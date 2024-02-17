import { sleep } from "bun";
import Redis, { type Callback, type Result } from "ioredis";

// redis-stack-server

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
const maxRequestsPerSecond = 6;
const windowSizeInSeconds = 2;
const maxRequestsPerHour = 8;
const windowSizeInSecondsForHourLimit = 10;

await redis.del(queueName);
await redis.del(rateLimiterKey);
await redis.del(rateLimiterKey2);

redis.defineCommand("checkRateLimit", {
  numberOfKeys: 2,
  lua: `
    local keys = KEYS
    local args = ARGV

    redis.log(redis.LOG_NOTICE, "RateLimiter called with key: " .. keys[1])

      -- Keys for per-second and per-hour limits
      local keyPerSecond = keys[1]
      local keyPerHour = keys[2]

      -- Limits and window sizes from arguments
      local limitPerSecond = tonumber(args[1]) -- Limit for requests per second
      local windowSizePerSecond = tonumber(args[2]) * 1000 -- Window size in milliseconds for per-second limit

      local limitPerHour = tonumber(args[3]) -- Limit for requests per hour
      local windowSizePerHour = tonumber(args[4]) * 1000 -- Window size in milliseconds for per-hour limit

      local currentTime = redis.call('TIME')
      currentTime = tonumber(currentTime[1]) * 1000 + tonumber(currentTime[2] / 1000)

      -- Function to check rate limit
      local function checkRateLimit(key, limit, windowSize)
          local clearBefore = currentTime - windowSize
          redis.call('ZREMRANGEBYSCORE', key, 0, clearBefore)
          local requestCount = redis.call('ZCARD', key)

          if requestCount < limit then
              -- redis.call('ZADD', key, currentTime, currentTime)
              return 0 -- No wait time needed
          else
              local oldestRequest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')[2]
              return windowSize - (currentTime - oldestRequest)
          end
      end

      -- Check both rate limits
      local waitTimePerSecond = checkRateLimit(keyPerSecond, limitPerSecond, windowSizePerSecond)
      local waitTimePerHour = checkRateLimit(keyPerHour, limitPerHour, windowSizePerHour)

      -- Determine the longer wait time
      local maxWaitTime = math.max(waitTimePerSecond, waitTimePerHour)
      local isAllowed = maxWaitTime == 0

      return {isAllowed, maxWaitTime}
  `,
});

declare module "ioredis" {
  interface RedisCommander<Context> {
    checkRateLimit(
      key1: string,
      key2: string,
      argv1: number,
      argv2: number,
      argv3: number,
      argv4: number
    ): Result<[number, number], Context>;
  }
}

for (let i = 0; i < 100; i++) {
  await redis.lpush(queueName, "test" + i, i);
}

while (1) {
  // const [isAllowed, timeToWait] = (await redis.fcall(
  //   "check_rate_limit",
  //   2,
  //   rateLimiterKey,
  //   rateLimiterKey2,
  //   maxRequestsPerSecond,
  //   windowSizeInSeconds,
  //   maxRequestsPerHour,
  //   windowSizeInSecondsForHourLimit
  // )) as [number, number];

  const [isAllowed, timeToWait] = await redis.checkRateLimit(
    rateLimiterKey,
    rateLimiterKey2,
    maxRequestsPerSecond,
    windowSizeInSeconds,
    maxRequestsPerHour,
    windowSizeInSecondsForHourLimit
  );

  console.log(isAllowed, timeToWait);

  if (!isAllowed) {
    console.log("Rate limit exceeded, sleeping for", timeToWait, "seconds");
    await sleep(timeToWait);
  } else {
    console.log("OK... getting job");
    const data = await redis.brpop(queueName, 3);
    console.log("job result:", data);

    await redis.fcall("update_rate_limits", 2, rateLimiterKey, rateLimiterKey2);
  }
}
