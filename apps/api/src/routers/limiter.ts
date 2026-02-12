import { redisClient } from "../redis/index.ts";
import { os } from "./base.ts";

const windowSeconds = 10;

const call = os.contract.limiter.call.handler(async ({ input }) => {
  const [allowed] = await redisClient.windowIncrement(
    input.key, // key
    Date.now(), // now
    windowSeconds, // window
    input.maxRequests, // limit
  );

  return { allowed: !!allowed };
});

export default {
  call
};
