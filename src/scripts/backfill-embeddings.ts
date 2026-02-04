#!/usr/bin/env tsx
/**
 * Backfill Embeddings Script
 * 
 * Generate embeddings for existing events that don't have them.
 * Run this after importing data without embeddings.
 * 
 * Usage:
 *   npm run embeddings:backfill
 *   npm run embeddings:backfill --batch-size 50
 *   npm run embeddings:backfill --dry-run
 */

import 'dotenv/config';
import { embedBatch } from '../lib/embeddings';
import { checkConnection, closePool, query } from '../lib/db';

interface EventRow {
  id: string;
  text: string;
}

async function main() {
  const args = process.argv.slice(2);
  
  // Parse options
  const dryRun = args.includes('--dry-run');
  const batchSizeIdx = args.indexOf('--batch-size');
  const batchSize = batchSizeIdx !== -1 ? parseInt(args[batchSizeIdx + 1], 10) : 100;
  
  console.log('Embedding Backfill');
  console.log('==================');
  console.log(`Dry run: ${dryRun}`);
  console.log(`Batch size: ${batchSize}`);
  console.log('');
  
  // Check required environment variables
  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL environment variable is required');
    console.error('Example: DATABASE_URL=postgresql://operator:operator_dev_password@localhost:5433/personal_operator');
    process.exit(1);
  }
  
  if (!dryRun && !process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY environment variable is required for embeddings');
    console.error('Use --dry-run to preview without API key');
    process.exit(1);
  }
  
  // Check database connection
  console.log('Checking database connection...');
  const dbOk = await checkConnection();
  if (!dbOk) {
    console.error('Error: Could not connect to database');
    console.error('Make sure PostgreSQL is running: npm run db:start');
    process.exit(1);
  }
  console.log('Database connected ✓');
  console.log('');
  
  try {
    // Count events needing embeddings (only user messages, min 10 chars)
    const countResult = await query<{ count: string }>(`
      SELECT COUNT(*) as count 
      FROM events 
      WHERE embedding IS NULL 
        AND LENGTH(text) > 10
        AND (metadata->>'role' = 'user' OR metadata->>'role' IS NULL)
    `);
    
    const totalCount = parseInt(countResult.rows[0].count, 10);
    console.log(`Events needing embeddings: ${totalCount}`);
    
    if (totalCount === 0) {
      console.log('Nothing to do - all events have embeddings!');
      return;
    }
    
    // Estimate cost (text-embedding-3-small: ~$0.02 per 1M tokens)
    const avgCharsPerEvent = 1117; // From chatgpt-data-architecture.md
    const estimatedTokens = (totalCount * avgCharsPerEvent) / 4;
    const estimatedCost = (estimatedTokens / 1_000_000) * 0.02;
    console.log(`Estimated tokens: ~${(estimatedTokens / 1000).toFixed(0)}K`);
    console.log(`Estimated cost: ~$${estimatedCost.toFixed(2)}`);
    console.log('');
    
    if (dryRun) {
      console.log('(Dry run - no embeddings generated)');
      return;
    }
    
    // Process in batches
    let processed = 0;
    let errors = 0;
    const startTime = Date.now();
    
    while (processed < totalCount) {
      // Fetch batch of events
      const eventsResult = await query<EventRow>(`
        SELECT id, text
        FROM events 
        WHERE embedding IS NULL 
          AND LENGTH(text) > 10
          AND (metadata->>'role' = 'user' OR metadata->>'role' IS NULL)
        ORDER BY timestamp DESC
        LIMIT $1
      `, [batchSize]);
      
      if (eventsResult.rows.length === 0) {
        break;
      }
      
      const events = eventsResult.rows;
      const texts = events.map(e => prepareTextForEmbedding(e.text));
      
      try {
        // Generate embeddings
        const embeddings = await embedBatch(texts);
        
        // Update events with embeddings
        for (let i = 0; i < events.length; i++) {
          const event = events[i];
          const embedding = embeddings[i];
          
          await query(`
            UPDATE events 
            SET embedding = $1::vector
            WHERE id = $2
          `, [`[${embedding.join(',')}]`, event.id]);
        }
        
        processed += events.length;
        
        // Progress update
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = processed / elapsed;
        const remaining = (totalCount - processed) / rate;
        
        process.stdout.write(
          `\rProcessed: ${processed}/${totalCount} (${((processed / totalCount) * 100).toFixed(1)}%) - ` +
          `${rate.toFixed(1)}/sec - ETA: ${formatDuration(remaining)}`
        );
        
        // Rate limiting: small delay between batches
        await sleep(200);
        
      } catch (error) {
        errors++;
        console.error(`\nBatch error:`, error);
        
        // Continue with next batch
        if (errors > 10) {
          console.error('Too many errors, stopping');
          break;
        }
        
        await sleep(1000); // Longer delay after error
      }
    }
    
    console.log('\n');
    console.log('Backfill Complete!');
    console.log('==================');
    console.log(`Events processed: ${processed}`);
    console.log(`Errors: ${errors}`);
    console.log(`Duration: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
    
    // Verify
    const verifyResult = await query<{ with_embeddings: string; total: string }>(`
      SELECT 
        COUNT(embedding) as with_embeddings,
        COUNT(*) as total
      FROM events
    `);
    
    console.log('');
    console.log('Verification:');
    console.log(`  Events with embeddings: ${verifyResult.rows[0].with_embeddings}`);
    console.log(`  Total events: ${verifyResult.rows[0].total}`);
    
  } catch (error) {
    console.error('Backfill failed:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

function prepareTextForEmbedding(text: string): string {
  const maxLength = 8000;
  let prepared = text.slice(0, maxLength);
  prepared = prepared.replace(/\s+/g, ' ').trim();
  return prepared;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  } else if (seconds < 3600) {
    return `${Math.round(seconds / 60)}m`;
  } else {
    return `${(seconds / 3600).toFixed(1)}h`;
  }
}

main();

