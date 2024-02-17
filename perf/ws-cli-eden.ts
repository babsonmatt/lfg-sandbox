import { edenFetch } from "@elysiajs/eden";
import type { App } from "./ws";

const fetch = edenFetch<App>("http://localhost:8080");

// response type: 'Hi Elysia'
const pong = await fetch("/ws", {
  method: "SUBSCRIBE",
});

console.log('PONG', pong)




// // response type: 1895
// const id = await fetch("/id/:id", {
//   params: {
//     id: "1895",
//   },
// });

// response type: { id: 1895, name: 'Skadi' }
// const nendoroid = await fetch("/mirror", {
//   method: "POST",
//   body: {
//     id: 1895,
//     name: "Skadi",
//   },
// });
