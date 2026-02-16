import { LimiterHandler } from "./base.ts";

class FixedWindowHandler extends LimiterHandler {
    async increment(key: string, now: number, window: number, limit: number): Promise<void> {
        this.redis.fixedWindowIncrement(key, now, window, limit)
    }
}

export { FixedWindowHandler };
