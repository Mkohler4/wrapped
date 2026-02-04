#!/usr/bin/env tsx
/**
 * Generate ChatGPT Wrapped Stats from Database
 * 
 * Queries the existing PostgreSQL database (where ChatGPT data is already imported)
 * and outputs stats for the Wrapped UI.
 * 
 * Usage:
 *   npm run wrapped:stats
 *   npm run wrapped:stats --json > stats.json
 */

import 'dotenv/config';
import { query, checkConnection, closePool } from '../lib/db';

interface WrappedStats {
  totalConversations: number;
  totalMessages: number;
  totalUserMessages: number;
  averageMessagesPerConversation: number;
  firstConversationDate: string | null;
  lastConversationDate: string | null;
  topTopics: { topic: string; count: number }[];
  byHour: number[];
  byDayOfWeek: number[];
  peakHour: number;
  peakDay: string;
  longestConversation: {
    title: string;
    messageCount: number;
    date: string | null;
  } | null;
  topWords: { word: string; count: number }[];
  streaks: {
    currentStreak: number;
    longestStreak: number;
    totalActiveDays: number;
  };
  codeBlocksShared: number;
  imagesUploaded: number;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

async function main() {
  const isJson = process.argv.includes('--json');

  if (!isJson) {
    console.log('ChatGPT Wrapped Stats Generator');
    console.log('================================\n');
  }

  // Check database connection
  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const dbOk = await checkConnection();
  if (!dbOk) {
    console.error('Error: Could not connect to database');
    console.error('Make sure Docker is running: docker compose up -d');
    process.exit(1);
  }

  try {
    const stats = await generateStats();

    if (isJson) {
      console.log(JSON.stringify(stats, null, 2));
    } else {
      printStats(stats);
    }

  } finally {
    await closePool();
  }
}

async function generateStats(): Promise<WrappedStats> {
  // Total conversations
  const convResult = await query<{ count: string }>(`
    SELECT COUNT(*) as count FROM threads WHERE source = 'chatgpt'
  `);
  const totalConversations = parseInt(convResult.rows[0].count);

  // Total messages
  const msgResult = await query<{ total: string; user_msgs: string }>(`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE metadata->>'role' = 'user') as user_msgs
    FROM events 
    WHERE source = 'chatgpt'
  `);
  const totalMessages = parseInt(msgResult.rows[0].total);
  const totalUserMessages = parseInt(msgResult.rows[0].user_msgs);

  // First and last conversation dates
  const dateResult = await query<{ first_date: Date; last_date: Date }>(`
    SELECT 
      MIN(first_event_at) as first_date,
      MAX(last_event_at) as last_date
    FROM threads 
    WHERE source = 'chatgpt'
  `);
  const firstConversationDate = dateResult.rows[0]?.first_date?.toISOString() || null;
  const lastConversationDate = dateResult.rows[0]?.last_date?.toISOString() || null;

  // Top topics
  const topicsResult = await query<{ topic: string; count: string }>(`
    SELECT 
      unnest(topic_tags) as topic,
      COUNT(*) as count
    FROM events
    WHERE source = 'chatgpt' AND array_length(topic_tags, 1) > 0
    GROUP BY topic
    ORDER BY count DESC
    LIMIT 10
  `);
  const topTopics = topicsResult.rows.map(r => ({
    topic: r.topic,
    count: parseInt(r.count),
  }));

  // Hour distribution
  const hourResult = await query<{ hour: number; count: string }>(`
    SELECT 
      EXTRACT(HOUR FROM timestamp) as hour,
      COUNT(*) as count
    FROM events
    WHERE source = 'chatgpt'
    GROUP BY hour
    ORDER BY hour
  `);
  const byHour = new Array(24).fill(0);
  for (const r of hourResult.rows) {
    byHour[r.hour] = parseInt(r.count);
  }
  const peakHour = byHour.indexOf(Math.max(...byHour));

  // Day of week distribution
  const dayResult = await query<{ dow: number; count: string }>(`
    SELECT 
      EXTRACT(DOW FROM timestamp) as dow,
      COUNT(*) as count
    FROM events
    WHERE source = 'chatgpt'
    GROUP BY dow
    ORDER BY dow
  `);
  const byDayOfWeek = new Array(7).fill(0);
  for (const r of dayResult.rows) {
    byDayOfWeek[r.dow] = parseInt(r.count);
  }
  const peakDayIndex = byDayOfWeek.indexOf(Math.max(...byDayOfWeek));
  const peakDay = DAY_NAMES[peakDayIndex];

  // Longest conversation
  const longestResult = await query<{ subject: string; event_count: number; first_event_at: Date }>(`
    SELECT subject, event_count, first_event_at
    FROM threads
    WHERE source = 'chatgpt'
    ORDER BY event_count DESC
    LIMIT 1
  `);
  const longestConversation = longestResult.rows[0] ? {
    title: longestResult.rows[0].subject || 'Untitled',
    messageCount: longestResult.rows[0].event_count,
    date: longestResult.rows[0].first_event_at?.toISOString() || null,
  } : null;

  // Top words (from user messages)
  const wordsResult = await query<{ word: string; count: string }>(`
    WITH words AS (
      SELECT unnest(regexp_split_to_array(lower(text), '\\s+')) as word
      FROM events
      WHERE source = 'chatgpt' AND metadata->>'role' = 'user'
    )
    SELECT word, COUNT(*) as count
    FROM words
    WHERE length(word) >= 4
      AND word !~ '^[0-9]+$'
      AND word NOT IN (
        'that', 'this', 'with', 'from', 'have', 'what', 'about',
        'would', 'there', 'their', 'will', 'when', 'which', 'them',
        'been', 'were', 'being', 'could', 'should', 'more', 'some',
        'than', 'into', 'other', 'also', 'just', 'like', 'want',
        'here', 'your', 'need', 'make', 'know', 'please', 'help',
        'using', 'code', 'want', 'sure', 'okay', 'yeah', 'well',
        'dont', 'cant', 'wont'
      )
    GROUP BY word
    ORDER BY count DESC
    LIMIT 20
  `);
  const topWords = wordsResult.rows.map(r => ({
    word: r.word,
    count: parseInt(r.count),
  }));

  // Streak detection
  const streakResult = await query<{ active_date: string }>(`
    SELECT DISTINCT DATE(timestamp) as active_date
    FROM events
    WHERE source = 'chatgpt'
    ORDER BY active_date
  `);
  const activeDates = streakResult.rows.map(r => r.active_date);
  const streaks = computeStreaks(activeDates);

  // Code blocks (estimate from text containing ```)
  const codeResult = await query<{ count: string }>(`
    SELECT COUNT(*) as count
    FROM events
    WHERE source = 'chatgpt' 
      AND metadata->>'role' = 'user'
      AND text LIKE '%\`\`\`%'
  `);
  const codeBlocksShared = parseInt(codeResult.rows[0].count);

  // Images (from metadata)
  const imageResult = await query<{ count: string }>(`
    SELECT COUNT(*) as count
    FROM events
    WHERE source = 'chatgpt'
      AND (metadata->>'has_image' = 'true' OR metadata->>'content_type' LIKE '%image%')
  `);
  const imagesUploaded = parseInt(imageResult.rows[0].count);

  return {
    totalConversations,
    totalMessages,
    totalUserMessages,
    averageMessagesPerConversation: totalConversations > 0 
      ? Math.round(totalMessages / totalConversations * 10) / 10 
      : 0,
    firstConversationDate,
    lastConversationDate,
    topTopics,
    byHour,
    byDayOfWeek,
    peakHour,
    peakDay,
    longestConversation,
    topWords,
    streaks,
    codeBlocksShared,
    imagesUploaded,
  };
}

function computeStreaks(dates: string[]): { currentStreak: number; longestStreak: number; totalActiveDays: number } {
  if (dates.length === 0) {
    return { currentStreak: 0, longestStreak: 0, totalActiveDays: 0 };
  }

  let longestStreak = 1;
  let currentStreakLength = 1;

  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      currentStreakLength++;
      if (currentStreakLength > longestStreak) {
        longestStreak = currentStreakLength;
      }
    } else {
      currentStreakLength = 1;
    }
  }

  // Current streak (from end)
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const lastDate = dates[dates.length - 1];

  let currentStreak = 0;
  if (lastDate === today || lastDate === yesterday) {
    currentStreak = 1;
    for (let i = dates.length - 2; i >= 0; i--) {
      const curr = new Date(dates[i + 1]);
      const prev = new Date(dates[i]);
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
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
    totalActiveDays: dates.length,
  };
}

function printStats(stats: WrappedStats) {
  console.log('📊 Your ChatGPT Wrapped Stats\n');
  
  console.log(`💬 Conversations: ${stats.totalConversations.toLocaleString()}`);
  console.log(`📝 Total Messages: ${stats.totalMessages.toLocaleString()}`);
  console.log(`👤 Your Messages: ${stats.totalUserMessages.toLocaleString()}`);
  console.log(`📈 Avg per Convo: ${stats.averageMessagesPerConversation}`);
  
  console.log(`\n📅 Active: ${stats.firstConversationDate?.split('T')[0]} → ${stats.lastConversationDate?.split('T')[0]}`);
  
  console.log('\n🏷️  Top Topics:');
  stats.topTopics.slice(0, 5).forEach((t, i) => {
    console.log(`   ${i + 1}. ${t.topic} (${t.count})`);
  });

  console.log(`\n⏰ Peak Hour: ${formatHour(stats.peakHour)}`);
  console.log(`📆 Peak Day: ${stats.peakDay}`);

  if (stats.longestConversation) {
    console.log(`\n🏆 Longest Conversation:`);
    console.log(`   "${stats.longestConversation.title}" — ${stats.longestConversation.messageCount} messages`);
  }

  console.log('\n🔤 Top Words:');
  console.log(`   ${stats.topWords.slice(0, 10).map(w => w.word).join(', ')}`);

  console.log(`\n🔥 Streaks:`);
  console.log(`   Current: ${stats.streaks.currentStreak} days`);
  console.log(`   Longest: ${stats.streaks.longestStreak} days`);
  console.log(`   Total Active Days: ${stats.streaks.totalActiveDays}`);

  console.log(`\n💻 Code Blocks Shared: ${stats.codeBlocksShared}`);
  console.log(`🖼️  Images Uploaded: ${stats.imagesUploaded}`);
}

function formatHour(hour: number): string {
  if (hour === 0) return '12am';
  if (hour === 12) return '12pm';
  return hour > 12 ? `${hour - 12}pm` : `${hour}am`;
}

main();

