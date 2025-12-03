# Claude Agent SDK WebSocket Server

A WebSocket server that wraps the Claude Agent SDK, allowing real-time bidirectional communication with Claude through WebSockets. 

## Overview

### 1. Setup Environment

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Add your API keys:

```bash
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
```

Install dependencies:

```bash
bun install
```

### 2. Run Server

```bash
bun run start:server
```
Starts the server locally on `http://localhost:3000`. Use this for local development and testing.

### 3. Run Client

```bash
bun run test:client
```
This runs `packages/client/example-client.ts` connected to `localhost:3000`


## Modifying the Server

If you want to customize the server behavior:

### 1. Edit Server Code

The server code is in `packages/server/`:

- `index.ts` - Main server and WebSocket handling
- `message-handler.ts` - Message processing logic
- `const.ts` - Configuration constants

**Example:**

```bash
curl -X POST http://localhost:3000/config \
  -H "Content-Type: application/json" \
  -d '{
    "systemPrompt": "You are a helpful assistant.",
    "allowedTools": ["read_file", "write_file"],
    "anthropicApiKey": "sk-ant-...",
    "model": "claude-3-5-sonnet-20241022",
    "agents": {
      "myAgent": {
        "name": "My Custom Agent",
        "description": "A custom agent"
      }
    }
  }'
```

**Response:**

```json
{
  "success": true,
  "config": {
    "systemPrompt": "You are a helpful assistant.",
    "allowedTools": ["read_file", "write_file"],
    "agents": { ... }
  }
}
```

#### GET /config

Get the current configuration:

```bash
curl http://localhost:3000/config
```

**Response:**

```json
{
  "config": {
    "systemPrompt": "You are a helpful assistant.",
    "allowedTools": ["read_file", "write_file"]
  }
}
```

### WebSocket API

#### Connecting

Connect to the WebSocket endpoint:

```javascript
const ws = new WebSocket('ws://localhost:3000/ws')
```

**Note:** The server only accepts **one active connection at a time**. If another client is already connected, new connection attempts will be rejected with an error message.

#### Message Format

**Sending Messages (Client → Server)**

```typescript
type WSInputMessage =
  | {
      type: 'user_message'
      data: SDKUserMessage
    }
  | {
      type: 'interrupt'
    }
```

**User Message:**

Send a wrapped `SDKUserMessage`:

```json
{
  "type": "user_message",
  "data": {
    "type": "user",
    "session_id": "your-session-id",
    "parent_tool_use_id": null,
    "message": {
      "role": "user",
      "content": "Hello, Claude!"
    }
  }
}
```

**Structure:**

- `type`: Must be `"user_message"`
- `data`: An `SDKUserMessage` object containing:
  - `type`: Must be `"user"`
  - `session_id`: Your session identifier (string)
  - `message`: An object with `role` and `content`
    - `role`: Must be `"user"`
    - `content`: The message content (string)
  - `parent_tool_use_id`: Optional, for tool use responses
  - `uuid`: Optional, message UUID (auto-generated if not provided)

**Interrupt Message:**

Send an interrupt to stop the current agent operation:

```json
{
  "type": "interrupt"
}
```

**Receiving Messages (Server → Client)**

```typescript
type WSOutputMessage =
  | { type: 'connected' }
  | { type: 'sdk_message'; data: unknown }
  | { type: 'error'; error: string }
```

Connection confirmation:

```json
{
  "type": "connected"
}
```

SDK messages (responses from Claude):

```json
{
  "type": "sdk_message",
  "data": {
    "type": "assistant",
    "session_id": "...",
    "message": {
      /* Claude's response */
    }
  }
}
```

Error messages:

```json
{
  "type": "error",
  "error": "Error description"
}
```

## Architecture

The server is a simple **1-to-1 relay** between a single WebSocket client and the Claude Agent SDK:

1. **Configuration** (optional): Client can POST to `/config` to set agents, allowedTools, and systemPrompt
2. **Client Connects**: A WebSocket connection is established (only one allowed at a time)
3. **Client Sends Message**: Client sends a user message (or interrupt)
4. **Message Queuing**: Server adds messages to the queue and processes them with the SDK
5. **SDK Processing**: The SDK query stream processes messages using the configured options
6. **Response Relay**: SDK responses are immediately sent back to the connected WebSocket client
7. **Cleanup**: When the client disconnects, the server is ready to accept a new connection

**Key Design Principles:**

- **Pre-connection configuration**: Configure query options via `/config` endpoint before connecting
- **Lazy initialization**: Query stream only starts when first WebSocket connection is made
- **Single connection only**: Server rejects additional connection attempts while one is active
- **Simple relay**: Server relays messages between WebSocket and SDK without session management
- **Message queue**: Incoming messages are queued and processed by the SDK stream
- **Interrupt support**: Clients can send interrupt messages to stop ongoing operations
- **Direct routing**: All SDK responses go to the single active WebSocket connection

## Project Structure

The codebase follows a monorepo structure:

```
claude-agent-server/
├── packages/
│   ├── server/           # Main server implementation
│   │   ├── index.ts
│   │   ├── message-handler.ts
│   │   └── ...
│   ├── client/           # Client library and examples
│   │   ├── src/
│   │   └── example-client.ts
├── package.json          # Root package.json (workspaces)
└── README.md
```

## Testing

### Web Test Client

Open `http://localhost:3000/` in your browser to access the built-in test client. You can:

- Send messages to Claude
- See real-time responses
- View the full JSON structure of SDK messages

**API Key Priority:**

- If you set `anthropicApiKey` via the Configuration API (`/config` endpoint), it will override the `ANTHROPIC_API_KEY` environment variable.
- When using the client library, you can pass `anthropicApiKey` in the constructor options.

