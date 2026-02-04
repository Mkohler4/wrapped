# ChatGPT Data Import Pipeline

## Overview

Your ChatGPT conversation history is a goldmine of personal context:
- **How you think** — your questions reveal thought patterns
- **What you care about** — topics you return to repeatedly
- **Your communication style** — how you phrase things, level of detail you prefer
- **Decisions & reasoning** — problems you've worked through
- **Technical preferences** — languages, tools, approaches you favor

This is the **first data source** for the personal operator — a rich foundation before connecting live integrations.

---

## ChatGPT Export Format

### How to Export

1. Go to ChatGPT → Settings → Data Controls
2. Click "Export data"
3. You'll receive an email with a download link
4. Download the ZIP file

### Export Contents

```
chatgpt-export/
├── conversations.json    ← Main file we care about
├── user.json             ← Account info (optional use)
├── message_feedback.json ← Thumbs up/down (useful signal!)
├── model_comparisons.json
└── shared_conversations.json
```

### Conversation Structure

```typescript
interface ChatGPTExport {
  conversations: ChatGPTConversation[];
}

interface ChatGPTConversation {
  title: string;
  create_time: number;        // Unix timestamp (float)
  update_time: number;
  mapping: {
    [messageId: string]: ChatGPTMessage;
  };
  moderation_results: any[];
  current_node: string;        // Last message ID
  conversation_template_id?: string;
}

interface ChatGPTMessage {
  id: string;
  message: {
    id: string;
    author: {
      role: 'user' | 'assistant' | 'system' | 'tool';
      name?: string;          // Plugin/tool name if role=tool
      metadata: object;
    };
    create_time: number | null;
    update_time: number | null;
    content: {
      content_type: 'text' | 'code' | 'execution_output' | 'tether_browsing_display' | 'tether_quote';
      parts?: string[];       // Main content for text
      language?: string;      // For code blocks
      text?: string;          // Alternative text field
    };
    status: 'finished_successfully' | 'in_progress' | string;
    metadata: {
      model_slug?: string;    // 'gpt-4', 'gpt-4o', etc.
      finish_details?: object;
      is_visually_hidden_from_conversation?: boolean;
    };
  } | null;                   // Can be null for root/system nodes
  parent: string | null;
  children: string[];
}
```

---

## Mapping to LifeEvent Schema

### Conversation → Thread

```typescript
// ChatGPT Conversation maps to Thread
{
  source: 'chatgpt',
  source_thread_id: conversation.id || hash(conversation.title + conversation.create_time),
  subject: conversation.title,
  first_event_at: fromUnixTime(conversation.create_time),
  last_event_at: fromUnixTime(conversation.update_time),
  // event_count calculated after import
}
```

### Message → Event

```typescript
// Each user message becomes an Event
{
  source: 'chatgpt',
  source_id: message.id,
  timestamp: fromUnixTime(message.message.create_time),
  text: extractText(message.message.content),
  thread_id: thread.id,
  parent_id: findParentEventId(message.parent),
  
  // Metadata captures ChatGPT-specific info
  metadata: {
    role: message.message.author.role,
    model: message.message.metadata?.model_slug,
    has_code: hasCodeBlocks(message.message.content),
    content_type: message.message.content.content_type
  }
}
```

### What to Import

| Message Type | Import? | Rationale |
|--------------|---------|-----------|
| **User messages** | ✅ Yes | Your thoughts, questions, context |
| **Assistant responses** | ✅ Yes, selectively | Useful for context, but secondary |
| **System prompts** | ❌ No | Not your content |
| **Tool outputs** | ⚠️ Metadata only | Too verbose, but track that tool was used |
| **Hidden messages** | ❌ No | Internal ChatGPT machinery |

### Conversation Filtering

Not all conversations are worth importing:

```typescript
function shouldImportConversation(conv: ChatGPTConversation): boolean {
  const messageCount = countUserMessages(conv);
  const hasSubstance = messageCount >= 2;  // Skip single-message tests
  const notEmpty = conv.title !== 'New chat';
  const hasContent = !isOnlyGreetings(conv);
  
  return hasSubstance && notEmpty && hasContent;
}
```

---

## Import Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                      CHATGPT EXPORT ZIP                             │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STAGE 1: EXTRACT & PARSE                                            │
│                                                                      │
│ • Unzip export file                                                 │
│ • Parse conversations.json                                          │
│ • Parse message_feedback.json (for quality signals)                 │
│ • Validate structure                                                │
│                                                                      │
│ Output: Parsed conversations array                                  │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STAGE 2: FILTER & CLASSIFY                                          │
│                                                                      │
│ For each conversation:                                              │
│ • Skip if < 2 user messages                                         │
│ • Skip if title is "New chat" and no substance                     │
│ • Classify topic (coding, writing, research, personal, etc.)        │
│ • Calculate importance (length × engagement × recency)              │
│                                                                      │
│ Output: Filtered & classified conversations                         │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STAGE 3: LINEARIZE MESSAGES                                         │
│                                                                      │
│ ChatGPT stores as tree (regenerations create branches)              │
│ We need to pick the "canonical" path:                               │
│                                                                      │
│ Strategy: Follow current_node back to root                          │
│           (This is the conversation as the user last saw it)        │
│                                                                      │
│ Output: Linear message array per conversation                       │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STAGE 4: CREATE THREADS & EVENTS                                    │
│                                                                      │
│ For each conversation:                                              │
│   1. Create Thread record                                           │
│   2. For each message in linear order:                              │
│      • Create Event with text + metadata                            │
│      • Link to thread                                               │
│      • Link to parent message                                       │
│   3. Update thread event_count                                      │
│                                                                      │
│ Output: Thread + Event records (not yet in DB)                      │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STAGE 5: GENERATE EMBEDDINGS                                        │
│                                                                      │
│ For user messages only (not assistant):                             │
│ • Batch embed with text-embedding-3-small                           │
│ • Rate limit: 3000 RPM, batch size 100                              │
│                                                                      │
│ Embedding strategy for long conversations:                          │
│ • Short message (<500 tokens): embed directly                       │
│ • Long message: chunk and embed, store primary chunk                │
│                                                                      │
│ Output: Events with embeddings                                      │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STAGE 6: EXTRACT INSIGHTS                                           │
│                                                                      │
│ Scan conversations for memorable content:                           │
│                                                                      │
│ Profile Memory candidates:                                          │
│ • Stated preferences ("I prefer...", "I like...", "I use...")      │
│ • Technical stack mentions (languages, frameworks, tools)           │
│ • Personal facts (job, location, interests)                         │
│                                                                      │
│ Episodic Memory candidates:                                         │
│ • Decisions worked through                                          │
│ • Problems solved                                                   │
│ • Learnings ("I realized...", "turns out...")                       │
│                                                                      │
│ Style signals:                                                      │
│ • Message length patterns                                           │
│ • Question framing style                                            │
│ • Level of technical detail                                         │
│                                                                      │
│ Output: Memory candidates → Queue for approval                      │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STAGE 7: PERSIST                                                    │
│                                                                      │
│ • Batch insert threads                                              │
│ • Batch insert events                                               │
│ • Queue memory candidates for review                                │
│ • Log import stats                                                  │
│                                                                      │
│ Output: Data in database, ready for retrieval                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Topic Classification

Auto-tag conversations to enable filtered retrieval:

```typescript
const TOPIC_PATTERNS = {
  coding: {
    keywords: ['code', 'function', 'error', 'debug', 'api', 'database', 'typescript', 'python', 'react'],
    weight: 1.5
  },
  writing: {
    keywords: ['write', 'draft', 'email', 'essay', 'article', 'blog', 'copy'],
    weight: 1.2
  },
  research: {
    keywords: ['explain', 'what is', 'how does', 'compare', 'difference', 'pros cons'],
    weight: 1.0
  },
  brainstorm: {
    keywords: ['ideas', 'brainstorm', 'options', 'possibilities', 'what if'],
    weight: 1.0
  },
  planning: {
    keywords: ['plan', 'schedule', 'organize', 'roadmap', 'strategy', 'goals'],
    weight: 1.3
  },
  personal: {
    keywords: ['i feel', 'my life', 'relationship', 'family', 'health', 'habit'],
    weight: 1.4  // Higher weight for personal context
  },
  career: {
    keywords: ['job', 'interview', 'resume', 'career', 'salary', 'promotion', 'startup'],
    weight: 1.4
  }
};

function classifyConversation(conv: ChatGPTConversation): string[] {
  const text = extractAllUserText(conv).toLowerCase();
  const tags: string[] = [];
  
  for (const [topic, config] of Object.entries(TOPIC_PATTERNS)) {
    const matches = config.keywords.filter(kw => text.includes(kw)).length;
    if (matches >= 2) {
      tags.push(topic);
    }
  }
  
  return tags.length > 0 ? tags : ['general'];
}
```

---

## Insight Extraction Prompts

### Preference Detection

```
Analyze this ChatGPT conversation for stated preferences or personal facts.

Look for:
- Technology preferences ("I use X", "I prefer Y")
- Communication style ("keep it brief", "be detailed")  
- Personal context (job role, industry, location)
- Working habits (when they work, how they organize)

Output as JSON:
{
  "preferences": [
    {"category": "technology", "key": "language", "value": "TypeScript", "confidence": 0.9},
    ...
  ],
  "facts": [
    {"category": "work", "key": "role", "value": "startup founder", "confidence": 0.8},
    ...
  ]
}

Only include high-confidence items (>0.7).
```

### Decision/Learning Extraction

```
Analyze this ChatGPT conversation for decisions made or lessons learned.

A decision includes:
- What was decided
- Why (the reasoning)
- What alternatives were considered

A learning includes:
- What was discovered or realized
- The context that led to it

Output as JSON:
{
  "decisions": [
    {
      "summary": "Decided to use PostgreSQL instead of MongoDB",
      "reasoning": "Need strong consistency for financial data",
      "alternatives": ["MongoDB", "DynamoDB"],
      "confidence": 0.85
    }
  ],
  "learnings": [
    {
      "summary": "Learned that batch processing is more efficient than real-time for this use case",
      "context": "Was debugging performance issues",
      "confidence": 0.8
    }
  ]
}
```

---

## Handling Edge Cases

### Regenerated Messages

ChatGPT stores all regenerations as tree branches. We only keep the "final" path:

```typescript
function linearizeConversation(conv: ChatGPTConversation): ChatGPTMessage[] {
  const messages: ChatGPTMessage[] = [];
  let currentId = conv.current_node;
  
  // Walk backwards from current node to root
  while (currentId) {
    const node = conv.mapping[currentId];
    if (node?.message && !isHiddenMessage(node.message)) {
      messages.unshift(node);
    }
    currentId = node.parent;
  }
  
  return messages;
}
```

### Code Blocks

Code in conversations is valuable context. Store separately for retrieval:

```typescript
interface CodeBlock {
  language: string;
  code: string;
  context: string;  // The message it appeared in
  eventId: string;
}

function extractCodeBlocks(message: ChatGPTMessage): CodeBlock[] {
  const content = message.message?.content;
  if (content?.content_type === 'code') {
    return [{
      language: content.language || 'unknown',
      code: content.parts?.join('\n') || content.text || '',
      context: '', // Parent message
      eventId: message.id
    }];
  }
  
  // Also extract from markdown code fences in text
  const text = content?.parts?.join('\n') || '';
  const codeRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const blocks: CodeBlock[] = [];
  
  let match;
  while ((match = codeRegex.exec(text)) !== null) {
    blocks.push({
      language: match[1] || 'unknown',
      code: match[2],
      context: text.slice(0, 200),
      eventId: message.id
    });
  }
  
  return blocks;
}
```

### Long Conversations

For very long conversations (>50 messages), also generate a summary:

```typescript
async function summarizeLongConversation(conv: ChatGPTConversation): Promise<string> {
  const messages = linearizeConversation(conv);
  if (messages.length < 50) return '';
  
  const userMessages = messages
    .filter(m => m.message?.author.role === 'user')
    .map(m => extractText(m.message.content))
    .join('\n---\n');
  
  const summary = await llm.complete({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'system',
      content: 'Summarize this conversation in 2-3 sentences. Focus on what the user was trying to accomplish.'
    }, {
      role: 'user',
      content: userMessages.slice(0, 10000)  // Token limit
    }],
    max_tokens: 200
  });
  
  return summary.content;
}
```

---

## Cost Estimation

For a typical ChatGPT power user:

| Item | Volume | Cost |
|------|--------|------|
| Conversations | ~500 | - |
| User messages | ~5,000 | - |
| Embeddings (3-small) | ~2M tokens | ~$0.04 |
| Insight extraction (4o-mini) | ~1M tokens | ~$0.15 |
| Classification | ~500K tokens | ~$0.08 |

**Total: ~$0.30** for full import

---

## Progress Tracking

Show user import progress:

```typescript
interface ImportProgress {
  stage: 'extracting' | 'filtering' | 'linearizing' | 'creating' | 'embedding' | 'extracting_insights' | 'persisting' | 'complete';
  conversationsTotal: number;
  conversationsProcessed: number;
  eventsCreated: number;
  memoriesQueued: number;
  errors: string[];
}

// Emit progress events
emitter.emit('progress', {
  stage: 'embedding',
  conversationsTotal: 500,
  conversationsProcessed: 234,
  eventsCreated: 1847,
  memoriesQueued: 12,
  errors: []
});
```

---

## CLI Usage

```bash
# Basic import
pnpm run import:chatgpt ./path/to/chatgpt-export.zip

# With options
pnpm run import:chatgpt ./export.zip \
  --skip-embeddings \    # Import structure only, embed later
  --dry-run \            # Preview what would be imported
  --min-messages 3 \     # Skip conversations with < 3 user messages
  --since 2024-01-01     # Only import conversations after date
```

---

## Post-Import Actions

After import completes:

1. **Review Memory Queue** — Approve/reject extracted preferences and decisions
2. **Verify Sample Retrieval** — Test searches to ensure embeddings work
3. **Check Topic Distribution** — See what categories your conversations fall into
4. **Review Sensitive Content** — Mark any private conversations

```typescript
// Example: Show import summary
const summary = await db.query(`
  SELECT 
    COUNT(*) as total_events,
    COUNT(DISTINCT thread_id) as conversations,
    array_agg(DISTINCT unnest(topic_tags)) as topics,
    MIN(timestamp) as earliest,
    MAX(timestamp) as latest
  FROM events 
  WHERE source = 'chatgpt' AND user_id = $1
`, [userId]);

console.log(`
Import Complete!
- ${summary.conversations} conversations
- ${summary.total_events} messages
- Topics: ${summary.topics.join(', ')}
- Date range: ${summary.earliest} to ${summary.latest}
`);
```

