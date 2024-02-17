// prevents TS errors
declare var self: Worker;

import EventSource from "eventsource";

require("events").EventEmitter.defaultMaxListeners = 10000;

const file = Bun.file("./log.txt");
const writer = file.writer();

let count = 0;

function doSSE() {
  for (let i = 0; i < 256; i++) {
    const es = new EventSource("http://localhost:8080/source");

    es.onopen = function (e) {
      console.log("open", i);
    };

    es.onerror = function (e) {
      console.log("error", e);
    };

    es.addEventListener("comments", async function (e) {
      // console.log(`➡️ ${i}`, e.data);
      writer.write(`➡️ ${i} ${e.data}\n`);
      writer.flush();

      // es.close();

      count = count + 1;
      // if (count > 100000) {
      //   writer.end();
      // }
    });
  }

  console.log("✅ Done");
}

self.onmessage = (event: MessageEvent) => {
  console.log(event.data);
  doSSE();
  postMessage("world");
};
