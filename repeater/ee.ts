import { EventEmitter } from "events";

EventEmitter.defaultMaxListeners = 1000000;

const ee = new EventEmitter();
ee.setMaxListeners(1000000);

type Handler = (message: any) => void;

const handlers: Handler[] = [];

function go(id: number) {
  const handler = (message: any) => {
    console.log("message", id);
  };
  ee.on("foo", handler);
}

async function go2(id: number) {
  const s = new ReadableStream({
    start(controller) {
      console.log("start!!");
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
  }
}

console.time("add");
for (let i = 0; i < 10000; i++) {
  go2(i);
}
console.timeEnd("add");

console.time("send");
ee.emit("foo", "bar");
console.timeEnd("send");

console.time("send2");
ee.emit("foo", "bar");
console.timeEnd("send2");

console.time("send3");
ee.emit("foo", "bar");
console.timeEnd("send3");

// setInterval(() => {
//   ee.emit("foo", "bar");
// }, 100);

// console.time("remove");
// handlers.forEach((handler) => {
//   ee.off("foo", handler);
// });
// console.timeEnd("remove");
