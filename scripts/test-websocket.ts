const apiUrl = "wss://jzleizp0bb.execute-api.us-east-1.amazonaws.com/$default";

const ws = new WebSocket(apiUrl);

ws.onopen = () => {
  console.log("Connected to WebSocket");
};

ws.onmessage = (event) => {
  console.log("Received message from server:", event.data);
};

ws.onclose = () => {
  console.log("Disconnected from WebSocket");
};

ws.onerror = (error) => {
  console.error("WebSocket error:", error);
};

// in 5s, send a poke message to the server
setTimeout(() => {
  ws.send(JSON.stringify({ action: "poke" }));
}, 2000);
