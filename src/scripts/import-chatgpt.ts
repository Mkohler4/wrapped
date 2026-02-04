#!/usr/bin/env tsx
/**
 * ChatGPT Import Script
 * 
 * Usage:
 *   pnpm run import:chatgpt ./path/to/export.zip
 *   pnpm run import:chatgpt ./path/to/export.zip --dry-run
 *   pnpm run import:chatgpt ./path/to/export.zip --min-messages 3 --since 2024-01-01
 */

import { runImportCLI } from '../ingest/chatgpt/importer';

const args = process.argv.slice(2);

runImportCLI(args).catch(error => {
  console.error('Import failed:', error);
  process.exit(1);
});

