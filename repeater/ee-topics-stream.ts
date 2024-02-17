// import { heapStats } from "bun:jsc";
// import Redis from "ioredis";
import { EventEmitter } from "events";

EventEmitter.defaultMaxListeners = 500000;

// require("events").EventEmitter.defaultMaxListeners = 0;

// const initialHeapSize = heapStats().heapSize;

// const sub = new Redis();

const ee = new EventEmitter();
ee.setMaxListeners(1000000);

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
  const s = new ReadableStream({
    start(controller) {
      const handler = (message: any) => {
        if (message === "c") {
          ee.off("foo", handler);
          controller.close();
        } else {
          controller.enqueue(message);
        }
      };
      ee.on("foo", handler);
    },
    cancel(reason) {
      console.log("cancel", reason);
    },
  });

  for await (const message of s) {
    // console.log("-->", message, id);
    // break;
    // if (message.userId === id) {
    //   console.log("message.userId === id", message.userId, id);
    // } else {
    //   console.log("message.userId !== id", message.userId, id);
    // }
  }
  // console.log("loop done");
  //   ac.abort();
}

// setTimeout(() => {
//   pubsub.publish("topic", "c");
// }, 2000);

const promises = [];

for (let i = 0; i < 100000; i++) {
  promises.push(go(i));
}

setInterval(() => {
  ee.emit("foo", "bar");
}, 1000);

// setTimeout(() => {
//   console.log('emitting "c"');
//   ee.emit("foo", "c");
//   console.log("count");
//   console.log("count", ee.listenerCount("foo"));
// }, 3000);

// await Promise.all(promises);
console.log("done creating!");

// ee.removeAllListeners();

// setInterval(() => {
//   console.log((heapStats().heapSize - initialHeapSize) / 1024 / 1024, "MB");
// }, 100);

// await Promise.all(promises);

console.log("done!", ee.listenerCount("foo"));

// Bun.gc(true);
// pubsub.close();
// pub.quit();
// sub.quit();
