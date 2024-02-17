// import { heapStats } from "bun:jsc";
// import Redis from "ioredis";
import { on, EventEmitter } from "events";

EventEmitter.defaultMaxListeners = 500000;

// require("events").EventEmitter.defaultMaxListeners = 0;

// const initialHeapSize = heapStats().heapSize;

// const sub = new Redis();

const ee = new EventEmitter();
ee.setMaxListeners(500000);

// process.nextTick(() => {
//   ee.emit("foo", "bar");
//   //   ee.emit("foo", 42);
//   //   ee.emit("foo", "bar");
//   //   ee.emit("foo", 42);
//   ee.emit("foo", "c");
// });

// const pub = new Redis();

// sub.setMaxListeners(0);

// sub.psubscribe("*");

// setInterval(() => {
//   pub.publish("topic", Date.now().toString());
//   // console.log("listener count", sub.listenerCount("message"));
// }, 1000);

let id = 0;

// sub.on("pmessage", (pattern, channel, message) => {
//   // console.log("pmessage", pattern, channel, message);
//   pubsub.publish(channel, { channel, message, id: id++, userId: id % 2 });
// });

// pubsub.subscribe("topic").

async function go(id: number) {
  // console.log("starting go", id);
  // const ac = new AbortController();

  // for await (const message of on(ee, "foo", { signal: ac.signal })) {
  for await (const message of on(ee, "foo")) {
    // console.log("-->", message, id);
    if (message[0] === "c") {
      break;
    }

    // break;

    // if (message.userId === id) {
    //   console.log("message.userId === id", message.userId, id);
    // } else {
    //   console.log("message.userId !== id", message.userId, id);
    // }
  }
  //   ac.abort();
}

// setTimeout(() => {
//   pubsub.publish("topic", "c");
// }, 2000);

const promises = [];

for (let i = 0; i < 50000; i++) {
  promises.push(go(i));
}

ee.emit("foo", "bar");
ee.emit("foo", "c");

await Promise.all(promises);
console.log("done creating!");

// ee.removeAllListeners();

// setInterval(() => {
//   console.log((heapStats().heapSize - initialHeapSize) / 1024 / 1024, "MB");
// }, 100);

// await Promise.all(promises);

console.log("done!", ee.listenerCount("foo"));

setTimeout(() => {
  console.log("count", ee.listenerCount("foo"));
}, 3000);

// Bun.gc(true);
// pubsub.close();
// pub.quit();
// sub.quit();
