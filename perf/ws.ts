import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import Redis from "ioredis";
import crypto from "crypto";

require("events").EventEmitter.defaultMaxListeners = 10000;

// const redis = new Redis();
const sub = new Redis();
const pub = new Redis();

sub.setMaxListeners(0);

setInterval(() => {
  pub.publish("test", Date.now().toString());
  console.log("listener count", sub.listenerCount("message"));
}, 1000);

const subscriptions = new Map<string, Set<string>>();

sub.subscribe("test");
sub.subscribe("search");

const app = new Elysia()
  .state("websocketsByUserId", new Map<string, any>())
  .use(cors())
  .onBeforeHandle(({ cookie: { ssid } }) => {
    console.log("before", ssid.value);
    if (!ssid.value) {
      ssid.path = "/";
      ssid.value = crypto.randomUUID();
    }
  })
  .onAfterHandle(({ cookie: { ssid } }) => {
    console.log("after", ssid.value);
  })
  .get("/test", (ctx) => {
    // pub.publish("test", "hello world");
    const ssid = ctx.cookie.ssid.value;
    ctx.store.websocketsByUserId.get(ssid)?.send("hello world");
    return "ok";
  })
  .get(
    "/search",
    (ctx) => {
      const {
        query: { bracket, minRating },
        cookie: { ssid },
      } = ctx;

      //   pub.publish("search", JSON.stringify({ bracket, minRating }));

      pub.publish(
        "search",
        JSON.stringify({
          userId: ssid.value,
          bracket,
          minRating,
        })
      );

      return "ok";
    },
    {
      query: t.Object({
        bracket: t.String(),
        minRating: t.Optional(t.Numeric()),
      }),
    }
  )
  .ws("/ws", {
    open(ws) {
      const ssid = ws.data.cookie.ssid.value;
      const websocketsByUserId = ws.data.store.websocketsByUserId;

      websocketsByUserId.set(ssid, ws);

      const handler = (channel, message) => {
        ws.send(message);
      };

      sub.on("message", handler);
    },
    close(ws) {
      console.log("close");
    },
    message(ws, message) {
      console.log("new");
    },
  })
  .listen(8080);

export type App = typeof app;
