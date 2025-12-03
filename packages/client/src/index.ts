import { SERVER_PORT } from './const'
import type {
    WSInputMessage,
    WSOutputMessage,
} from './types'

export class ClaudeAgentClient {
    private ws?: WebSocket
    private messageHandlers: ((message: WSOutputMessage) => void)[] = []

    async start() {
        const configUrl = `http://localhost:${SERVER_PORT}/config`
        const wsUrl = `ws://localhost:${SERVER_PORT}/ws`

        const anthropicApiKey = process.env.ANTHROPIC_API_KEY

        const configResponse = await fetch(configUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                anthropicApiKey
            }),
        })

        if (!configResponse.ok) {
            const error = await configResponse.text()
            throw new Error(`Failed to configure server: ${error}`)
        }

        console.log('🔌 Connecting to WebSocket...')

        return new Promise<void>((resolve, reject) => {
            this.ws = new WebSocket(wsUrl)

            this.ws.onopen = () => {
                console.log('✅ Connected to Claude Agent SDK')
                resolve()
            }

            this.ws.onmessage = event => {
                try {
                    const message = JSON.parse(event.data.toString()) as WSOutputMessage
                    this.handleMessage(message)
                } catch (error) {
                    console.error('Failed to parse message:', error)
                }
            }

            this.ws.onerror = error => {
                console.error('WebSocket error:', error)
                reject(error)
            }

            this.ws.onclose = () => {
                console.log('👋 Disconnected')
            }
        })
    }

    private handleMessage(message: WSOutputMessage) {
        console.log('📨 Received message:', JSON.stringify(message, null, 2))
        this.messageHandlers.forEach(handler => handler(message))
    }

    onMessage(handler: (message: WSOutputMessage) => void) {
        this.messageHandlers.push(handler)
        return () => {
            this.messageHandlers = this.messageHandlers.filter(h => h !== handler)
        }
    }

    send(message: WSInputMessage) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket is not connected')
        }
        this.ws.send(JSON.stringify(message))
    }

    async stop() {
        if (this.ws) {
            this.ws.close()
        }
    }

}