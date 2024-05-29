import { Resource } from "sst";
import { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { z } from "zod";

// zod schema for the connection ID item
const ConnectionIdItemSchema = z.object({ id: z.string() });
type ConnectionIdItem = z.infer<typeof ConnectionIdItemSchema>;
const connections = {
  client: DynamoDBDocumentClient.from(new DynamoDBClient()),
  async add(connectionId: string) {
    return this.client.send(
      new PutCommand({
        TableName: Resource.TaylorsTechWSConnections.name,
        Item: { id: connectionId } satisfies ConnectionIdItem,
      })
    );
  },
  async remove(connectionId: string) {
    return this.client.send(
      new DeleteCommand({
        TableName: Resource.TaylorsTechWSConnections.name,
        Key: { id: connectionId } as Pick<ConnectionIdItem, "id">,
      })
    );
  },
  async list(): Promise<string[]> {
    const result = await this.client.send(
      new ScanCommand({
        TableName: Resource.TaylorsTechWSConnections.name,
      })
    );
    try {
      return (result.Items ?? []).map((item) => ConnectionIdItemSchema.parse(item).id);
    } catch (e) {
      console.error(`Failed to parse connection IDs: ${e}`, JSON.stringify({ result, e }));
      return [];
    }
  },
};

export const handleConnect: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId;
  await connections.add(connectionId);
  console.log(`Connected: ${connectionId}`);
  return {
    statusCode: 200,
    body: "Connected.",
  };
};

export const handleDisconnect: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId;
  await connections.remove(connectionId);
  console.log(`Disconnected: ${connectionId}`);
  return {
    statusCode: 200,
    body: "Disconnected.",
  };
};

export const handlePoke: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  console.log(`Received poke from ${event.requestContext.connectionId}`);
  try {
    const client = new ApiGatewayManagementApiClient({
      endpoint: Resource.TaylorsTechWS.managementEndpoint,
    });
    const connectionIds = await connections.list();
    console.log(`Sending poke to connections`);
    const results = await Promise.allSettled(
      connectionIds.map((connectionId) =>
        client.send(
          new PostToConnectionCommand({
            ConnectionId: connectionId,
            Data: "Poke.",
          })
        )
      )
    );
    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        console.log(`Sent poke to connection ${connectionIds[index]}`);
      } else {
        if (result.reason?.name === "GoneException") {
          console.log(`Connection ${connectionIds[index]} is gone. Removing.`);
          connections.remove(connectionIds[index]);
        } else {
          const error = result.reason;
          console.error(
            `Failed to send poke to connection ${connectionIds[index]}: ${error}`,
            JSON.stringify(error)
          );
        }
      }
    });
  } catch (e) {
    console.error(`Failed to send poke: ${e}`, JSON.stringify(e));
  }
  return {
    statusCode: 200,
    body: "Poke received.",
  };
};

export const handleDefault: APIGatewayProxyWebsocketHandlerV2 = async () => {
  console.log("Default route");
  return {
    statusCode: 200,
    body: "Default route.",
  };
};
