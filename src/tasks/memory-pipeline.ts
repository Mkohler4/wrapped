/**
 * Memory Pipeline
 * 
 * Archives completed tasks to long-term episodic memory.
 * Extracts preferences and learnings from task completion patterns.
 */

import { query } from '../lib/db.js';
import { embed } from '../lib/embeddings.js';
import { complete, getModelConfig } from '../lib/llm.js';
import type {
  Task,
  TaskUpdate,
  Utterance,
  TaskArchiveData,
  TaskArchiveSummary,
  TaskRow,
  UtteranceRow,
} from './types.js';
import { taskFromRow, utteranceFromRow, formatVector } from './types.js';

// ============================================
// ARCHIVE SYSTEM PROMPT
// ============================================

const ARCHIVE_SYSTEM_PROMPT = `You summarize completed tasks into long-term memories.

Given a task and its history, create:
1. A concise summary (1-2 sentences) of what was accomplished
2. Context about how/why it was done
3. Relevant tags for future retrieval
4. Any revealed preferences (optional) - patterns about how the user works

Output JSON:
{
  "summary": "Brief summary of completed task",
  "context": "Additional context about the task",
  "tags": ["tag1", "tag2"],
  "revealedPreference": {
    "key": "preference key (e.g., 'communication_style')",
    "value": "preference value"
  } // or null if none detected
}

Focus on actionable, searchable information. Tags should be useful for future retrieval.`;

// ============================================
// MAIN ARCHIVE FUNCTION
// ============================================

/**
 * Archive a completed task to episodic memory.
 */
export async function archiveCompletedTask(taskId: string): Promise<string | null> {
  // Get task with all related data
  const archiveData = await getTaskArchiveData(taskId);
  
  if (!archiveData) {
    console.error(`Task not found: ${taskId}`);
    return null;
  }
  
  if (archiveData.task.status !== 'completed') {
    console.error(`Task is not completed: ${taskId}`);
    return null;
  }
  
  // Already archived?
  if (archiveData.task.archivedToMemoryId) {
    console.log(`Task already archived: ${taskId}`);
    return archiveData.task.archivedToMemoryId;
  }
  
  // Generate summary using LLM
  const summary = await generateArchiveSummary(archiveData);
  
  // Generate embedding for the summary
  const summaryEmbedding = await embed(summary.summary + ' ' + summary.context);
  
  // Insert into episodic memory
  const result = await query<{ id: string }>(
    `INSERT INTO episodic_memory 
      (user_id, type, summary, context, timestamp, tags, embedding, source_refs)
     VALUES 
      ($1, 'decision', $2, $3, $4, $5, $6::vector, $7)
     RETURNING id`,
    [
      archiveData.task.userId,
      summary.summary,
      summary.context,
      archiveData.task.completedAt || new Date(),
      summary.tags,
      formatVector(summaryEmbedding),
      [taskId], // Source reference
    ]
  );
  
  const memoryId = result.rows[0].id;
  
  // Update task with memory reference
  await query(
    `UPDATE tasks SET archived_to_memory_id = $1 WHERE id = $2`,
    [memoryId, taskId]
  );
  
  // Handle revealed preference if any
  if (summary.revealedPreference) {
    await queuePreferenceMemory(
      archiveData.task.userId,
      summary.revealedPreference,
      archiveData.task.title
    );
  }
  
  console.log(`Archived task ${taskId} to memory ${memoryId}`);
  return memoryId;
}

// ============================================
// DATA GATHERING
// ============================================

async function getTaskArchiveData(taskId: string): Promise<TaskArchiveData | null> {
  // Get task
  const taskResult = await query<TaskRow>(
    'SELECT * FROM tasks WHERE id = $1',
    [taskId]
  );
  
  if (taskResult.rows.length === 0) {
    return null;
  }
  
  const task = taskFromRow(taskResult.rows[0]);
  
  // Get updates
  const updatesResult = await query<{
    id: string;
    task_id: string;
    utterance_id: string | null;
    update_type: string;
    notes: string | null;
    changes: Record<string, unknown>;
    created_at: Date;
  }>(
    'SELECT * FROM task_updates WHERE task_id = $1 ORDER BY created_at',
    [taskId]
  );
  
  const updates: TaskUpdate[] = updatesResult.rows.map(row => ({
    id: row.id,
    taskId: row.task_id,
    utteranceId: row.utterance_id ?? undefined,
    updateType: row.update_type as TaskUpdate['updateType'],
    notes: row.notes ?? undefined,
    changes: row.changes || {},
    createdAt: row.created_at,
  }));
  
  // Get related utterances
  const utterancesResult = await query<UtteranceRow>(
    'SELECT * FROM utterances WHERE matched_task_id = $1 ORDER BY created_at',
    [taskId]
  );
  
  const utterances = utterancesResult.rows.map(utteranceFromRow);
  
  return { task, updates, utterances };
}

// ============================================
// SUMMARY GENERATION
// ============================================

async function generateArchiveSummary(data: TaskArchiveData): Promise<TaskArchiveSummary> {
  const config = getModelConfig();
  
  // Format task data for LLM
  const taskInfo = formatTaskForArchive(data);
  
  try {
    const result = await complete({
      model: config.fast,
      messages: [
        { role: 'system', content: ARCHIVE_SYSTEM_PROMPT },
        { role: 'user', content: taskInfo },
      ],
      maxTokens: 300,
      temperature: 0.5,
    });
    
    return parseArchiveSummary(result.content);
  } catch (error) {
    console.error('Error generating archive summary:', error);
    
    // Fallback summary
    return {
      summary: `Completed: ${data.task.title}`,
      context: data.task.description || '',
      tags: data.task.tags,
    };
  }
}

function formatTaskForArchive(data: TaskArchiveData): string {
  const { task, updates, utterances } = data;
  
  const parts: string[] = [
    `TASK: ${task.title}`,
    task.description ? `DESCRIPTION: ${task.description}` : '',
    `TAGS: ${task.tags.join(', ') || 'none'}`,
    `CREATED: ${task.createdAt.toISOString()}`,
    `COMPLETED: ${task.completedAt?.toISOString() || 'unknown'}`,
  ];
  
  if (updates.length > 0) {
    parts.push('\nUPDATES:');
    for (const update of updates) {
      parts.push(`  - [${update.updateType}] ${update.notes || '(no notes)'}`);
    }
  }
  
  if (utterances.length > 0) {
    parts.push('\nRELATED SPEECH:');
    for (const utterance of utterances.slice(0, 5)) {
      parts.push(`  - "${utterance.rawText}"`);
    }
  }
  
  return parts.filter(Boolean).join('\n');
}

function parseArchiveSummary(content: string): TaskArchiveSummary {
  try {
    // Extract JSON from response
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }
    
    const parsed = JSON.parse(jsonStr);
    
    return {
      summary: parsed.summary || 'Task completed',
      context: parsed.context || '',
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      revealedPreference: parsed.revealedPreference || undefined,
    };
  } catch (error) {
    console.error('Failed to parse archive summary:', content);
    return {
      summary: 'Task completed',
      context: '',
      tags: [],
    };
  }
}

// ============================================
// PREFERENCE EXTRACTION
// ============================================

async function queuePreferenceMemory(
  userId: string,
  preference: { key: string; value: string },
  taskTitle: string
): Promise<void> {
  await query(
    `INSERT INTO memory_queue 
      (user_id, memory_type, proposed_data, reason, status)
     VALUES 
      ($1, 'profile', $2, $3, 'pending')`,
    [
      userId,
      JSON.stringify({
        category: 'preference',
        key: preference.key,
        value: preference.value,
      }),
      `Inferred from completed task: ${taskTitle}`,
    ]
  );
}

// ============================================
// BATCH ARCHIVING
// ============================================

/**
 * Archive all completed tasks that haven't been archived yet.
 */
export async function archiveAllCompletedTasks(userId: string): Promise<number> {
  const result = await query<{ id: string }>(
    `SELECT id FROM tasks 
     WHERE user_id = $1 
       AND status = 'completed'
       AND archived_to_memory_id IS NULL`,
    [userId]
  );
  
  let archived = 0;
  for (const row of result.rows) {
    try {
      await archiveCompletedTask(row.id);
      archived++;
    } catch (error) {
      console.error(`Failed to archive task ${row.id}:`, error);
    }
  }
  
  return archived;
}

/**
 * Get tasks pending archival.
 */
export async function getPendingArchiveTasks(userId: string): Promise<Task[]> {
  const result = await query<TaskRow>(
    `SELECT * FROM tasks 
     WHERE user_id = $1 
       AND status = 'completed'
       AND archived_to_memory_id IS NULL
     ORDER BY completed_at DESC`,
    [userId]
  );
  
  return result.rows.map(taskFromRow);
}

// ============================================
// RETRIEVAL
// ============================================

/**
 * Search archived task memories by similarity.
 */
export async function searchTaskMemories(
  userId: string,
  queryText: string,
  limit: number = 5
): Promise<Array<{
  id: string;
  summary: string;
  context: string;
  tags: string[];
  timestamp: Date;
  similarity: number;
}>> {
  const queryEmbedding = await embed(queryText);
  
  const result = await query<{
    id: string;
    summary: string;
    context: string;
    tags: string[];
    timestamp: Date;
    similarity: number;
  }>(
    `SELECT 
      id, summary, context, tags, timestamp,
      1 - (embedding <=> $2::vector) as similarity
     FROM episodic_memory
     WHERE user_id = $1
       AND type = 'decision'
       AND embedding IS NOT NULL
     ORDER BY embedding <=> $2::vector
     LIMIT $3`,
    [userId, formatVector(queryEmbedding), limit]
  );
  
  return result.rows;
}

