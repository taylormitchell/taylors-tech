import { Resource } from "sst";
import { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";

export const handleConnect: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId;
  // Store the connection ID in a database or memory store for later use
  console.log(`Connected: ${connectionId}`);
  return {
    statusCode: 200,
    body: "Connected.",
  };
};

export const handleDisconnect: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId;
  // Remove the connection ID from the database or memory store
  console.log(`Disconnected: ${connectionId}`);
  return {
    statusCode: 200,
    body: "Disconnected.",
  };
};

export const handlePoke: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  console.log(`Received poke from ${event.requestContext.connectionId}`);
  try {
    console.log(`Sending poke to all connections`);
    const client = new ApiGatewayManagementApiClient({
      endpoint: Resource.TaylorsTechWS.managementEndpoint,
    });
    await client.send(
      new PostToConnectionCommand({
        ConnectionId: event.requestContext.connectionId,
        Data: "Poke.",
      })
    );
  } catch (e) {
    console.error(`Failed to send poke: ${e}`, JSON.stringify(e));
  }
  return {
    statusCode: 200,
    body: "Poke received.",
  };
};

const handleDefault: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  console.log("Default route");
  return {
    statusCode: 200,
    body: "Default route.",
  };
};
