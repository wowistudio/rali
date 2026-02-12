import type { InferContractRouterOutputs } from "@orpc/contract";
import limiter from "./limiter.ts";

const contract = {
  limiter,
}

export type Contract = InferContractRouterOutputs<typeof contract>
export default contract;