import { WebSocket } from "k6/experimental/websockets";

export default function () {
  const ws = new WebSocket("ws://localhost:3000/ws/lfg");

  ws.onopen = () => {
    console.log("WebSocket connection established!");
    ws.ping();
    ws.close();
  };

  ws.onpong = () => {
    // As required by the spec, when the ping is received, the recipient must send back a pong.
    console.log("connection is alive");
  };
}
