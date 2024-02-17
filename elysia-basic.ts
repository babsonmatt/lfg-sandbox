import { Elysia } from "elysia";
import { Stream } from "@elysiajs/stream";
import Redis from "ioredis";

const redis = new Redis();
const sub = new Redis();
const pub = new Redis();

setInterval(() => {
  pub.publish("test", "hello world");
}, 500);

new Elysia()
  .get(
    "/source",
    () =>
      new Stream((stream) => {
        sub.subscribe("test", (err, count) => {
          if (err) {
            console.log(err);
          }
          console.log("subscribed to " + count + " channel(s)");
        });

        sub.on("message", (channel, message) => {
          stream.send({ channel, message });
        });

        // const interval = setInterval(() => {
        //   stream.send("hello world");
        // }, 500);

        // setTimeout(() => {
        //   clearInterval(interval);
        //   stream.close();
        // }, 3000);
      })
  )
  .listen(8080);
