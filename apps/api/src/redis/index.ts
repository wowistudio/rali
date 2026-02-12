import { Redis as RedisInterface } from "ioredis";

// @ts-ignore
const redisClient: OurRedis = new RedisInterface({
    host: process.env.REDIS_HOST ?? "localhost",
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
    password: process.env.REDIS_PASSWORD,
});

const windowIncrement = `
    -- KEYS[1] = rate limit key
    -- ARGV[1] = current timestamp (in same units as window size)
    -- ARGV[2] = window size
    -- ARGV[3] = max requests allowed in window
    
    local key = KEYS[1]
    local now = tonumber(ARGV[1]) / 1000
    local window = tonumber(ARGV[2])
    local limit = tonumber(ARGV[3])
    
    -- read stored values from separate keys
    local current_str = redis.call("GET", key .. ":current_count")
    local previous_str = redis.call("GET", key .. ":previous_count")
    local start_str = redis.call("GET", key .. ":window_start")
    
    local current = current_str and tonumber(current_str) or 0
    local previous = previous_str and tonumber(previous_str) or 0
    local start = start_str and tonumber(start_str) or now
    
    -- check if window rolled over
    if now >= start + window then
        previous = current
        current = 0
        start = now - (now % window)
    end
    
    -- compute sliding estimate
    local elapsed = now - start
    local weight = (window - elapsed) / window
    local estimated = current + previous * weight
    
    
    -- reject if over limit
    if estimated >= limit then
    return {0, estimated}
    end
    
    -- increment current counter
    current = current + 1
    
    -- store back to Redis as separate keys
    redis.call("SET", key .. ":current_count", current)
    redis.call("SET", key .. ":previous_count", previous)
    redis.call("SET", key .. ":window_start", start)
    
    -- set TTL so idle keys disappear
    local ttl = math.ceil(window * 2)
    redis.call("EXPIRE", key .. ":current_count", ttl)
    redis.call("EXPIRE", key .. ":previous_count", ttl)
    redis.call("EXPIRE", key .. ":window_start", ttl)
    
    return {1}
    `

redisClient.defineCommand("windowIncrement", {
    numberOfKeys: 1,
    lua: windowIncrement,
});

export interface OurRedis extends RedisInterface {
    windowIncrement(key: string, now: number, window: number, limit: number): Promise<[number]>; // Returns [limited (0/1)]
}

export {
    redisClient
};
