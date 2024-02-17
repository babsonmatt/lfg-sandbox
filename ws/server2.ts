import { Elysia } from "elysia";
import { Stream } from "@elysiajs/stream";
import { cors } from "@elysiajs/cors";
import Redis from "ioredis";
import crypto from "crypto";
import type { ElysiaWS } from "elysia/ws";

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

const app = new Elysia()
  .state("websocketsByUserId", new Map<string, ElysiaWS>())
  .state("handlersBySsid", new Map<string, any>())
  .state("wsBySsid", new Map<string, Set<any>>())
  .use(cors())
  //   .onBeforeHandle(({ cookie: { ssid } }) => {
  //     console.log("before");
  //     if (!ssid.value) {
  //       ssid.path = "/";
  //       ssid.value = crypto.randomUUID();
  //     }
  //   })
  //   .onAfterHandle(({ cookie: { ssid } }) => {
  //     console.log("after");
  //   })
  .get("/test", (ctx) => {
    // pub.publish("test", "hello world");
    //const ssid = ctx.cookie.ssid.value;
    //ctx.store.websocketsByUserId.get(ssid)?.send("hello world");
    return "ok";
  })
  .ws("/ws", {
    // beforeHandle(context) {
    //   return {};
    // },

    // upgrade(context) {
    //   return {};
    // },

    open(ws) {
      console.log("wsid", ws.id);
      const ssid = ws.data.cookie.ssid.value;
      console.log("open", ssid);

      const websocketsByUserId = ws.data.store.websocketsByUserId;
      const handlersBySsid = ws.data.store.handlersBySsid;
      ws.data.store.websocketsByUserId.set(ssid, ws);

      ws.data.store.wsBySsid.set(
        ssid,
        ws.data.store.wsBySsid.get(ssid) ?? new Set([ws])
      );

      ws.subscribe("messages");

      //   ws.data.store.wsBySsid.forEach((valueSet, key) => {
      //     console.log(`Key: ${key}`);
      //     valueSet.forEach(ws => {
      //       console.log('ws id', ws.id);
      //       ws.send('hello');
      //     });
      //   });

      // const handler = (channel, message) => {
      //   ws.send(message);
      // };

      handlersBySsid.set(ssid, handler);

      // sub.on("message", handler);
    },
    close(ws) {
      const ssid = ws.data.cookie.ssid.value;
      const handlersBySsid = ws.data.store.handlersBySsid;
      const handler = handlersBySsid.get(ssid);
      sub.removeListener("message", handler);
      console.log("close", ssid);
    },
    message(ws, message) {
      ws.publish("messages", message);
    },
  })
  .listen(8080);

const ws = app.server!;

sub.on("message", (channel, message) => {
  ws.publish("messages", "woooo!");
});




export type App = typeof app;
