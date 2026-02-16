import { Redis as RedisInterface } from "ioredis";

// @ts-ignore
const redisClient: OurRedis = new RedisInterface({
    host: process.env.REDIS_HOST ?? "localhost",
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
    password: process.env.REDIS_PASSWORD,
});

const fixedWindowIncrement = `
    redis.log(2, "=============================================")
    -- KEYS[1] = rate limit key
    -- ARGV[1] = current timestamp in seconds (in same units as window size)
    -- ARGV[2] = window size
    -- ARGV[3] = max requests allowed in window
    
    -- parse arguments
    local now = tonumber(ARGV[1])
    local window = tonumber(ARGV[2])
    local limit = tonumber(ARGV[3])
    
    -- define keys
    local key = KEYS[1]
    local countKey = key .. ":count"
    local windowKey = key .. ":window_end"
    
    local windowEnd = now + window
    local count = redis.call("INCR", countKey)
    if count == 1 then
        redis.call("SET", windowKey, windowEnd, "EX", window)
        redis.call("EXPIRE", countKey, window)
    end
    return {count}
`
const windowIncrement = `
    redis.log(2, "=============================================")
    -- KEYS[1] = rate limit key
    -- ARGV[1] = current timestamp in seconds (in same units as window size)
    -- ARGV[2] = window size
    -- ARGV[3] = max requests allowed in window
    
    local key = KEYS[1]
    local now = tonumber(ARGV[1])
    local window = tonumber(ARGV[2])
    local limit = tonumber(ARGV[3])

    -- define keys
    local ccountKey = key .. ":ccount"
    local pcountKey = key .. ":pcount"
    local wstartKey = key .. ":wstart"
    local luntilKey = key .. ":retry_after"
    
    -- read stored values from separate keys in single call
    local values = redis.call("MGET", ccountKey, pcountKey, wstartKey)
    local current = values[1] and tonumber(values[1]) or 0
    local previous = values[2] and tonumber(values[2]) or 0
    local start = values[3] and tonumber(values[3]) or now
    
    -- check if window rolled over
    if now >= start + window then
        redis.log(2, "window rolled over")
        previous = current
        current = 0
        start = now - (now % window)
    end

    -- increment current counter
    current = current + 1

    redis.log(2, "curr:", current, "prev:", previous)
    
    -- compute sliding estimate
    local elapsed = now - start
    local weight = (window - elapsed) / window
    local estimated = current + previous * weight

    local function round2(n)
        return math.floor(n * 100 + 0.5) / 100
    end

    redis.log(2, "estimated:", round2(estimated), "elapsed:", round2(elapsed), "capacity:", limit - estimated)

    -- reject if over limit
    if estimated >= limit then
        -- here we calculate how long the user will be limited for
        -- ratio 1 is the case where there was no previous request count
        local ratio = 1
        if previous ~= 0 then
            -- how we calculate:
            -- find ratio such that (previous * (1 - ratio)) + current = limit
            ratio = 1 - ((limit - current) / previous)
            ratio = math.min(1, ratio)
        end
        
        redis.log(2, "ratio:", round2(ratio))

        local ratioUntil = ratio * window  
        local limitedUntil = start + ratioUntil
        local ttl = math.ceil(limitedUntil - now)
        redis.log(2, "'" .. key .. "' will be limited until", limitedUntil, "for", ttl, "seconds")

        -- set the limitedUntil timestamp in seconds with TTL
        limitedUntil = limitedUntil * 1000
        redis.call("SET", luntilKey, limitedUntil, "EX", ttl)

        return {0, limitedUntil}
    end
    
    -- store back to Redis as separate keys with TTL in single operation
    local ttl = math.ceil(window * 2)
    redis.call("SET", ccountKey, current, "EX", ttl)
    redis.call("SET", pcountKey, previous, "EX", ttl)
    redis.call("SET", wstartKey, start, "EX", ttl)
    
    return {1}
`

redisClient.defineCommand("windowIncrement", {
    numberOfKeys: 1,
    lua: windowIncrement,
});

redisClient.defineCommand("fixedWindowIncrement", {
    numberOfKeys: 1,
    lua: fixedWindowIncrement,
});

export interface OurRedis extends RedisInterface {
    windowIncrement(key: string, now: number, window: number, limit: number): Promise<[number, number | null]>; // Returns [limited (0/1), limitedUntil (timestamp in seconds)]
    fixedWindowIncrement(key: string, now: number, window: number, limit: number): Promise<number>;
}

export {
    redisClient
};
