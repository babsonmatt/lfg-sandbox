#!lua name=mylib


-- cat my-lib.lua | redis-cli -x FUNCTION LOAD REPLACE
-- redis-stack-server

local function hset(keys, args)
    redis.log(redis.LOG_NOTICE, "rateLimiter called with key: " .. keys[1])

    local key = keys[1] -- Rate limiter key
    local limit = tonumber(args[1]) -- Maximum number of allowed requests
    local windowSize = tonumber(args[2]) -- Window size in seconds
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
end

local function hset2(keys, args)
    redis.log(redis.LOG_NOTICE, "rateLimiter called with key: " .. keys[1])

    local key = keys[1] -- Rate limiter key
    local limit = tonumber(args[1]) -- Maximum number of allowed requests
    local windowSize = tonumber(args[2]) -- Window size in milliseconds
    local currentTime = redis.call('TIME') -- Get current time (in seconds and microseconds)
    currentTime = tonumber(currentTime[1]) * 1000 + tonumber(currentTime[2] / 1000) -- Convert to milliseconds

    -- Remove old requests outside of the current window
    local clearBefore = currentTime - windowSize
    redis.call('ZREMRANGEBYSCORE', key, 0, clearBefore)

    -- Count the number of requests in the current window
    local requestCount = redis.call('ZCARD', key)

    if requestCount < limit then
        -- Under the limit, allow the request
        redis.call('ZADD', key, currentTime, currentTime)
        return {true, 0} -- Returning 0 as no wait time is needed
    else
        -- Over the limit, calculate the wait time
        local oldestRequest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')[2]
        local timeToWait = (oldestRequest + windowSize) - currentTime
        return {false, timeToWait}
    end
end

local function hset3(keys, args)
    redis.log(redis.LOG_NOTICE, "rateLimiter called with key: " .. keys[1])

    local key = keys[1] -- Rate limiter key
    local limit = tonumber(args[1]) -- Maximum number of allowed requests
    local windowSize = tonumber(args[2]) -- Window size in milliseconds
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
        return {true, 0} -- Returning 0 as no wait time is needed
    else
        -- Over the limit, calculate the wait time
        local oldestRequest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')[2]
        local timeToWait = windowSize * 1000 - (currentTime - oldestRequest)
        return {false, timeToWait}
    end
end

-- In this FCALL command:
-- 100 is the maximum number of allowed requests per second.
-- 1 is the window size in seconds for the per-second limit.
-- 36000 is the maximum number of allowed requests per hour.
-- 3600 is the window size in seconds for the per-hour limit.
-- The window sizes (1 second and 3600 seconds or 1 hour) are multiplied by 1000 within the script to convert them to milliseconds, which aligns with the currentTime calculation.
-- FCALL my_hset4 2 rate_limit_per_second_key rate_limit_per_hour_key 100 1 36000 3600
-- FCALL my_hset4 2 rate_limit_per_second_key rate_limit_per_hour_key 1 1 2 4

local function hset4(keys, args)
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
            redis.call('ZADD', key, currentTime, currentTime)
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
end

local function check_rate_limit(keys, args)
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
end

-- rate_limit_per_second_key is the Redis key for the sorted set used for the per-second rate limit.
-- rate_limit_per_hour_key is the Redis key for the sorted set used for the per-hour rate limit.
-- FCALL update_rate_limits 2 rate_limit_per_second_key rate_limit_per_hour_key

local function update_rate_limits(keys, args)
    local keyPerSecond = keys[1] -- Key for per-second limit
    local keyPerHour = keys[2] -- Key for per-hour limit

    local currentTime = redis.call('TIME')
    currentTime = tonumber(currentTime[1]) * 1000 + tonumber(currentTime[2] / 1000)

    -- Add the current request to the rate limiter for per-second limit
    redis.call('ZADD', keyPerSecond, currentTime, currentTime)

    -- Add the current request to the rate limiter for per-hour limit
    redis.call('ZADD', keyPerHour, currentTime, currentTime)

    return true -- Indicate successful update
end

redis.register_function('update_rate_limits', update_rate_limits)

-- FCALL my_hset4 2 rate_limit_per_second_key rate_limit_per_hour_key 1 10
-- local function hset4(keys, args)
--     redis.log(redis.LOG_NOTICE, "RateLimiter called with key: " .. keys[1])

--     -- Keys and limits for per-second and per-hour limits
--     local keyPerSecond = keys[1] -- Key for per-second limit
--     local limitPerSecond = tonumber(args[1]) -- 100 requests per second
--     -- local windowSizePerSecond = 1000 -- 1 second in milliseconds
--     local windowSizePerSecond = 1000 -- 1 second in milliseconds

--     local keyPerHour = keys[2] -- Key for per-hour limit
--     local limitPerHour = tonumber(args[2]) -- 36,000 requests per hour
--     -- local windowSizePerHour = 3600000 -- 1 hour in milliseconds
--     local windowSizePerHour = 5000 -- 1 hour in milliseconds

--     local currentTime = redis.call('TIME')
--     currentTime = tonumber(currentTime[1]) * 1000 + tonumber(currentTime[2] / 1000)

--     -- Function to check rate limit
--     local function checkRateLimit(key, limit, windowSize)
--         local clearBefore = currentTime - windowSize
--         redis.call('ZREMRANGEBYSCORE', key, 0, clearBefore)
--         local requestCount = redis.call('ZCARD', key)

--         if requestCount < limit then
--             redis.call('ZADD', key, currentTime, currentTime)
--             return 0 -- No wait time needed
--         else
--             local oldestRequest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')[2]
--             return windowSize - (currentTime - oldestRequest)
--         end
--     end

--     -- Check both rate limits
--     local waitTimePerSecond = checkRateLimit(keyPerSecond, limitPerSecond, windowSizePerSecond)
--     local waitTimePerHour = checkRateLimit(keyPerHour, limitPerHour, windowSizePerHour)

--     -- Determine the longer wait time
--     local maxWaitTime = math.max(waitTimePerSecond, waitTimePerHour)
--     local isAllowed = maxWaitTime == 0

--     return {isAllowed, maxWaitTime}
-- end

redis.register_function('my_hset', hset)

redis.register_function('my_hset2', hset2)

redis.register_function('my_hset3', hset3)

redis.register_function('my_hset4', hset4)

redis.register_function('check_rate_limit', check_rate_limit)
