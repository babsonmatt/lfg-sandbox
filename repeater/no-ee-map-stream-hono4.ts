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
import { enableMapSet, produce } from "immer";

enableMapSet();

const redisKeyPrefix = "lfg:";

const sub = new Redis({ keyPrefix: redisKeyPrefix });
const pub = new Redis({ keyPrefix: redisKeyPrefix });

sub.psubscribe(`${redisKeyPrefix}*`);

const app = new Hono();
app.use(logger());

class ConnectionManager {
  private channelsByHandler: Map<Handler, Set<string>> = new Map();
  private channelsBySsid: Map<string, Set<string>> = new Map();
  private userBySsid: Map<string, string> = new Map();
  private handlersByChannel: Map<string, Set<Handler>> = new Map();
  private handlersBySsid: Map<string, Set<Handler>> = new Map();
  private handlersBySsidByChannel2: Map<[string, string], Set<Handler>> =
    new Map();
  private handlersBySsidByChannel: Map<string, Map<string, Set<Handler>>> =
    new Map();

  addHandlerToChannel(channel: string, ssid: string, handler: Handler) {
    this.handlersByChannel.set(
      channel,
      this.handlersByChannel.get(channel)?.add(handler) ?? new Set([handler])
    );

    this.channelsBySsid.set(
      ssid,
      this.channelsBySsid.get(ssid)?.add(channel) ?? new Set([channel])
    );

    this.channelsByHandler.set(
      handler,
      this.channelsByHandler.get(handler)?.add(channel) ?? new Set([channel])
    );

    const newHandlers =
      this.handlersBySsidByChannel.get(ssid)?.get(channel)?.add(handler) ??
      new Set([handler]);

    const newMap =
      this.handlersBySsidByChannel.get(ssid) ??
      new Map([[channel, newHandlers]]); // need to make sure a map exists for the ssid/channel

    newMap?.set(channel, newHandlers); // TODO: this shouldnt happen if the map didnt exist prior

    this.handlersBySsidByChannel.set(ssid, newMap); // can we mutate instead of making a new Map?
  }

  getHandlersBySsidByChannel(ssid: string, channel: string) {
    return this.handlersBySsidByChannel.get(ssid)?.get(channel);
  }

  addChanneltoSsid(channel: string, ssid: string) {
    this.channelsBySsid.set(
      ssid,
      this.channelsBySsid.get(ssid)?.add(channel) ?? new Set([channel])
    );
  }

  removeChannelFromSsid(channel: string, ssid: string) {
    this.channelsBySsid.get(ssid)?.delete(channel);
  }

  getChannelsBySsid(ssid: string) {
    return this.channelsBySsid.get(ssid);
  }

  getChannelsByHandler(handler: Handler) {
    return this.channelsByHandler.get(handler);
  }

  removeHandlerFromChannel(channel: string, ssid: string, handler: Handler) {
    this.handlersByChannel.get(channel)?.delete(handler);

    this.handlersBySsidByChannel.get(ssid)?.get(channel)?.delete(handler);
  }

  removeHandlerFromAllChannels(ssid: string, handler: Handler) {
    const channels = this.getChannelsByHandler(handler);
    channels?.forEach((channel) => {
      this.removeHandlerFromChannel(channel, ssid, handler);
    });
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
    // console.log("processMessage", channel, message);
    this.messageHandler(channel, message);
  }
}

const mh = new MessageHandler();

function subscribeSsidToChannel(ssid: string, channel: string) {
  const handlers = cm.getHandlersBySsid(ssid!);

  handlers?.forEach((handler) => {
    cm.addHandlerToChannel(channel, ssid!, handler);
  });

  cm.addChanneltoSsid(channel, ssid!);

  const allSsidHandlersForChannel = cm.getHandlersBySsidByChannel(
    ssid,
    channel
  );
}

function unsubscribeSsidFromChannel(ssid: string, channel: string) {
  cm.removeChannelFromSsid(channel, ssid);
  const allSsidHandlersForChannel = cm.getHandlersBySsidByChannel(
    ssid,
    channel
  );

  allSsidHandlersForChannel?.forEach((handler) => {
    cm.removeHandlerFromChannel(channel, ssid, handler);
  });
}

sub.on("pmessage", (_pattern, channel, message) => {
  const c = stripPrefixFromChannel(redisKeyPrefix, channel);
  if (c === "subscribe") {
    const { ssid, channel } = JSON.parse(message);
    subscribeSsidToChannel(ssid, channel);
  } else if (c === "unsubscribe") {
    const { ssid, channel } = JSON.parse(message);
    unsubscribeSsidFromChannel(ssid, channel);
  } else {
    mh.processMessage(c, message);
  }
});

type Handler = (message: any) => void;

function handleAbort(
  c: Context,
  stream: SSEStreamingApi,
  abortHandler: () => void
) {
  if (typeof Bun !== "undefined") {
    const wrappedHandler = function () {
      abortHandler();
      c.req.raw.signal.removeEventListener("abort", wrappedHandler);
    };
    c.req.raw.signal.addEventListener("abort", wrappedHandler);
  } else {
    stream.onAbort(abortHandler);
  }
}

async function handleSSE(c: Context, stream: SSEStreamingApi) {
  const ssid = getCookie(c, "ssid");
  const s = new ReadableStream({
    start(controller) {
      const handler = (message: any) => {
        controller.enqueue(message);
      };

      handleAbort(c, stream, () => {
        cm.removeHandlerFromAllChannels(ssid!, handler);
        cm.removeHandlerFromSsid(ssid!, handler);
        controller.close();
        stream.close();
      });

      // c.set("caca", "a");

      const existingChannelsForSsid = cm.getChannelsBySsid(ssid!);

      existingChannelsForSsid?.forEach((channel: string) => {
        cm.addHandlerToChannel(channel, ssid!, handler);
      });

      cm.addHandlerToSsid(ssid!, handler);

      // default channels (might already be associated with the ssid, shouldnt cause an issue since we are using a set)
      cm.addHandlerToChannel(`message-user:${ssid}`, ssid!, handler);
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

app.get("/subscribe/:channel", async (c) => {
  const ssid = getCookie(c, "ssid");
  const channel = c.req.param("channel");

  await pub.publish(
    `${redisKeyPrefix}subscribe`,
    JSON.stringify({ ssid, channel })
  );

  return c.json({ ok: true });
});

app.get("/unsubscribe/:channel", async (c) => {
  const ssid = getCookie(c, "ssid");
  const channel = c.req.param("channel");

  await pub.publish(
    `${redisKeyPrefix}unsubscribe`,
    JSON.stringify({ ssid, channel })
  );

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
