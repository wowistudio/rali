import { Cacheable } from "cacheable";
import { z } from "zod";
import { limiterInput, limiterResponse } from "../contract/limiter.ts";
import type { OurRedis } from "../redis/index.ts";

type HandlerParams = z.infer<typeof limiterInput>
type HandlerOutput = z.infer<typeof limiterResponse>
type TCacheVal = number

abstract class LimiterHandler {
    readonly #cache: Cacheable;
    readonly redis: OurRedis;

    constructor(cache: Cacheable, redis: OurRedis) {
        this.#cache = cache;
        this.redis = redis;
    }

    localCacheKey(key: string) {
        return `${key}:retry_after`;
    }

    getRetryAfterSeconds = (until: Date | number): number => {
        if (until instanceof Date)
            return until.getTime() - Date.now();
        return (until) - Date.now();
    }

    setLocalRetryAfter(key: string, value: TCacheVal) {
        this.#cache.set(this.localCacheKey(key), value);
    }

    async getLocalRetryAfter(prefix: string) {
        const value = await this.#cache.get<TCacheVal>(this.localCacheKey(prefix));
        if (!value) return null;
        if (value < Date.now()) {
            console.log('local cache expired for ', prefix);
            await this.#cache.delete(this.localCacheKey(prefix));
            return null;
        }
        return value;
    }

    async getRemoteRetryAfter(prefix: string) {
        const value = await this.redis.get(`${prefix}:retry_after`);
        if (!value) return null;
        if (Number(value) < Date.now())
            return null;
        return Number(value);
    }

    abstract increment(key: string, now: number, window: number, limit: number): Promise<void>

    async handle(params: HandlerParams): Promise<HandlerOutput> {
        const { key, limit, window } = params;
        const localValue = await this.getLocalRetryAfter(key);

        if (localValue) {
            console.debug('(local) retry after found for ', key);
            return {
                allowed: false,
                retryAfter: this.getRetryAfterSeconds(localValue)
            };
        }

        const remoteValue = await this.getRemoteRetryAfter(key);
        if (remoteValue) {
            this.setLocalRetryAfter(key, remoteValue);
            console.debug('(redis) retry after found for ', key);
            return {
                allowed: false,
                retryAfter: this.getRetryAfterSeconds(remoteValue)
            };
        }

        this.increment(key, Date.now() / 1000, window, limit)

        return { allowed: true };
    }
}

export { LimiterHandler, type HandlerOutput, type HandlerParams };
