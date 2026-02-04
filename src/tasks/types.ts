/**
 * Neural Task Understanding - Type Definitions
 * 
 * Types for natural language task tracking with Jarvis-style understanding.
 */

// ============================================
// DATABASE ENUMS
// ============================================

export type TaskStatus = 'pending' | 'active' | 'completed' | 'abandoned';

export type TaskUpdateType = 
  | 'created' 
  | 'progress' 
  | 'completed' 
  | 'blocked' 
  | 'edited' 
  | 'priority' 
  | 'unblocked';

export type UtteranceIntent = 
  | 'starting'   // Beginning a new task
  | 'progress'   // Reporting progress
  | 'completed'  // Finished a task
  | 'blocked'    // Stuck on something
  | 'query'      // Asking about tasks
  | 'not_task';  // Not task-related

// ============================================
// CORE ENTITIES
// ============================================

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: number; // 1-5
  tags: string[];
  dueAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  embedding?: number[];
  parentTaskId?: string;
  metadata: Record<string, unknown>;
  archivedToMemoryId?: string;
}

export interface TaskUpdate {
  id: string;
  taskId: string;
  utteranceId?: string;
  updateType: TaskUpdateType;
  notes?: string;
  changes: Record<string, unknown>;
  createdAt: Date;
}

export interface Utterance {
  id: string;
  userId: string;
  sessionId?: string;
  rawText: string;
  normalizedText?: string;
  intent: UtteranceIntent;
  intentConfidence: number;
  matchedTaskId?: string;
  matchConfidence?: number;
  embedding?: number[];
  wasCorrected: boolean;
  correctedToTaskId?: string;
  llmAnalysis: LLMAnalysisResult;
  voiceMetadata?: VoiceMetadata;
  createdAt: Date;
}

export interface TaskSession {
  id: string;
  userId: string;
  activeTaskId?: string;
  recentUtterances: string[];
  context: SessionContextData;
  startedAt: Date;
  lastActivityAt: Date;
}

// ============================================
// LLM ANALYSIS
// ============================================

export interface LLMAnalysisResult {
  intent: UtteranceIntent;
  confidence: number;
  taskReference?: string;
  isNewTask: boolean;
  extractedTitle?: string;
  extractedDescription?: string;
  extractedTags?: string[];
  extractedPriority?: number;
  extractedDueDate?: string;
  notes?: string;
  reasoning: string;
}

export interface LLMAnalysisContext {
  activeTask?: TaskSummary;
  recentTasks: TaskSummary[];
  recentUtterances: string[];
}

export interface TaskSummary {
  id: string;
  title: string;
  status: TaskStatus;
}

// ============================================
// SESSION CONTEXT
// ============================================

export interface SessionContext {
  sessionId: string;
  startedAt: Date;
  lastActivityAt: Date;
  activeTask: Task | null;
  recentTasks: Task[];
  recentUtterances: Utterance[];
  currentFocus?: string;
  mood?: SessionMood;
}

export interface SessionContextData {
  currentFocus?: string;
  mood?: SessionMood;
  lastIntent?: UtteranceIntent;
  lastMatchedTaskId?: string;
  customData?: Record<string, unknown>;
}

export type SessionMood = 'focused' | 'distracted' | 'frustrated' | 'productive';

// ============================================
// TASK MATCHING
// ============================================

export interface TaskMatch {
  task: Task;
  confidence: number;
  source: 'context' | 'embedding' | 'exact' | 'recent';
}

export interface TaskMatchResult {
  match: TaskMatch | null;
  candidates: TaskCandidate[];
  isNewTask: boolean;
}

export interface TaskCandidate {
  task: Task;
  similarity: number;
  contextBoost: number;
  finalScore: number;
}

// ============================================
// VOICE INPUT
// ============================================

export interface VoiceMetadata {
  confidence: number;
  alternatives?: string[];
  duration?: number;
  language?: string;
  isFinal: boolean;
}

export interface VoiceCaptureConfig {
  language: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
}

// ============================================
// API TYPES
// ============================================

export interface ProcessUtteranceRequest {
  text: string;
  sessionId?: string;
  voiceMetadata?: VoiceMetadata;
}

export interface ProcessUtteranceResponse {
  utteranceId: string;
  intent: UtteranceIntent;
  intentConfidence: number;
  task?: Task;
  action?: 'created' | 'updated' | 'completed' | 'queried';
  matchConfidence?: number;
  tasks?: Task[]; // For query intent
  message: string;
  needsConfirmation?: boolean;
  sessionId: string;
}

export interface CorrectMatchRequest {
  correctTaskId: string;
}

export interface QueryTasksRequest {
  status?: TaskStatus | TaskStatus[];
  query?: string;
  limit?: number;
  includeArchived?: boolean;
}

export interface QueryTasksResponse {
  tasks: Task[];
  total: number;
  sessionContext: {
    activeTask?: Task;
    recentTasks: Task[];
  };
}

// ============================================
// MEMORY PIPELINE
// ============================================

export interface TaskArchiveData {
  task: Task;
  updates: TaskUpdate[];
  utterances: Utterance[];
}

export interface TaskArchiveSummary {
  summary: string;
  context: string;
  tags: string[];
  revealedPreference?: {
    key: string;
    value: string;
  };
}

// ============================================
// LEARNING
// ============================================

export interface CorrectionData {
  utteranceId: string;
  originalTaskId?: string;
  correctedTaskId: string;
  utteranceText: string;
  timestamp: Date;
}

export interface LearningPattern {
  utterancePattern: string;
  preferredTaskId: string;
  occurrences: number;
  lastSeen: Date;
}

// ============================================
// DATABASE ROW TYPES (for SQL results)
// ============================================

export interface TaskRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: number;
  tags: string[];
  due_at: Date | null;
  created_at: Date;
  updated_at: Date;
  completed_at: Date | null;
  embedding: string | null; // pgvector returns as string
  parent_task_id: string | null;
  metadata: Record<string, unknown>;
  archived_to_memory_id: string | null;
}

export interface UtteranceRow {
  id: string;
  user_id: string;
  session_id: string | null;
  raw_text: string;
  normalized_text: string | null;
  intent: UtteranceIntent;
  intent_confidence: string; // numeric comes as string
  matched_task_id: string | null;
  match_confidence: string | null;
  embedding: string | null;
  was_corrected: boolean;
  corrected_to_task_id: string | null;
  llm_analysis: LLMAnalysisResult;
  voice_metadata: VoiceMetadata | null;
  created_at: Date;
}

export interface TaskSessionRow {
  id: string;
  user_id: string;
  active_task_id: string | null;
  recent_utterances: string[];
  context: SessionContextData;
  started_at: Date;
  last_activity_at: Date;
}

// ============================================
// CONVERSION HELPERS
// ============================================

export function taskFromRow(row: TaskRow): Task {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description ?? undefined,
    status: row.status,
    priority: row.priority,
    tags: row.tags || [],
    dueAt: row.due_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at ?? undefined,
    embedding: row.embedding ? parseVector(row.embedding) : undefined,
    parentTaskId: row.parent_task_id ?? undefined,
    metadata: row.metadata || {},
    archivedToMemoryId: row.archived_to_memory_id ?? undefined,
  };
}

export function utteranceFromRow(row: UtteranceRow): Utterance {
  return {
    id: row.id,
    userId: row.user_id,
    sessionId: row.session_id ?? undefined,
    rawText: row.raw_text,
    normalizedText: row.normalized_text ?? undefined,
    intent: row.intent,
    intentConfidence: parseFloat(row.intent_confidence),
    matchedTaskId: row.matched_task_id ?? undefined,
    matchConfidence: row.match_confidence ? parseFloat(row.match_confidence) : undefined,
    embedding: row.embedding ? parseVector(row.embedding) : undefined,
    wasCorrected: row.was_corrected,
    correctedToTaskId: row.corrected_to_task_id ?? undefined,
    llmAnalysis: row.llm_analysis,
    voiceMetadata: row.voice_metadata ?? undefined,
    createdAt: row.created_at,
  };
}

export function sessionFromRow(row: TaskSessionRow): TaskSession {
  return {
    id: row.id,
    userId: row.user_id,
    activeTaskId: row.active_task_id ?? undefined,
    recentUtterances: row.recent_utterances || [],
    context: row.context || {},
    startedAt: row.started_at,
    lastActivityAt: row.last_activity_at,
  };
}

// Parse pgvector string representation to number array
function parseVector(vectorStr: string): number[] {
  // pgvector returns "[0.1,0.2,0.3,...]"
  const cleaned = vectorStr.replace(/^\[|\]$/g, '');
  return cleaned.split(',').map(s => parseFloat(s.trim()));
}

// Format number array as pgvector string
export function formatVector(vector: number[]): string {
  return `[${vector.join(',')}]`;
}

