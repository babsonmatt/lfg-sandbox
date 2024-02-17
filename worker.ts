import { sleep } from "bun";
import Redis from "ioredis";

const redis = new Redis();

const queueName = "test";
const rateLimiter = `${queueName}:ratelimiter`;

while (1) {
  const [ok, timeToWait] = (await redis.fcall(
    "my_hset3",
    1,
    rateLimiter,
    2,
    3
  )) as [number, number];

  if (!ok) {
    console.log("Rate limit exceeded");
    await sleep(timeToWait);
  } else {
    console.log("OK... getting job");
    const data = await redis.brpop(queueName, 3);
    console.log(data);
  }
}
