import Image from "next/image";
import SSE from "./sse";
import CommentsAll from "./comments";
import { WebSocketDemo } from "./ws";

export default function Home() {
  return (
    <main>
      {/* <SSE /> */}
      {/* <CommentsAll /> */}
      <WebSocketDemo />
    </main>
  );
}
