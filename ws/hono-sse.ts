import { Hono } from "hono";
import { stream, streamText, streamSSE } from "hono/streaming";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";

const app = new Hono(); //.basePath("/api");
app.use(logger());

app.get("/hello", (c) => {
  return c.json({
    message: "Hello Next.js!",
  });
});

app.get("/streamText", (c) => {
  return streamText(c, async (stream) => {
    // Write a text with a new line ('\n').
    await stream.writeln("Hello");
    // Wait 1 second.
    await stream.sleep(1000);
    // Write a text without a new line.
    await stream.write(`Hono!`);
  });
});

let id = 0;

app.get("/sse", async (c) => {
  return streamSSE(c, async (stream) => {
    let isAborted = false;

    c.req.raw.signal.addEventListener("abort", () => {
      console.log("aborted!");
      isAborted = true;
      stream.close();
    });

    // stream.onAbort(() => {
    //   console.log("done!!!");
    //   isAborted = true;
    //   stream.close();
    // });

    for (let i = 0; i < 10; i++) {
      if (isAborted) break;
      const message = `It is ${new Date().toISOString()}`;
      console.log(message);
      const what = await stream.writeSSE({
        data: message,
        event: "time-update",
        id: String(id++),
      });
      console.log("what", what);
      await stream.sleep(1000);
    }
    console.log("we are done");
  });
});

app.get("/what", (c) =>
  streamSSE(c, async (stream) => {
    let isAborted: boolean = false;
    stream.onAbort(() => {
      console.log("abort!!!!");
      isAborted = true;
    });
    while (!isAborted) {
      const now = Date.now();
      console.log("write start", now);
      await stream.writeSSE({ data: String(now) }).finally(() => {
        console.log("write end", now);
      });
      await stream.sleep(1000);
    }
  })
);

export default app;

// serve(app);
