#!js name=lib api_version=1.0

// https://redis.io/docs/interact/programmability/triggers-and-functions/development/
// https://redis.io/docs/interact/programmability/triggers-and-functions/concepts/triggers/user_functions/
// bun run deploy -- -r redis://localhost:6379
// TFCALL lib.test 2 a b

import { redis } from "@redis/gears-api";

redis.registerFunction("test", (client, ...args) => {
  redis.log("Hello from Gears!");
  redis.log(args[1]);
  client.call("SET", "testxyz", "test");
  return "test";
});
