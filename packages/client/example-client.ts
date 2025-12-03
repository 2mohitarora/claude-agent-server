/**
 * Example WebSocket client for the Claude Agent SDK server
 *
 * Usage: bun example-client.ts
 */

import { ClaudeAgentClient } from './src/index'

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY environment variable is required')
  process.exit(1)
}

async function main() {
  const client = new ClaudeAgentClient()

  try {
    await client.start()

    const commands = [
      {
        type: 'user_message',
        data: {
          type: 'user',
          session_id: 'example-session',
          parent_tool_use_id: null,
          message: {
            role: 'user',
            content:
              'Hello, how are you?',
          },
        },
      },
    ] as const

    // Cleanup function
    const stopAndExit = async () => {
      console.log('\n✅ Received result message, stopping...')
      process.exit(0)
    }

    // Register message handler
    client.onMessage(async message => {
      switch (message.type) {
        case 'connected':
          console.log('🔗 Connection confirmed')
          break

        case 'error':
          console.error('❌ Error:', message.error)
          break

        case 'sdk_message':
          console.log('🤖 SDK Message:', JSON.stringify(message.data, null, 2))

          // Stop when we receive a "result" type message
          if (message.data.type === 'result') {
            await stopAndExit()
          }
          break

        default:
          console.log('📨 Unknown message type:', (message as any).type)
      }
    })

    // Send commands
    for (const command of commands) {
      console.log(`\n📤 Sending command: ${command.type}`)
      client.send(command)
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

  } catch (error) {
    console.error('❌ Error:', error)
    await client.stop()
    process.exit(1)
  }
}

main()