import { oc } from "@orpc/contract";
import { z } from "zod";

export const limiterResponse = z.object({
  allowed: z.boolean(),
  retryAfter: z.number().optional(),
})

export const limiterInput = z.object({
  key: z.string(),
  limit: z.number(),
  window: z.number(),
  strategy: z.enum(['sliding', 'fixed'])
})

const call = oc
  .input(limiterInput)
  .output(limiterResponse)

export default {
  call,
}