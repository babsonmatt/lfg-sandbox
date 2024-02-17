const streams: Map<ReadableStreamController<any>, number> = new Map();

const streamCount = 50000;

async function go(id: number) {
  const s = new ReadableStream({
    start(controller) {
      streams.set(controller, id);
    },
  });

  for await (const message of s) {
    // console.log('msg', id, message)
  }
}

console.time("add");
for (let i = 0; i < streamCount; i++) {
  go(i);
}
console.timeEnd("add");

console.time("send");
streams.forEach((_, stream) => {
  stream.enqueue("bar");
});
console.timeEnd("send");

console.time("send 100");
for (let i = 0; i < 100; i++) {
  streams.forEach((_, stream) => {
    stream.enqueue("bar");
  });
}
console.timeEnd("send 100");

console.time("remove");
streams.forEach((_, stream) => {
  stream.close();
  streams.delete(stream);
});
console.timeEnd("remove");

// console.time("removeAll");
// handlers.clear();
// console.timeEnd("removeAll");

console.log(streams.size);

await Bun.sleep(10000);
console.log("bye");
