const apiUrl = "wss://jzleizp0bb.execute-api.us-east-1.amazonaws.com/$default";

// const apiUrl = "ws://localhost:8080";

// create a bunch of connections that are listening for pokes
for (let i = 0; i < 10; i++) {
  try {
    const ws = new WebSocket(apiUrl);
    ws.onopen = () => {
      console.log(`Listener ${i} connected to WebSocket`);
    };
    ws.onmessage = (event) => {
      console.log(`Listener ${i} received message:`, event.data);
    };
  } catch (e) {
    console.error(`Failed to create WebSocket: ${e}`, JSON.stringify(e));
  }
}

// then send a poke
setTimeout(() => {
  const ws = new WebSocket(apiUrl);
  ws.onopen = () => {
    console.log("Sending poke to server");
    ws.send(JSON.stringify({ action: "poke" }));
  };
}, 2000);
