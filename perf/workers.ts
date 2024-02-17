const workerURL = new URL("worker.ts", import.meta.url).href;
const worker = new Worker(workerURL);

worker.postMessage("hello");
worker.onmessage = (event) => {
  console.log(event.data);
};

const worker2 = new Worker(workerURL);
worker2.postMessage("hello");
worker2.onmessage = (event) => {
  console.log(event.data);
};

const worker3 = new Worker(workerURL);
worker3.postMessage("hello");
worker3.onmessage = (event) => {
  console.log(event.data);
};
