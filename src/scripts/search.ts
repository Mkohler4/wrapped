#!/usr/bin/env tsx
/**
 * Search CLI
 * 
 * Search your imported data using hybrid search (keyword + semantic).
 * 
 * Usage:
 *   npm run search "what did I decide about pricing"
 *   npm run search "typescript best practices" --limit 5
 *   npm run search "startup advice" --semantic-only
 *   npm run search "database" --keyword-only
 */

import 'dotenv/config';
import { embed } from '../lib/embeddings';
import { checkConnection, closePool, query } from '../lib/db';

interface SearchResult {
  id: string;
  text: string;
  timestamp: Date;
  source: string;
  thread_subject: string | null;
  topic_tags: string[];
  score: number;
  match_type: 'keyword' | 'semantic' | 'hybrid';
}

interface KeywordResult {
  id: string;
  text: string;
  timestamp: Date;
  source: string;
  thread_subject: string | null;
  topic_tags: string[];
  rank: number;
}

interface SemanticResult {
  id: string;
  text: string;
  timestamp: Date;
  source: string;
  thread_subject: string | null;
  topic_tags: string[];
  similarity: number;
}

async function main() {
  const args = process.argv.slice(2);
  
  // Find query (first non-flag argument)
  const queryIdx = args.findIndex(a => !a.startsWith('--'));
  const searchQuery = queryIdx !== -1 ? args[queryIdx] : null;
  
  if (!searchQuery) {
    console.error('Usage: npm run search "<query>" [options]');
    console.error('');
    console.error('Options:');
    console.error('  --limit N         Number of results (default: 10)');
    console.error('  --semantic-only   Only use vector search');
    console.error('  --keyword-only    Only use keyword search');
    console.error('');
    console.error('Examples:');
    console.error('  npm run search "what did I decide about pricing"');
    console.error('  npm run search "typescript patterns" --limit 5');
    process.exit(1);
  }
  
  // Parse options
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : 10;
  const semanticOnly = args.includes('--semantic-only');
  const keywordOnly = args.includes('--keyword-only');
  
  // Check required environment variables
  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL environment variable is required');
    process.exit(1);
  }
  
  if (!keywordOnly && !process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY required for semantic search');
    console.error('Use --keyword-only to search without embeddings');
    process.exit(1);
  }
  
  // Check database connection
  const dbOk = await checkConnection();
  if (!dbOk) {
    console.error('Error: Could not connect to database');
    process.exit(1);
  }
  
  try {
    console.log(`\n🔍 Searching: "${searchQuery}"\n`);
    
    let results: SearchResult[] = [];
    
    if (keywordOnly) {
      // Keyword-only search
      results = await keywordSearch(searchQuery, limit);
    } else if (semanticOnly) {
      // Semantic-only search
      results = await semanticSearch(searchQuery, limit);
    } else {
      // Hybrid search (combine both)
      results = await hybridSearch(searchQuery, limit);
    }
    
    if (results.length === 0) {
      console.log('No results found.');
      return;
    }
    
    // Display results
    console.log(`Found ${results.length} results:\n`);
    console.log('─'.repeat(80));
    
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      displayResult(i + 1, result);
    }
    
  } catch (error) {
    console.error('Search failed:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

async function keywordSearch(searchQuery: string, limit: number): Promise<SearchResult[]> {
  const result = await query<KeywordResult>(`
    SELECT 
      e.id,
      e.text,
      e.timestamp,
      e.source,
      t.subject as thread_subject,
      e.topic_tags,
      ts_rank(to_tsvector('english', e.text), plainto_tsquery('english', $1)) as rank
    FROM events e
    LEFT JOIN threads t ON e.thread_id = t.id
    WHERE to_tsvector('english', e.text) @@ plainto_tsquery('english', $1)
      AND e.is_sensitive = false
      AND e.permissions != 'private'
    ORDER BY rank DESC, e.timestamp DESC
    LIMIT $2
  `, [searchQuery, limit]);
  
  return result.rows.map(r => ({
    ...r,
    score: r.rank,
    match_type: 'keyword' as const,
  }));
}

async function semanticSearch(searchQuery: string, limit: number): Promise<SearchResult[]> {
  // Generate embedding for query
  const queryEmbedding = await embed(searchQuery);
  
  const result = await query<SemanticResult>(`
    SELECT 
      e.id,
      e.text,
      e.timestamp,
      e.source,
      t.subject as thread_subject,
      e.topic_tags,
      1 - (e.embedding <=> $1::vector) as similarity
    FROM events e
    LEFT JOIN threads t ON e.thread_id = t.id
    WHERE e.embedding IS NOT NULL
      AND e.is_sensitive = false
      AND e.permissions != 'private'
    ORDER BY e.embedding <=> $1::vector
    LIMIT $2
  `, [`[${queryEmbedding.join(',')}]`, limit]);
  
  return result.rows.map(r => ({
    ...r,
    score: r.similarity,
    match_type: 'semantic' as const,
  }));
}

async function hybridSearch(searchQuery: string, limit: number): Promise<SearchResult[]> {
  // Run both searches
  const [keywordResults, semanticResults] = await Promise.all([
    keywordSearch(searchQuery, limit * 2),
    semanticSearch(searchQuery, limit * 2),
  ]);
  
  // Combine and dedupe results using Reciprocal Rank Fusion (RRF)
  const k = 60; // RRF constant
  const scores = new Map<string, { result: SearchResult; score: number }>();
  
  // Add keyword results
  keywordResults.forEach((result, rank) => {
    const rrfScore = 1 / (k + rank + 1);
    const existing = scores.get(result.id);
    if (existing) {
      existing.score += rrfScore;
      existing.result.match_type = 'hybrid';
    } else {
      scores.set(result.id, { result: { ...result, match_type: 'keyword' }, score: rrfScore });
    }
  });
  
  // Add semantic results
  semanticResults.forEach((result, rank) => {
    const rrfScore = 1 / (k + rank + 1);
    const existing = scores.get(result.id);
    if (existing) {
      existing.score += rrfScore;
      existing.result.match_type = 'hybrid';
    } else {
      scores.set(result.id, { result: { ...result, match_type: 'semantic' }, score: rrfScore });
    }
  });
  
  // Sort by combined score and return top results
  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ result, score }) => ({ ...result, score }));
}

function displayResult(index: number, result: SearchResult) {
  const date = new Date(result.timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  
  // Match type badge
  const badge = {
    keyword: '📝',
    semantic: '🧠',
    hybrid: '⚡',
  }[result.match_type];
  
  // Thread/conversation title
  const title = result.thread_subject || '(untitled conversation)';
  
  // Truncate text for display
  const maxLength = 300;
  let text = result.text.replace(/\s+/g, ' ').trim();
  if (text.length > maxLength) {
    text = text.slice(0, maxLength) + '...';
  }
  
  // Tags
  const tags = result.topic_tags?.length > 0 
    ? result.topic_tags.map(t => `#${t}`).join(' ') 
    : '';
  
  console.log(`${badge} [${index}] ${title}`);
  console.log(`   📅 ${date}  ${tags ? `🏷️ ${tags}` : ''}`);
  console.log(`   ${text}`);
  console.log('─'.repeat(80));
}

main();

