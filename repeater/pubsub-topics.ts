// import { heapStats } from "bun:jsc";
// import { Repeater } from "@repeaterjs/repeater";
// import { InMemoryPubSub } from "@repeaterjs/pubsub";
import { InMemoryPubSub } from "./ps";
import Redis from "ioredis";
import { EventEmitter } from "events";

EventEmitter.defaultMaxListeners = 200000;

// const initialHeapSize = heapStats().heapSize;

const sub = new Redis();
const pub = new Redis();
const pubsub = new InMemoryPubSub();

// sub.setMaxListeners(0);

sub.psubscribe("*");

// setInterval(() => {
//   pub.publish("topic", Date.now().toString());
//   // console.log("listener count", sub.listenerCount("message"));
// }, 100);

let id = 0;

sub.on("pmessage", (pattern, channel, message) => {
  // console.log("pmessage", pattern, channel, message);
  pubsub.publish(channel, { channel, message, id: id++, userId: id % 2 });
});

// pubsub.subscribe("topic").

async function go(id: number) {
  // console.log("starting go", id);
  const r = pubsub.subscribe("topic");
  // setTimeout(() => {
  //   console.log("what is this");
  //   r.return();
  // }, 2000);
  for await (const message of r) {
    // console.log("-->", message, id);
    if (message === "c") {
      // console.log("breaking!", id);
      // pubsub.unpublish("topic");
      // pubsub.unpublish("message");
      // pubsub.close();
      break;
    }

    // if (message.userId === id) {
    //   console.log("message.userId === id", message.userId, id);
    // } else {
    //   console.log("message.userId !== id", message.userId, id);
    // }
  }
  // console.log("out of loop", id);
}

setTimeout(() => {
  console.log("publishing");
  pubsub.publish("topic", "c");
}, 5000);

const promises = [];

for (let i = 0; i < 100000; i++) {
  promises.push(go(i));
}

console.log("done creating!");

// setInterval(() => {
//   console.log((heapStats().heapSize - initialHeapSize) / 1024 / 1024, "MB");
// }, 1000);

// setInterval(() => {
//   console.log(process.memoryUsage());
// }, 1000);

await Promise.all(promises);

pubsub.close();

console.log("done!", pubsub.sizePublishers("topic"));
// console.log((heapStats().heapSize - initialHeapSize) / 1024 / 1024, "MB");

Bun.gc(true);
// pub.quit();
// sub.quit();
