import {
    type SDKMessage,
    type SDKUserMessage,
} from '@anthropic-ai/claude-agent-sdk'

// WebSocket message types
export type WSInputMessage =
    | {
        type: 'user_message'
        data: SDKUserMessage
    }
    | { type: 'interrupt' }

export type WSOutputMessage =
    | { type: 'connected' }
    | { type: 'sdk_message'; data: SDKMessage }
    | { type: 'error'; error: string }
    | { type: 'info'; data: string }
