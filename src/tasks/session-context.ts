/**
 * Session Context Manager
 * 
 * Tracks active tasks, recent speech, and maintains conversation state
 * for natural task understanding.
 */

import { query } from '../lib/db.js';
import type {
  Task,
  TaskSession,
  SessionContext,
  SessionContextData,
  LLMAnalysisContext,
  TaskSummary,
  TaskRow,
  TaskSessionRow,
  taskFromRow,
  sessionFromRow,
} from './types.js';
import { taskFromRow as toTask, sessionFromRow as toSession } from './types.js';

// ============================================
// SESSION MANAGEMENT
// ============================================

/**
 * Get or create a session for the user.
 * Sessions expire after 4 hours of inactivity.
 */
export async function getOrCreateSession(userId: string): Promise<TaskSession> {
  // Use database function to get or create session
  const result = await query<{ get_or_create_session: string }>(
    'SELECT get_or_create_session($1)',
    [userId]
  );
  
  const sessionId = result.rows[0].get_or_create_session;
  
  // Fetch full session data
  const sessionResult = await query<TaskSessionRow>(
    'SELECT * FROM task_sessions WHERE id = $1',
    [sessionId]
  );
  
  return toSession(sessionResult.rows[0]);
}

/**
 * Get an existing session by ID.
 */
export async function getSession(sessionId: string): Promise<TaskSession | null> {
  const result = await query<TaskSessionRow>(
    'SELECT * FROM task_sessions WHERE id = $1',
    [sessionId]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return toSession(result.rows[0]);
}

/**
 * Update session activity - called after processing an utterance.
 */
export async function updateSessionActivity(
  sessionId: string,
  utteranceText: string,
  activeTaskId?: string
): Promise<void> {
  await query(
    'SELECT update_session_activity($1, $2, $3)',
    [sessionId, utteranceText, activeTaskId || null]
  );
}

/**
 * Set the active task for the session.
 */
export async function setActiveTask(
  sessionId: string,
  taskId: string | null
): Promise<void> {
  await query(
    'UPDATE task_sessions SET active_task_id = $1, last_activity_at = NOW() WHERE id = $2',
    [taskId, sessionId]
  );
}

/**
 * Update session context data (custom state).
 */
export async function updateSessionContext(
  sessionId: string,
  contextUpdate: Partial<SessionContextData>
): Promise<void> {
  await query(
    `UPDATE task_sessions 
     SET context = context || $1::jsonb, 
         last_activity_at = NOW() 
     WHERE id = $2`,
    [JSON.stringify(contextUpdate), sessionId]
  );
}

// ============================================
// CONTEXT BUILDING
// ============================================

/**
 * Build full session context with tasks and utterances.
 */
export async function buildSessionContext(
  userId: string,
  sessionId?: string
): Promise<SessionContext> {
  // Get or create session
  let session: TaskSession;
  if (sessionId) {
    const existing = await getSession(sessionId);
    session = existing || await getOrCreateSession(userId);
  } else {
    session = await getOrCreateSession(userId);
  }
  
  // Get active task if set
  let activeTask: Task | null = null;
  if (session.activeTaskId) {
    activeTask = await getTask(session.activeTaskId);
  }
  
  // Get recent tasks
  const recentTasks = await getRecentTasks(userId, 5);
  
  // Build context
  return {
    sessionId: session.id,
    startedAt: session.startedAt,
    lastActivityAt: session.lastActivityAt,
    activeTask,
    recentTasks,
    recentUtterances: [], // Will be populated from session
    currentFocus: session.context.currentFocus,
    mood: session.context.mood,
  };
}

/**
 * Build context for LLM analysis (lighter weight).
 */
export async function buildLLMContext(
  userId: string,
  sessionId?: string
): Promise<LLMAnalysisContext> {
  // Get session
  let session: TaskSession | null = null;
  if (sessionId) {
    session = await getSession(sessionId);
  }
  if (!session) {
    session = await getOrCreateSession(userId);
  }
  
  // Get active task summary
  let activeTask: TaskSummary | undefined;
  if (session.activeTaskId) {
    const task = await getTask(session.activeTaskId);
    if (task) {
      activeTask = {
        id: task.id,
        title: task.title,
        status: task.status,
      };
    }
  }
  
  // Get recent tasks summaries
  const recentTasks = await getRecentTaskSummaries(userId, 5);
  
  return {
    activeTask,
    recentTasks,
    recentUtterances: session.recentUtterances.slice(0, 5),
  };
}

// ============================================
// TASK HELPERS
// ============================================

async function getTask(taskId: string): Promise<Task | null> {
  const result = await query<TaskRow>(
    'SELECT * FROM tasks WHERE id = $1',
    [taskId]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return toTask(result.rows[0]);
}

async function getRecentTasks(userId: string, limit: number): Promise<Task[]> {
  const result = await query<TaskRow>(
    `SELECT * FROM tasks 
     WHERE user_id = $1 AND status IN ('pending', 'active')
     ORDER BY updated_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  
  return result.rows.map(toTask);
}

async function getRecentTaskSummaries(userId: string, limit: number): Promise<TaskSummary[]> {
  const result = await query<{ id: string; title: string; status: string }>(
    `SELECT id, title, status FROM tasks 
     WHERE user_id = $1 AND status IN ('pending', 'active')
     ORDER BY updated_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  
  return result.rows.map(row => ({
    id: row.id,
    title: row.title,
    status: row.status as Task['status'],
  }));
}

// ============================================
// CONTEXT DECAY
// ============================================

/**
 * Calculate context weight based on time since last activity.
 * Used to adjust matching confidence for older context.
 */
export function calculateContextDecay(lastActivityAt: Date): number {
  const now = new Date();
  const minutesElapsed = (now.getTime() - lastActivityAt.getTime()) / (1000 * 60);
  
  if (minutesElapsed < 5) return 1.0;        // Full context
  if (minutesElapsed < 15) return 0.7;       // Recent
  if (minutesElapsed < 60) return 0.4;       // Moderate decay
  if (minutesElapsed < 240) return 0.1;      // Significant decay
  
  return 0; // Session should be considered expired
}

/**
 * Check if a session is still valid (not expired).
 */
export function isSessionValid(session: TaskSession): boolean {
  const decay = calculateContextDecay(session.lastActivityAt);
  return decay > 0;
}

// ============================================
// FOCUS TRACKING
// ============================================

/**
 * Update the current focus based on recent activity.
 */
export async function updateFocus(
  sessionId: string,
  task: Task | null
): Promise<void> {
  const focus = task ? `working on ${task.title}` : undefined;
  
  await updateSessionContext(sessionId, {
    currentFocus: focus,
    lastMatchedTaskId: task?.id,
  });
}

/**
 * Infer mood from recent utterances and activity patterns.
 * (Simple heuristic - could be enhanced with LLM)
 */
export function inferMood(utterances: string[]): SessionContextData['mood'] {
  if (utterances.length === 0) return undefined;
  
  const recent = utterances.slice(0, 3).join(' ').toLowerCase();
  
  // Frustrated patterns
  if (
    recent.includes('stuck') ||
    recent.includes('frustrated') ||
    recent.includes("can't") ||
    recent.includes('ugh') ||
    recent.includes('argh')
  ) {
    return 'frustrated';
  }
  
  // Productive patterns
  if (
    recent.includes('done') ||
    recent.includes('finished') ||
    recent.includes('completed') ||
    recent.includes('great')
  ) {
    return 'productive';
  }
  
  // Distracted patterns (lots of context switches)
  const taskMentions = (recent.match(/\b(task|thing|that|this)\b/gi) || []).length;
  if (taskMentions > 3 && utterances.length > 5) {
    return 'distracted';
  }
  
  // Default to focused if actively engaged
  return 'focused';
}

// ============================================
// EXPORTS
// ============================================

export {
  getTask,
  getRecentTasks,
};

