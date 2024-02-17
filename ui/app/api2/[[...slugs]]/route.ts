import { Elysia, t } from "elysia";
import { Stream } from "@elysiajs/stream";

type SSEMessage = {
  event: string;
  data: string | {};
  id: string | number;
};

const ssidToStream = new Map<string, Set<Stream<any>>>();

setInterval(() => {
  for (const [ssid, streams] of ssidToStream) {
    for (const stream of streams) {
      writeSSE(stream, {
        data: `hi ${ssid}`,
        event: "woot",
        id: crypto.randomUUID(),
      });
    }
  }
}, 1000);

function writeSSE(stream: Stream<any>, msg: SSEMessage) {
  stream.send(
    `event: ${msg.event}\ndata: ${JSON.stringify(msg.data)}\nid: ${msg.id}\n\n`
  );
}

const app = new Elysia({ prefix: "/api2" })
  .get("/test", () => ({
    ok: true,
  }))
  .post("/", ({ body }) => body, {
    body: t.Object({
      name: t.String(),
    }),
  })
  .get(
    "/source",
    (c) =>
      new Stream((stream) => {
        ssidToStream.set("1", new Set([stream]));
        c.request.signal.addEventListener("abort", () => {
          ssidToStream.get("1")?.delete(stream);
          clearInterval(interval);
          stream.close();
          console.log("abort");
        });

        const interval = setInterval(() => {
          //   stream.send("hello world");
          writeSSE(stream, {
            data: "test",
            event: "woot",
            id: crypto.randomUUID(),
          });
        }, 500);

        // setTimeout(() => {
        //   clearInterval(interval);
        //   stream.close();
        // }, 10000);
      })
  )
  .get(
    "/",
    () =>
      new Stream(async (stream) => {
        stream.send("hello");

        await stream.wait(1000);
        stream.send("world");

        stream.close();
      })
  )
  .ws("/ws", {
    open(ws) {
      console.log("open", ws.id);
    },
    close(ws) {
      console.log("open", ws.id);
    },
    message(ws, message) {
      console.log("message", ws.id);
    },
  });

export const GET = app.handle;
export const POST = app.handle;
