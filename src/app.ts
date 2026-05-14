import Fastify, { FastifyInstance } from 'fastify'
import { healthRoute } from './routes/health.js'
import { chatRoute } from './routes/chat.js'

export async function buildApp(opts: object = {}): Promise<FastifyInstance> {
    const app = Fastify({
        logger: {
            level: process.env.LOG_LEVEL ?? 'info',
            transport: process.env.NODE_ENV !== 'production'
                ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
                : undefined
        },
        ...opts
    })

    await app.register(healthRoute)
    await app.register(chatRoute)

    return app
}