type Handler = (message: any) => void;
const handlers: Handler[] = [];

console.time("add");
for (let i = 0; i < 200000; i++) {
  const handler = (message: any) => {
    // console.log("message", i);
  };

  handlers.push(handler);
}
console.timeEnd("add");

console.time("send");
for (let i = 0; i < 200000; i++) {
  handlers[i]("bar");
}
console.timeEnd("send");

console.time("remove");
handlers.forEach((handler) => {
  const index = handlers.indexOf(handler);
  handlers.splice(index, 1);
});
console.timeEnd("remove");
