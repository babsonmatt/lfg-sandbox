import type { Server, ServerWebSocket } from "bun";
import { Hono } from "hono";
import { logger } from "hono/logger";
import Redis from "ioredis";

const sub = new Redis();
const pub = new Redis();

sub.setMaxListeners(0);

type SocketWithId = ServerWebSocket<{ userId: number }>;

const wsByUserId = new Map<number, Set<SocketWithId>>();

const minRatingsByUserId = new Map<number, number>();
minRatingsByUserId.set(1, 1000);
minRatingsByUserId.set(2, 500);

setInterval(() => {
  //   pub.publish("test", Date.now().toString());
  //   console.log("listener count", sub.listenerCount("message"));
  // console.log(Object.fromEntries(wsByUserId));
  //   console.log("size", wsByUserId.size);
}, 1000);

const subscriptions = new Map<string, Set<string>>();

sub.subscribe("test");
sub.subscribe("user:search");

sub.on("message", (channel, message) => {
  console.log("got message", channel, message);
  if (channel === "user:search") {
    const { userId, bracket, minRating } = JSON.parse(message);
    const result = Array.from(userId).filter(
      ([userId, { minRating }]) => minRating >= 1200
    );
    const set = wsByUserId.get(userId);
    if (set) {
      for (const ws of set) {
        ws.send("searching");
      }
    }
  }
});

// pub.publish(
//   "user:search",
//   JSON.stringify({ userId: 3, bracket: "2v2", minRating: 1000 })
// );

const app = new Hono<{
  Bindings: {
    server: Server;
  };
}>();

app.use(logger());

app.get("/test", async (c) => {
  return c.json({ ok: true });
});

app.get("/ws", async (c) => {
  if (
    !c.env.server.upgrade(c.req.raw, {
      data: {
        userId: 1,
      },
    })
  ) {
    console.error("failed to upgrade!");
  }
  return new Response(); // have to return empty response so hono doesn't get mad
});

const server = Bun.serve({
  port: process.env.PORT || "8080",
  fetch: (req: Request, server: Server) => {
    return app.fetch(req, {
      server,
    });
  },
  websocket: {
    message(ws: SocketWithId, msg) {
      // add to user's set of websockets

      console.log("got message", ws.data, msg);

      pub.publish(
        "user:search",
        JSON.stringify({ userId: 3, bracket: "2v2", minRating: 1000 })
      );
    },
    open(ws) {
      console.log("websocket opened", ws.data);
      const userId = ws.data.userId;
      const set = wsByUserId.get(userId) ?? new Set();
      set.add(ws);
      wsByUserId.set(userId, set);

      console.log(wsByUserId.size);
    },
    close(ws) {
      console.log("websocket closed", ws.data);
    },
  },
});

server.publish("aaa", "cool");
