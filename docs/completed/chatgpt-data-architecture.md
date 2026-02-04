# ChatGPT Data Architecture

> **Status:** ✅ Completed  
> **Date:** February 2, 2026  
> **Data Imported:** 15,052 messages across 961 conversations

---

## Overview

This document explains how ChatGPT conversation history is transformed and stored in the Personal Operator database.

---

## Data Flow

```mermaid
flowchart TB
    subgraph Export["ChatGPT Export"]
        ZIP[("ZIP File")]
        JSON["conversations.json"]
        ZIP --> JSON
    end

    subgraph Parse["Parsing Layer"]
        EXTRACT["Extract & Parse"]
        LINEAR["Linearize Tree\n(handle regenerations)"]
        FILTER["Filter Conversations\n(min messages, date)"]
        CLASSIFY["Classify Topics"]
        JSON --> EXTRACT
        EXTRACT --> LINEAR
        LINEAR --> FILTER
        FILTER --> CLASSIFY
    end

    subgraph Transform["Transform Layer"]
        THREAD["Create Thread"]
        EVENT["Create Events\n(per message)"]
        INSIGHT["Extract Insights"]
        STYLE["Analyze Style"]
        CLASSIFY --> THREAD
        CLASSIFY --> EVENT
        CLASSIFY --> INSIGHT
        CLASSIFY --> STYLE
    end

    subgraph Store["PostgreSQL + pgvector"]
        USERS[("users")]
        THREADS[("threads")]
        EVENTS[("events")]
        MEMORY[("memory_queue")]
        
        THREAD --> THREADS
        EVENT --> EVENTS
        INSIGHT --> MEMORY
        THREADS --> USERS
        EVENTS --> THREADS
    end

    style Export fill:#f9f,stroke:#333
    style Parse fill:#bbf,stroke:#333
    style Transform fill:#bfb,stroke:#333
    style Store fill:#fbb,stroke:#333
```

---

## Database Schema

```mermaid
erDiagram
    users ||--o{ threads : has
    users ||--o{ events : has
    users ||--o{ memory_queue : has
    threads ||--o{ events : contains

    users {
        uuid id PK
        varchar email
        varchar name
        timestamp created_at
    }

    threads {
        uuid id PK
        uuid user_id FK
        enum source "chatgpt"
        varchar source_thread_id
        varchar subject
        timestamp first_event_at
        timestamp last_event_at
        int event_count
    }

    events {
        uuid id PK
        uuid user_id FK
        uuid thread_id FK
        enum source "chatgpt"
        varchar source_id
        timestamp timestamp
        text text
        text[] topic_tags
        int importance
        jsonb metadata
        vector embedding "1536 dims"
    }

    memory_queue {
        uuid id PK
        uuid user_id FK
        varchar memory_type
        jsonb proposed_data
        varchar reason
        enum status "pending"
    }
```

---

## Data Mapping

### ChatGPT Conversation → Thread

| ChatGPT Field | Thread Column | Notes |
|---------------|---------------|-------|
| `title` | `subject` | Conversation title |
| `create_time` | `first_event_at` | Unix timestamp → Date |
| `update_time` | `last_event_at` | Unix timestamp → Date |
| `id` or hash | `source_thread_id` | Unique identifier |
| — | `source` | Always `'chatgpt'` |
| — | `event_count` | Calculated from messages |

### ChatGPT Message → Event

| ChatGPT Field | Event Column | Notes |
|---------------|--------------|-------|
| `message.id` | `source_id` | Message UUID |
| `message.create_time` | `timestamp` | When sent |
| `message.content.parts[]` | `text` | Joined text content |
| — | `source` | Always `'chatgpt'` |
| — | `topic_tags` | Auto-classified |
| `message.author.role` | `metadata.role` | user/assistant |
| `message.metadata.model_slug` | `metadata.model` | gpt-4, etc |
| Code detection | `metadata.has_code` | Boolean |

### Metadata JSON Structure

```json
{
  "role": "user",
  "model": "gpt-4",
  "has_code": true,
  "content_type": "text"
}
```

---

## Topic Classification

Conversations are auto-tagged based on keyword patterns:

```mermaid
pie title Topic Distribution (961 conversations)
    "coding" : 570
    "general" : 307
    "writing" : 218
    "research" : 120
    "learning" : 119
    "planning" : 77
    "career" : 55
    "personal" : 14
    "brainstorm" : 9
```

### Classification Rules

| Topic | Trigger Keywords |
|-------|-----------------|
| `coding` | code, function, error, debug, api, typescript, python |
| `writing` | write, draft, email, essay, article, blog |
| `research` | explain, what is, how does, compare, difference |
| `planning` | plan, schedule, roadmap, strategy, goals |
| `career` | job, interview, resume, salary, startup |
| `personal` | i feel, relationship, family, health |
| `learning` | learn, tutorial, understand, teach, example |

---

## Message Linearization

ChatGPT stores conversations as a tree (regenerations create branches). We linearize by following the path from `current_node` back to root:

```mermaid
graph TD
    ROOT["Root Node"]
    A["Message 1 (User)"]
    B["Message 2 (Assistant)"]
    B2["Message 2b (Regenerated)"]
    C["Message 3 (User)"]
    D["Message 4 (Assistant)"]
    D2["Message 4b (Regenerated)"]
    CURRENT["current_node"]

    ROOT --> A
    A --> B
    A --> B2
    B --> C
    B2 -.-> |abandoned| X1[" "]
    C --> D
    C --> D2
    D2 --> CURRENT

    style CURRENT fill:#f96,stroke:#333
    style B2 fill:#ccc,stroke:#999
    style X1 fill:#fff,stroke:#fff

    linkStyle 2 stroke:#999,stroke-dasharray: 5 5
    linkStyle 5 stroke:#999,stroke-dasharray: 5 5
```

**Result:** Only the canonical path (what user last saw) is imported.

---

## Insight Extraction

The import process extracts potential memories for review:

```mermaid
flowchart LR
    subgraph Input
        CONV["Conversation Text"]
    end

    subgraph Patterns["Pattern Matching"]
        PREF["Preference Patterns\n'I use X', 'I prefer Y'"]
        DEC["Decision Patterns\n'I decided to...', 'Let's go with...'"]
        LEARN["Learning Patterns\n'I realized...', 'Turns out...'"]
    end

    subgraph Output
        QUEUE["memory_queue\n(pending approval)"]
    end

    CONV --> PREF
    CONV --> DEC
    CONV --> LEARN
    PREF --> QUEUE
    DEC --> QUEUE
    LEARN --> QUEUE
```

### Extracted Insights Summary

| Type | Count | Example |
|------|-------|---------|
| Preferences | 63 | "I prefer TypeScript" |
| Decisions | 6 | "Decided to use PostgreSQL" |
| Learnings | 18 | "Learned that batch processing is faster" |

---

## Style Analysis

Automatically detected from message patterns:

```yaml
averageMessageLength: 1,117 chars
usesCodeBlocks: true
technicalLevel: high
questionStyle: detailed
preferredFormat: bullets
```

---

## Query Examples

### Count messages by topic
```sql
SELECT 
  unnest(topic_tags) as topic,
  COUNT(*) as count
FROM events 
WHERE source = 'chatgpt'
GROUP BY topic
ORDER BY count DESC;
```

### Search conversations
```sql
SELECT 
  t.subject,
  COUNT(e.id) as messages,
  MIN(e.timestamp) as started
FROM threads t
JOIN events e ON e.thread_id = t.id
WHERE t.source = 'chatgpt'
  AND e.text ILIKE '%typescript%'
GROUP BY t.id
ORDER BY started DESC
LIMIT 10;
```

### Full-text search
```sql
SELECT * FROM search_events(
  '8949a988-a1d0-4ceb-8ea5-9b2f120b2444',  -- user_id
  'startup advice',                          -- query
  10                                         -- limit
);
```

---

## Files Involved

| File | Purpose |
|------|---------|
| `src/ingest/chatgpt/types.ts` | TypeScript interfaces |
| `src/ingest/chatgpt/parser.ts` | ZIP extraction, linearization |
| `src/ingest/chatgpt/insights.ts` | Memory extraction |
| `src/ingest/chatgpt/importer.ts` | Main orchestrator |
| `src/scripts/import-chatgpt-full.ts` | CLI entry point |
| `schemas/db-schema.sql` | Database schema |

---

## Next Steps

1. ~~**Generate embeddings**~~ — ✅ Completed (see [embedding-search-architecture.md](./embedding-search-architecture.md))
2. **Build search API** — Query from chat interface
3. **Review memories** — Approve/reject extracted insights

