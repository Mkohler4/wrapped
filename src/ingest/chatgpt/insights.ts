/**
 * ChatGPT Insight Extraction
 * 
 * Extracts preferences, decisions, and learnings from conversations
 * to populate the memory system.
 */

import {
  ProcessedConversation,
  ExtractedInsights,
  ExtractedPreference,
  ExtractedDecision,
  ExtractedLearning,
} from './types';

// ============================================
// PATTERN-BASED EXTRACTION (Fast, No LLM)
// ============================================

const PREFERENCE_PATTERNS = [
  // Technology preferences
  { regex: /\b(?:i (?:use|prefer|like|love|always use|work with))\s+([a-zA-Z0-9\-_.]+)/gi, category: 'technology' as const },
  { regex: /\b(?:my (?:favorite|preferred|go-to))\s+(?:language|framework|tool|editor|ide)\s+(?:is\s+)?([a-zA-Z0-9\-_.]+)/gi, category: 'technology' as const },
  { regex: /\b(?:i'm a|i am a)\s+([a-zA-Z]+)\s+(?:developer|engineer|programmer)/gi, category: 'technology' as const },
  
  // Communication preferences
  { regex: /\b(?:keep it|be)\s+(brief|short|concise|detailed|verbose)/gi, category: 'communication' as const },
  { regex: /\b(?:i prefer)\s+(bullet points|paragraphs|lists|headers)/gi, category: 'communication' as const },
  
  // Work preferences
  { regex: /\b(?:i work (?:at|for|on))\s+([a-zA-Z0-9\s]+?)(?:\.|,|\s+and|\s+as)/gi, category: 'work' as const },
  { regex: /\b(?:i'm (?:a|the|an))\s+([a-zA-Z\s]+?)(?:\s+at|\s+for|\.)/gi, category: 'work' as const },
];

const DECISION_PATTERNS = [
  /\b(?:i(?:'ve)?\s+decided|i(?:'m)?\s+going\s+(?:to|with)|let(?:'s)?\s+go\s+with|i(?:'ll)?\s+choose|my\s+decision\s+is)\s+(.+?)(?:\.|$)/gi,
  /\b(?:after\s+(?:considering|thinking|weighing),?\s*i(?:'ll)?\s+)(.+?)(?:\.|$)/gi,
];

const LEARNING_PATTERNS = [
  /\b(?:i\s+(?:learned|realized|discovered|found\s+out|understood))\s+(?:that\s+)?(.+?)(?:\.|$)/gi,
  /\b(?:turns\s+out|it\s+seems|apparently)\s+(.+?)(?:\.|$)/gi,
  /\b(?:the\s+(?:key|trick|solution|answer)\s+(?:is|was))\s+(.+?)(?:\.|$)/gi,
];

export function extractInsightsFromPatterns(
  conversation: ProcessedConversation
): ExtractedInsights {
  const userText = conversation.messages
    .filter(m => m.role === 'user')
    .map(m => m.text)
    .join('\n');
  
  const insights: ExtractedInsights = {
    preferences: [],
    decisions: [],
    learnings: [],
  };
  
  // Extract preferences
  for (const pattern of PREFERENCE_PATTERNS) {
    let match;
    while ((match = pattern.regex.exec(userText)) !== null) {
      const value = match[1]?.trim();
      if (value && value.length > 1 && value.length < 100) {
        insights.preferences.push({
          category: pattern.category,
          key: guessPreferenceKey(match[0], pattern.category),
          value,
          confidence: 0.7,
          sourceConversationId: conversation.id,
          sourceText: match[0],
        });
      }
    }
    // Reset regex lastIndex
    pattern.regex.lastIndex = 0;
  }
  
  // Extract decisions
  for (const pattern of DECISION_PATTERNS) {
    let match;
    while ((match = pattern.exec(userText)) !== null) {
      const summary = match[1]?.trim();
      if (summary && summary.length > 10 && summary.length < 300) {
        insights.decisions.push({
          summary: `Decided to ${summary}`,
          reasoning: '', // Would need LLM for this
          alternatives: [],
          confidence: 0.6,
          sourceConversationId: conversation.id,
          timestamp: conversation.updatedAt,
        });
      }
    }
    pattern.lastIndex = 0;
  }
  
  // Extract learnings
  for (const pattern of LEARNING_PATTERNS) {
    let match;
    while ((match = pattern.exec(userText)) !== null) {
      const summary = match[1]?.trim();
      if (summary && summary.length > 10 && summary.length < 300) {
        insights.learnings.push({
          summary,
          context: conversation.title,
          confidence: 0.6,
          sourceConversationId: conversation.id,
          timestamp: conversation.updatedAt,
        });
      }
    }
    pattern.lastIndex = 0;
  }
  
  // Deduplicate
  insights.preferences = dedupePreferences(insights.preferences);
  insights.decisions = dedupeByField(insights.decisions, 'summary');
  insights.learnings = dedupeByField(insights.learnings, 'summary');
  
  return insights;
}

function guessPreferenceKey(matchText: string, category: string): string {
  const lower = matchText.toLowerCase();
  
  if (category === 'technology') {
    if (lower.includes('language')) return 'programming_language';
    if (lower.includes('framework')) return 'framework';
    if (lower.includes('editor') || lower.includes('ide')) return 'editor';
    if (lower.includes('developer') || lower.includes('engineer')) return 'developer_type';
    return 'tool';
  }
  
  if (category === 'communication') {
    if (lower.includes('brief') || lower.includes('short') || lower.includes('concise')) return 'response_length';
    if (lower.includes('detailed') || lower.includes('verbose')) return 'response_length';
    return 'format';
  }
  
  if (category === 'work') {
    if (lower.includes('work at') || lower.includes('work for')) return 'company';
    return 'role';
  }
  
  return 'general';
}

function dedupePreferences(prefs: ExtractedPreference[]): ExtractedPreference[] {
  const seen = new Map<string, ExtractedPreference>();
  
  for (const pref of prefs) {
    const key = `${pref.category}:${pref.key}:${pref.value.toLowerCase()}`;
    const existing = seen.get(key);
    
    if (!existing || pref.confidence > existing.confidence) {
      seen.set(key, pref);
    }
  }
  
  return Array.from(seen.values());
}

function dedupeByField<T extends { summary: string }>(items: T[], field: keyof T): T[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const value = String(item[field]).toLowerCase().slice(0, 50);
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

// ============================================
// LLM-BASED EXTRACTION (More Accurate)
// ============================================

export interface LLMClient {
  complete(params: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    max_tokens: number;
    temperature?: number;
  }): Promise<{ content: string }>;
}

const PREFERENCE_EXTRACTION_PROMPT = `Analyze this ChatGPT conversation between the user and assistant. Extract any preferences, personal facts, or habits the USER explicitly states or strongly implies.

Focus on:
- Technology preferences (languages, frameworks, tools, editors)
- Communication preferences (verbosity, format, tone)
- Work context (role, company, industry)
- Personal facts (only if directly stated)

Output as JSON:
{
  "preferences": [
    {
      "category": "technology|communication|work|personal",
      "key": "specific_key_name",
      "value": "the preference value",
      "confidence": 0.0-1.0
    }
  ]
}

Only include items where the user clearly states or strongly implies the preference (confidence > 0.7).
If no clear preferences are found, return {"preferences": []}.

CONVERSATION:
`;

const DECISION_EXTRACTION_PROMPT = `Analyze this ChatGPT conversation for any decisions the USER made or conclusions they reached.

A decision includes:
- What was decided
- Why (the reasoning, if stated)
- What alternatives were considered (if mentioned)

Output as JSON:
{
  "decisions": [
    {
      "summary": "Brief description of the decision",
      "reasoning": "Why they decided this (or empty string if not stated)",
      "alternatives": ["alt1", "alt2"],
      "confidence": 0.0-1.0
    }
  ],
  "learnings": [
    {
      "summary": "What they learned or realized",
      "context": "What prompted this learning",
      "confidence": 0.0-1.0
    }
  ]
}

Only include items with confidence > 0.7.
If no decisions or learnings are found, return {"decisions": [], "learnings": []}.

CONVERSATION:
`;

export async function extractInsightsWithLLM(
  conversation: ProcessedConversation,
  llm: LLMClient
): Promise<ExtractedInsights> {
  const userMessages = conversation.messages
    .filter(m => m.role === 'user')
    .map(m => `USER: ${m.text}`)
    .join('\n\n');
  
  const assistantMessages = conversation.messages
    .filter(m => m.role === 'assistant')
    .map(m => `ASSISTANT: ${m.text.slice(0, 500)}...`)
    .join('\n\n');
  
  const conversationText = `Title: ${conversation.title}\n\n${userMessages}\n\n---\n\n${assistantMessages}`.slice(0, 8000);
  
  const insights: ExtractedInsights = {
    preferences: [],
    decisions: [],
    learnings: [],
  };
  
  try {
    // Extract preferences
    const prefResponse = await llm.complete({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: PREFERENCE_EXTRACTION_PROMPT },
        { role: 'user', content: conversationText },
      ],
      max_tokens: 500,
      temperature: 0.3,
    });
    
    const prefData = parseJSONResponse(prefResponse.content);
    if (prefData?.preferences) {
      insights.preferences = prefData.preferences.map((p: any) => ({
        ...p,
        sourceConversationId: conversation.id,
        sourceText: '',
      }));
    }
    
    // Extract decisions and learnings
    const decResponse = await llm.complete({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: DECISION_EXTRACTION_PROMPT },
        { role: 'user', content: conversationText },
      ],
      max_tokens: 500,
      temperature: 0.3,
    });
    
    const decData = parseJSONResponse(decResponse.content);
    if (decData?.decisions) {
      insights.decisions = decData.decisions.map((d: any) => ({
        ...d,
        sourceConversationId: conversation.id,
        timestamp: conversation.updatedAt,
      }));
    }
    if (decData?.learnings) {
      insights.learnings = decData.learnings.map((l: any) => ({
        ...l,
        sourceConversationId: conversation.id,
        timestamp: conversation.updatedAt,
      }));
    }
  } catch (error) {
    console.error('LLM insight extraction failed:', error);
    // Fall back to pattern-based extraction
    return extractInsightsFromPatterns(conversation);
  }
  
  return insights;
}

function parseJSONResponse(content: string): any {
  // Try to extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

// ============================================
// STYLE ANALYSIS
// ============================================

export interface StyleSignals {
  averageMessageLength: number;
  usesCodeBlocks: boolean;
  technicalLevel: 'low' | 'medium' | 'high';
  questionStyle: 'direct' | 'contextual' | 'detailed';
  preferredFormat: 'prose' | 'bullets' | 'mixed';
}

export function analyzeStyle(conversations: ProcessedConversation[]): StyleSignals {
  const userMessages = conversations.flatMap(c => 
    c.messages.filter(m => m.role === 'user')
  );
  
  if (userMessages.length === 0) {
    return {
      averageMessageLength: 0,
      usesCodeBlocks: false,
      technicalLevel: 'medium',
      questionStyle: 'direct',
      preferredFormat: 'mixed',
    };
  }
  
  // Average message length
  const totalLength = userMessages.reduce((sum, m) => sum + m.text.length, 0);
  const averageMessageLength = totalLength / userMessages.length;
  
  // Code block usage
  const usesCodeBlocks = userMessages.some(m => m.hasCode);
  
  // Technical level (based on technical terms)
  const technicalTerms = [
    'api', 'function', 'database', 'server', 'client', 'async', 'promise',
    'algorithm', 'architecture', 'deploy', 'container', 'kubernetes', 'docker',
  ];
  const allText = userMessages.map(m => m.text.toLowerCase()).join(' ');
  const technicalMatches = technicalTerms.filter(t => allText.includes(t)).length;
  const technicalLevel = technicalMatches > 10 ? 'high' : technicalMatches > 3 ? 'medium' : 'low';
  
  // Question style
  const shortQuestions = userMessages.filter(m => m.text.length < 100 && m.text.includes('?')).length;
  const longQuestions = userMessages.filter(m => m.text.length > 300).length;
  const questionStyle = shortQuestions > longQuestions * 2 ? 'direct' : longQuestions > shortQuestions ? 'detailed' : 'contextual';
  
  // Format preference (based on user's requests)
  const wantsBullets = allText.includes('bullet') || allText.includes('list');
  const wantsProse = allText.includes('paragraph') || allText.includes('prose');
  const preferredFormat = wantsBullets ? 'bullets' : wantsProse ? 'prose' : 'mixed';
  
  return {
    averageMessageLength,
    usesCodeBlocks,
    technicalLevel,
    questionStyle,
    preferredFormat,
  };
}

