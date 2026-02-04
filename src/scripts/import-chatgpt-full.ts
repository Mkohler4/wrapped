#!/usr/bin/env tsx
/**
 * Full ChatGPT Import Script
 * 
 * Imports ChatGPT data with embeddings into PostgreSQL.
 * 
 * Usage:
 *   npm run import:chatgpt:full ./path/to/export.zip
 *   npm run import:chatgpt:full ./path/to/export.zip --skip-embeddings
 */

import 'dotenv/config';
import { ChatGPTImporter } from '../ingest/chatgpt/importer';
import { createDatabaseClient } from '../lib/db-client';
import { embeddingClient } from '../lib/embeddings';
import { checkConnection, closePool, query } from '../lib/db';

async function main() {
  const args = process.argv.slice(2);
  const sourcePath = args[0];
  
  if (!sourcePath) {
    console.error('Usage: npm run import:chatgpt:full <path-to-export.zip> [options]');
    console.error('Options:');
    console.error('  --skip-embeddings   Import without generating embeddings');
    console.error('  --min-messages N    Min user messages to import (default: 2)');
    console.error('  --since YYYY-MM-DD  Only import conversations after date');
    process.exit(1);
  }
  
  // Check required environment variables
  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL environment variable is required');
    console.error('Create a .env file with:');
    console.error('  DATABASE_URL=postgresql://operator:operator_dev_password@localhost:5432/personal_operator');
    process.exit(1);
  }
  
  const skipEmbeddings = args.includes('--skip-embeddings');
  
  if (!skipEmbeddings && !process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY environment variable is required for embeddings');
    console.error('Either set OPENAI_API_KEY or use --skip-embeddings flag');
    process.exit(1);
  }
  
  // Parse options
  const minMessagesIdx = args.indexOf('--min-messages');
  const minMessages = minMessagesIdx !== -1 ? parseInt(args[minMessagesIdx + 1], 10) : 2;
  
  const sinceIdx = args.indexOf('--since');
  const since = sinceIdx !== -1 ? new Date(args[sinceIdx + 1]) : undefined;
  
  console.log('ChatGPT Full Import');
  console.log('===================');
  console.log(`Source: ${sourcePath}`);
  console.log(`Skip embeddings: ${skipEmbeddings}`);
  console.log(`Min messages: ${minMessages}`);
  if (since) console.log(`Since: ${since.toISOString()}`);
  console.log('');
  
  // Check database connection
  console.log('Checking database connection...');
  const dbOk = await checkConnection();
  if (!dbOk) {
    console.error('Error: Could not connect to database');
    console.error('Make sure PostgreSQL is running: npm run db:start');
    process.exit(1);
  }
  console.log('Database connected ✓');
  
  // Create or get user
  const userEmail = process.env.USER_EMAIL || 'user@personal-operator.local';
  const userName = process.env.USER_NAME || 'Personal Operator User';
  
  const userResult = await query(`
    INSERT INTO users (email, name)
    VALUES ($1, $2)
    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `, [userEmail, userName]);
  
  const userId = userResult.rows[0].id;
  console.log(`User ID: ${userId}`);
  console.log('');
  
  // Create importer
  const db = createDatabaseClient();
  
  const importer = new ChatGPTImporter({
    db,
    embedder: embeddingClient,
    userId,
  });
  
  // Progress logging
  importer.on('progress', (progress) => {
    if (progress.stage === 'embedding') {
      process.stdout.write(`\rEmbedding: ${progress.conversationsProcessed}/${progress.conversationsTotal} conversations...`);
    } else if (progress.stage === 'persisting') {
      process.stdout.write(`\rPersisting: ${progress.eventsCreated} events created...`);
    } else {
      console.log(`Stage: ${progress.stage}`);
    }
  });
  
  // Run import
  try {
    const result = await importer.import(sourcePath, {
      minMessages,
      since,
      skipEmbeddings,
      dryRun: false,
    });
    
    console.log('\n');
    console.log('Import Complete!');
    console.log('================');
    console.log(`Conversations imported: ${result.conversationsImported}`);
    console.log(`Conversations skipped: ${result.conversationsSkipped}`);
    console.log(`Events created: ${result.eventsCreated}`);
    console.log(`Memories queued: ${result.memoriesQueued}`);
    console.log(`Duration: ${(result.durationMs / 1000).toFixed(1)}s`);
    console.log('');
    console.log('Topic distribution:');
    for (const [topic, count] of Object.entries(result.topicDistribution).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${topic}: ${count}`);
    }
    console.log('');
    console.log(`Date range: ${result.dateRange.earliest.toLocaleDateString()} - ${result.dateRange.latest.toLocaleDateString()}`);
    
    if (result.errors.length > 0) {
      console.log('');
      console.log(`Errors (${result.errors.length}):`);
      for (const error of result.errors.slice(0, 10)) {
        console.log(`  - ${error}`);
      }
      if (result.errors.length > 10) {
        console.log(`  ... and ${result.errors.length - 10} more`);
      }
    }
    
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

main();

