/**
 * Embedding Client
 * 
 * Generate embeddings using OpenAI's text-embedding-3-small model.
 */

import OpenAI from 'openai';

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    client = new OpenAI({ apiKey });
  }
  return client;
}

const MODEL = 'text-embedding-3-small';
const DIMENSIONS = 1536;
const MAX_BATCH_SIZE = 100;
const MAX_TOKENS_PER_TEXT = 8191;

/**
 * Generate embedding for a single text.
 */
export async function embed(text: string): Promise<number[]> {
  const client = getClient();
  
  // Truncate if too long
  const truncated = truncateText(text, MAX_TOKENS_PER_TEXT);
  
  const response = await client.embeddings.create({
    model: MODEL,
    input: truncated,
    dimensions: DIMENSIONS,
  });
  
  return response.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts in batch.
 * More efficient than calling embed() multiple times.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const client = getClient();
  
  // Process in chunks of MAX_BATCH_SIZE
  const results: number[][] = [];
  
  for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
    const batch = texts.slice(i, i + MAX_BATCH_SIZE);
    const truncated = batch.map(t => truncateText(t, MAX_TOKENS_PER_TEXT));
    
    const response = await client.embeddings.create({
      model: MODEL,
      input: truncated,
      dimensions: DIMENSIONS,
    });
    
    // Results come back in same order as input
    for (const item of response.data) {
      results.push(item.embedding);
    }
    
    // Rate limiting: small delay between batches
    if (i + MAX_BATCH_SIZE < texts.length) {
      await sleep(100);
    }
  }
  
  return results;
}

/**
 * Rough token count estimation (4 chars ≈ 1 token).
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Truncate text to fit within token limit.
 */
function truncateText(text: string, maxTokens: number): string {
  const estimated = estimateTokens(text);
  if (estimated <= maxTokens) {
    return text;
  }
  
  // Truncate to approximate character limit
  const maxChars = maxTokens * 4;
  return text.slice(0, maxChars);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Export for type compatibility with importer
export const embeddingClient = {
  embed,
  embedBatch,
};

