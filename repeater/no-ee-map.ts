type Handler = (message: any) => void;
const handlers: Map<Handler, number> = new Map();

console.time("add");
for (let i = 0; i < 1000000; i++) {
  const handler = (message: any) => {
    // console.log("message", i);
  };

  handlers.set(handler, i);
}
console.timeEnd("add");

console.time("send");
handlers.forEach((_, handler) => {
  handler("bar");
});
console.timeEnd("send");

console.time("remove");
handlers.forEach((_, handler) => {
  handlers.delete(handler);
});
console.timeEnd("remove");

// console.time("removeAll");
// handlers.clear();
// console.timeEnd("removeAll");

console.log(handlers.size);
