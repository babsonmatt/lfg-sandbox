import { Elysia } from "elysia";
import { Stream } from "@elysiajs/stream";
import { cors } from "@elysiajs/cors";
import Redis from "ioredis";
import crypto from "crypto";
import { heapStats } from "bun:jsc";

const redis = new Redis();
const sub = new Redis();
const pub = new Redis();

const subscribeCount = 100000;

setInterval(() => {
  for (let i = 0; i < subscribeCount; i++) {
    pub.publish(`test-${i}`, "hello world");
  }

  //   console.log("listener count", sub.listenerCount("message"));
  console.log(heapStats().heapSize);
}, 1000);

for (let i = 0; i < subscribeCount; i++) {
  sub.subscribe(`test-${i}`, (err, count) => {
    if (err) {
      console.log(err);
    }
    // console.log("subscribed to " + count + " channel(s)");
  });
}

console.log("done");

sub.on("message", (channel, message) => {
  //   console.log(channel, message);
});
