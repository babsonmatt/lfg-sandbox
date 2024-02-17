import { heapStats } from "bun:jsc";
import { InMemoryPubSub } from "@repeaterjs/pubsub";

const initialHeapSize = heapStats().heapSize;

async function newUser(id: number) {
  const pubsub = new InMemoryPubSub();

  async function go() {
    // console.log("go");
    for await (const message of pubsub.subscribe("topic")) {
      // console.log("-->", message, id);
      if (message === "c") {
        // console.log("break!", id);
        pubsub.close();
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

  // console.log("done!", id);
}

const promises = [];

for (let i = 0; i < 100000; i++) {
  promises.push(newUser(i));
}

console.log("done creating!");

setInterval(() => {
  console.log((heapStats().heapSize - initialHeapSize) / 1024 / 1024, "MB");
}, 1000);

await Promise.all(promises);

console.log("done!");
