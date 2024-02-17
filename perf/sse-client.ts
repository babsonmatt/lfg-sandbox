import EventSource from "eventsource";

require("events").EventEmitter.defaultMaxListeners = 10000;

const file = Bun.file("./log.txt");
const writer = file.writer();

let count = 0;

for (let i = 0; i < 500; i++) {
  //   const es = new EventSource("https://lfg.local/api/source");
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
