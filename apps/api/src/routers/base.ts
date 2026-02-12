import { implement } from "@orpc/server";
import contract from "../contract/index.ts";

const ctr = implement(contract)

export const os = {
    contract: ctr,
}