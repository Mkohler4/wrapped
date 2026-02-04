# Retrieval Pipeline — The Secret Sauce

## Overview

The retrieval pipeline is what makes the assistant feel "smart". It's not about storing everything — it's about **pulling the right context at the right time**.

This is the "Cursor feeling" applied to your life.

---

## Pipeline Stages

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER QUERY                                   │
│           "What did we decide about the pricing model?"             │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STAGE 1: INTENT DETECTION                                           │
│                                                                      │
│ Classify the query into one of:                                     │
│   • draft    — User wants content generated                         │
│   • summarize — User wants information condensed                    │
│   • search   — User wants to find something                         │
│   • plan     — User wants help organizing/prioritizing              │
│   • reflect  — User wants to revisit past decisions                 │
│   • chat     — General conversation                                  │
│                                                                      │
│ Output: intent = "reflect" (asking about past decision)             │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STAGE 2: QUERY EXPANSION                                            │
│                                                                      │
│ Generate variations to improve recall:                              │
│                                                                      │
│ Original: "pricing model"                                           │
│ Expanded:                                                           │
│   • "pricing model"                                                 │
│   • "pricing strategy"                                              │
│   • "price", "cost", "monetization"                                │
│   • "tier", "plan", "subscription"                                  │
│   • Project names if detected: "#product", "v2-pricing"            │
│   • People if mentioned: (none in this case)                        │
│   • Time expansion: last 30 days, last 90 days                      │
│                                                                      │
│ Output: 5-10 query variants                                         │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STAGE 3: CANDIDATE GATHERING (Parallel)                             │
│                                                                      │
│ ┌─────────────────────────┐    ┌─────────────────────────┐         │
│ │    KEYWORD SEARCH       │    │   SEMANTIC SEARCH       │         │
│ │    (BM25 / FTS)         │    │   (Vector similarity)   │         │
│ │                         │    │                         │         │
│ │ • Exact matches         │    │ • Conceptual matches    │         │
│ │ • Names, IDs            │    │ • Paraphrases           │         │
│ │ • Quoted terms          │    │ • Related ideas         │         │
│ │                         │    │                         │         │
│ │ Top K = 30              │    │ Top K = 30              │         │
│ └─────────────────────────┘    └─────────────────────────┘         │
│                                                                      │
│ Also search:                                                        │
│   • Episodic memory (decisions, learnings)                          │
│   • Profile memory (preferences, people)                            │
│                                                                      │
│ Output: ~60-100 candidate chunks                                    │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STAGE 4: MERGE & DEDUPE                                             │
│                                                                      │
│ • Combine results from all searches                                 │
│ • Remove exact duplicates                                           │
│ • Merge near-duplicates (>90% similar)                              │
│ • Preserve source diversity (don't let email dominate)              │
│                                                                      │
│ Output: ~40-60 unique candidates                                    │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STAGE 5: RERANKING                                                  │
│                                                                      │
│ Score each candidate on multiple factors:                           │
│                                                                      │
│ ┌──────────────────┬────────┬───────────────────────────────────┐  │
│ │ Factor           │ Weight │ Description                        │  │
│ ├──────────────────┼────────┼───────────────────────────────────┤  │
│ │ Query relevance  │ 0.40   │ How well does it match the ask?   │  │
│ │ Recency          │ 0.20   │ More recent = higher score        │  │
│ │ Source importance│ 0.15   │ Email from CEO > random Slack     │  │
│ │ Thread context   │ 0.10   │ Part of relevant thread?          │  │
│ │ Decision marker  │ 0.10   │ Contains decision language?       │  │
│ │ Your engagement  │ 0.05   │ Did you reply? Star? React?       │  │
│ └──────────────────┴────────┴───────────────────────────────────┘  │
│                                                                      │
│ Reranking methods:                                                  │
│   • Simple: weighted scoring (fast, V1)                             │
│   • Advanced: cross-encoder reranker (slower, more accurate)        │
│   • LLM-based: ask model to rank (slowest, best quality)            │
│                                                                      │
│ Output: Candidates sorted by final score                            │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STAGE 6: CONTEXT PACKING                                            │
│                                                                      │
│ Budget: ~8000 tokens for context (leaves room for system + response)│
│                                                                      │
│ Strategy:                                                           │
│   1. Include top 3-5 candidates VERBATIM (full text)               │
│   2. Summarize next 5-10 into tight bullets                         │
│   3. List remaining as "also found: [titles/subjects]"              │
│   4. Add relevant memories (profile + episodic)                     │
│   5. Ensure source diversity                                        │
│                                                                      │
│ Format:                                                             │
│ ┌───────────────────────────────────────────────────────────────┐  │
│ │ RELEVANT CONTEXT:                                              │  │
│ │                                                                │  │
│ │ [SOURCE: slack #product, 2024-01-10]                          │  │
│ │ <full message text>                                            │  │
│ │                                                                │  │
│ │ [SOURCE: email from Sarah, 2024-01-08]                        │  │
│ │ <full email text>                                              │  │
│ │                                                                │  │
│ │ [SOURCE: episodic memory, 2024-01-05]                         │  │
│ │ Decision: Agreed to use tiered pricing model because...        │  │
│ │                                                                │  │
│ │ ADDITIONAL CONTEXT (summarized):                               │  │
│ │ • Jan 3: Initial pricing discussion in #product                │  │
│ │ • Jan 2: Mike suggested freemium approach                      │  │
│ │ • Dec 28: Competitor analysis shared                           │  │
│ │                                                                │  │
│ │ ALSO FOUND (may be relevant):                                  │  │
│ │ • "Q4 Revenue Planning" doc                                    │  │
│ │ • Thread with finance team                                     │  │
│ └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│ Output: Packed context string within token budget                   │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        TO LLM FOR RESPONSE                          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Details

### Stage 1: Intent Detection

```typescript
const INTENTS = ['draft', 'summarize', 'search', 'plan', 'reflect', 'chat'] as const;

async function detectIntent(query: string): Promise<Intent> {
  // Simple keyword matching for V1
  const patterns = {
    draft: /\b(draft|write|compose|reply|respond)\b/i,
    summarize: /\b(summarize|summary|what.*miss|catch.*up|digest)\b/i,
    search: /\b(find|search|look.*for|where.*is|show.*me)\b/i,
    plan: /\b(plan|priorit|schedule|what.*should|todo|task)\b/i,
    reflect: /\b(decide|decided|decision|why.*did|what.*did.*i|last.*time)\b/i,
  };
  
  for (const [intent, pattern] of Object.entries(patterns)) {
    if (pattern.test(query)) {
      return intent as Intent;
    }
  }
  
  return 'chat';
}

// V2: Use LLM for more nuanced detection
async function detectIntentLLM(query: string): Promise<Intent> {
  const response = await llm.complete({
    model: 'gpt-3.5-turbo',
    messages: [{
      role: 'system',
      content: `Classify the user intent: ${INTENTS.join(', ')}`
    }, {
      role: 'user', 
      content: query
    }],
    max_tokens: 10
  });
  
  return response.content as Intent;
}
```

### Stage 2: Query Expansion

```typescript
interface ExpandedQuery {
  original: string;
  synonyms: string[];
  relatedTerms: string[];
  people: string[];
  projects: string[];
  timeWindows: TimeWindow[];
}

async function expandQuery(query: string): Promise<ExpandedQuery> {
  // Extract entities
  const people = extractPeopleNames(query);
  const projects = extractProjectNames(query);
  
  // Generate synonyms (can use LLM or thesaurus)
  const synonyms = await generateSynonyms(query);
  
  // Detect time references
  const timeWindows = extractTimeWindows(query);
  
  // Add default time window if none specified
  if (timeWindows.length === 0) {
    timeWindows.push({ days: 30 }, { days: 90 });
  }
  
  return {
    original: query,
    synonyms,
    relatedTerms: await getRelatedTerms(query),
    people,
    projects,
    timeWindows
  };
}
```

### Stage 3: Candidate Gathering

```typescript
interface SearchResult {
  id: string;
  source: EventSource;
  text: string;
  timestamp: Date;
  score: number;
  matchType: 'keyword' | 'semantic' | 'memory';
}

async function gatherCandidates(
  expanded: ExpandedQuery, 
  userId: string
): Promise<SearchResult[]> {
  // Run searches in parallel
  const [keywordResults, semanticResults, memoryResults] = await Promise.all([
    keywordSearch(expanded, userId, 30),
    semanticSearch(expanded, userId, 30),
    memorySearch(expanded, userId, 10)
  ]);
  
  return [...keywordResults, ...semanticResults, ...memoryResults];
}

// Keyword search using PostgreSQL full-text
async function keywordSearch(
  expanded: ExpandedQuery, 
  userId: string, 
  limit: number
): Promise<SearchResult[]> {
  const allTerms = [
    expanded.original,
    ...expanded.synonyms,
    ...expanded.relatedTerms
  ];
  
  const tsQuery = allTerms.join(' | '); // OR query
  
  return db.query(`
    SELECT id, source, text, timestamp,
           ts_rank(to_tsvector('english', text), to_tsquery($1)) as score
    FROM events
    WHERE user_id = $2
      AND is_sensitive = false
      AND to_tsvector('english', text) @@ to_tsquery($1)
    ORDER BY score DESC, timestamp DESC
    LIMIT $3
  `, [tsQuery, userId, limit]);
}

// Semantic search using pgvector
async function semanticSearch(
  expanded: ExpandedQuery, 
  userId: string, 
  limit: number
): Promise<SearchResult[]> {
  // Embed the query
  const embedding = await embedder.embed(expanded.original);
  
  return db.query(`
    SELECT id, source, text, timestamp,
           1 - (embedding <=> $1) as score
    FROM events
    WHERE user_id = $2
      AND is_sensitive = false
      AND embedding IS NOT NULL
    ORDER BY embedding <=> $1
    LIMIT $3
  `, [embedding, userId, limit]);
}
```

### Stage 4: Merge & Dedupe

```typescript
async function mergeAndDedupe(
  candidates: SearchResult[]
): Promise<SearchResult[]> {
  const seen = new Map<string, SearchResult>();
  
  for (const candidate of candidates) {
    // Check for exact duplicate
    if (seen.has(candidate.id)) {
      // Keep the one with higher score
      if (candidate.score > seen.get(candidate.id)!.score) {
        seen.set(candidate.id, candidate);
      }
      continue;
    }
    
    // Check for near-duplicate (>90% text similarity)
    let isDupe = false;
    for (const [, existing] of seen) {
      if (textSimilarity(candidate.text, existing.text) > 0.9) {
        isDupe = true;
        break;
      }
    }
    
    if (!isDupe) {
      seen.set(candidate.id, candidate);
    }
  }
  
  return Array.from(seen.values());
}

function textSimilarity(a: string, b: string): number {
  // Jaccard similarity on word sets
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
  const union = new Set([...wordsA, ...wordsB]);
  
  return intersection.size / union.size;
}
```

### Stage 5: Reranking

```typescript
interface RerankFactors {
  queryRelevance: number;  // 0-1
  recency: number;         // 0-1
  sourceImportance: number; // 0-1
  threadContext: number;   // 0-1
  decisionMarker: number;  // 0-1
  userEngagement: number;  // 0-1
}

const WEIGHTS = {
  queryRelevance: 0.40,
  recency: 0.20,
  sourceImportance: 0.15,
  threadContext: 0.10,
  decisionMarker: 0.10,
  userEngagement: 0.05
};

async function rerank(
  candidates: SearchResult[],
  query: string,
  intent: Intent
): Promise<SearchResult[]> {
  const scored = await Promise.all(
    candidates.map(async (c) => ({
      ...c,
      finalScore: await computeFinalScore(c, query, intent)
    }))
  );
  
  return scored.sort((a, b) => b.finalScore - a.finalScore);
}

async function computeFinalScore(
  candidate: SearchResult,
  query: string,
  intent: Intent
): Promise<number> {
  const factors: RerankFactors = {
    queryRelevance: candidate.score, // Already computed
    recency: computeRecencyScore(candidate.timestamp),
    sourceImportance: await computeSourceImportance(candidate),
    threadContext: await computeThreadContext(candidate, query),
    decisionMarker: computeDecisionMarker(candidate.text, intent),
    userEngagement: await computeUserEngagement(candidate)
  };
  
  // Weighted sum
  let score = 0;
  for (const [factor, weight] of Object.entries(WEIGHTS)) {
    score += factors[factor as keyof RerankFactors] * weight;
  }
  
  return score;
}

function computeRecencyScore(timestamp: Date): number {
  const daysAgo = (Date.now() - timestamp.getTime()) / (1000 * 60 * 60 * 24);
  
  // Exponential decay: score = e^(-days/30)
  return Math.exp(-daysAgo / 30);
}

function computeDecisionMarker(text: string, intent: Intent): number {
  if (intent !== 'reflect') return 0;
  
  const decisionPatterns = [
    /\b(decided|decision|agreed|concluded|determined)\b/i,
    /\b(we('ll| will)|going (to|with)|let's)\b/i,
    /\b(final|official|confirmed)\b/i
  ];
  
  const matches = decisionPatterns.filter(p => p.test(text)).length;
  return Math.min(matches / 3, 1);
}
```

### Stage 6: Context Packing

```typescript
interface PackedContext {
  fullContent: ContextChunk[];
  summarized: string[];
  alsoFound: string[];
  memories: string[];
  totalTokens: number;
}

const TOKEN_BUDGET = 8000;
const TOKENS_PER_FULL = 500;    // Reserve per full chunk
const TOKENS_PER_SUMMARY = 50;  // Reserve per summary item

async function packContext(
  ranked: SearchResult[],
  memories: Memory[]
): Promise<PackedContext> {
  const packed: PackedContext = {
    fullContent: [],
    summarized: [],
    alsoFound: [],
    memories: [],
    totalTokens: 0
  };
  
  // 1. Add memories first (usually small)
  for (const memory of memories) {
    const memoryText = formatMemory(memory);
    packed.memories.push(memoryText);
    packed.totalTokens += countTokens(memoryText);
  }
  
  // 2. Add full content for top candidates
  let fullCount = 0;
  for (const candidate of ranked) {
    if (packed.totalTokens + TOKENS_PER_FULL > TOKEN_BUDGET * 0.6) break;
    if (fullCount >= 5) break;
    
    const chunk = formatFullChunk(candidate);
    packed.fullContent.push(chunk);
    packed.totalTokens += countTokens(chunk.text);
    fullCount++;
  }
  
  // 3. Summarize next batch
  const toSummarize = ranked.slice(fullCount, fullCount + 10);
  if (toSummarize.length > 0) {
    const summaries = await summarizeBatch(toSummarize);
    for (const summary of summaries) {
      if (packed.totalTokens + TOKENS_PER_SUMMARY > TOKEN_BUDGET * 0.85) break;
      packed.summarized.push(summary);
      packed.totalTokens += countTokens(summary);
    }
  }
  
  // 4. List remaining as "also found"
  const remaining = ranked.slice(fullCount + toSummarize.length);
  for (const candidate of remaining.slice(0, 10)) {
    packed.alsoFound.push(formatAlsoFound(candidate));
  }
  
  return packed;
}

function formatFullChunk(result: SearchResult): ContextChunk {
  return {
    text: `[SOURCE: ${result.source}, ${formatDate(result.timestamp)}]\n${result.text}`,
    source: result.source,
    timestamp: result.timestamp,
    id: result.id
  };
}

async function summarizeBatch(results: SearchResult[]): Promise<string[]> {
  const response = await llm.complete({
    model: 'gpt-3.5-turbo',
    messages: [{
      role: 'system',
      content: 'Summarize each item in one bullet point. Be concise.'
    }, {
      role: 'user',
      content: results.map(r => 
        `[${r.source}, ${formatDate(r.timestamp)}]: ${r.text}`
      ).join('\n\n')
    }],
    max_tokens: 500
  });
  
  return response.content.split('\n').filter(Boolean);
}
```

---

## Configuration Parameters

```typescript
const RETRIEVAL_CONFIG = {
  // Candidate gathering
  keywordTopK: 30,
  semanticTopK: 30,
  memoryTopK: 10,
  
  // Deduplication
  similarityThreshold: 0.9,
  
  // Reranking weights
  weights: {
    queryRelevance: 0.40,
    recency: 0.20,
    sourceImportance: 0.15,
    threadContext: 0.10,
    decisionMarker: 0.10,
    userEngagement: 0.05
  },
  
  // Context packing
  tokenBudget: 8000,
  maxFullChunks: 5,
  maxSummarized: 10,
  maxAlsoFound: 10,
  
  // Time decay
  recencyHalfLife: 30, // days
  
  // Source importance (base scores)
  sourceBaseImportance: {
    email: 0.7,
    slack: 0.5,
    document: 0.6,
    calendar: 0.4,
    note: 0.5,
    manual: 0.8
  }
};
```

---

## Provenance & Citations

Every factual claim must be traceable.

### Citation Format

```typescript
interface Citation {
  id: string;
  source: EventSource;
  timestamp: Date;
  snippet: string;      // Brief excerpt
  confidence: 'direct' | 'inferred';
}

// In responses, citations appear as:
// "You decided to use tiered pricing [1] because of the competitor analysis [2]."
// 
// [1] slack #product, Jan 10: "Let's go with tiered..."
// [2] email from Sarah, Jan 8: "Competitor X uses..."
```

### Inference Labeling

When the assistant makes an inference (not directly stated):

```
"Based on your recent emails, it seems like you're leaning toward option B 
[INFERENCE - not explicitly stated, based on tone in emails #123, #124]"
```

---

## Performance Optimization

### Caching Strategy

```typescript
// Cache recent search results (5 min TTL)
const searchCache = new Map<string, {results: SearchResult[], timestamp: number}>();

async function cachedSearch(query: string, userId: string): Promise<SearchResult[]> {
  const cacheKey = `${userId}:${hash(query)}`;
  const cached = searchCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
    return cached.results;
  }
  
  const results = await fullSearch(query, userId);
  searchCache.set(cacheKey, {results, timestamp: Date.now()});
  return results;
}
```

### Parallel Execution

```typescript
// Always run keyword and semantic search in parallel
const [keyword, semantic, memory] = await Promise.all([
  keywordSearch(query, userId),
  semanticSearch(query, userId),
  memorySearch(query, userId)
]);
```

### Precomputation

- Embeddings generated async on ingest (not at query time)
- Thread summaries cached and updated incrementally
- Source importance scores computed daily

---

## Metrics & Monitoring

### Retrieval Quality Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Precision@5 | > 0.8 | User marks relevant/not relevant |
| Recall | > 0.9 | "Did this miss anything?" feedback |
| Latency P50 | < 500ms | Timing logs |
| Latency P99 | < 2000ms | Timing logs |

### Logging

```typescript
interface RetrievalLog {
  queryId: string;
  userId: string;
  query: string;
  intent: Intent;
  candidateCount: number;
  finalCount: number;
  latencyMs: number;
  sources: {[key in EventSource]: number};
  feedback?: {
    relevant: string[];
    notRelevant: string[];
    missed: string[];
  };
}
```
