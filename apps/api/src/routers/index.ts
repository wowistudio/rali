import type { InferRouterOutputs } from "@orpc/server";
import limiter from "./limiter.ts";

export const appRouter = {
  limiter,
}

export type AppRouter = typeof appRouter;
export type RouterSchema = InferRouterOutputs<AppRouter>;