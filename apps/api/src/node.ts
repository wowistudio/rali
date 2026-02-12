import { OpenAPIHandler } from '@orpc/openapi/node';
import { onError } from '@orpc/server';
import { CORSPlugin } from '@orpc/server/plugins';
import { createServer } from 'node:http';
import { appRouter } from "./routers/index.ts";

const handler = new OpenAPIHandler(appRouter, {
    plugins: [new CORSPlugin()],
    interceptors: [
        onError((error) => {
            console.error(error)
        }),
    ],
})

const server = createServer(async (req, res) => {
    const result = await handler.handle(req, res, {
        context: { headers: req.headers }
    })

    if (!result.matched) {
        res.statusCode = 404
        res.end('No procedure matched')
    }
})

server.listen(
    4000,
    '127.0.0.1',
    () => console.log('Listening on 127.0.0.1:4000')
)