import { LimiterHandler } from "./base.ts";

class SlidingWindowHandler extends LimiterHandler {
    async increment(key: string, now: number, window: number, limit: number): Promise<void> {
        console.log("incrementing sliding window", key, now, window, limit)
        this.redis.windowIncrement(key, now, window, limit)
    }
}

export { SlidingWindowHandler };
