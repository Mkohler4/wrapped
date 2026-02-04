# System Architecture

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                   │
│                        (Next.js + React)                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│  │    Chat     │  │   Memory    │  │   Settings  │                  │
│  │  Interface  │  │   Browser   │  │    Panel    │                  │
│  └─────────────┘  └─────────────┘  └─────────────┘                  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ REST/WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           BACKEND                                    │
│                      (Node.js / Python)                              │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                      API LAYER                               │    │
│  │   Auth │ Chat │ Memory │ Search │ Integrations │ Settings   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│  ┌───────────────────────────┼───────────────────────────────────┐  │
│  │                    CORE SERVICES                               │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐          │  │
│  │  │ Context │  │ Memory  │  │  Style  │  │  LLM    │          │  │
│  │  │ Engine  │  │ Manager │  │ Engine  │  │ Router  │          │  │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘          │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│  ┌───────────────────────────┼───────────────────────────────────┐  │
│  │                   INTEGRATION LAYER                            │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐          │  │
│  │  │  Email  │  │  Slack  │  │ Calendar│  │  Docs   │          │  │
│  │  │ Adapter │  │ Adapter │  │ Adapter │  │ Adapter │          │  │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘          │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                                   │
│  ┌─────────────────────┐  ┌─────────────────────┐                   │
│  │     PostgreSQL      │  │       Redis         │                   │
│  │  + pgvector         │  │  (Cache + Queue)    │                   │
│  │                     │  │                     │                   │
│  │  • Events           │  │  • Session cache    │                   │
│  │  • Memory           │  │  • Job queue        │                   │
│  │  • Style            │  │  • Rate limiting    │                   │
│  │  • Conversations    │  │                     │                   │
│  │  • Embeddings       │  │                     │                   │
│  └─────────────────────┘  └─────────────────────┘                   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKGROUND WORKERS                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│  │   Ingest    │  │   Digest    │  │  Embedding  │                  │
│  │   Worker    │  │   Worker    │  │   Worker    │                  │
│  └─────────────┘  └─────────────┘  └─────────────┘                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component Details

### Frontend Layer

**Technology:** Next.js 14 (App Router) + React + Tailwind CSS

| Component | Purpose | Key Features |
|-----------|---------|--------------|
| **Chat Interface** | Main interaction | Streaming responses, source citations, feedback buttons |
| **Memory Browser** | View/manage memories | Filter, edit, delete profile & episodic memories |
| **Settings Panel** | Configuration | Integrations, style profile, privacy controls |

**Key Libraries:**
- `@tanstack/react-query` — Server state management
- `react-markdown` — Render markdown responses
- `zustand` — Client state
- `sonner` — Toast notifications

### API Layer

**Technology:** Node.js (Express or Fastify) or Python (FastAPI)

| Endpoint Group | Purpose |
|----------------|---------|
| `/api/auth/*` | OAuth flows, session management |
| `/api/chat/*` | Send messages, get responses, feedback |
| `/api/memory/*` | CRUD for profile & episodic memory |
| `/api/search/*` | Hybrid search across all sources |
| `/api/integrations/*` | Connect/manage Gmail, Slack, etc. |
| `/api/settings/*` | User preferences, style profile |

**Auth:** 
- Clerk or NextAuth for OAuth
- JWT sessions with refresh tokens

### Core Services

#### Context Engine

The "secret sauce" — assembles the right context for every request.

```typescript
class ContextEngine {
  async assembleContext(query: string, intent: Intent): Promise<Context> {
    // 1. Expand query
    const expandedQueries = await this.expandQuery(query);
    
    // 2. Parallel retrieval
    const [keywordResults, semanticResults] = await Promise.all([
      this.keywordSearch(expandedQueries),
      this.semanticSearch(expandedQueries)
    ]);
    
    // 3. Merge and dedupe
    const candidates = this.mergeCandidates(keywordResults, semanticResults);
    
    // 4. Rerank
    const reranked = await this.rerank(candidates, query, intent);
    
    // 5. Pack context
    return this.packContext(reranked);
  }
}
```

See [retrieval-pipeline.md](retrieval-pipeline.md) for full details.

#### Memory Manager

Handles all memory operations with approval workflow.

```typescript
class MemoryManager {
  // Profile memory
  async savePreference(key: string, value: string, source: MemorySource): Promise<void>;
  async getPreference(key: string): Promise<ProfileMemory | null>;
  async searchPreferences(query: string): Promise<ProfileMemory[]>;
  
  // Episodic memory
  async saveEpisode(episode: EpisodicMemory): Promise<void>;
  async searchEpisodes(query: string, tags?: string[]): Promise<EpisodicMemory[]>;
  
  // Approval queue
  async proposeMemory(type: 'profile' | 'episodic', data: any, reason: string): Promise<void>;
  async approveMemory(queueId: string): Promise<void>;
  async rejectMemory(queueId: string): Promise<void>;
}
```

#### Style Engine

Applies and learns writing style.

```typescript
class StyleEngine {
  // Apply style to output
  getStylePrompt(context: string): string;
  
  // Learn from edits
  async recordEdit(original: string, edited: string, context: string): Promise<void>;
  async analyzeEditPatterns(): Promise<StyleInsight[]>;
  
  // Learn from ratings
  async recordRating(text: string, rating: number, context: string): Promise<void>;
  
  // Get exemplars for few-shot
  async getExemplars(context: string, limit: number): Promise<StyleExemplar[]>;
}
```

#### LLM Router

Manages LLM calls with fallback and optimization.

```typescript
class LLMRouter {
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    // Select model based on task
    const model = this.selectModel(request.intent);
    
    // Build prompt with context + style
    const prompt = this.buildPrompt(request);
    
    // Call with retry and fallback
    return this.callWithFallback(model, prompt);
  }
  
  private selectModel(intent: Intent): ModelConfig {
    // Fast model for search/categorization
    if (intent === 'search' || intent === 'classify') {
      return this.config.fastModel;  // GPT-3.5, Claude Haiku
    }
    // Quality model for drafting/analysis
    return this.config.qualityModel;  // GPT-4, Claude Sonnet
  }
}
```

### Integration Layer

Each integration follows a common interface:

```typescript
interface IntegrationAdapter {
  // Setup
  connect(credentials: OAuthCredentials): Promise<void>;
  disconnect(): Promise<void>;
  
  // Sync
  sync(cursor?: string): Promise<SyncResult>;
  
  // Transform
  toLifeEvent(item: any): LifeEvent;
}
```

#### Email Adapter (Gmail)

```typescript
class GmailAdapter implements IntegrationAdapter {
  // Uses Gmail API read-only scope
  // Syncs in batches of 100 messages
  // Handles threading automatically
  // Extracts: subject, body, sender, recipients, timestamp
}
```

#### Slack Adapter

```typescript
class SlackAdapter implements IntegrationAdapter {
  // Uses Slack Web API with selected channels
  // Syncs messages, threads, reactions
  // Handles rate limiting (tier 3)
  // Extracts: text, channel, user, thread_ts, reactions
}
```

### Data Layer

#### PostgreSQL + pgvector

Primary database for all persistent data.

**Key Tables:**
- `events` — All ingested content
- `profile_memory` — Preferences and facts
- `episodic_memory` — Decisions and learnings
- `style_profile` — Writing style parameters
- `conversations` — Chat history

**Vector Search:**
```sql
-- Find similar events
SELECT id, text, 1 - (embedding <=> $1) as similarity
FROM events
WHERE user_id = $2
ORDER BY embedding <=> $1
LIMIT 20;
```

#### Redis

Caching and job queue.

**Caches:**
- Session data (TTL: 1 hour)
- Recent search results (TTL: 5 min)
- Integration rate limit tracking

**Queues:**
- `sync:email` — Email sync jobs
- `sync:slack` — Slack sync jobs
- `embed` — Embedding generation
- `digest` — Daily digest generation

### Background Workers

#### Ingest Worker

```typescript
// Runs every 5-15 minutes
class IngestWorker {
  async run() {
    // For each active integration
    for (const source of this.activeSources) {
      // Check for new content
      const newItems = await source.adapter.sync(source.cursor);
      
      // Transform to events
      const events = newItems.map(item => source.adapter.toLifeEvent(item));
      
      // Store and index
      await this.eventStore.bulkInsert(events);
      
      // Queue embedding generation
      await this.embedQueue.addBatch(events.map(e => e.id));
      
      // Update cursor
      await this.sourceStore.updateCursor(source.id, newItems.cursor);
    }
  }
}
```

#### Digest Worker

```typescript
// Runs daily at configured time
class DigestWorker {
  async run(userId: string) {
    // Get events from last 24 hours
    const events = await this.eventStore.getRecent(userId, '24h');
    
    // Categorize
    const categorized = await this.categorize(events);
    
    // Generate digest with LLM
    const digest = await this.llm.generateDigest(categorized);
    
    // Store and notify
    await this.digestStore.save(digest);
    await this.notifier.send(userId, digest);
  }
}
```

#### Embedding Worker

```typescript
// Runs continuously, processing queue
class EmbeddingWorker {
  async processEvent(eventId: string) {
    const event = await this.eventStore.get(eventId);
    
    // Generate embedding
    const embedding = await this.embedder.embed(event.text);
    
    // Update event
    await this.eventStore.updateEmbedding(eventId, embedding);
  }
}
```

---

## Request Flow: Chat Message

```
User types: "Summarize what I missed in #product today"
                │
                ▼
┌─────────────────────────────────────┐
│ 1. INTENT DETECTION                 │
│    → "summarize" intent detected    │
│    → source: slack, channel: product│
│    → timeframe: today               │
└─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│ 2. CONTEXT ASSEMBLY                 │
│    → Query expansion                │
│    → Hybrid search (keyword+vector) │
│    → Rerank by relevance + recency  │
│    → Pack top 5 threads verbatim    │
│    → Summarize remaining 10 threads │
└─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│ 3. MEMORY RETRIEVAL                 │
│    → Get user's summary preferences │
│    → Get people context (who's who) │
│    → Get project context            │
└─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│ 4. PROMPT CONSTRUCTION              │
│    → System: role + style profile   │
│    → Context: slack threads + memory│
│    → User: original request         │
└─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│ 5. LLM GENERATION                   │
│    → Stream response to frontend    │
│    → Include source citations       │
└─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│ 6. POST-PROCESSING                  │
│    → Log conversation               │
│    → Track sources used             │
│    → Prompt for feedback            │
└─────────────────────────────────────┘
```

---

## Deployment Architecture

### Development

```
Local machine:
├── Next.js dev server (port 3000)
├── API server (port 8000)
├── PostgreSQL (Docker, port 5432)
├── Redis (Docker, port 6379)
└── Workers (separate process)
```

### Production (V1)

Simple deployment for single user:

```
┌─────────────────────────────────────┐
│            Vercel / Railway         │
│  ┌───────────┐  ┌───────────────┐  │
│  │  Next.js  │  │   API Server  │  │
│  │  Frontend │  │   + Workers   │  │
│  └───────────┘  └───────────────┘  │
└─────────────────────────────────────┘
                │
    ┌───────────┴───────────┐
    │                       │
    ▼                       ▼
┌──────────┐         ┌──────────┐
│ Supabase │         │  Upstash │
│ (Postgres│         │  (Redis) │
│ +pgvector)│        │          │
└──────────┘         └──────────┘
```

**Estimated costs (V1, single user):**
- Vercel: Free tier
- Supabase: Free tier (500MB)
- Upstash: Free tier
- OpenAI: ~$20/month (embeddings + completions)

---

## Security Architecture

### Authentication Flow

```
User → [OAuth Provider] → [API] → [JWT Session]
                              ↓
                    [Encrypted token storage]
```

### Data Encryption

| Data | At Rest | In Transit |
|------|---------|------------|
| OAuth tokens | AES-256 encrypted | TLS 1.3 |
| User content | Database encryption | TLS 1.3 |
| Embeddings | Plain (low sensitivity) | TLS 1.3 |

### API Security

- Rate limiting per user
- Request validation (Zod schemas)
- CORS restricted to frontend domain
- No sensitive data in logs

### Privacy Controls

```typescript
// Before any context is used
function canInclude(event: LifeEvent): boolean {
  return (
    !event.is_sensitive &&
    event.permissions !== 'private' &&
    event.permissions !== 'metadata_only'
  );
}
```
