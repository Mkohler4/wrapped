#!/usr/bin/env npx ts-node

/**
 * Task CLI
 * 
 * Command-line interface for natural task understanding.
 * 
 * Usage:
 *   npm run task "I need to finish the quarterly report"
 *   npm run task:list
 *   npm run task:show <task-id>
 *   npm run task:correct <utterance-id> <correct-task-id>
 */

import 'dotenv/config';
import { query, closePool } from '../lib/db.js';
import { processUtterance, correctTaskMatch } from '../tasks/index.js';
import type { Task, TaskRow } from '../tasks/types.js';
import { taskFromRow } from '../tasks/types.js';

// ============================================
// CONFIGURATION
// ============================================

// Default user ID (for testing - would come from auth in real system)
const DEFAULT_USER_ID = process.env.TEST_USER_ID || '8949a988-a1d0-4ceb-8ea5-9b2f120b2444';

// ============================================
// CLI COMMANDS
// ============================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    switch (command) {
      case '--list':
      case 'list':
        await listTasks();
        break;
        
      case '--show':
      case 'show':
        await showTask(args[1]);
        break;
        
      case '--correct':
      case 'correct':
        await correct(args[1], args[2]);
        break;
        
      case '--archive':
      case 'archive':
        await archiveTasks();
        break;
        
      case '--help':
      case 'help':
      case '-h':
        showHelp();
        break;
        
      default:
        // Treat as utterance to process
        if (command && !command.startsWith('-')) {
          const utterance = args.join(' ');
          await processNaturalUtterance(utterance);
        } else {
          showHelp();
        }
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

// ============================================
// COMMAND HANDLERS
// ============================================

async function processNaturalUtterance(text: string): Promise<void> {
  console.log(`\n🎤 Processing: "${text}"\n`);
  
  const response = await processUtterance(DEFAULT_USER_ID, { text });
  
  console.log('─'.repeat(50));
  console.log(`📝 Intent: ${response.intent} (${(response.intentConfidence * 100).toFixed(0)}% confidence)`);
  
  if (response.task) {
    console.log(`📋 Task: ${response.task.title}`);
    console.log(`   Status: ${response.task.status}`);
    console.log(`   ID: ${response.task.id}`);
    
    if (response.matchConfidence) {
      console.log(`   Match confidence: ${(response.matchConfidence * 100).toFixed(0)}%`);
    }
  }
  
  if (response.tasks && response.tasks.length > 0) {
    console.log('\n📋 Tasks:');
    for (const task of response.tasks) {
      console.log(`   • [${task.status}] ${task.title}`);
    }
  }
  
  console.log('─'.repeat(50));
  console.log(`💬 ${response.message}`);
  
  if (response.needsConfirmation) {
    console.log('\n⚠️  Low confidence match. Is this the right task? (y/n)');
  }
  
  console.log(`\n🔗 Session: ${response.sessionId}`);
  console.log(`📌 Utterance ID: ${response.utteranceId}`);
}

async function listTasks(): Promise<void> {
  console.log('\n📋 Active Tasks\n');
  console.log('─'.repeat(60));
  
  const result = await query<TaskRow>(
    `SELECT * FROM tasks 
     WHERE user_id = $1 
       AND status IN ('pending', 'active')
     ORDER BY 
       CASE status WHEN 'active' THEN 1 WHEN 'pending' THEN 2 END,
       priority DESC,
       updated_at DESC`,
    [DEFAULT_USER_ID]
  );
  
  if (result.rows.length === 0) {
    console.log('No active tasks. Say something like "I need to..." to create one.');
    return;
  }
  
  const tasks = result.rows.map(taskFromRow);
  
  for (const task of tasks) {
    const statusIcon = task.status === 'active' ? '🔵' : '⚪';
    const priorityStars = '★'.repeat(task.priority) + '☆'.repeat(5 - task.priority);
    
    console.log(`${statusIcon} ${task.title}`);
    console.log(`   Priority: ${priorityStars}  Status: ${task.status}`);
    console.log(`   ID: ${task.id}`);
    
    if (task.tags.length > 0) {
      console.log(`   Tags: ${task.tags.join(', ')}`);
    }
    
    console.log();
  }
  
  console.log('─'.repeat(60));
  console.log(`Total: ${tasks.length} task(s)`);
}

async function showTask(taskId: string): Promise<void> {
  if (!taskId) {
    console.error('Please provide a task ID');
    process.exit(1);
  }
  
  const taskResult = await query<TaskRow>(
    'SELECT * FROM tasks WHERE id = $1',
    [taskId]
  );
  
  if (taskResult.rows.length === 0) {
    console.error(`Task not found: ${taskId}`);
    process.exit(1);
  }
  
  const task = taskFromRow(taskResult.rows[0]);
  
  console.log('\n📋 Task Details\n');
  console.log('─'.repeat(60));
  console.log(`Title: ${task.title}`);
  console.log(`Status: ${task.status}`);
  console.log(`Priority: ${'★'.repeat(task.priority)}${'☆'.repeat(5 - task.priority)}`);
  console.log(`Created: ${task.createdAt.toLocaleString()}`);
  console.log(`Updated: ${task.updatedAt.toLocaleString()}`);
  
  if (task.completedAt) {
    console.log(`Completed: ${task.completedAt.toLocaleString()}`);
  }
  
  if (task.description) {
    console.log(`\nDescription:\n${task.description}`);
  }
  
  if (task.tags.length > 0) {
    console.log(`\nTags: ${task.tags.join(', ')}`);
  }
  
  // Get updates
  const updatesResult = await query<{
    update_type: string;
    notes: string | null;
    created_at: Date;
  }>(
    `SELECT update_type, notes, created_at 
     FROM task_updates 
     WHERE task_id = $1 
     ORDER BY created_at`,
    [taskId]
  );
  
  if (updatesResult.rows.length > 0) {
    console.log('\n📝 Updates:');
    for (const update of updatesResult.rows) {
      const icon = getUpdateIcon(update.update_type);
      console.log(`   ${icon} [${update.update_type}] ${update.notes || ''}`);
      console.log(`      ${update.created_at.toLocaleString()}`);
    }
  }
  
  // Get related utterances
  const utterancesResult = await query<{
    raw_text: string;
    intent: string;
    created_at: Date;
  }>(
    `SELECT raw_text, intent, created_at 
     FROM utterances 
     WHERE matched_task_id = $1 
     ORDER BY created_at`,
    [taskId]
  );
  
  if (utterancesResult.rows.length > 0) {
    console.log('\n🎤 Related Speech:');
    for (const utterance of utterancesResult.rows) {
      console.log(`   "${utterance.raw_text}"`);
      console.log(`      Intent: ${utterance.intent}, ${utterance.created_at.toLocaleString()}`);
    }
  }
  
  console.log('─'.repeat(60));
}

async function correct(utteranceId: string, correctTaskId: string): Promise<void> {
  if (!utteranceId || !correctTaskId) {
    console.error('Usage: npm run task:correct <utterance-id> <correct-task-id>');
    process.exit(1);
  }
  
  await correctTaskMatch(utteranceId, correctTaskId);
  console.log(`✅ Correction recorded. Future similar utterances will match better.`);
}

async function archiveTasks(): Promise<void> {
  const { archiveAllCompletedTasks } = await import('../tasks/memory-pipeline.js');
  
  console.log('📦 Archiving completed tasks to memory...\n');
  
  const count = await archiveAllCompletedTasks(DEFAULT_USER_ID);
  
  console.log(`✅ Archived ${count} task(s) to long-term memory.`);
}

function showHelp(): void {
  console.log(`
Neural Task Understanding CLI

USAGE:
  npm run task "<utterance>"       Process a natural language utterance
  npm run task:list                List active tasks
  npm run task:show <id>           Show task details
  npm run task:correct <u> <t>     Correct a match (utterance-id, task-id)
  npm run task:archive             Archive completed tasks to memory

EXAMPLES:
  npm run task "I need to call mom"
  npm run task "Working on the report"
  npm run task "Done with groceries"
  npm run task "What am I working on?"

The system understands natural speech and will:
  - Create new tasks when you mention something to do
  - Update existing tasks when you report progress
  - Complete tasks when you say you're done
  - Match vague references to the right task

ENVIRONMENT:
  TEST_USER_ID     User ID to use (default: dev user)
  DATABASE_URL     PostgreSQL connection string
  OPENAI_API_KEY   For embeddings and analysis
`);
}

// ============================================
// HELPERS
// ============================================

function getUpdateIcon(updateType: string): string {
  const icons: Record<string, string> = {
    created: '🆕',
    progress: '📈',
    completed: '✅',
    blocked: '🚫',
    edited: '✏️',
    priority: '⬆️',
    unblocked: '🔓',
  };
  return icons[updateType] || '•';
}

// ============================================
// RUN
// ============================================

main().catch(console.error);

