// This is the Lambda function that will handle WebSocket connections and messages

export const handleConnect = async (event) => {
  const connectionId = event.requestContext.connectionId;
  // Store the connection ID in a database or memory store for later use
  console.log(`Connected: ${connectionId}`);
  return {
    statusCode: 200,
    body: "Connected.",
  };
};

export const handleDisconnect = async (event) => {
  const connectionId = event.requestContext.connectionId;
  // Remove the connection ID from the database or memory store
  console.log(`Disconnected: ${connectionId}`);
  return {
    statusCode: 200,
    body: "Disconnected.",
  };
};

export const handlePoke = async (event) => {
  const connectionId = event.requestContext.connectionId;
  console.log(`Poked: ${connectionId}`);
  // Here you can handle the poke message as needed
  return {
    statusCode: 200,
    body: "Poke received.",
  };
};

const handleDefault = async (event) => {
  console.log("Default route");
  return {
    statusCode: 200,
    body: "Default route.",
  };
};
