import { Elysia } from "elysia";
import { Stream } from "@elysiajs/stream";
import { cors } from "@elysiajs/cors";
import Redis from "ioredis";
import crypto from "crypto";

const redis = new Redis();
const sub = new Redis();
const pub = new Redis();

setInterval(() => {
  pub.publish("test", "hello world");
  pub.publish("cat", "hello cat");

  console.log("listener count", sub.listenerCount("message"));
}, 1000);

// sub.subscribe("test", (err, count) => {
//   if (err) {
//     console.log(err);
//   }
//   console.log("subscribed to " + count + " channel(s)");
// });

// sub.on("message", (channel, message) => {
//   console.log(1, channel, message);
// });

// const callbackA = (channel, message) => {
//   console.log(2, channel, message);
// }

// sub.on("message", callbackA);

// const listener = sub.on("message", (channel, message) => {
//   console.log(3, channel, message);
// });

// setTimeout(() => {
//   // sub.removeAllListeners("message");
//   // sub.removeListener()
//   sub.removeListener("message", callbackA);
// }, 3000);

const subscriptions = new Map<string, Set<string>>();

new Elysia()
  .use(cors())
  .onBeforeHandle(({ cookie: { ssid } }) => {
    console.log("before");
    if (!ssid.value) {
      ssid.path = "/";
      ssid.value = crypto.randomUUID();
    }
  })
  .onAfterHandle(({ cookie: { ssid } }) => {
    console.log("after");
  })
  .get("/subscribe/:channel", ({ params: { channel }, cookie: { ssid } }) => {
    sub.subscribe(channel, (err, count) => {
      if (err) {
        console.log(err);
      }
      console.log("subscribed to " + count + " channel(s)");
    });

    if (!subscriptions.get(channel)) {
      subscriptions.set(channel, new Set());
    }
    subscriptions.get(channel)?.add(ssid.value);

    // console.log(subscriptions.get(channel));

    return `${ssid} subscribed to ${channel}!`;
  })
  .get("/unsubscribe/:channel", ({ params: { channel }, cookie: { ssid } }) => {
    const currentSubscriptions = subscriptions.get(channel);
    if (currentSubscriptions) {
      currentSubscriptions.delete(ssid.value);
      subscriptions.set(channel, currentSubscriptions);
    }
  })
  .get("/source", async ({ request, cookie: { ssid } }) => {
    const stream = new Stream((stream) => {
      stream.send(
        `id: ${crypto.randomUUID()}\nevent: comments\ndata: ${JSON.stringify({
          value: "caca1",
        })}\n\n`
      );

      stream.send(
        `id: ${crypto.randomUUID()}\nevent: comments\ndata: ${JSON.stringify({
          value: "caca2",
        })}\n\n`
      );

      stream.send(
        `id: ${crypto.randomUUID()}\nevent: comments\ndata: ${JSON.stringify({
          value: "caca3",
        })}\n\n`
      );

      const handler = (channel, message) => {
        const subscriberIds = subscriptions.get(channel) ?? new Set();

        console.log('message', message)

        if (subscriberIds.has(ssid.value)) {
          // stream.send({
          //   event: "comments",
          //   type: 'message111',
          //   data: {
          //     channel,
          //     message,
          //     ssid: ssid.value,
          //   },
          //   id: crypto.randomUUID(),
          // });

          // stream.send(`id: ${crypto.randomUUID()}\n`);
          // stream.send("event: comments\n");
          // stream.send("data: " + JSON.stringify({ value: "caca" }) + "\n\n");

          stream.send(
            `id: ${crypto.randomUUID()}\nevent: comments\ndata: ${JSON.stringify(
              { value: Date.now() }
            )}\n\n`
          );

          // stream.send({
          //   event: "comments",
          //   type: "message111",
          //   data: {
          //     channel,
          //     message,
          //     ssid: ssid.value,
          //   },
          //   id: crypto.randomUUID(),
          // });
        }
      };

      sub.on("message", handler);

      request.signal.addEventListener("abort", () => {
        sub.removeListener("message", handler);
        console.log("closed");
      });
    });

    // const writableStream = new WritableStream({
    //   close() {
    //     console.log("close");
    //   },
    // });

    // stream.stream.pipeTo(writableStream);

    return stream;
  })

  .listen(8080);
