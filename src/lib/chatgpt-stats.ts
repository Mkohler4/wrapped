/**
 * ChatGPT Stats Module
 * 
 * Shared statistics computation for ChatGPT data.
 * Used by both the main app and ChatGPT Wrapped.
 * 
 * IMPORTANT: This module re-exports existing functionality.
 * DO NOT duplicate code from parser.ts or insights.ts!
 */

// ============================================
// RE-EXPORTS FROM EXISTING MODULES
// (Don't duplicate - import from source)
// ============================================

// Topic classification
export { classifyConversation, TOPIC_PATTERNS } from '../ingest/chatgpt/parser';

// Style analysis
export { analyzeStyle, type StyleSignals } from '../ingest/chatgpt/insights';

// Insight extraction
export { extractInsightsFromPatterns } from '../ingest/chatgpt/insights';

// Types
export type {
  ChatGPTConversation,
  ProcessedConversation,
  LinearizedMessage,
} from '../ingest/chatgpt/types';

// ============================================
// NEW: WRAPPED-SPECIFIC STATS
// ============================================

import type { ChatGPTConversation } from '../ingest/chatgpt/types';
import { linearizeConversation, extractText } from '../ingest/chatgpt/parser';

// ============================================
// TIME-BASED STATS
// ============================================

export interface TimeStats {
  /** Counts by hour (0-23) */
  byHour: number[];
  /** Counts by day of week (0=Sunday, 6=Saturday) */
  byDayOfWeek: number[];
  /** Peak hour (0-23) */
  peakHour: number;
  /** Peak day name */
  peakDay: string;
  /** User persona based on time patterns */
  persona: 'early_bird' | 'night_owl' | 'nine_to_fiver' | 'weekend_warrior' | 'always_on';
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function computeTimeStats(conversations: ChatGPTConversation[]): TimeStats {
  const byHour = new Array(24).fill(0);
  const byDayOfWeek = new Array(7).fill(0);
  
  for (const conv of conversations) {
    if (!conv.create_time) continue;
    
    const date = new Date(conv.create_time * 1000);
    const hour = date.getHours();
    const day = date.getDay();
    
    byHour[hour]++;
    byDayOfWeek[day]++;
  }
  
  // Find peak hour
  const peakHour = byHour.indexOf(Math.max(...byHour));
  
  // Find peak day
  const peakDayIndex = byDayOfWeek.indexOf(Math.max(...byDayOfWeek));
  const peakDay = DAY_NAMES[peakDayIndex];
  
  // Determine persona
  const persona = determineTimePersona(byHour, byDayOfWeek);
  
  return { byHour, byDayOfWeek, peakHour, peakDay, persona };
}

function determineTimePersona(
  byHour: number[], 
  byDayOfWeek: number[]
): TimeStats['persona'] {
  const total = byHour.reduce((a, b) => a + b, 0);
  if (total === 0) return 'always_on';
  
  // Early morning (5-9am)
  const earlyMorning = byHour.slice(5, 10).reduce((a, b) => a + b, 0);
  // Late night (10pm-4am)
  const lateNight = [...byHour.slice(22), ...byHour.slice(0, 5)].reduce((a, b) => a + b, 0);
  // Work hours (9am-5pm)
  const workHours = byHour.slice(9, 17).reduce((a, b) => a + b, 0);
  // Weekend
  const weekend = byDayOfWeek[0] + byDayOfWeek[6];
  const weekday = byDayOfWeek.slice(1, 6).reduce((a, b) => a + b, 0);
  
  // Thresholds
  if (lateNight / total > 0.35) return 'night_owl';
  if (earlyMorning / total > 0.25) return 'early_bird';
  if (weekend > weekday * 0.6) return 'weekend_warrior';
  if (workHours / total > 0.6) return 'nine_to_fiver';
  
  return 'always_on';
}

// ============================================
// LONGEST CONVERSATION
// ============================================

export interface LongestConversation {
  title: string;
  messageCount: number;
  userMessageCount: number;
  date: Date | null;
  id?: string;
}

export function findLongestConversation(
  conversations: ChatGPTConversation[]
): LongestConversation | null {
  if (conversations.length === 0) return null;
  
  let longest: LongestConversation | null = null;
  let maxMessages = 0;
  
  for (const conv of conversations) {
    const messages = linearizeConversation(conv);
    const userMessages = messages.filter(m => m.role === 'user').length;
    
    if (messages.length > maxMessages) {
      maxMessages = messages.length;
      longest = {
        title: conv.title || 'Untitled',
        messageCount: messages.length,
        userMessageCount: userMessages,
        date: conv.create_time ? new Date(conv.create_time * 1000) : null,
        id: conv.id,
      };
    }
  }
  
  return longest;
}

// ============================================
// MOST USED WORDS
// ============================================

export interface WordFrequency {
  word: string;
  count: number;
}

// Common stop words to filter out
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'it', 'its',
  'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they',
  'what', 'which', 'who', 'when', 'where', 'why', 'how', 'all', 'each',
  'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'not', 'only', 'same', 'so', 'than', 'too', 'very', 'just', 'also',
  'now', 'here', 'there', 'then', 'if', 'my', 'your', 'our', 'their',
  'me', 'him', 'her', 'us', 'them', 'any', 'about', 'into', 'through',
  'during', 'before', 'after', 'above', 'below', 'between', 'under',
  'again', 'further', 'once', 'up', 'down', 'out', 'off', 'over',
  'am', 'being', 'get', 'got', 'like', 'want', 'make', 'use', 'using',
  'please', 'thanks', 'thank', 'yes', 'no', 'ok', 'okay', 'sure', 'well',
  'dont', "don't", 'cant', "can't", 'wont', "won't", 'im', "i'm", 'ive', "i've",
]);

export function computeWordFrequency(
  conversations: ChatGPTConversation[],
  options: {
    topN?: number;
    minLength?: number;
    userMessagesOnly?: boolean;
  } = {}
): WordFrequency[] {
  const { topN = 20, minLength = 3, userMessagesOnly = true } = options;
  
  const wordCounts = new Map<string, number>();
  
  for (const conv of conversations) {
    for (const node of Object.values(conv.mapping)) {
      if (!node.message) continue;
      
      // Skip non-user messages if configured
      if (userMessagesOnly && node.message.author.role !== 'user') continue;
      
      const text = extractText(node).toLowerCase();
      
      // Extract words (alphanumeric only)
      const words = text.match(/\b[a-z][a-z0-9]*\b/g) || [];
      
      for (const word of words) {
        // Skip short words and stop words
        if (word.length < minLength) continue;
        if (STOP_WORDS.has(word)) continue;
        
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    }
  }
  
  // Sort by frequency and return top N
  return Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word, count]) => ({ word, count }));
}

// ============================================
// STREAK DETECTION
// ============================================

export interface StreakStats {
  /** Current streak (consecutive days ending today or recently) */
  currentStreak: number;
  /** Longest streak ever */
  longestStreak: number;
  /** Start date of longest streak */
  longestStreakStart: Date | null;
  /** End date of longest streak */
  longestStreakEnd: Date | null;
  /** Total unique days with activity */
  totalActiveDays: number;
}

export function computeStreaks(conversations: ChatGPTConversation[]): StreakStats {
  if (conversations.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      longestStreakStart: null,
      longestStreakEnd: null,
      totalActiveDays: 0,
    };
  }
  
  // Get unique dates (YYYY-MM-DD format)
  const activeDates = new Set<string>();
  
  for (const conv of conversations) {
    if (!conv.create_time) continue;
    const date = new Date(conv.create_time * 1000);
    const dateStr = date.toISOString().split('T')[0];
    activeDates.add(dateStr);
  }
  
  // Sort dates
  const sortedDates = Array.from(activeDates).sort();
  const totalActiveDays = sortedDates.length;
  
  if (totalActiveDays === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      longestStreakStart: null,
      longestStreakEnd: null,
      totalActiveDays: 0,
    };
  }
  
  // Find longest streak
  let longestStreak = 1;
  let longestStreakStart = sortedDates[0];
  let longestStreakEnd = sortedDates[0];
  
  let currentStreakLength = 1;
  let currentStreakStart = sortedDates[0];
  
  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = new Date(sortedDates[i - 1]);
    const currDate = new Date(sortedDates[i]);
    
    // Check if consecutive (within 1 day)
    const diffDays = Math.round(
      (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (diffDays === 1) {
      currentStreakLength++;
    } else {
      // Streak broken, check if it was the longest
      if (currentStreakLength > longestStreak) {
        longestStreak = currentStreakLength;
        longestStreakStart = currentStreakStart;
        longestStreakEnd = sortedDates[i - 1];
      }
      // Start new streak
      currentStreakLength = 1;
      currentStreakStart = sortedDates[i];
    }
  }
  
  // Check final streak
  if (currentStreakLength > longestStreak) {
    longestStreak = currentStreakLength;
    longestStreakStart = currentStreakStart;
    longestStreakEnd = sortedDates[sortedDates.length - 1];
  }
  
  // Compute current streak (from most recent date backwards)
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  let currentStreak = 0;
  const lastActiveDate = sortedDates[sortedDates.length - 1];
  
  // Only count current streak if active today or yesterday
  if (lastActiveDate === today || lastActiveDate === yesterday) {
    currentStreak = 1;
    
    for (let i = sortedDates.length - 2; i >= 0; i--) {
      const currDate = new Date(sortedDates[i + 1]);
      const prevDate = new Date(sortedDates[i]);
      
      const diffDays = Math.round(
        (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (diffDays === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }
  
  return {
    currentStreak,
    longestStreak,
    longestStreakStart: new Date(longestStreakStart),
    longestStreakEnd: new Date(longestStreakEnd),
    totalActiveDays,
  };
}

// ============================================
// AGGREGATE STATS (for Wrapped)
// ============================================

export interface WrappedStats {
  /** Total conversations */
  totalConversations: number;
  /** Total messages (all roles) */
  totalMessages: number;
  /** Total user messages */
  totalUserMessages: number;
  /** Average messages per conversation */
  averageMessagesPerConversation: number;
  /** Images uploaded (approximate from multimodal content) */
  imagesUploaded: number;
  /** Code blocks shared by user */
  codeBlocksShared: number;
  /** First conversation date */
  firstConversationDate: Date | null;
  /** Last conversation date */
  lastConversationDate: Date | null;
  /** Time-based stats */
  timeStats: TimeStats;
  /** Longest conversation */
  longestConversation: LongestConversation | null;
  /** Most used words */
  topWords: WordFrequency[];
  /** Streak stats */
  streaks: StreakStats;
  /** Topic distribution */
  topicDistribution: Map<string, number>;
}

export function computeWrappedStats(
  conversations: ChatGPTConversation[]
): WrappedStats {
  let totalMessages = 0;
  let totalUserMessages = 0;
  let imagesUploaded = 0;
  let codeBlocksShared = 0;
  const topicCounts = new Map<string, number>();
  
  // Track first/last dates
  let firstDate: Date | null = null;
  let lastDate: Date | null = null;
  
  // Import classifyConversation dynamically to avoid circular deps
  const { classifyConversation } = require('../ingest/chatgpt/parser');
  
  for (const conv of conversations) {
    const messages = linearizeConversation(conv);
    totalMessages += messages.length;
    
    const userMessages = messages.filter(m => m.role === 'user');
    totalUserMessages += userMessages.length;
    
    // Track first/last conversation dates
    if (conv.create_time) {
      const convDate = new Date(conv.create_time * 1000);
      if (!firstDate || convDate < firstDate) firstDate = convDate;
      if (!lastDate || convDate > lastDate) lastDate = convDate;
    }
    
    // Count code blocks in user messages
    for (const msg of userMessages) {
      const codeMatches = msg.text.match(/```[\s\S]*?```/g);
      if (codeMatches) {
        codeBlocksShared += codeMatches.length;
      }
    }
    
    // Count images (multimodal content)
    for (const node of Object.values(conv.mapping)) {
      const content = node.message?.content;
      if (content?.content_type === 'multimodal_text' && content.parts) {
        for (const part of content.parts) {
          if (typeof part === 'object' && part?.asset_pointer) {
            imagesUploaded++;
          }
        }
      }
    }
    
    // Classify topics
    const topics = classifyConversation(conv);
    for (const topic of topics) {
      topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
    }
  }
  
  const averageMessagesPerConversation = conversations.length > 0
    ? Math.round(totalMessages / conversations.length * 10) / 10
    : 0;
  
  return {
    totalConversations: conversations.length,
    totalMessages,
    totalUserMessages,
    averageMessagesPerConversation,
    imagesUploaded,
    codeBlocksShared,
    firstConversationDate: firstDate,
    lastConversationDate: lastDate,
    timeStats: computeTimeStats(conversations),
    longestConversation: findLongestConversation(conversations),
    topWords: computeWordFrequency(conversations),
    streaks: computeStreaks(conversations),
    topicDistribution: topicCounts,
  };
}

// ============================================
// FORMATTING HELPERS (for UI)
// ============================================

export function formatHour(hour: number): string {
  if (hour === 0) return '12am';
  if (hour === 12) return '12pm';
  if (hour < 12) return `${hour}am`;
  return `${hour - 12}pm`;
}

export function getPersonaEmoji(persona: TimeStats['persona']): string {
  switch (persona) {
    case 'night_owl': return '🦉';
    case 'early_bird': return '🐦';
    case 'nine_to_fiver': return '💼';
    case 'weekend_warrior': return '🎮';
    case 'always_on': return '⚡';
  }
}

export function getPersonaLabel(persona: TimeStats['persona']): string {
  switch (persona) {
    case 'night_owl': return 'Night Owl';
    case 'early_bird': return 'Early Bird';
    case 'nine_to_fiver': return 'Nine-to-Fiver';
    case 'weekend_warrior': return 'Weekend Warrior';
    case 'always_on': return 'Always On';
  }
}

