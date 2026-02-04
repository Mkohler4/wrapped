/**
 * Understanding Engine
 * 
 * Analyzes natural language utterances to extract task-related intent.
 * Uses LLM to classify intent and extract task information.
 */

import { complete, getModelConfig } from '../lib/llm.js';
import type {
  UtteranceIntent,
  LLMAnalysisResult,
  LLMAnalysisContext,
  TaskSummary,
} from './types.js';

// ============================================
// SYSTEM PROMPT
// ============================================

const UNDERSTANDING_SYSTEM_PROMPT = `You are a task understanding engine. You analyze natural speech to identify task-related intent.

Your job is to:
1. Classify the intent of the utterance
2. Extract task information if present
3. Identify if this refers to an existing task or is a new one

INTENT CLASSIFICATIONS:
- "starting": User is beginning or declaring a new task
  Examples: "I need to call mom", "Going to work on the report", "Let me start that project"
  
- "progress": User is reporting progress on a task
  Examples: "Making good progress on the report", "Halfway done with groceries", "Working on it"
  
- "completed": User finished a task
  Examples: "Done!", "Finished the report", "Got the groceries", "That's done"
  
- "blocked": User is stuck or pausing
  Examples: "Stuck on the API issue", "Waiting for Bob's response", "Can't continue until..."
  
- "query": User is asking about tasks
  Examples: "What was I working on?", "Show my tasks", "What's pending?"
  
- "not_task": Not task-related
  Examples: "The weather is nice", "Hello", "Thanks", general conversation

IMPORTANT RULES:
1. Be generous with task detection - users speak naturally
2. "Done" or "finished" near task context = completed
3. "Working on" or "doing" = progress
4. "Need to" or "have to" or "should" = starting
5. Vague references ("that thing", "the usual") should try to match context
6. Questions about tasks = query
7. When unsure, prefer starting > not_task for actionable statements

Respond with valid JSON only.`;

// ============================================
// ANALYSIS FUNCTION
// ============================================

export interface AnalyzeUtteranceOptions {
  utterance: string;
  context?: LLMAnalysisContext;
  verbose?: boolean;
}

export async function analyzeUtterance(
  options: AnalyzeUtteranceOptions
): Promise<LLMAnalysisResult> {
  const { utterance, context, verbose } = options;
  
  // Build context string for the LLM
  const contextStr = buildContextString(context);
  
  const userPrompt = `CONTEXT:
${contextStr}

UTTERANCE: "${utterance}"

Analyze this utterance and respond with JSON:
{
  "intent": "starting|progress|completed|blocked|query|not_task",
  "confidence": 0.0-1.0,
  "taskReference": "what task this refers to (if any, null if unclear)",
  "isNewTask": true/false,
  "extractedTitle": "task title if new task (null otherwise)",
  "extractedDescription": "description if provided (null otherwise)",
  "extractedTags": ["tags", "if", "detectable"],
  "extractedPriority": 1-5 or null,
  "extractedDueDate": "ISO date string if mentioned, null otherwise",
  "notes": "any additional context extracted",
  "reasoning": "brief explanation of your classification"
}`;

  const config = getModelConfig();
  
  try {
    const result = await complete({
      model: config.fast, // Use fast model for classification
      messages: [
        { role: 'system', content: UNDERSTANDING_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      maxTokens: 500,
      temperature: 0.3, // Lower temperature for consistent classification
    });

    const analysis = parseAnalysisResponse(result.content);
    
    if (verbose) {
      console.log('LLM Analysis:', JSON.stringify(analysis, null, 2));
    }
    
    return analysis;
  } catch (error) {
    console.error('Error analyzing utterance:', error);
    
    // Return safe default on error
    return {
      intent: 'not_task',
      confidence: 0,
      isNewTask: false,
      reasoning: 'Analysis failed - defaulting to not_task',
    };
  }
}

// ============================================
// HELPERS
// ============================================

function buildContextString(context?: LLMAnalysisContext): string {
  if (!context) {
    return '(No context available)';
  }

  const parts: string[] = [];

  if (context.activeTask) {
    parts.push(`Active task: "${context.activeTask.title}" (${context.activeTask.status})`);
  } else {
    parts.push('Active task: None');
  }

  if (context.recentTasks.length > 0) {
    const recentList = context.recentTasks
      .map(t => `  - "${t.title}" (${t.status})`)
      .join('\n');
    parts.push(`Recent tasks:\n${recentList}`);
  } else {
    parts.push('Recent tasks: None');
  }

  if (context.recentUtterances.length > 0) {
    const utteranceList = context.recentUtterances
      .slice(0, 5) // Last 5 utterances
      .map((u, i) => `  ${i + 1}. "${u}"`)
      .join('\n');
    parts.push(`Recent speech:\n${utteranceList}`);
  }

  return parts.join('\n');
}

function parseAnalysisResponse(content: string): LLMAnalysisResult {
  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content;
    
    // Try to extract from code block
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }
    
    // Parse and validate
    const parsed = JSON.parse(jsonStr);
    
    return {
      intent: validateIntent(parsed.intent),
      confidence: clamp(parsed.confidence ?? 0.5, 0, 1),
      taskReference: parsed.taskReference || undefined,
      isNewTask: Boolean(parsed.isNewTask),
      extractedTitle: parsed.extractedTitle || undefined,
      extractedDescription: parsed.extractedDescription || undefined,
      extractedTags: Array.isArray(parsed.extractedTags) ? parsed.extractedTags : undefined,
      extractedPriority: validatePriority(parsed.extractedPriority),
      extractedDueDate: parsed.extractedDueDate || undefined,
      notes: parsed.notes || undefined,
      reasoning: parsed.reasoning || 'No reasoning provided',
    };
  } catch (error) {
    console.error('Failed to parse LLM response:', content);
    
    // Attempt simple extraction
    return extractFallback(content);
  }
}

function validateIntent(intent: string): UtteranceIntent {
  const validIntents: UtteranceIntent[] = [
    'starting', 'progress', 'completed', 'blocked', 'query', 'not_task'
  ];
  
  if (validIntents.includes(intent as UtteranceIntent)) {
    return intent as UtteranceIntent;
  }
  
  return 'not_task';
}

function validatePriority(priority: unknown): number | undefined {
  if (typeof priority === 'number' && priority >= 1 && priority <= 5) {
    return Math.round(priority);
  }
  return undefined;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function extractFallback(content: string): LLMAnalysisResult {
  // Simple keyword-based fallback
  const lower = content.toLowerCase();
  
  let intent: UtteranceIntent = 'not_task';
  
  if (lower.includes('"starting"') || lower.includes('new task')) {
    intent = 'starting';
  } else if (lower.includes('"completed"') || lower.includes('"done"')) {
    intent = 'completed';
  } else if (lower.includes('"progress"')) {
    intent = 'progress';
  } else if (lower.includes('"blocked"')) {
    intent = 'blocked';
  } else if (lower.includes('"query"')) {
    intent = 'query';
  }
  
  return {
    intent,
    confidence: 0.5,
    isNewTask: intent === 'starting',
    reasoning: 'Fallback extraction from unparseable response',
  };
}

// ============================================
// QUICK CLASSIFICATION (without full analysis)
// ============================================

const QUICK_PATTERNS = {
  starting: [
    /^i need to\b/i,
    /^i have to\b/i,
    /^i should\b/i,
    /^let me\b/i,
    /^going to\b/i,
    /^gonna\b/i,
    /^time to\b/i,
    /^gotta\b/i,
  ],
  completed: [
    /^done\b/i,
    /^finished\b/i,
    /^completed\b/i,
    /^that's done\b/i,
    /^all done\b/i,
    /^got it done\b/i,
  ],
  progress: [
    /^working on\b/i,
    /^making progress\b/i,
    /^halfway\b/i,
    /^almost done\b/i,
    /^still working\b/i,
  ],
  blocked: [
    /^stuck\b/i,
    /^blocked\b/i,
    /^waiting for\b/i,
    /^can't continue\b/i,
  ],
  query: [
    /^what('s| is| are)?\s*(my|the)?\s*task/i,
    /^show\s*(my|the)?\s*task/i,
    /^what was i\b/i,
    /^what am i\b/i,
  ],
};

/**
 * Quick pattern-based classification for common phrases.
 * Returns null if no clear pattern match - use full LLM analysis.
 */
export function quickClassify(utterance: string): { intent: UtteranceIntent; confidence: number } | null {
  const trimmed = utterance.trim();
  
  for (const [intent, patterns] of Object.entries(QUICK_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(trimmed)) {
        return {
          intent: intent as UtteranceIntent,
          confidence: 0.85,
        };
      }
    }
  }
  
  return null;
}

// ============================================
// NORMALIZER
// ============================================

/**
 * Normalize utterance text for better matching and storage.
 */
export function normalizeUtterance(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ')           // Collapse whitespace
    .replace(/[""]/g, '"')          // Normalize quotes
    .replace(/['']/g, "'")          // Normalize apostrophes
    .replace(/\.{2,}/g, '...')      // Normalize ellipsis
    .replace(/!{2,}/g, '!')         // Collapse exclamation marks
    .replace(/\?{2,}/g, '?');       // Collapse question marks
}

// ============================================
// EXPORTS
// ============================================

export {
  UNDERSTANDING_SYSTEM_PROMPT,
  buildContextString,
};

