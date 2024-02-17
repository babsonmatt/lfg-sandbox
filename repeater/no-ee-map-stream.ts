type Handler = (message: any) => void;
const handlers: Map<Handler, number> = new Map();

const handlerCount = 50000;

async function go(id: number) {
  const s = new ReadableStream({
    start(controller) {
      const handler = (message: any) => {
        if (message === "c") {
          controller.close();
        } else {
          controller.enqueue(message);
        }
      };
      handlers.set(handler, id);
    },
  });
  for await (const message of s) {
    // console.log('msg', id, message)
  }
}

console.time("add");
for (let i = 0; i < handlerCount; i++) {
  go(i);
}
console.timeEnd("add");

console.time("send");
handlers.forEach((_, handler) => {
  handler("bar");
});
console.timeEnd("send");

console.time("send 100");
for (let i = 0; i < 100; i++) {
  handlers.forEach((_, handler) => {
    handler("bar");
  });
}
console.timeEnd("send 100");

console.time("remove");
handlers.forEach((_, handler) => {
  handlers.delete(handler);
});
console.timeEnd("remove");

// console.time("removeAll");
// handlers.clear();
// console.timeEnd("removeAll");

console.log(handlers.size);

await Bun.sleep(10000);
console.log("bye");
