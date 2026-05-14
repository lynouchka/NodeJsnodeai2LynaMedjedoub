import type { FastifyInstance } from 'fastify'

const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434'
const MODEL = process.env.OLLAMA_MODEL ?? 'tinyllama'

const chatBodySchema = {
    type: 'object',
    required: ['message'],
    properties: {
        message: { type: 'string', minLength: 1, maxLength: 4096 }
    },
    additionalProperties: false
} as const

interface OllamaMessage {
    role: 'user' | 'assistant' | 'system'
    content: string
}

interface OllamaResponse {
    message: OllamaMessage
}

interface OllamaStreamChunk {
    message?: OllamaMessage
    done: boolean
}

export async function chatRoute(app: FastifyInstance): Promise<void> {
    app.post('/chat', {
        schema: {
            body: chatBodySchema
        }
    }, async (request, reply) => {
        const { message } = request.body as { message: string }

        const res = await fetch(`${OLLAMA_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: MODEL,
                messages: [{ role: 'user', content: message }],
                stream: false
            })
        })

        if (!res.ok) {
            const text = await res.text()
            //request.log.error({ err: { status: res.status, body: text } }, 'Ollama error')
            request.log.error(`Ollama error: status=${res.status} body=${text}`)
            return reply.status(502).send({ error: 'Ollama request failed' })
        }

        const data = await res.json() as OllamaResponse
        return { response: data.message.content }
    })

    app.post('/chat/stream', {
        schema: { body: chatBodySchema }
    }, async (request, reply) => {
        const { message } = request.body as { message: string }
        const controller = new AbortController()

        const res = await fetch(`${OLLAMA_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
                model: MODEL,
                messages: [{ role: 'user', content: message }],
                stream: true
            })
        })

        if (!res.ok) {
            const text = await res.text()
            //request.log.error({ err: { status: res.status, body: text } }, 'Ollama error')
            request.log.error(`Ollama error: status=${res.status} body=${text}`)
            return reply.status(502).send({ error: 'Ollama request failed' })
        }

        request.socket?.once('close', () => {
            request.log.info('Client disconnected — aborting Ollama stream')
            controller.abort()
        })

        reply.raw.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'
        })

        const sendEvent = (payload: object): void => {
            reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`)
        }

        try {
            for await (const chunk of res.body as AsyncIterable<Uint8Array>) {
                const lines = Buffer.from(chunk).toString('utf8').split('\n').filter(Boolean)
                for (const line of lines) {
                    const parsed = JSON.parse(line) as OllamaStreamChunk
                    if (parsed.message?.content) {
                        sendEvent({ type: 'token', value: parsed.message.content })
                    }
                    if (parsed.done) {
                        sendEvent({ type: 'done' })
                    }
                }
            }
        } catch (err) {
            if (err instanceof Error && err.name !== 'AbortError') {
                //request.log.error(err, 'Streaming error')
                request.log.error(`Streaming error: ${err.message}`)
                sendEvent({ type: 'error', message: err.message })
            }
        } finally {
            reply.raw.end()
        }
    })
}