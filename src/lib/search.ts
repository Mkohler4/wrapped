/**
 * Search Service
 * 
 * Hybrid search combining keyword (PostgreSQL FTS) and semantic (pgvector) search.
 * Uses Reciprocal Rank Fusion (RRF) to combine results.
 */

import { embed } from './embeddings';
import { query } from './db';

// ============================================
// TYPES
// ============================================

export interface SearchOptions {
  query: string;
  userId?: string;
  limit?: number;
  mode?: 'hybrid' | 'keyword' | 'semantic';
  filters?: {
    source?: string;
    topicTags?: string[];
    since?: Date;
    until?: Date;
  };
}

export interface SearchResult {
  id: string;
  text: string;
  timestamp: Date;
  source: string;
  threadId: string | null;
  threadSubject: string | null;
  topicTags: string[];
  metadata: Record<string, unknown>;
  score: number;
  matchType: 'keyword' | 'semantic' | 'hybrid';
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
  mode: 'hybrid' | 'keyword' | 'semantic';
  timing: {
    total: number;
    keyword?: number;
    semantic?: number;
  };
}

interface KeywordRow {
  id: string;
  text: string;
  timestamp: Date;
  source: string;
  thread_id: string | null;
  thread_subject: string | null;
  topic_tags: string[];
  metadata: Record<string, unknown>;
  rank: number;
}

interface SemanticRow {
  id: string;
  text: string;
  timestamp: Date;
  source: string;
  thread_id: string | null;
  thread_subject: string | null;
  topic_tags: string[];
  metadata: Record<string, unknown>;
  similarity: number;
}

// ============================================
// MAIN SEARCH FUNCTION
// ============================================

export async function search(options: SearchOptions): Promise<SearchResponse> {
  const {
    query: searchQuery,
    userId,
    limit = 10,
    mode = 'hybrid',
    filters = {},
  } = options;

  const startTime = Date.now();
  const timing: SearchResponse['timing'] = { total: 0 };

  let results: SearchResult[];

  if (mode === 'keyword') {
    const keywordStart = Date.now();
    results = await keywordSearch(searchQuery, limit, userId, filters);
    timing.keyword = Date.now() - keywordStart;
  } else if (mode === 'semantic') {
    const semanticStart = Date.now();
    results = await semanticSearch(searchQuery, limit, userId, filters);
    timing.semantic = Date.now() - semanticStart;
  } else {
    // Hybrid search
    const keywordStart = Date.now();
    const keywordPromise = keywordSearch(searchQuery, limit * 2, userId, filters);
    timing.keyword = Date.now() - keywordStart;

    const semanticStart = Date.now();
    const semanticPromise = semanticSearch(searchQuery, limit * 2, userId, filters);

    const [keywordResults, semanticResults] = await Promise.all([
      keywordPromise,
      semanticPromise,
    ]);
    timing.semantic = Date.now() - semanticStart;

    results = fuseResults(keywordResults, semanticResults, limit);
  }

  timing.total = Date.now() - startTime;

  return {
    results,
    total: results.length,
    query: searchQuery,
    mode,
    timing,
  };
}

// ============================================
// KEYWORD SEARCH
// ============================================

async function keywordSearch(
  searchQuery: string,
  limit: number,
  userId?: string,
  filters: SearchOptions['filters'] = {}
): Promise<SearchResult[]> {
  const params: (string | number | Date)[] = [searchQuery, limit];
  let paramIdx = 3;

  let whereClause = `
    to_tsvector('english', e.text) @@ plainto_tsquery('english', $1)
    AND e.is_sensitive = false
    AND e.permissions != 'private'
  `;

  if (userId) {
    whereClause += ` AND e.user_id = $${paramIdx}`;
    params.push(userId);
    paramIdx++;
  }

  if (filters.source) {
    whereClause += ` AND e.source = $${paramIdx}`;
    params.push(filters.source);
    paramIdx++;
  }

  if (filters.topicTags && filters.topicTags.length > 0) {
    whereClause += ` AND e.topic_tags && $${paramIdx}`;
    params.push(filters.topicTags as any);
    paramIdx++;
  }

  if (filters.since) {
    whereClause += ` AND e.timestamp >= $${paramIdx}`;
    params.push(filters.since);
    paramIdx++;
  }

  if (filters.until) {
    whereClause += ` AND e.timestamp <= $${paramIdx}`;
    params.push(filters.until);
    paramIdx++;
  }

  const result = await query<KeywordRow>(`
    SELECT 
      e.id,
      e.text,
      e.timestamp,
      e.source,
      e.thread_id,
      t.subject as thread_subject,
      e.topic_tags,
      e.metadata,
      ts_rank(to_tsvector('english', e.text), plainto_tsquery('english', $1)) as rank
    FROM events e
    LEFT JOIN threads t ON e.thread_id = t.id
    WHERE ${whereClause}
    ORDER BY rank DESC, e.timestamp DESC
    LIMIT $2
  `, params);

  return result.rows.map(row => ({
    id: row.id,
    text: row.text,
    timestamp: row.timestamp,
    source: row.source,
    threadId: row.thread_id,
    threadSubject: row.thread_subject,
    topicTags: row.topic_tags || [],
    metadata: row.metadata || {},
    score: row.rank,
    matchType: 'keyword' as const,
  }));
}

// ============================================
// SEMANTIC SEARCH
// ============================================

async function semanticSearch(
  searchQuery: string,
  limit: number,
  userId?: string,
  filters: SearchOptions['filters'] = {}
): Promise<SearchResult[]> {
  // Generate embedding for query
  const queryEmbedding = await embed(searchQuery);
  const embeddingStr = `[${queryEmbedding.join(',')}]`;

  const params: (string | number | Date)[] = [embeddingStr, limit];
  let paramIdx = 3;

  let whereClause = `
    e.embedding IS NOT NULL
    AND e.is_sensitive = false
    AND e.permissions != 'private'
  `;

  if (userId) {
    whereClause += ` AND e.user_id = $${paramIdx}`;
    params.push(userId);
    paramIdx++;
  }

  if (filters.source) {
    whereClause += ` AND e.source = $${paramIdx}`;
    params.push(filters.source);
    paramIdx++;
  }

  if (filters.topicTags && filters.topicTags.length > 0) {
    whereClause += ` AND e.topic_tags && $${paramIdx}`;
    params.push(filters.topicTags as any);
    paramIdx++;
  }

  if (filters.since) {
    whereClause += ` AND e.timestamp >= $${paramIdx}`;
    params.push(filters.since);
    paramIdx++;
  }

  if (filters.until) {
    whereClause += ` AND e.timestamp <= $${paramIdx}`;
    params.push(filters.until);
    paramIdx++;
  }

  const result = await query<SemanticRow>(`
    SELECT 
      e.id,
      e.text,
      e.timestamp,
      e.source,
      e.thread_id,
      t.subject as thread_subject,
      e.topic_tags,
      e.metadata,
      1 - (e.embedding <=> $1::vector) as similarity
    FROM events e
    LEFT JOIN threads t ON e.thread_id = t.id
    WHERE ${whereClause}
    ORDER BY e.embedding <=> $1::vector
    LIMIT $2
  `, params);

  return result.rows.map(row => ({
    id: row.id,
    text: row.text,
    timestamp: row.timestamp,
    source: row.source,
    threadId: row.thread_id,
    threadSubject: row.thread_subject,
    topicTags: row.topic_tags || [],
    metadata: row.metadata || {},
    score: row.similarity,
    matchType: 'semantic' as const,
  }));
}

// ============================================
// RECIPROCAL RANK FUSION
// ============================================

function fuseResults(
  keywordResults: SearchResult[],
  semanticResults: SearchResult[],
  limit: number
): SearchResult[] {
  const k = 60; // RRF constant
  const scores = new Map<string, { result: SearchResult; score: number }>();

  // Add keyword results
  keywordResults.forEach((result, rank) => {
    const rrfScore = 1 / (k + rank + 1);
    const existing = scores.get(result.id);
    if (existing) {
      existing.score += rrfScore;
      existing.result.matchType = 'hybrid';
    } else {
      scores.set(result.id, { 
        result: { ...result, matchType: 'keyword' }, 
        score: rrfScore 
      });
    }
  });

  // Add semantic results
  semanticResults.forEach((result, rank) => {
    const rrfScore = 1 / (k + rank + 1);
    const existing = scores.get(result.id);
    if (existing) {
      existing.score += rrfScore;
      existing.result.matchType = 'hybrid';
    } else {
      scores.set(result.id, { 
        result: { ...result, matchType: 'semantic' }, 
        score: rrfScore 
      });
    }
  });

  // Sort by combined score and return top results
  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ result, score }) => ({ ...result, score }));
}

