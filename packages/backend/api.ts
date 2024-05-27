import { db } from "./db";
import { note } from "./notes.sql";
import { APIGatewayProxyHandlerV2 } from "aws-lambda";

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
    default: {
      return {
        statusCode: 404,
        body: "Not Found",
      };
    }
  }
};
