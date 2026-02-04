/**
 * Task Matcher
 * 
 * Fuzzy matching of utterances to existing tasks using embeddings
 * and context-aware boosting.
 */

import { query } from '../lib/db.js';
import { embed } from '../lib/embeddings.js';
import type {
  Task,
  TaskMatch,
  TaskMatchResult,
  TaskCandidate,
  TaskStatus,
  SessionContext,
  TaskRow,
} from './types.js';
import { taskFromRow, formatVector } from './types.js';

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  // Minimum similarity threshold for a match
  matchThreshold: 0.65,
  
  // High confidence threshold (no need for confirmation)
  highConfidenceThreshold: 0.85,
  
  // Context boost weights
  contextBoosts: {
    activeTask: 0.15,      // Boost for the currently active task
    recentTask: 0.10,      // Boost for recently mentioned tasks
    recentMention: 0.05,   // Per-mention boost (max 3)
  },
  
  // Maximum candidates to consider
  maxCandidates: 5,
};

// ============================================
// MAIN MATCHING FUNCTION
// ============================================

export interface MatchTaskOptions {
  userId: string;
  reference: string;
  context?: SessionContext;
  statusFilter?: TaskStatus | TaskStatus[];
}

/**
 * Match a task reference to an existing task.
 */
export async function matchTask(options: MatchTaskOptions): Promise<TaskMatchResult> {
  const { userId, reference, context, statusFilter } = options;
  
  // Quick check: if reference is very short, might be contextual
  if (reference.length < 5 && context?.activeTask) {
    return {
      match: {
        task: context.activeTask,
        confidence: 0.9,
        source: 'context',
      },
      candidates: [],
      isNewTask: false,
    };
  }
  
  // Generate embedding for the reference
  const referenceEmbedding = await embed(reference);
  
  // Search for similar tasks
  const candidates = await searchTasksBySimilarity(
    userId,
    referenceEmbedding,
    CONFIG.maxCandidates,
    statusFilter
  );
  
  if (candidates.length === 0) {
    return {
      match: null,
      candidates: [],
      isNewTask: true,
    };
  }
  
  // Apply context boosting
  const scoredCandidates = candidates.map(candidate => ({
    ...candidate,
    contextBoost: calculateContextBoost(candidate.task, context),
    finalScore: candidate.similarity + calculateContextBoost(candidate.task, context),
  }));
  
  // Sort by final score
  scoredCandidates.sort((a, b) => b.finalScore - a.finalScore);
  
  const best = scoredCandidates[0];
  
  // Check if best match exceeds threshold
  if (best.finalScore >= CONFIG.matchThreshold) {
    return {
      match: {
        task: best.task,
        confidence: best.finalScore,
        source: best.contextBoost > 0 ? 'context' : 'embedding',
      },
      candidates: scoredCandidates,
      isNewTask: false,
    };
  }
  
  // No confident match - likely a new task
  return {
    match: null,
    candidates: scoredCandidates,
    isNewTask: true,
  };
}

// ============================================
// EMBEDDING SEARCH
// ============================================

interface SimilarityResult {
  id: string;
  title: string;
  status: TaskStatus;
  similarity: number;
}

async function searchTasksBySimilarity(
  userId: string,
  embedding: number[],
  limit: number,
  statusFilter?: TaskStatus | TaskStatus[]
): Promise<TaskCandidate[]> {
  // Build status filter clause
  let statusClause = '';
  const params: (string | number | number[] | string[])[] = [userId, formatVector(embedding), limit];
  
  if (statusFilter) {
    const statuses = Array.isArray(statusFilter) ? statusFilter : [statusFilter];
    statusClause = `AND status = ANY($4::task_status[])`;
    params.push(statuses);
  }
  
  // Use pgvector for similarity search
  const result = await query<SimilarityResult>(
    `SELECT 
      id,
      title,
      status,
      1 - (embedding <=> $2::vector) as similarity
    FROM tasks
    WHERE user_id = $1
      AND embedding IS NOT NULL
      ${statusClause}
    ORDER BY embedding <=> $2::vector
    LIMIT $3`,
    params
  );
  
  // Fetch full task data for top candidates
  const taskIds = result.rows.map(r => r.id);
  if (taskIds.length === 0) {
    return [];
  }
  
  const tasksResult = await query<TaskRow>(
    `SELECT * FROM tasks WHERE id = ANY($1)`,
    [taskIds]
  );
  
  const tasksById = new Map<string, Task>();
  for (const row of tasksResult.rows) {
    tasksById.set(row.id, taskFromRow(row));
  }
  
  // Combine results
  return result.rows.map(r => ({
    task: tasksById.get(r.id)!,
    similarity: r.similarity,
    contextBoost: 0,
    finalScore: r.similarity,
  }));
}

// ============================================
// CONTEXT BOOSTING
// ============================================

function calculateContextBoost(task: Task, context?: SessionContext): number {
  if (!context) return 0;
  
  let boost = 0;
  
  // Active task boost
  if (context.activeTask?.id === task.id) {
    boost += CONFIG.contextBoosts.activeTask;
  }
  
  // Recent task boost
  const recentIds = context.recentTasks.map(t => t.id);
  if (recentIds.includes(task.id)) {
    boost += CONFIG.contextBoosts.recentTask;
  }
  
  // Recent mention boost (check utterances for task title mentions)
  const taskTitleLower = task.title.toLowerCase();
  const mentionCount = context.recentUtterances.filter(u => 
    u.rawText?.toLowerCase().includes(taskTitleLower)
  ).length;
  boost += Math.min(mentionCount, 3) * CONFIG.contextBoosts.recentMention;
  
  return boost;
}

// ============================================
// EXACT MATCHING (for corrections/learning)
// ============================================

/**
 * Find a task by exact title match.
 */
export async function findTaskByTitle(
  userId: string,
  title: string
): Promise<Task | null> {
  const result = await query<TaskRow>(
    `SELECT * FROM tasks 
     WHERE user_id = $1 
       AND LOWER(title) = LOWER($2)
     LIMIT 1`,
    [userId, title]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return taskFromRow(result.rows[0]);
}

/**
 * Find tasks by keyword search.
 */
export async function searchTasksByKeyword(
  userId: string,
  keyword: string,
  limit: number = 5
): Promise<Task[]> {
  const result = await query<TaskRow>(
    `SELECT * FROM tasks
     WHERE user_id = $1
       AND (
         to_tsvector('english', title || ' ' || COALESCE(description, '')) 
         @@ plainto_tsquery('english', $2)
         OR title ILIKE '%' || $2 || '%'
       )
     ORDER BY updated_at DESC
     LIMIT $3`,
    [userId, keyword, limit]
  );
  
  return result.rows.map(taskFromRow);
}

// ============================================
// LEARNING FROM CORRECTIONS
// ============================================

/**
 * Record a correction to improve future matching.
 */
export async function recordCorrection(
  utteranceId: string,
  correctTaskId: string
): Promise<void> {
  await query(
    `UPDATE utterances SET
      was_corrected = true,
      corrected_to_task_id = $1
    WHERE id = $2`,
    [correctTaskId, utteranceId]
  );
}

/**
 * Get corrections for learning patterns.
 */
export async function getCorrections(
  userId: string,
  limit: number = 100
): Promise<Array<{
  utteranceText: string;
  wrongTaskId: string | null;
  correctTaskId: string;
}>> {
  const result = await query<{
    raw_text: string;
    matched_task_id: string | null;
    corrected_to_task_id: string;
  }>(
    `SELECT raw_text, matched_task_id, corrected_to_task_id
     FROM utterances
     WHERE user_id = $1
       AND was_corrected = true
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  
  return result.rows.map(row => ({
    utteranceText: row.raw_text,
    wrongTaskId: row.matched_task_id,
    correctTaskId: row.corrected_to_task_id,
  }));
}

// ============================================
// CONFIDENCE HELPERS
// ============================================

/**
 * Check if match confidence is high enough to proceed without confirmation.
 */
export function isHighConfidence(confidence: number): boolean {
  return confidence >= CONFIG.highConfidenceThreshold;
}

/**
 * Check if match needs user confirmation.
 */
export function needsConfirmation(matchResult: TaskMatchResult): boolean {
  if (!matchResult.match) return false;
  
  const { confidence } = matchResult.match;
  return confidence >= CONFIG.matchThreshold && confidence < CONFIG.highConfidenceThreshold;
}

// ============================================
// EXPORTS
// ============================================

export { CONFIG as MATCH_CONFIG };

