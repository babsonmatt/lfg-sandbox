for (let i = 0; i < 1; i++) {
  const socket = new WebSocket("ws://localhost:8080/ws", {
    headers: {
      Authorization: "Bearer <token>",
    },
  });

  socket.onopen = function (e) {
    console.log("open!");
  };

  socket.onmessage = function (event) {
    console.log("message", event.data);
  };

  socket.onerror = function (event) {
    console.log("error", event);
  };

  socket.onclose = function (event) {
    console.log("close", event);
  };
}
