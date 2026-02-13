import { oc } from "@orpc/contract";
import { z } from "zod";

const output = z.object({
  allowed: z.boolean(),
  retryAfterMs: z.number().optional(),
})

const call = oc
  .input(z.object({
    key: z.string(),
    maxRequests: z.number(),
    windowSeconds: z.number(),
  }))
  .output(output)

export default {
  call
}