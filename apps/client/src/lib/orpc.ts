import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import type { AppRouter } from "@repo/api/routers";

type ORPCClient = RouterClient<AppRouter>;

const makeClient = (): ORPCClient => {
    const url = "http://localhost:4000/rpc";

    const link = new RPCLink({
        url,
    });

    return createORPCClient(link) as ORPCClient;
};

export const orpcClient = makeClient();

