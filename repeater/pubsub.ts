import type { SSEMessage } from "hono/streaming";
import { Push, Repeater } from "@repeaterjs/repeater";
import { InMemoryPubSub } from "@repeaterjs/pubsub";

// const pubsub = new InMemoryPubSub();
// const messages = (async () => {
//   console.log("called");
//   const messages = [];
//   for await (const message of pubsub.subscribe("topic")) {
//     console.log("saadasdasd", message);
//     messages.push(message);
//     if (message === "c") {
//       break;
//     }
//   }

//   return messages;
// })();

// pubsub.publish("topic", "a");
// pubsub.publish("topic", "b");
// pubsub.publish("topic", "c");
// pubsub.publish("unrelated", "d");

// console.log(await messages);

const pubsub = new InMemoryPubSub();

async function go() {
  console.log("go");
  for await (const message of pubsub.subscribe("topic")) {
    console.log("-->", message);
    if (message === "c") {
      console.log("break!");
      break;
    }
  }
}

const intervalId = setInterval(() => {
  pubsub.publish("topic", new Date());
}, 1000);

setTimeout(() => {
  pubsub.publish("topic", "c");
  clearInterval(intervalId);
}, 5000);

await go();

console.log("done!");
pubsub.close();

// const messages = new Repeater<SSEMessage>(async (push, stop) => {
//   await stop;
//   console.log("ALL DONE!");
// });

// let i = 0;

// for await (const message of messages) {
//   console.log(message);
// }
