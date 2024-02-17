local key = KEYS[1]                  -- Rate limiter key
local limit = tonumber(ARGV[1])      -- Maximum number of allowed requests
local windowSize = tonumber(ARGV[2]) -- Window size in seconds
local currentTime = redis.call('TIME') -- Get current time (in seconds and microseconds)
currentTime = tonumber(currentTime[1]) * 1000 + tonumber(currentTime[2] / 1000) -- Convert to milliseconds

-- Remove old requests outside of the current window
local clearBefore = currentTime - windowSize * 1000
redis.call('ZREMRANGEBYSCORE', key, 0, clearBefore)

-- Count the number of requests in the current window
local requestCount = redis.call('ZCARD', key)

if requestCount < limit then
    -- Under the limit, allow the request
    redis.call('ZADD', key, currentTime, currentTime)
    return true
else
    -- Over the limit, reject the request
    return false
end