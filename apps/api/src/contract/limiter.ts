import { oc } from "@orpc/contract";
import { z } from "zod";

const output = z.object({
  allowed: z.boolean(),
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