#!/usr/bin/env npx ts-node

/**
 * Memory Review CLI
 * 
 * Review and approve/reject extracted memories from the queue.
 * 
 * Usage:
 *   npm run memory:review          # Interactive review
 *   npm run memory:list            # List pending memories
 *   npm run memory:approve <id>    # Approve specific memory
 *   npm run memory:reject <id>     # Reject specific memory
 *   npm run memory:clear-junk      # Auto-reject obvious false positives
 */

import 'dotenv/config';
import * as readline from 'readline';
import { query, closePool } from '../lib/db.js';

// ============================================
// TYPES
// ============================================

interface QueuedMemory {
  id: string;
  memory_type: 'profile' | 'episodic';
  proposed_data: {
    category?: string;
    key?: string;
    value?: string;
    type?: string;
    summary?: string;
    reasoning?: string;
    context?: string;
    timestamp?: string;
  };
  reason: string;
  created_at: Date;
}

// ============================================
// DATABASE OPERATIONS
// ============================================

async function getPendingMemories(limit = 50): Promise<QueuedMemory[]> {
  const result = await query<QueuedMemory>(
    `SELECT id, memory_type, proposed_data, reason, created_at 
     FROM memory_queue 
     WHERE status = 'pending'
     ORDER BY created_at ASC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

async function getPendingCount(): Promise<number> {
  const result = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM memory_queue WHERE status = 'pending'`
  );
  return parseInt(result.rows[0].count);
}

async function approveMemory(id: string): Promise<boolean> {
  const memory = await query<QueuedMemory>(
    `SELECT * FROM memory_queue WHERE id = $1`,
    [id]
  );
  
  if (memory.rows.length === 0) return false;
  
  const m = memory.rows[0];
  
  if (m.memory_type === 'profile') {
    // Map extracted categories to valid enum values
    // Valid: 'preference', 'person', 'default', 'rule'
    const categoryMap: Record<string, string> = {
      'technology': 'preference',
      'communication': 'preference',
      'work': 'preference',
      'style': 'preference',
      'tool': 'preference',
    };
    const category = categoryMap[m.proposed_data.category || ''] || 'preference';
    
    // Insert into profile_memory (source: 'inferred' from ChatGPT conversations)
    await query(
      `INSERT INTO profile_memory (user_id, category, key, value, source)
       SELECT user_id, $2, $3, $4, 'inferred'
       FROM memory_queue WHERE id = $1
       ON CONFLICT (user_id, category, key) DO UPDATE SET value = $4`,
      [id, category, m.proposed_data.key, m.proposed_data.value]
    );
  } else {
    // Insert into episodic_memory
    await query(
      `INSERT INTO episodic_memory (user_id, type, summary, context, timestamp)
       SELECT user_id, $2, $3, $4, COALESCE($5::timestamptz, NOW())
       FROM memory_queue WHERE id = $1`,
      [id, m.proposed_data.type || 'learning', m.proposed_data.summary, m.proposed_data.context, m.proposed_data.timestamp]
    );
  }
  
  // Mark as approved
  await query(
    `UPDATE memory_queue SET status = 'approved', reviewed_at = NOW() WHERE id = $1`,
    [id]
  );
  
  return true;
}

async function rejectMemory(id: string): Promise<boolean> {
  const result = await query(
    `UPDATE memory_queue SET status = 'rejected', reviewed_at = NOW() WHERE id = $1`,
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}

async function clearJunkMemories(): Promise<number> {
  // Auto-reject obvious false positives
  const junkPatterns = [
    // Single words that aren't real tools/preferences
    `proposed_data->>'value' IN ('that', 'this', 'the', 'it', 'a', 'an')`,
    // Very short values
    `LENGTH(proposed_data->>'value') < 3`,
    // Values that are questions
    `proposed_data->>'value' LIKE '%?%'`,
  ];
  
  let totalRejected = 0;
  
  for (const pattern of junkPatterns) {
    const result = await query(
      `UPDATE memory_queue 
       SET status = 'rejected', reviewed_at = NOW() 
       WHERE status = 'pending' AND ${pattern}`
    );
    totalRejected += result.rowCount ?? 0;
  }
  
  return totalRejected;
}

// ============================================
// DISPLAY HELPERS
// ============================================

function formatMemory(m: QueuedMemory, index: number): string {
  const lines: string[] = [];
  
  lines.push(`\n[${ index + 1}] ${m.memory_type.toUpperCase()} — ${m.id.slice(0, 8)}`);
  lines.push('─'.repeat(50));
  
  if (m.memory_type === 'profile') {
    lines.push(`  Category: ${m.proposed_data.category}`);
    lines.push(`  Key:      ${m.proposed_data.key}`);
    lines.push(`  Value:    ${m.proposed_data.value}`);
  } else {
    lines.push(`  Type:    ${m.proposed_data.type}`);
    lines.push(`  Summary: ${m.proposed_data.summary}`);
    if (m.proposed_data.context) {
      lines.push(`  Context: ${m.proposed_data.context}`);
    }
  }
  
  lines.push(`  Reason:  ${m.reason?.slice(0, 80)}...`);
  
  return lines.join('\n');
}

// ============================================
// COMMANDS
// ============================================

async function listCommand(): Promise<void> {
  const count = await getPendingCount();
  console.log(`\n📋 Pending memories: ${count}\n`);
  
  if (count === 0) {
    console.log('No memories to review!');
    return;
  }
  
  const memories = await getPendingMemories(20);
  
  for (let i = 0; i < memories.length; i++) {
    console.log(formatMemory(memories[i], i));
  }
  
  if (count > 20) {
    console.log(`\n... and ${count - 20} more`);
  }
  
  console.log('\nCommands:');
  console.log('  npm run memory:review       — Interactive review');
  console.log('  npm run memory:clear-junk   — Auto-reject false positives');
  console.log('  npm run memory:approve <id> — Approve specific memory');
  console.log('  npm run memory:reject <id>  — Reject specific memory');
}

async function reviewCommand(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = (q: string): Promise<string> => new Promise(r => rl.question(q, r));

  console.log('\n╔════════════════════════════════════════╗');
  console.log('║       Memory Review — Interactive      ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('\nCommands: [a]pprove, [r]eject, [s]kip, [q]uit\n');

  let reviewed = 0;
  let approved = 0;
  let rejected = 0;

  while (true) {
    const memories = await getPendingMemories(1);
    
    if (memories.length === 0) {
      console.log('\n✅ All memories reviewed!');
      break;
    }

    const m = memories[0];
    const remaining = await getPendingCount();
    
    console.log(`\n[${remaining} remaining]`);
    console.log(formatMemory(m, 0));
    
    const answer = await ask('\n→ [a]pprove / [r]eject / [s]kip / [q]uit: ');
    
    switch (answer.toLowerCase()) {
      case 'a':
        await approveMemory(m.id);
        console.log('✅ Approved');
        approved++;
        reviewed++;
        break;
      case 'r':
        await rejectMemory(m.id);
        console.log('❌ Rejected');
        rejected++;
        reviewed++;
        break;
      case 's':
        // Skip (move to end of queue by updating created_at)
        await query(`UPDATE memory_queue SET created_at = NOW() WHERE id = $1`, [m.id]);
        console.log('⏭️  Skipped');
        break;
      case 'q':
        console.log(`\n📊 Session: ${reviewed} reviewed (${approved} approved, ${rejected} rejected)`);
        rl.close();
        return;
      default:
        console.log('Unknown command');
    }
  }

  console.log(`\n📊 Session: ${reviewed} reviewed (${approved} approved, ${rejected} rejected)`);
  rl.close();
}

async function approveCommand(id: string): Promise<void> {
  const success = await approveMemory(id);
  if (success) {
    console.log(`✅ Memory ${id} approved`);
  } else {
    console.log(`❌ Memory ${id} not found`);
  }
}

async function rejectCommand(id: string): Promise<void> {
  const success = await rejectMemory(id);
  if (success) {
    console.log(`❌ Memory ${id} rejected`);
  } else {
    console.log(`❌ Memory ${id} not found`);
  }
}

async function clearJunkCommand(): Promise<void> {
  console.log('🧹 Clearing obvious false positives...');
  const count = await clearJunkMemories();
  console.log(`✅ Rejected ${count} junk memories`);
  
  const remaining = await getPendingCount();
  console.log(`📋 ${remaining} memories remaining for review`);
}

// ============================================
// MAIN
// ============================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || 'list';

  try {
    switch (command) {
      case 'list':
        await listCommand();
        break;
      case 'review':
        await reviewCommand();
        break;
      case 'approve':
        if (!args[1]) {
          console.log('Usage: npm run memory:approve <id>');
        } else {
          await approveCommand(args[1]);
        }
        break;
      case 'reject':
        if (!args[1]) {
          console.log('Usage: npm run memory:reject <id>');
        } else {
          await rejectCommand(args[1]);
        }
        break;
      case 'clear-junk':
        await clearJunkCommand();
        break;
      default:
        console.log('Unknown command. Use: list, review, approve, reject, clear-junk');
    }
  } finally {
    await closePool();
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

