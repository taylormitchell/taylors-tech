import { Resource } from "sst";
import { and, eq, gt } from "drizzle-orm";
import { db, serverId } from "./db";
import { note, replicacheClient, replicacheServer } from "./schema.sql";
import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import {
  MutationV1,
  PatchOperation,
  PullRequestV1,
  PullResponseOKV1,
  PushRequestV1,
} from "replicache";
import { isMutatorName } from "../notes/src/mutators";
import { Note } from "../notes/src/types";
import { WebSocket } from "ws";

export const handler: APIGatewayProxyHandlerV2 = async (evt) => {
  const { method, path } = evt.requestContext.http;
  const route = `${method} ${path}`;
  switch (route) {
    case "GET /": {
      const result = await db.select().from(note).execute();
      return {
        statusCode: 200,
        body: JSON.stringify(result, null, 2),
      };
    }
    case "POST /": {
      const { title, body } = JSON.parse(evt.body || "{}");
      const result = await db
        .insert(note)
        .values({ title: title || null, body: body || null })
        .returning()
        .execute();
      return {
        statusCode: 200,
        body: JSON.stringify(result),
      };
    }
    case "POST /pull": {
      const pull: PullRequestV1 = JSON.parse(evt.body || "{}");
      console.log("Processing pull", JSON.stringify(pull));
      const t0 = Date.now();

      try {
        const body = await db.transaction(
          async (t) => {
            return await processPull(t, pull);
          },
          { isolationLevel: "repeatable read" }
        );
        console.log("Returning patch", JSON.stringify(body));
        return {
          statusCode: 200,
          body: JSON.stringify(body),
        };
      } catch (e) {
        console.error(e);
        return {
          statusCode: 500,
          body: e.message,
        };
      }
    }
    case "POST /push": {
      const push: PushRequestV1 = JSON.parse(evt.body || "{}");
      console.log("Processing push", JSON.stringify(push));
      const t0 = Date.now();
      try {
        for (const mutation of push.mutations) {
          const t1 = Date.now();
          console.log(`Processing mutation ${mutation.id}`);
          await applyMutation(mutation, push.clientGroupID);
          console.log(`Processed mutation ${mutation.id}`, Date.now() - t1);
        }
      } catch (e) {
        console.error(e);
        return {
          statusCode: 500,
          body: e.message,
        };
      }
      console.log("Processed push", Date.now() - t0);
      console.log("Sending poke");
      sendPoke();
      return {
        statusCode: 200,
        body: "{}",
      };
    }
    default: {
      return {
        statusCode: 404,
        body: "Not Found",
      };
    }
  }
};

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function processPull(t: Transaction, pull: PullRequestV1): Promise<PullResponseOKV1> {
  const { clientGroupID } = pull;
  const fromVersion = (pull.cookie as any) ?? 0; // TODO type this
  const t0 = Date.now();
  try {
    const { version: currentVersion } = await t.query.replicacheServer.findFirst({
      where: eq(replicacheServer.id, serverId),
    });

    if (fromVersion > currentVersion) {
      throw new Error(
        `from ${fromVersion} is from the future - aborting. This can happen in development if the server restarts. In that case, clear appliation data in browser and refresh.`
      );
    }

    // get last mutation ids since fromVersion
    const rows = await t.query.replicacheClient.findMany({
      where: and(
        eq(replicacheClient.clientGroupId, clientGroupID),
        gt(replicacheClient.version, fromVersion)
      ),
    });
    const clientIdToLastMutationId = Object.fromEntries(
      rows.map((row) => [row.id, row.lastMutationID])
    );

    const notesChanged = await t.query.note.findMany({
      where: gt(note.version, fromVersion),
    });
    const patch: PatchOperation[] = [];
    for (const note of notesChanged) {
      patch.push({
        op: "put",
        key: `note/${note.id}`,
        value: note,
      });
      // TODO handle deletes
    }
    const body: PullResponseOKV1 = {
      lastMutationIDChanges: clientIdToLastMutationId ?? {},
      patch,
      cookie: currentVersion,
    };
    return body;
  } catch (e) {
    console.error(e);
    throw e;
  }
}

async function applyMutation(mutation: MutationV1, clientGroupId: string) {
  return db.transaction(
    async (t) => {
      if (!isMutatorName(mutation.name)) {
        throw new Error(`Unknown mutation: ${mutation.name}`);
      }
      console.log("Getting current version");
      const prevVersion =
        (
          await t.query.replicacheServer.findFirst({
            where: eq(replicacheServer.id, serverId),
          })
        )?.version ?? 0;
      const nextVersion = prevVersion + 1;
      console.log("Getting lastMutationID for client");
      const client = await t.query.replicacheClient.findFirst({
        where: eq(replicacheClient.id, mutation.clientID),
      });
      const nextMutationID = (client?.lastMutationID || 0) + 1;
      // console.log("processing mutation", JSON.stringify({ mutation, nextVersion, nextMutationID }));

      // skip mutations that have already been processed
      if (mutation.id < nextMutationID) {
        console.log(`Mutation ${mutation.id} already processed. Skipping.`);
        return;
      }
      // this should never happen
      if (mutation.id > nextMutationID) {
        throw new Error(
          `Mutation ${mutation.id} is from the future - aborting. This can happen in development if the server restarts. In that case, clear appliation data in browser and refresh.`
        );
      }

      // TODO: can I generate types for these?
      switch (mutation.name) {
        case "putNote": {
          const { id, title, body } = mutation.args as any; // TODO type this
          console.log("Inserting note");
          await t.insert(note).values({ id, title, body, version: nextVersion });
          break;
        }
        case "updateNote": {
          console.log("Updating note");
          const partialNote: Partial<Note> = mutation.args as any; // TODO type this
          await t
            .update(note)
            .set({ ...partialNote, version: nextVersion })
            .where(eq(note.id, partialNote.id));
          break;
        }
        default: {
          mutation.name satisfies never;
          throw new Error(`Unknown mutation: ${mutation.name}`);
        }
      }

      // Upsert lastMutationID for requesting client.
      console.log("Upserting lastMutationID");
      const result = await t
        .update(replicacheClient)
        .set({ lastMutationID: nextMutationID, version: nextVersion })
        .where(eq(replicacheClient.id, mutation.clientID))
        .returning();
      if (result.length === 0) {
        await t.insert(replicacheClient).values({
          id: mutation.clientID,
          clientGroupId,
          lastMutationID: nextMutationID,
          version: nextVersion,
        });
      }

      // Update global version.
      console.log("Updating global version");
      await t
        .update(replicacheServer)
        .set({ version: nextVersion })
        .where(eq(replicacheServer.id, serverId));
    },
    { isolationLevel: "repeatable read" }
  );
}

function sendPoke() {
  const ws = new WebSocket(Resource.TaylorsTechWS.url);
  ws.onopen = () => {
    ws.send(JSON.stringify({ action: "poke" }));
    ws.close();
  };
}
