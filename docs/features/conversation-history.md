---
title: Conversation History Management
description: Access and manage conversation session history with in-memory or Redis storage
keywords: conversation history, session management, memory, redis, in-memory, debugging
---

# Conversation History Management

> **Status**: Stable | **Availability**: SDK + CLI

## Overview

**What it does**: Retrieve, inspect, and manage conversation session history stored in-memory or Redis for debugging and session management.

**Why use it**: Access structured conversation data to debug sessions, inspect conversation flow, and manage session lifecycle. Essential for understanding multi-turn conversations.

**Common use cases**:

- Debugging conversation flow and context
- Inspecting what the AI remembers in a session
- Managing session lifecycle (clear old sessions)
- Viewing conversation statistics
- Building custom conversation interfaces

## Quick Start

### SDK Example

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    maxTurnsPerSession: 50, // Keep last 50 turns
    maxSessions: 100,       // Keep 100 sessions max
  },
});

// Have a conversation
await neurolink.generate({
  prompt: "What is machine learning?",
  context: { sessionId: "session-123", userId: "user-456" },
});

// Retrieve the conversation history
const history = await neurolink.getConversationHistory("session-123");

console.log(history);
// [
//   { role: "user", content: "What is machine learning?" },
//   { role: "assistant", content: "Machine learning is..." }
// ]

// Get conversation statistics
const stats = await neurolink.getConversationStats();
console.log(stats); // { totalSessions: 1, totalTurns: 1 }

// Clear a specific session
await neurolink.clearConversationSession("session-123");

// Clear all sessions
await neurolink.clearAllConversations();
```

### CLI Example

```bash
# Start loop mode with conversation memory (in-memory by default)
npx @juspay/neurolink loop --enable-conversation-memory

# Have a conversation
⎔ neurolink » What is machine learning?
[AI response...]

# View conversation history for current session
⎔ neurolink » .memory history <session-id>

# Or use the CLI directly
npx @juspay/neurolink memory history --session-id <SESSION_ID>
```

## Configuration

### Conversation Memory Config

```typescript
interface ConversationMemoryConfig {
  enabled: boolean;                  // Enable conversation memory
  maxSessions?: number;              // Max sessions to keep (default: 50)
  maxTurnsPerSession?: number;       // Max turns per session (default: 50)
  enableSummarization?: boolean;     // Enable auto-summarization
  summarizationThresholdTurns?: number;  // Trigger summarization at N turns
  mem0Enabled?: boolean;             // Enable Mem0 semantic memory
}
```

### Environment Variables

```bash
# Conversation memory settings
export NEUROLINK_MEMORY_ENABLED="true"
export NEUROLINK_MEMORY_MAX_SESSIONS="50"
export NEUROLINK_MEMORY_MAX_TURNS_PER_SESSION="50"
export NEUROLINK_SUMMARIZATION_ENABLED="false"
export NEUROLINK_SUMMARIZATION_THRESHOLD_TURNS="20"
```

### Storage Backends

NeuroLink supports two storage backends for conversation history:

#### In-Memory Storage (Default)

Fast, lightweight storage suitable for development and short-lived sessions.

```typescript
const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    // No additional config needed for in-memory
  },
});
```

#### Redis Storage (Production)

Persistent storage across restarts, suitable for production use.

```typescript
const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    store: "redis", // Enable Redis storage
    redis: {
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      password: process.env.REDIS_PASSWORD,
      db: 0,
    },
  },
});
```

**Redis Environment Variables:**

```bash
export REDIS_URL="redis://localhost:6379"
# or individually:
export REDIS_HOST="localhost"
export REDIS_PORT="6379"
export REDIS_PASSWORD="your-password"  # if needed
```

## How It Works

### Data Flow

1. **Conversation occurs** → User message and AI response stored as a "turn"
2. **Context injection** → Previous messages automatically included in prompts
3. **History retrieval** → SDK method queries storage for session messages
4. **Session management** → Automatic cleanup based on limits (LRU eviction)

### Storage Structure

#### In-Memory Storage

```typescript
// Internal Map structure
sessions: Map<sessionId, SessionMemory>

interface SessionMemory {
  sessionId: string;
  userId?: string;
  messages: ChatMessage[];  // Array of user/assistant messages
  createdAt: number;
  lastActivity: number;
}
```

#### Redis Storage

```
# Redis key patterns
neurolink:conversation:{userId}:{sessionId} → Conversation object (JSON)

# Conversation object structure
{
  id: "uuid",
  title: "Auto-generated title",
  sessionId: "session-123",
  userId: "user-456",
  messages: [
    { role: "user", content: "..." },
    { role: "assistant", content: "..." }
  ],
  createdAt: "ISO timestamp",
  updatedAt: "ISO timestamp"
}
```

### Message Schema

```typescript
interface ChatMessage {
  role: "user" | "assistant" | "system" | "tool_call" | "tool_result";
  content: string;
  id?: string;        // Optional message ID
  timestamp?: string; // Optional timestamp
  tool?: string;      // For tool messages
  args?: Record<string, unknown>;    // For tool_call
  result?: ToolResult; // For tool_result
}
```

## Advanced Usage

### Processing Conversation History

```typescript
// Get history and analyze conversation flow
const history = await neurolink.getConversationHistory("session-123");

// Count turns
const turnCount = history.filter(msg => msg.role !== "system").length / 2;

// Extract user questions
const userQuestions = history
  .filter(msg => msg.role === "user")
  .map(msg => msg.content);

// Find tool usage
const toolCalls = history
  .filter(msg => msg.role === "tool_call")
  .map(msg => ({ tool: msg.tool, args: msg.args }));

console.log({ turnCount, userQuestions, toolCalls });
```

### Custom Export to File

```typescript
import { writeFile } from "fs/promises";

// Export conversation to JSON file
async function exportSessionToFile(sessionId: string, filename: string) {
  const history = await neurolink.getConversationHistory(sessionId);
  const stats = await neurolink.getConversationStats();
  
  const exportData = {
    sessionId,
    exportedAt: new Date().toISOString(),
    messageCount: history.length,
    stats,
    messages: history,
  };
  
  await writeFile(filename, JSON.stringify(exportData, null, 2));
  console.log(`Exported ${history.length} messages to ${filename}`);
}

// Usage
await exportSessionToFile("session-123", "./conversation-123.json");
```

### Session Cleanup Strategy

```typescript
// Implement custom cleanup logic
async function cleanupOldSessions(sessionIds: string[], maxAge: number) {
  for (const sessionId of sessionIds) {
    const history = await neurolink.getConversationHistory(sessionId);
    
    // Check if session is old (custom logic)
    if (history.length > 0) {
      // Clear if needed
      await neurolink.clearConversationSession(sessionId);
      console.log(`Cleared session: ${sessionId}`);
    }
  }
}
```

### Integration with Analytics

```typescript
// Track conversation metrics
async function trackConversationMetrics(sessionId: string) {
  const history = await neurolink.getConversationHistory(sessionId);
  const stats = await neurolink.getConversationStats();
  
  const metrics = {
    sessionId,
    totalMessages: history.length,
    userMessages: history.filter(m => m.role === "user").length,
    assistantMessages: history.filter(m => m.role === "assistant").length,
    toolCalls: history.filter(m => m.role === "tool_call").length,
    averageMessageLength: history.reduce((acc, m) => 
      acc + m.content.length, 0) / history.length,
  };
  
  // Send to your analytics service
  await analytics.track("conversation_completed", metrics);
  return metrics;
}
```

## API Reference

### SDK Methods

#### `getConversationHistory(sessionId: string): Promise<ChatMessage[]>`

Retrieve all messages for a session.

```typescript
const history = await neurolink.getConversationHistory("session-123");
// Returns: [{ role: "user", content: "..." }, { role: "assistant", content: "..." }]
```

#### `getConversationStats(): Promise<ConversationMemoryStats>`

Get memory statistics across all sessions.

```typescript
const stats = await neurolink.getConversationStats();
// Returns: { totalSessions: 10, totalTurns: 45 }
```

#### `clearConversationSession(sessionId: string): Promise<boolean>`

Clear a specific session from memory.

```typescript
const cleared = await neurolink.clearConversationSession("session-123");
// Returns: true if session existed and was cleared
```

#### `clearAllConversations(): Promise<void>`

Clear all conversation sessions from memory.

```typescript
await neurolink.clearAllConversations();
// All sessions cleared
```

### CLI Commands

#### View History

```bash
# View conversation history for a session
npx @juspay/neurolink memory history --session-id <SESSION_ID>

# In loop mode
⎔ neurolink » .memory history <session-id>
```

#### Session Management in Loop Mode

```bash
# Start loop mode with memory enabled
npx @juspay/neurolink loop --enable-conversation-memory

# Inside loop, session ID is auto-generated and displayed
# Use that session ID to view history later
```

See [CONVERSATION-MEMORY.md](../CONVERSATION-MEMORY.md) for complete memory system documentation.

## Troubleshooting

### Problem: "Conversation memory is not enabled"

**Cause**: Memory not configured or initialized
**Solution**:

```typescript
// Ensure memory is enabled in config
const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true, // ← Must be true
  },
});
```

### Problem: History returns empty array

**Cause**: Session ID doesn't exist or no conversation occurred yet
**Solution**:

```typescript
// Check if session exists by getting stats first
const stats = await neurolink.getConversationStats();
console.log(stats); // { totalSessions: N, totalTurns: M }

// Ensure you're using the correct session ID
const history = await neurolink.getConversationHistory("session-123");
if (history.length === 0) {
  console.log("No messages in this session");
}
```

### Problem: Sessions not persisting across restarts

**Cause**: Using in-memory storage without Redis
**Solution**:

```typescript
// Configure Redis for persistent storage
const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    store: "redis", // ← Add Redis storage
    redis: {
      host: "localhost",
      port: 6379,
    },
  },
});
```

**Test Redis connection:**

```bash
# Check if Redis is running
redis-cli ping  # Should return PONG

# Or use Docker
docker run -d -p 6379:6379 redis:latest
```

### Problem: Memory growing too large

**Cause**: No limits configured
**Solution**:

```typescript
// Configure memory limits
const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    maxSessions: 50,              // Limit total sessions
    maxTurnsPerSession: 50,       // Limit messages per session
    enableSummarization: true,    // Auto-summarize long sessions
    summarizationThresholdTurns: 20, // Trigger at 20 turns
  },
});
```

## Best Practices

### 1. Session ID Strategy

Use consistent, meaningful session IDs:

```typescript
// Good: Combine user and conversation context
const sessionId = `user-${userId}-${conversationId}`;
const sessionId = `support-ticket-${ticketId}`;
const sessionId = `chat-${roomId}-${timestamp}`;

// Bad: Random IDs without context
const sessionId = Math.random().toString(); // Hard to track
```

### 2. Memory Management

Configure appropriate limits for your use case:

```typescript
// For customer support (long conversations)
const supportConfig = {
  conversationMemory: {
    enabled: true,
    maxSessions: 100,          // Many concurrent users
    maxTurnsPerSession: 100,   // Long support conversations
    enableSummarization: true, // Keep memory manageable
  },
};

// For quick Q&A (short sessions)
const qnaConfig = {
  conversationMemory: {
    enabled: true,
    maxSessions: 50,           // Fewer sessions needed
    maxTurnsPerSession: 20,    // Short interactions
  },
};
```

### 3. Privacy & Compliance

Implement data handling practices:

```typescript
// Redact PII before storing or exporting
function redactPII(text: string): string {
  return text
    .replace(/\b[\w.-]+@[\w.-]+\.\w+\b/g, "[EMAIL]")
    .replace(/\b\d{3}-\d{3}-\d{4}\b/g, "[PHONE]")
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[SSN]");
}

// Use when retrieving history
async function getSafeHistory(sessionId: string) {
  const history = await neurolink.getConversationHistory(sessionId);
  return history.map(msg => ({
    ...msg,
    content: redactPII(msg.content),
  }));
}
```

### 4. Production Considerations

Use Redis for production environments:

```typescript
// Development: in-memory (fast, no setup)
const devNeurolink = new NeuroLink({
  conversationMemory: { enabled: true },
});

// Production: Redis (persistent, scalable)
const prodNeurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    store: "redis",
    redis: {
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT),
      password: process.env.REDIS_PASSWORD,
    },
  },
});
```

### 5. Regular Cleanup

Implement cleanup strategies:

```typescript
// Clear old sessions periodically
async function cleanupOldSessions() {
  const stats = await neurolink.getConversationStats();
  console.log(`Total sessions before cleanup: ${stats.totalSessions}`);
  
  // Clear all sessions
  await neurolink.clearAllConversations();
  
  console.log("All sessions cleared");
}

// Run weekly
setInterval(cleanupOldSessions, 7 * 24 * 60 * 60 * 1000);
```

## Use Cases

### Debugging Conversation Flow

```typescript
// Debug why AI gave an unexpected response
async function debugConversation(sessionId: string) {
  const history = await neurolink.getConversationHistory(sessionId);
  
  console.log("=== Conversation Flow ===");
  history.forEach((msg, idx) => {
    console.log(`[${idx}] ${msg.role}: ${msg.content.substring(0, 100)}...`);
  });
  
  // Check for context issues
  const userMessages = history.filter(m => m.role === "user");
  const assistantMessages = history.filter(m => m.role === "assistant");
  
  console.log(`\nUser messages: ${userMessages.length}`);
  console.log(`Assistant messages: ${assistantMessages.length}`);
}
```

### Building Chat Interfaces

```typescript
// Display conversation history in UI
async function loadChatHistory(sessionId: string) {
  const history = await neurolink.getConversationHistory(sessionId);
  
  return history.map(msg => ({
    id: msg.id || crypto.randomUUID(),
    author: msg.role === "user" ? "You" : "AI",
    text: msg.content,
    timestamp: msg.timestamp || new Date().toISOString(),
  }));
}

// Usage in frontend
const messages = await loadChatHistory("chat-123");
render(<ChatWindow messages={messages} />);
```

### Conversation Analytics

```typescript
// Analyze conversation patterns
async function analyzeConversationPatterns(sessionId: string) {
  const history = await neurolink.getConversationHistory(sessionId);
  
  const analysis = {
    totalMessages: history.length,
    userMessages: history.filter(m => m.role === "user").length,
    averageMessageLength: history.reduce((acc, m) => 
      acc + m.content.length, 0) / history.length,
    toolsUsed: history.filter(m => m.role === "tool_call").length,
    conversationLength: history.length / 2, // Turns
  };
  
  return analysis;
}
```

### Session Recovery

```typescript
// Resume conversation from previous session
async function resumeConversation(sessionId: string) {
  // Check if session exists
  const history = await neurolink.getConversationHistory(sessionId);
  
  if (history.length === 0) {
    console.log("Starting new conversation");
    return null;
  }
  
  console.log(`Resuming conversation with ${history.length} previous messages`);
  
  // Continue conversation with same session ID
  const response = await neurolink.generate({
    prompt: "Continue our previous discussion",
    context: { sessionId }, // Same session ID maintains context
  });
  
  return response;
}
```

## Related Features

- [CLI Loop Sessions](./cli-loop-sessions.md) - Interactive conversation mode with Redis persistence
- [Conversation Memory](../CONVERSATION-MEMORY.md) - Complete conversation memory system documentation
- [Mem0 Integration](../MEM0_INTEGRATION.md) - Semantic memory for long-term knowledge retention
- [API Reference](../sdk/api-reference.md) - Complete SDK method documentation

## Key Differences from In-Memory vs Redis

| Feature | In-Memory | Redis |
|---------|-----------|-------|
| **Persistence** | Lost on restart | Survives restarts |
| **Speed** | Fastest | Fast (network overhead) |
| **Setup** | None required | Redis server needed |
| **Use Case** | Development, testing | Production, multi-instance |
| **Scalability** | Single instance | Multiple instances can share |
| **CLI Loop Sessions** | Session lost on exit | Can resume sessions |

## Migration Notes

### Switching from In-Memory to Redis

1. **Install and start Redis:**
   ```bash
   # Using Docker
   docker run -d -p 6379:6379 redis:latest
   
   # Or install locally (Ubuntu/Debian)
   sudo apt-get install redis-server
   sudo systemctl start redis
   ```

2. **Update configuration:**
   ```typescript
   const neurolink = new NeuroLink({
     conversationMemory: {
       enabled: true,
       store: "redis", // Add this line
       redis: {
         host: "localhost",
         port: 6379,
       },
     },
   });
   ```

3. **Important:** Existing in-memory sessions will be lost. The switch is immediate and sessions cannot be migrated automatically.

### Switching from Redis to In-Memory

Simply remove the `store: "redis"` configuration. Existing Redis data will remain but won't be accessed.

For complete conversation memory system documentation, see [CONVERSATION-MEMORY.md](../CONVERSATION-MEMORY.md).
