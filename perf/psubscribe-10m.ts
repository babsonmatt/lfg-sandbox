import { Elysia } from "elysia";
import { Stream } from "@elysiajs/stream";
import { cors } from "@elysiajs/cors";
import Redis from "ioredis";
import crypto from "crypto";
import { heapStats } from "bun:jsc";

// const redis = new Redis();
const sub = new Redis();
const pub = new Redis();

const subscribeCount = 10000000;

sub.setMaxListeners(0);

setInterval(() => {
  const i = Math.floor(Math.random() * subscribeCount);
  const channel = `test-${i}`;
  pub.publish(channel, "hello world");
  // console.log("publishing to", channel);

  // console.log(heapStats().heapSize);
}, 10);

// setInterval(() => {
//   for (let i = 0; i < subscribeCount; i++) {
//     pub.publish(`test-${i}`, "hello world");
//   }

//   //   console.log("listener count", sub.listenerCount("message"));
//   console.log(heapStats().heapSize);
// }, 1000);

sub.psubscribe("test-*", (err, count) => {
  if (err) {
    console.log(err);
  }
  console.log("subscribed to " + count + " channel(s)");
});

// sub.on("pmessage", (channel, message) => {
//   // console.log(`${channel}: ${message}`);
// });

for (let i = 0; i < subscribeCount; i++) {
  sub.on("pmessage", (channel, message) => {
    // console.log(`${channel}: ${message}`);
  });
}
