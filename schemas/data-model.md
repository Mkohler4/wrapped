# Data Model

## Overview

Everything in the system flows through a unified event model. This creates consistency across sources and simplifies retrieval.

---

## Unified "Life Event" Schema

Every piece of content becomes an **event**.

```typescript
interface LifeEvent {
  // Identity
  id: string;                      // Unique identifier (uuid)
  source: EventSource;             // Where it came from
  source_id: string;               // ID in the source system
  
  // Timing
  timestamp: Date;                 // When it happened
  indexed_at: Date;                // When we processed it
  
  // Content
  text: string;                    // The actual content
  summary?: string;                // AI-generated summary (if long)
  
  // Relationships
  thread_id?: string;              // For threaded conversations
  parent_id?: string;              // Reply to what?
  people: Person[];                // Who's involved
  
  // Classification
  topic_tags: string[];            // Auto or manual tags
  importance: number;              // 1-5 scale
  action_required: boolean;        // Needs response?
  
  // Privacy
  permissions: PermissionLevel;    // What can be shown
  is_sensitive: boolean;           // Marked as sensitive
  
  // Embeddings
  embedding?: number[];            // Vector for semantic search
}

type EventSource = 
  | 'email'
  | 'slack'
  | 'calendar'
  | 'document'
  | 'note'
  | 'manual'
  | 'chatgpt';   // Imported ChatGPT conversation history

type PermissionLevel = 
  | 'full'           // Can show full text
  | 'summary_only'   // Only show summary
  | 'metadata_only'  // Only show exists + metadata
  | 'private';       // Never include in context

interface Person {
  id: string;
  name: string;
  email?: string;
  slack_id?: string;
  role?: string;                   // From profile memory
  relationship?: string;           // How you know them
}
```

---

## Source-Specific Extensions

### Email Event

```typescript
interface EmailEvent extends LifeEvent {
  source: 'email';
  
  // Email-specific
  subject: string;
  from: Person;
  to: Person[];
  cc: Person[];
  
  // Threading
  thread_id: string;              // Gmail thread ID
  in_reply_to?: string;           // Message ID
  
  // Status
  is_read: boolean;
  is_starred: boolean;
  labels: string[];
  
  // Analysis
  needs_reply: boolean;
  reply_urgency: 'low' | 'medium' | 'high';
  detected_deadline?: Date;
}
```

### Slack Event

```typescript
interface SlackEvent extends LifeEvent {
  source: 'slack';
  
  // Slack-specific
  channel_id: string;
  channel_name: string;
  channel_type: 'channel' | 'dm' | 'group_dm';
  
  // Threading
  thread_ts?: string;             // Parent message timestamp
  reply_count?: number;
  
  // Engagement
  reactions: Reaction[];
  is_mention: boolean;            // Mentions you directly
  
  // Analysis
  is_decision: boolean;
  action_items: string[];
}

interface Reaction {
  emoji: string;
  count: number;
  users: string[];
}
```

### Document Event

```typescript
interface DocumentEvent extends LifeEvent {
  source: 'document';
  
  // Document-specific
  file_path: string;
  file_type: string;              // md, txt, pdf, docx
  title: string;
  
  // Structure
  sections: Section[];
  word_count: number;
  
  // Versioning
  last_modified: Date;
  version?: string;
}

interface Section {
  heading: string;
  content: string;
  level: number;
}
```

### ChatGPT Event

```typescript
interface ChatGPTEvent extends LifeEvent {
  source: 'chatgpt';
  
  // ChatGPT-specific (stored in metadata)
  role: 'user' | 'assistant';     // Who sent the message
  model?: string;                  // gpt-4, gpt-4o, etc.
  has_code: boolean;               // Contains code blocks
  content_type: string;            // text, code, etc.
  
  // Thread = conversation
  // thread_id links all messages in same conversation
  
  // Analysis (computed on import)
  topic_tags: string[];            // coding, writing, planning, etc.
}
```

**Why ChatGPT is valuable:**
- Your questions reveal how you think
- Topics show what you care about
- Style of asking shows communication preferences
- Decisions worked through become episodic memory
- Technical choices become profile memory

---

## Storage Layers

```
┌─────────────────────────────────────────────────────────┐
│                     RAW STORE                            │
│                    (PostgreSQL)                          │
│   Events • Threads • Message bodies • Metadata          │
├─────────────────────────────────────────────────────────┤
│                    INDEX STORE                           │
│              (PostgreSQL + pgvector)                     │
│        Keyword index (BM25) • Vector index              │
├─────────────────────────────────────────────────────────┤
│                   MEMORY STORE                           │
│                    (PostgreSQL)                          │
│    Profile memory (k/v) • Episodic memory (summaries)   │
├─────────────────────────────────────────────────────────┤
│                    STYLE STORE                           │
│                    (PostgreSQL)                          │
│    Rules • Parameters • Exemplar outputs                │
└─────────────────────────────────────────────────────────┘
```

### Layer 1: Raw Store

**Purpose:** Source of truth for all ingested content.

**Tables:**
- `events` — All life events
- `threads` — Thread groupings
- `people` — Known people
- `sources` — Connected integrations

**Retention:** Configurable per source
- Full text: 90 days default
- Summaries: Indefinite
- Metadata: Indefinite

### Layer 2: Index Store

**Purpose:** Fast retrieval via search.

**Components:**
- **Keyword index:** PostgreSQL full-text search with ts_vector
- **Vector index:** pgvector for embedding similarity

**Sync:** Updated on event ingest

### Layer 3: Memory Store

**Purpose:** Curated knowledge about you.

**Tables:**
- `profile_memory` — Preferences, people, defaults
- `episodic_memory` — Decisions, learnings, commitments
- `memory_queue` — Pending items for approval

### Layer 4: Style Store

**Purpose:** How you write.

**Tables:**
- `style_profile` — Parameters and rules
- `style_exemplars` — Good output examples
- `edit_signals` — Learning from your edits

---

## Relationships

```
                         ┌──────────┐
                         │  Person  │
                         └────┬─────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │  Email   │   │  Slack   │   │ Profile  │
        │  Event   │   │  Event   │   │ Memory   │
        └────┬─────┘   └────┬─────┘   └──────────┘
             │              │
             └──────┬───────┘
                    │
                    ▼
             ┌──────────┐
             │  Thread  │
             └────┬─────┘
                  │
                  ▼
           ┌──────────┐
           │ Episodic │
           │ Memory   │
           └──────────┘
```

---

## Indexing Strategy

### What Gets Indexed

| Content | Keyword | Vector | Why |
|---------|---------|--------|-----|
| Email subject | ✓ | ✓ | Quick lookup + semantic |
| Email body | ✓ | ✓ | Full search |
| Slack message | ✓ | ✓ | Full search |
| Document content | ✓ | ✓ | Full search |
| Person names | ✓ | ✗ | Exact match only |
| Profile memory | ✓ | ✓ | Both needed |
| Episodic memory | ✓ | ✓ | Both needed |

### Chunking Strategy

For long content:
```
Document (5000 words)
    ↓
Split by sections/headers
    ↓
Chunks of ~500 tokens each
    ↓
Each chunk indexed separately
    ↓
Chunk metadata links back to parent
```

### Embedding Model

**Recommended:** `text-embedding-3-small` (OpenAI)
- 1536 dimensions
- Good quality/cost balance
- ~$0.02 per 1M tokens

---

## Data Lifecycle

### Ingestion Flow

```
New Content (email/slack/doc)
    ↓
[Fetch from source API]
    ↓
[Normalize to LifeEvent schema]
    ↓
[Extract people, tags, importance]
    ↓
[Generate embedding]
    ↓
[Store in raw + index]
    ↓
[Queue for memory extraction?]
    ↓
Done
```

### Deletion Flow

```
Delete request (event ID)
    ↓
[Remove from raw store]
    ↓
[Remove from index store]
    ↓
[Unlink from threads]
    ↓
[Flag any episodic memory that referenced it]
    ↓
[Audit log: "deleted event X at time Y"]
    ↓
Done
```

### Privacy Sanitization

For sensitive content:
```
[Mark as sensitive]
    ↓
[Remove from index] — Can't be searched
    ↓
[Keep in raw store] — Still exists
    ↓
[Never included in LLM context]
```

---

## Capacity Planning

### V1 Estimates

| Data Type | Volume | Storage |
|-----------|--------|---------|
| Emails | 100/day × 90 days = 9,000 | ~50 MB |
| Slack | 200/day × 90 days = 18,000 | ~30 MB |
| Documents | 100 files | ~10 MB |
| Embeddings | 27,000 events × 6KB | ~160 MB |
| Profile memory | 500 items | ~1 MB |
| Episodic memory | 500 items | ~2 MB |

**Total:** ~250 MB for 90 days of active use

This fits comfortably in a small PostgreSQL instance.
