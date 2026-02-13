import { localCache } from "../cache/index.ts";
import { redisClient } from "../redis/index.ts";
import { os } from "./base.ts";

const call = os.contract.limiter.call.handler(async ({ input: { key, maxRequests, windowSeconds: window } }) => {
  const retryAfter = (until: Date) => until.getTime() - Date.now();
  // 1 - check local cache
  const cachedLimitedUntil = await localCache.getLimited(key);
  if (cachedLimitedUntil) {
    console.debug('limitation found locally:', key, cachedLimitedUntil);
    return {
      allowed: false,
      retryAfterMs: retryAfter(cachedLimitedUntil)
    };
  }

  // 2 - check if the key is limited
  const limitedUntil = await redisClient.get(`${key}:limited_until`);
  if (limitedUntil) {
    const limitedUntilDate = new Date(Number(limitedUntil));
    localCache.setLimited(key, limitedUntilDate);
    console.debug('limitation found inredis:', key, limitedUntilDate);
    return {
      allowed: false,
      retryAfterMs: retryAfter(limitedUntilDate)
    };
  }

  // 3 - at this point, the key is not limited
  redisClient.windowIncrement(key, Date.now(), window, maxRequests)

  return { allowed: true };
});

export default {
  call
};
