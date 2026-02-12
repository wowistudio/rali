import cors from "@fastify/cors";
import { onError } from '@orpc/server';
import { RPCHandler } from '@orpc/server/fastify';
import { CORSPlugin, RequestHeadersPlugin } from "@orpc/server/plugins";
import Fastify from "fastify";
import { appRouter } from "./routers/index.ts";

const corsPlugin = new CORSPlugin({
  origin: (origin, options) => {
    return origin
  },
  allowMethods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH'],
  credentials: true,
})

const handler = new RPCHandler(appRouter, {
  plugins: [
    corsPlugin,
    new RequestHeadersPlugin(),
  ],
  interceptors: [
    onError((error) => {
      console.log("====== RPC ERROR ======")
      console.error(error)
      console.log("=======================")
    })
  ]
})

const start = async () => {
  const fastify = Fastify({
    maxParamLength: 5000,
    logger: true,
  });

  fastify.addContentTypeParser('*', (request, payload, done) => {
    done(null, undefined)
  })

  try {
    await fastify.register(cors, {
      origin: true,
      credentials: true,
    });

    // Health
    fastify.get("/health", async () => {
      return { status: "ok", timestamp: new Date().toISOString() };
    });

    fastify.all('/rpc/*', async (req, reply) => {
      const { matched } = await handler.handle(req, reply, {
        prefix: '/rpc',
        context: {},
      })

      if (!matched)
        reply.status(404).send('Not found');
    })

    const port = process.env.PORT ? parseInt(process.env.PORT) : 4000;
    const host = process.env.HOST ?? "0.0.0.0";
    await fastify.listen({ port, host });

    console.log(`🚀 Server listening on http://${host}:${port}`);

  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
