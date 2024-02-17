import { Elysia } from "elysia";
import { Stream } from "@elysiajs/stream";
import { cors } from "@elysiajs/cors";
import Redis from "ioredis";
import crypto from "crypto";

require("events").EventEmitter.defaultMaxListeners = 10000;
``;
const redis = new Redis();
const sub = new Redis();
const pub = new Redis();

sub.setMaxListeners(0);

setInterval(() => {
  pub.publish("test", Date.now().toString());

  console.log("listener count", sub.listenerCount("message"));
}, 1000);

const subscriptions = new Map<string, Set<string>>();

sub.subscribe("test");

new Elysia()
  .use(cors())
  .onBeforeHandle(({ cookie: { ssid } }) => {
    // console.log("before");
    if (!ssid.value) {
      ssid.path = "/";
      ssid.value = crypto.randomUUID();
    }
  })
  .onAfterHandle(({ cookie: { ssid } }) => {
    // console.log("after");
  })
  .get("/source", async ({ request, cookie: { ssid } }) => {
    console.log("new");
    const stream = new Stream((stream) => {
      const handler = (channel, message) => {
        // console.log(">>> message", message);

        // const subscriberIds = subscriptions.get(channel) ?? new Set();

        stream.send(
          `id: ${crypto.randomUUID()}\nevent: comments\ndata: ${JSON.stringify({
            value: message,
          })}\n\n`
        );
      };

      sub.on("message", handler);

      request.signal.addEventListener("abort", () => {
        sub.removeListener("message", handler);
        console.log("closed");
      });
    });

    return stream;
  })
  .get("/source2", async ({ request, cookie: { ssid } }) => {
    console.log("new");
    const stream = new Stream((stream) => {
      const handler = (channel, message) => {
        // console.log(">>> message", message);

        // const subscriberIds = subscriptions.get(channel) ?? new Set();

        stream.send(
          `id: ${crypto.randomUUID()}\nevent: comments\ndata: ${JSON.stringify({
            value: message,
          })}\n\n`
        );
      };

      sub.on("message", handler);

      request.signal.addEventListener("abort", () => {
        sub.removeListener("message", handler);
        console.log("closed");
      });
    });

    return stream;
  })

  .listen(8080);
