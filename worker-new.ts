import { sleep } from "bun";
import Redis from "ioredis";

// FCALL my_hset4 2 rate_limit_per_second_key rate_limit_per_hour_key 1 1 2 4
// 100 is the maximum number of allowed requests per second.
// 1 is the window size in seconds for the per-second limit.
// 36000 is the maximum number of allowed requests per hour.
// 3600 is the window size in seconds for the per-hour limit.

const redis = new Redis();

const queueName = "test";
const rateLimiterKey = `${queueName}:ratelimiter`;
const rateLimiterKey2 = `${queueName}:ratelimiter2`;


// 4 requests per second, max 8 requests per 10 seconds
const maxRequestsPerSecond = 4;
const windowSizeInSeconds = 1;
const maxRequestsPerHour = 8;
const windowSizeInSecondsForHourLimit = 10;

for (let i = 0; i < 100; i++) {
  redis.lpush(queueName, "test" + i, i);
}

while (1) {
  const [ok, timeToWait] = (await redis.fcall(
    "my_hset4",
    2,
    rateLimiterKey,
    rateLimiterKey2,
    maxRequestsPerSecond,
    windowSizeInSeconds,
    maxRequestsPerHour,
    windowSizeInSecondsForHourLimit
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
