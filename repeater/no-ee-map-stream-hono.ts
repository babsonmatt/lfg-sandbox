import { Hono, type Context } from "hono";
import { logger } from "hono/logger";
import { SSEStreamingApi, streamSSE } from "hono/streaming";
import {
  getCookie,
  getSignedCookie,
  setCookie,
  setSignedCookie,
  deleteCookie,
} from "hono/cookie";
// import { serve } from "@hono/node-server";
import Redis from "ioredis";

const redisKeyPrefix = "lfg:";

const sub = new Redis({ keyPrefix: redisKeyPrefix });
const pub = new Redis({ keyPrefix: redisKeyPrefix });

sub.psubscribe(`${redisKeyPrefix}*`);

const app = new Hono();
app.use(logger());

class ConnectionManager {
  private channelsBySsid: Map<string, Set<string>> = new Map();
  private userBySsid: Map<string, string> = new Map();
  private handlersByChannel: Map<string, Set<Handler>> = new Map();
  private handlersBySsid: Map<string, Set<Handler>> = new Map();

  addHandlerToChannel(channel: string, handler: Handler) {
    this.handlersByChannel.set(
      channel,
      this.handlersByChannel.get(channel)?.add(handler) ?? new Set([handler])
    );
  }

  removeHandlerFromChannel(channel: string, handler: Handler) {
    this.handlersByChannel.get(channel)?.delete(handler);
  }

  getHandlersByChannel(channel: string) {
    return this.handlersByChannel.get(channel);
  }

  addHandlerToSsid(ssid: string, handler: Handler) {
    this.handlersBySsid.set(
      ssid,
      this.handlersBySsid.get(ssid)?.add(handler) ?? new Set([handler])
    );
  }

  removeHandlerFromSsid(ssid: string, handler: Handler) {
    this.handlersBySsid.get(ssid)?.delete(handler);
  }

  getHandlersBySsid(ssid: string) {
    return this.handlersBySsid.get(ssid);
  }

  sendMessageToSsid(ssid: string, event: string, data: string) {
    this.handlersBySsid.get(ssid)?.forEach((handler) =>
      handler({
        data,
        event,
        id: crypto.randomUUID(),
      })
    );
  }
}

const cm = new ConnectionManager();

function publishMessageToSsid(ssid: string, message: string) {
  const channel = `${redisKeyPrefix}message-user:${ssid}`;
  pub.publish(channel, message);
}

function publishMessageToChannel(channel: string, message: string) {
  pub.publish(`${redisKeyPrefix}${channel}`, message);
}

function stripPrefixFromChannel(prefix: string, channel: string) {
  // remove prefix if channel starts with it
  return channel.startsWith(prefix) ? channel.slice(prefix.length) : channel;
}

class MessageHandler {
  constructor() {}

  private messageHandler = (channel: string, message: {}) => {
    const sChannel = channel.split(":");
    const handlers = cm.getHandlersByChannel(channel);
    if (!handlers) return;

    handlers.forEach((_, handler) => {
      handler({
        data: message,
        event: sChannel[0],
        id: crypto.randomUUID(),
      });
    });
  };

  processMessage(channel: string, message: {}) {
    console.log("processMessage", channel, message);
    this.messageHandler(channel, message);
  }

  // private messageUserHandler = (channel: string, message: {}) => {
  //   const handlers = cm.getHandlersByChannel(channel);
  //   if (!handlers) return;

  //   handlers.forEach((_, handler) => {
  //     handler({
  //       data: message,
  //       event: "message-user",
  //       id: crypto.randomUUID(),
  //     });
  //   });
  // };

  // processMessage(channel: string, message: {}) {
  //   console.log("processMessage", channel, message);
  //   const eventHandler = this.msgHandlerMap.get(channel.split(":")[0]);

  //   if (eventHandler) {
  //     eventHandler(channel, message);
  //   }
  // }
}

const mh = new MessageHandler();

sub.on("pmessage", (_pattern, channel, message) => {
  const c = stripPrefixFromChannel(redisKeyPrefix, channel);
  mh.processMessage(c, message);
});

type Handler = (message: any) => void;

async function handleSSE(c: Context, stream: SSEStreamingApi) {
  const ssid = getCookie(c, "ssid");
  const s = new ReadableStream({
    start(controller) {
      c.req.raw.signal.addEventListener("abort", () => {
        console.log("closed!", ssid);
        controller.close();

        cm.removeHandlerFromChannel(`message-user:${ssid}`, handler);
        cm.removeHandlerFromSsid(ssid!, handler);

        stream.close();
      });

      // use with node
      // stream.onAbort(() => {
      //   console.log("closed!");
      //   controller.close();
      //   handlers.delete(handler);
      //   stream.close();
      // });

      const handler = (message: any) => {
        console.log("handler  called");
        controller.enqueue(message);
      };

      // c.set("caca", "a");

      const existingChannelsForSsid = cm.getChannelsBySsid(ssid!);
      console.log("existingChannelsForSsid", existingChannelsForSsid);

      existingChannelsForSsid?.forEach((channel: string) => {
        cm.addHandlerToChannel(channel, handler);
      });

      cm.addHandlerToSsid(ssid!, handler);
      cm.addHandlerToChannel(`message-user:${ssid}`, handler);
    },
  });

  // stream.pipe(s);

  for await (const message of s) {
    await stream.writeSSE(message);
  }
}

app.use(async (c, next) => {
  const ssid = getCookie(c, "ssid");
  if (!ssid) {
    const ssid = crypto.randomUUID();
    setCookie(c, "ssid", ssid, { path: "/" });
  }
  await next();
});

app.get("/subscribe/:channel", (c) => {
  const ssid = getCookie(c, "ssid");
  const handlers = cm.getHandlersBySsid(ssid!);

  handlers?.forEach((handler) => {
    cm.addHandlerToChannel(`message-user-test`, handler);
  });

  return c.json({ ok: true });
});

app.get("/sse", (c) => {
  return streamSSE(c, async (stream) => {
    await handleSSE(c, stream);
  });
});

setInterval(() => {
  publishMessageToSsid("63332f3d-a8f5-43a6-ad38-6c773e0b8a52", "hello");
  publishMessageToSsid("5e28bff6-c31f-4637-8745-f83c0c421f21", "hello");
  publishMessageToChannel(
    "message-user:5e28bff6-c31f-4637-8745-f83c0c421f21",
    "test"
  );
  publishMessageToChannel("message-user-test", "NEW SUB!!");
}, 1000);

export default app;

// serve(app);
