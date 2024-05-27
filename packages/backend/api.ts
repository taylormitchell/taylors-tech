import { eq } from "drizzle-orm";
import { db, serverId } from "./db";
import { note, replicacheClient, replicacheServer } from "./schema.sql";
import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { MutationV1, PushRequestV1 } from "replicache";
import { isMutatorName } from "../notes/src/mutators";
import { Note } from "../notes/src/types";

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
      return {
        statusCode: 200,
        body: JSON.stringify({
          lastMutationIDChanges: {},
          cookie: 42,
          patch: [
            { op: "clear" },
            {
              op: "put",
              key: "note/qpdgkvpb9ao",
              value: {
                id: "qpdgkvpb9ao",
                title: null,
                body: "hello world",
                created_at: "2021-09-29T21:00:00.000Z",
              },
            },
            {
              op: "put",
              key: "note/qpdgkvpb9ap",
              value: {
                id: "qpdgkvpb9ap",
                title: null,
                body: "goodbye world",
                created_at: "2021-09-29T21:00:00.000Z",
              },
            },
          ],
        }),
      };
    }
    case "POST /push": {
      const push: PushRequestV1 = JSON.parse(evt.body || "{}");
      console.log("Processing push", JSON.stringify(push));
      const t0 = Date.now();
      try {
        await db.transaction(
          async (t) => {
            for (const mutation of push.mutations) {
              await applyMutation(t, mutation, push.clientGroupID);
            }
          },
          { isolationLevel: "repeatable read" }
        );
      } catch (e) {
        console.error(e);
        return {
          statusCode: 500,
          body: e.message,
        };
      }
      console.log("Processed push", Date.now() - t0);
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

async function applyMutation(t: Transaction, mutation: MutationV1, clientGroupId: string) {
  const t1 = Date.now();
  if (!isMutatorName(mutation.name)) {
    throw new Error(`Unknown mutation: ${mutation.name}`);
  }
  // get the previous versions and increment them

  const { version: prevVersion } = await t.query.replicacheServer.findFirst({
    where: eq(replicacheServer.id, serverId),
  });
  const nextVersion = prevVersion + 1;
  const client = await t.query.replicacheClient.findFirst({
    where: eq(replicacheClient.id, mutation.clientID),
  });
  const nextMutationID = (client?.lastMutationID || 0) + 1;
  console.log({ nextVersion, nextMutationID });

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
      await t.insert(note).values({ id, title, body, version: nextVersion });
      break;
    }
    case "updateNote": {
      const partialNote: Partial<Note> = mutation.args as any; // TODO type this
      await t.update(note).set(partialNote).where(eq(note.id, partialNote.id));
      break;
    }
    default: {
      mutation.name satisfies never;
      throw new Error(`Unknown mutation: ${mutation.name}`);
    }
  }

  // Upsert lastMutationID for requesting client.
  const result = await t
    .update(replicacheClient)
    .set({ lastMutationID: nextMutationID, version: nextVersion })
    .where(eq(replicacheClient.id, mutation.clientID))
    .returning();
  console.log("Upserted lastMutationID", result);
  if (result.length === 0) {
    console.log("Inserting new client");
    await t.insert(replicacheClient).values({
      id: mutation.clientID,
      clientGroupId,
      lastMutationID: nextMutationID,
      version: nextVersion,
    });
  }

  // Update global version.
  await t
    .update(replicacheServer)
    .set({ version: nextVersion })
    .where(eq(replicacheServer.id, serverId));
}
