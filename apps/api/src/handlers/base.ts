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

    getRetryAfterSeconds = (until: Date | number): number => {
        if (until instanceof Date)
            return until.getTime() - Date.now();
        return (until) - Date.now();
    }

    setLocalRetryAfter(key: string, value: TCacheVal, retryAfter: number) {
        this.#cache.set(key, value, new Date(retryAfter * 1000).getTime());
    }

    getLocalRetryAfter(prefix: string) {
        return this.#cache.get<TCacheVal>(`${prefix}:retry_after`);
    }

    async getRemoteRetryAfter(prefix: string) {
        const value = await this.redis.get(`${prefix}:retry_after`);
        if (!value) return null;
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
            this.setLocalRetryAfter(key, remoteValue, window);
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
