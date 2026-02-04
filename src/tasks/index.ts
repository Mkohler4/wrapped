/**
 * Neural Task Understanding
 * 
 * Main orchestration module for natural language task tracking.
 * Provides Jarvis-style task understanding from natural speech.
 */

import { query } from '../lib/db.js';
import { embed } from '../lib/embeddings.js';
import { 
  analyzeUtterance, 
  quickClassify, 
  normalizeUtterance 
} from './understanding-engine.js';
import { 
  buildLLMContext, 
  buildSessionContext,
  getOrCreateSession,
  updateSessionActivity,
  setActiveTask,
  updateFocus,
} from './session-context.js';
import { 
  matchTask, 
  needsConfirmation, 
  isHighConfidence,
  recordCorrection,
} from './task-matcher.js';
import { archiveCompletedTask } from './memory-pipeline.js';
import type {
  Task,
  TaskStatus,
  Utterance,
  ProcessUtteranceRequest,
  ProcessUtteranceResponse,
  TaskRow,
  UtteranceRow,
  LLMAnalysisResult,
  VoiceMetadata,
} from './types.js';
import { taskFromRow, utteranceFromRow, formatVector } from './types.js';

// ============================================
// MAIN UTTERANCE PROCESSOR
// ============================================

/**
 * Process a natural language utterance.
 * This is the main entry point for the task understanding system.
 */
async function processUtterance(
  userId: string,
  request: ProcessUtteranceRequest
): Promise<ProcessUtteranceResponse> {
  const { text, sessionId: requestSessionId, voiceMetadata } = request;
  
  // Normalize the input
  const normalizedText = normalizeUtterance(text);
  
  // Get or create session
  const session = requestSessionId 
    ? await getOrCreateSession(userId) // Will create if not exists
    : await getOrCreateSession(userId);
  
  // Build context for analysis
  const llmContext = await buildLLMContext(userId, session.id);
  
  // Try quick classification first
  let analysis: LLMAnalysisResult;
  const quickResult = quickClassify(normalizedText);
  
  if (quickResult && quickResult.confidence >= 0.85) {
    // Use quick classification for common patterns
    analysis = {
      intent: quickResult.intent,
      confidence: quickResult.confidence,
      isNewTask: quickResult.intent === 'starting',
      reasoning: 'Quick pattern match',
    };
  } else {
    // Use LLM for complex analysis
    analysis = await analyzeUtterance({
      utterance: normalizedText,
      context: llmContext,
    });
  }
  
  // Handle based on intent
  let response: ProcessUtteranceResponse;
  
  switch (analysis.intent) {
    case 'starting':
      response = await handleStartingIntent(userId, session.id, normalizedText, analysis, voiceMetadata);
      break;
      
    case 'progress':
      response = await handleProgressIntent(userId, session.id, normalizedText, analysis, llmContext, voiceMetadata);
      break;
      
    case 'completed':
      response = await handleCompletedIntent(userId, session.id, normalizedText, analysis, llmContext, voiceMetadata);
      break;
      
    case 'blocked':
      response = await handleBlockedIntent(userId, session.id, normalizedText, analysis, llmContext, voiceMetadata);
      break;
      
    case 'query':
      response = await handleQueryIntent(userId, session.id, normalizedText, analysis, voiceMetadata);
      break;
      
    default:
      response = await handleNotTaskIntent(userId, session.id, normalizedText, analysis, voiceMetadata);
  }
  
  // Update session activity
  await updateSessionActivity(session.id, normalizedText, response.task?.id);
  
  return response;
}

// ============================================
// INTENT HANDLERS
// ============================================

async function handleStartingIntent(
  userId: string,
  sessionId: string,
  text: string,
  analysis: LLMAnalysisResult,
  voiceMetadata?: VoiceMetadata
): Promise<ProcessUtteranceResponse> {
  // Create new task
  const title = analysis.extractedTitle || extractTitleFromText(text);
  const task = await createTask(userId, {
    title,
    description: analysis.extractedDescription,
    tags: analysis.extractedTags || [],
    priority: analysis.extractedPriority || 3,
  });
  
  // Save utterance
  const utterance = await saveUtterance(userId, sessionId, text, analysis, task.id, voiceMetadata);
  
  // Create task update
  await createTaskUpdate(task.id, utterance.id, 'created', 'Task created from speech');
  
  // Set as active task
  await setActiveTask(sessionId, task.id);
  await updateFocus(sessionId, task);
  
  return {
    utteranceId: utterance.id,
    intent: 'starting',
    intentConfidence: analysis.confidence,
    task,
    action: 'created',
    message: `Got it - created task: "${task.title}"`,
    sessionId,
  };
}

async function handleProgressIntent(
  userId: string,
  sessionId: string,
  text: string,
  analysis: LLMAnalysisResult,
  _llmContext: Awaited<ReturnType<typeof buildLLMContext>>,
  voiceMetadata?: VoiceMetadata
): Promise<ProcessUtteranceResponse> {
  // Match to existing task
  const sessionContext = await buildSessionContext(userId, sessionId);
  const matchResult = await matchTask({
    userId,
    reference: analysis.taskReference || text,
    context: sessionContext,
    statusFilter: ['pending', 'active'],
  });
  
  if (!matchResult.match) {
    // No match found - treat as new task
    return handleStartingIntent(userId, sessionId, text, {
      ...analysis,
      intent: 'starting',
      isNewTask: true,
    }, voiceMetadata);
  }
  
  const task = matchResult.match.task;
  
  // Update task status to active
  if (task.status === 'pending') {
    await updateTaskStatus(task.id, 'active');
    task.status = 'active';
  }
  
  // Save utterance
  const utterance = await saveUtterance(userId, sessionId, text, analysis, task.id, voiceMetadata);
  
  // Create progress update
  await createTaskUpdate(task.id, utterance.id, 'progress', analysis.notes);
  
  // Update focus
  await setActiveTask(sessionId, task.id);
  await updateFocus(sessionId, task);
  
  return {
    utteranceId: utterance.id,
    intent: 'progress',
    intentConfidence: analysis.confidence,
    task,
    action: 'updated',
    matchConfidence: matchResult.match.confidence,
    message: `Got it - updating progress on "${task.title}"`,
    needsConfirmation: needsConfirmation(matchResult),
    sessionId,
  };
}

async function handleCompletedIntent(
  userId: string,
  sessionId: string,
  text: string,
  analysis: LLMAnalysisResult,
  _llmContext: Awaited<ReturnType<typeof buildLLMContext>>,
  voiceMetadata?: VoiceMetadata
): Promise<ProcessUtteranceResponse> {
  // Match to existing task
  const sessionContext = await buildSessionContext(userId, sessionId);
  const matchResult = await matchTask({
    userId,
    reference: analysis.taskReference || text,
    context: sessionContext,
    statusFilter: ['pending', 'active'],
  });
  
  if (!matchResult.match) {
    // No task to complete - maybe they meant something else
    const utterance = await saveUtterance(userId, sessionId, text, analysis, undefined, voiceMetadata);
    return {
      utteranceId: utterance.id,
      intent: 'completed',
      intentConfidence: analysis.confidence,
      message: "I heard 'done' but I'm not sure which task you completed. What task did you finish?",
      sessionId,
    };
  }
  
  const task = matchResult.match.task;
  
  // Complete the task
  await updateTaskStatus(task.id, 'completed');
  task.status = 'completed';
  task.completedAt = new Date();
  
  // Save utterance
  const utterance = await saveUtterance(userId, sessionId, text, analysis, task.id, voiceMetadata);
  
  // Create completion update
  await createTaskUpdate(task.id, utterance.id, 'completed', 'Task completed');
  
  // Clear active task
  await setActiveTask(sessionId, null);
  await updateFocus(sessionId, null);
  
  // Archive to memory (async, don't wait)
  archiveCompletedTask(task.id).catch(err => 
    console.error('Failed to archive task:', err)
  );
  
  return {
    utteranceId: utterance.id,
    intent: 'completed',
    intentConfidence: analysis.confidence,
    task,
    action: 'completed',
    matchConfidence: matchResult.match.confidence,
    message: `Nice! Completed: "${task.title}"`,
    needsConfirmation: needsConfirmation(matchResult),
    sessionId,
  };
}

async function handleBlockedIntent(
  userId: string,
  sessionId: string,
  text: string,
  analysis: LLMAnalysisResult,
  _llmContext: Awaited<ReturnType<typeof buildLLMContext>>,
  voiceMetadata?: VoiceMetadata
): Promise<ProcessUtteranceResponse> {
  // Match to existing task
  const sessionContext = await buildSessionContext(userId, sessionId);
  const matchResult = await matchTask({
    userId,
    reference: analysis.taskReference || text,
    context: sessionContext,
    statusFilter: ['pending', 'active'],
  });
  
  const task = matchResult.match?.task;
  
  // Save utterance
  const utterance = await saveUtterance(userId, sessionId, text, analysis, task?.id, voiceMetadata);
  
  if (task) {
    // Create blocked update
    await createTaskUpdate(task.id, utterance.id, 'blocked', analysis.notes || text);
  }
  
  return {
    utteranceId: utterance.id,
    intent: 'blocked',
    intentConfidence: analysis.confidence,
    task,
    action: task ? 'updated' : undefined,
    matchConfidence: matchResult.match?.confidence,
    message: task 
      ? `Noted - "${task.title}" is blocked. ${analysis.notes || ''}`
      : `Noted - you're blocked. What task is this related to?`,
    sessionId,
  };
}

async function handleQueryIntent(
  userId: string,
  sessionId: string,
  text: string,
  analysis: LLMAnalysisResult,
  voiceMetadata?: VoiceMetadata
): Promise<ProcessUtteranceResponse> {
  // Get active and pending tasks
  const tasks = await getActiveTasks(userId);
  
  // Save utterance
  const utterance = await saveUtterance(userId, sessionId, text, analysis, undefined, voiceMetadata);
  
  const taskList = tasks.length > 0
    ? tasks.map(t => `• ${t.title} (${t.status})`).join('\n')
    : 'No active tasks';
  
  return {
    utteranceId: utterance.id,
    intent: 'query',
    intentConfidence: analysis.confidence,
    tasks,
    message: `Here are your tasks:\n${taskList}`,
    sessionId,
  };
}

async function handleNotTaskIntent(
  userId: string,
  sessionId: string,
  text: string,
  analysis: LLMAnalysisResult,
  voiceMetadata?: VoiceMetadata
): Promise<ProcessUtteranceResponse> {
  // Save utterance but don't process as task
  const utterance = await saveUtterance(userId, sessionId, text, analysis, undefined, voiceMetadata);
  
  return {
    utteranceId: utterance.id,
    intent: 'not_task',
    intentConfidence: analysis.confidence,
    message: "I didn't detect a task in that. Need help with something?",
    sessionId,
  };
}

// ============================================
// DATABASE OPERATIONS
// ============================================

interface CreateTaskOptions {
  title: string;
  description?: string;
  tags?: string[];
  priority?: number;
  dueAt?: Date;
  parentTaskId?: string;
}

async function createTask(userId: string, options: CreateTaskOptions): Promise<Task> {
  // Generate embedding for the task title
  const embedding = await embed(options.title);
  
  const result = await query<TaskRow>(
    `INSERT INTO tasks 
      (user_id, title, description, tags, priority, due_at, parent_task_id, embedding)
     VALUES 
      ($1, $2, $3, $4, $5, $6, $7, $8::vector)
     RETURNING *`,
    [
      userId,
      options.title,
      options.description || null,
      options.tags || [],
      options.priority || 3,
      options.dueAt || null,
      options.parentTaskId || null,
      formatVector(embedding),
    ]
  );
  
  return taskFromRow(result.rows[0]);
}

async function updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
  await query(
    'UPDATE tasks SET status = $1, updated_at = NOW() WHERE id = $2',
    [status, taskId]
  );
}

async function saveUtterance(
  userId: string,
  sessionId: string,
  text: string,
  analysis: LLMAnalysisResult,
  matchedTaskId?: string,
  voiceMetadata?: VoiceMetadata
): Promise<Utterance> {
  // Generate embedding for the utterance
  const embedding = await embed(text);
  
  const result = await query<UtteranceRow>(
    `INSERT INTO utterances 
      (user_id, session_id, raw_text, normalized_text, intent, intent_confidence,
       matched_task_id, match_confidence, embedding, llm_analysis, voice_metadata)
     VALUES 
      ($1, $2, $3, $3, $4, $5, $6, $7, $8::vector, $9, $10)
     RETURNING *`,
    [
      userId,
      sessionId,
      text,
      analysis.intent,
      analysis.confidence,
      matchedTaskId || null,
      matchedTaskId ? analysis.confidence : null,
      formatVector(embedding),
      JSON.stringify(analysis),
      voiceMetadata ? JSON.stringify(voiceMetadata) : null,
    ]
  );
  
  return utteranceFromRow(result.rows[0]);
}

async function createTaskUpdate(
  taskId: string,
  utteranceId: string,
  updateType: string,
  notes?: string
): Promise<void> {
  await query(
    `INSERT INTO task_updates (task_id, utterance_id, update_type, notes)
     VALUES ($1, $2, $3, $4)`,
    [taskId, utteranceId, updateType, notes || null]
  );
}

async function getActiveTasks(userId: string): Promise<Task[]> {
  const result = await query<TaskRow>(
    `SELECT * FROM tasks 
     WHERE user_id = $1 
       AND status IN ('pending', 'active')
     ORDER BY priority DESC, updated_at DESC
     LIMIT 20`,
    [userId]
  );
  
  return result.rows.map(taskFromRow);
}

// ============================================
// HELPERS
// ============================================

function extractTitleFromText(text: string): string {
  // Remove common prefixes
  let title = text
    .replace(/^(i need to|i have to|i should|let me|going to|gonna|gotta|time to)\s+/i, '')
    .replace(/^(start|begin|work on)\s+/i, '')
    .trim();
  
  // Capitalize first letter
  title = title.charAt(0).toUpperCase() + title.slice(1);
  
  // Truncate if too long
  if (title.length > 100) {
    title = title.slice(0, 97) + '...';
  }
  
  return title;
}

// ============================================
// CORRECTION API
// ============================================

/**
 * Correct a task match - used when the system matched wrong task.
 */
async function correctTaskMatch(
  utteranceId: string,
  correctTaskId: string
): Promise<void> {
  await recordCorrection(utteranceId, correctTaskId);
  
  // Update the utterance's matched task
  await query(
    'UPDATE utterances SET matched_task_id = $1 WHERE id = $2',
    [correctTaskId, utteranceId]
  );
}

// ============================================
// EXPORTS
// ============================================

export {
  // Core processing
  processUtterance,
  correctTaskMatch,
  
  // Understanding engine
  analyzeUtterance,
  quickClassify,
  normalizeUtterance,
  
  // Session context
  buildSessionContext,
  buildLLMContext,
  getOrCreateSession,
  
  // Task matching
  matchTask,
  needsConfirmation,
  isHighConfidence,
  
  // Memory pipeline
  archiveCompletedTask,
};

// Re-export types
export * from './types.js';

