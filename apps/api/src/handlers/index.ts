import { localCache } from "../cache/index.ts";
import { redisClient } from "../redis/index.ts";
import { LimiterHandler } from "./base.ts";
import { FixedWindowHandler } from "./fixedWindow.ts";
import { SlidingWindowHandler } from "./slidingWindow.ts";

const handlers: Record<"sliding" | "fixed", LimiterHandler> = {
    sliding: new SlidingWindowHandler(localCache, redisClient),
    fixed: new FixedWindowHandler(localCache, redisClient),
}

export { handlers };
