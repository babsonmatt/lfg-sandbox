import { ServerWebSocket } from "bun";
import { Hono } from "hono";
import { handle } from "hono/vercel";
import {
  stream,
  streamText,
  streamSSE,
  SSEStreamingApi,
  SSEMessage,
} from "hono/streaming";
import { logger } from "hono/logger";
import {
  getCookie,
  getSignedCookie,
  setCookie,
  setSignedCookie,
  deleteCookie,
} from "hono/cookie";
import { Push, Repeater } from "@repeaterjs/repeater";

// const timestamps = new Repeater(async (push, stop) => {
//   push(Date.now());
//   const interval = setInterval(() => push(Date.now()), 1000);
//   await stop;
//   clearInterval(interval);
// });

// async function what(stream: SSEStreamingApi) {
//   let i = 0;
//   for await (const timestamp of timestamps) {
//     console.log(timestamp);
//     stream.writeSSE({
//       data: `It is ${timestamp}`,
//       event: "time-update",
//       id: String(i),
//     });
//     i++;
//     if (i >= 10) {
//       console.log("ALL DONE!");
//       break; // triggers clearInterval above
//     }
//   }
// }

const app = new Hono().basePath("/api");
app.use(logger());

const ssidToStream = new Map<string, Set<SSEStreamingApi>>();
const ssidToPush = new Map<string, Set<Push<SSEMessage, unknown>>>();

// setInterval(() => {
//   console.log(ssidToStream.size);
//   for (const [ssid, streams] of ssidToStream) {
//     console.log("streams size", streams.size);
//     for (const stream of streams) {
//       stream.writeSSE({
//         data: `hi ${ssid}`,
//         event: "woot",
//         id: crypto.randomUUID(),
//       });
//     }
//   }
// }, 1000);

setInterval(() => {
  console.log(ssidToPush.size);
  for (const [ssid, pushes] of ssidToPush) {
    console.log("pushes size", pushes.size);
    for (const push of pushes) {
      push({
        data: `hello!`,
        event: "message",
        id: crypto.randomUUID(),
      });
    }
  }
}, 1000);

app.get("/hello", (c) => {
  return c.json({
    message: "Hello Next.js!",
  });
});

app.get("/streamText", (c) => {
  return streamText(c, async (stream) => {
    // Write a text with a new line ('\n').
    await stream.writeln("Hello");
    // Wait 1 second.
    await stream.sleep(1000);
    // Write a text without a new line.
    await stream.write(`Hono!`);
  });
});

// let id = 0;

app.get("/sse", async (c) => {
  return streamSSE(c, async (stream) => {
    let ssid = getCookie(c, "ssid");
    if (!ssid) {
      ssid = crypto.randomUUID();
      setCookie(c, "ssid", ssid, { path: "/" });
    }

    // add stream to ssidToStream, add to Set if already exists
    const set = ssidToStream.get(ssid) ?? new Set();
    set.add(stream);
    ssidToStream.set(ssid, set);

    let isAborted = false;

    c.req.raw.signal.addEventListener("abort", () => {
      console.log("aborted!!!!");
      ssidToStream.get(ssid!)?.delete(stream);
      isAborted = true;
      stream.close();
    });

    // await what(stream);

    const messages = new Repeater<SSEMessage>(async (push, stop) => {
      // add push to ssidToPush, add to Set if already exists
      const set = ssidToPush.get(ssid!) ?? new Set();
      set.add(push);
      ssidToPush.set(ssid!, set);

      await stop;
      ssidToPush.get(ssid!)?.delete(push);
      console.log("ALL DONE!");
      stream.close();
    });

    let i = 0;

    for await (const message of messages) {
      console.log(message);
      stream.writeSSE(message);

      if (c.req.raw.signal.aborted) {
        console.log("aborted!!!!");
        break;
      }
    }

    // const timestamps = new Repeater(async (push, stop) => {
    //   push(Date.now());
    //   const interval = setInterval(() => push(Date.now()), 1000);
    //   await stop;
    //   clearInterval(interval);
    // });

    // let i = 0;

    // for await (const timestamp of timestamps) {
    //   console.log(timestamp);
    //   stream.writeSSE({
    //     data: `It is ${timestamp}`,
    //     event: "time-update",
    //     id: String(i),
    //   });
    //   i++;
    //   if (i >= 10) {
    //     console.log("ALL DONE!");
    //     break; // triggers clearInterval above
    //   }
    // }

    // stream.onAbort(() => {
    //   console.log("done!!!");
    //   isAborted = true;
    //   stream.close();
    // });

    // for (let i = 0; i < 10; i++) {
    //   if (isAborted) break;
    //   console.log("aaaa", c.req.raw.signal.aborted);
    //   const message = `It is ${new Date().toISOString()}`;
    //   console.log(message);
    //   const what = await stream.writeSSE({
    //     data: message,
    //     event: "time-update",
    //     id: String(id++),
    //   });
    //   console.log("what", what);
    //   await stream.sleep(1000);
    // }
    console.log("we are done");
  });
});

export const GET = handle(app);
export const POST = handle(app);
