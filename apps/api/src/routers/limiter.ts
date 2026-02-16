import { handlers } from "../handlers/index.ts";
import { os } from "./base.ts";

const call = os.contract.limiter.call.handler(async ({ input }) => {
  const { strategy } = input;
  const handler = handlers[strategy];
  return handler.handle(input);
});

export default {
  call,
};
