/**
 * Personal Operator API Server
 * 
 * Express server providing REST API endpoints for the personal operator.
 * 
 * Usage:
 *   npm run server        # Start server
 *   npm run server:dev    # Start with hot reload
 */

import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { search, SearchOptions, SearchResponse } from './lib/search.js';
import { checkConnection, closePool, query } from './lib/db.js';
import { processUtterance, correctTaskMatch } from './tasks/index.js';
import type { TaskRow } from './tasks/types.js';
import { taskFromRow } from './tasks/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================
// MIDDLEWARE
// ============================================

app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '..', 'public')));

// Default user ID (for development)
const DEFAULT_USER_ID = process.env.TEST_USER_ID || '8949a988-a1d0-4ceb-8ea5-9b2f120b2444';

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', async (req: Request, res: Response) => {
  const dbOk = await checkConnection();
  
  res.json({
    status: dbOk ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      database: dbOk ? 'connected' : 'disconnected',
    },
  });
});

// ============================================
// SEARCH API
// ============================================

interface SearchRequestBody {
  query: string;
  userId?: string;
  limit?: number;
  mode?: 'hybrid' | 'keyword' | 'semantic';
  filters?: {
    source?: string;
    topicTags?: string[];
    since?: string;
    until?: string;
  };
}

/**
 * POST /api/search
 * 
 * Search events using hybrid (keyword + semantic) search.
 * 
 * Request body:
 * {
 *   "query": "startup advice",
 *   "limit": 10,
 *   "mode": "hybrid",
 *   "filters": {
 *     "source": "chatgpt",
 *     "topicTags": ["coding"],
 *     "since": "2024-01-01",
 *     "until": "2025-12-31"
 *   }
 * }
 * 
 * Response:
 * {
 *   "results": [...],
 *   "total": 10,
 *   "query": "startup advice",
 *   "mode": "hybrid",
 *   "timing": { "total": 250, "keyword": 50, "semantic": 200 }
 * }
 */
app.post('/api/search', async (req: Request, res: Response) => {
  try {
    const body = req.body as SearchRequestBody;

    // Validate required fields
    if (!body.query || typeof body.query !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Query string is required',
      });
    }

    if (body.query.trim().length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Query cannot be empty',
      });
    }

    // Build search options
    const options: SearchOptions = {
      query: body.query.trim(),
      userId: body.userId,
      limit: Math.min(body.limit || 10, 100), // Cap at 100
      mode: body.mode || 'hybrid',
    };

    // Parse filters
    if (body.filters) {
      options.filters = {
        source: body.filters.source,
        topicTags: body.filters.topicTags,
        since: body.filters.since ? new Date(body.filters.since) : undefined,
        until: body.filters.until ? new Date(body.filters.until) : undefined,
      };
    }

    // Execute search
    const response = await search(options);

    res.json(response);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Search failed',
    });
  }
});

/**
 * GET /api/search
 * 
 * Simple GET endpoint for quick searches.
 * 
 * Query params:
 *   q: search query (required)
 *   limit: number of results (default: 10)
 *   mode: hybrid | keyword | semantic (default: hybrid)
 */
app.get('/api/search', async (req: Request, res: Response) => {
  try {
    const q = req.query.q as string;

    if (!q) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Query parameter "q" is required',
      });
    }

    const options: SearchOptions = {
      query: q.trim(),
      limit: Math.min(parseInt(req.query.limit as string) || 10, 100),
      mode: (req.query.mode as 'hybrid' | 'keyword' | 'semantic') || 'hybrid',
    };

    const response = await search(options);
    res.json(response);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Search failed',
    });
  }
});

// ============================================
// TASK API
// ============================================

/**
 * POST /api/tasks/utterance
 * 
 * Process a natural language utterance for task understanding.
 * 
 * Request body:
 * {
 *   "text": "I need to call mom",
 *   "sessionId": "optional-session-id"
 * }
 */
app.post('/api/tasks/utterance', async (req: Request, res: Response) => {
  try {
    const { text, sessionId, voiceMetadata } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Text is required',
      });
    }

    const response = await processUtterance(DEFAULT_USER_ID, {
      text: text.trim(),
      sessionId,
      voiceMetadata,
    });

    res.json(response);
  } catch (error) {
    console.error('Utterance processing error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to process utterance',
    });
  }
});

/**
 * GET /api/tasks
 * 
 * Get all active tasks for the user.
 */
app.get('/api/tasks', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string || 'pending,active';
    const statuses = status.split(',');

    const result = await query<TaskRow>(
      `SELECT * FROM tasks 
       WHERE user_id = $1 
         AND status = ANY($2::task_status[])
       ORDER BY 
         CASE status WHEN 'active' THEN 1 WHEN 'pending' THEN 2 ELSE 3 END,
         priority DESC,
         updated_at DESC
       LIMIT 50`,
      [DEFAULT_USER_ID, statuses]
    );

    const tasks = result.rows.map(taskFromRow);

    res.json({
      tasks,
      total: tasks.length,
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get tasks',
    });
  }
});

/**
 * GET /api/tasks/:id
 * 
 * Get a specific task by ID.
 */
app.get('/api/tasks/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query<TaskRow>(
      'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
      [id, DEFAULT_USER_ID]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Task not found',
      });
    }

    const task = taskFromRow(result.rows[0]);

    // Get updates
    const updatesResult = await query<{
      id: string;
      update_type: string;
      notes: string | null;
      created_at: Date;
    }>(
      `SELECT id, update_type, notes, created_at 
       FROM task_updates 
       WHERE task_id = $1 
       ORDER BY created_at DESC`,
      [id]
    );

    res.json({
      task,
      updates: updatesResult.rows,
    });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get task',
    });
  }
});

/**
 * POST /api/tasks/utterance/:id/correct
 * 
 * Correct a task match.
 */
app.post('/api/tasks/utterance/:id/correct', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { correctTaskId } = req.body;

    if (!correctTaskId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'correctTaskId is required',
      });
    }

    await correctTaskMatch(id, correctTaskId);

    res.json({ success: true });
  } catch (error) {
    console.error('Correct match error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to correct match',
    });
  }
});

/**
 * GET /api/tasks/session/context
 * 
 * Get current session context.
 */
app.get('/api/tasks/session/context', async (req: Request, res: Response) => {
  try {
    const { buildSessionContext, getOrCreateSession } = await import('./tasks/session-context.js');
    
    const session = await getOrCreateSession(DEFAULT_USER_ID);
    const context = await buildSessionContext(DEFAULT_USER_ID, session.id);

    res.json(context);
  } catch (error) {
    console.error('Get session context error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get session context',
    });
  }
});

// ============================================
// WRAPPED API
// ============================================

// Serve wrapped static files
app.use('/wrapped', express.static(path.join(__dirname, '..', 'projects', 'chatgpt-wrapped')));

/**
 * GET /api/wrapped/stats
 * 
 * Get ChatGPT Wrapped stats directly from database.
 * No hardcoded data - always fresh from DB.
 */
app.get('/api/wrapped/stats', async (req: Request, res: Response) => {
  try {
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
    const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    for (const r of dayResult.rows) {
      byDayOfWeek[r.dow] = parseInt(r.count);
    }
    const peakDayIndex = byDayOfWeek.indexOf(Math.max(...byDayOfWeek));

    // Longest conversation
    const longestResult = await query<{ subject: string; event_count: number; first_event_at: Date }>(`
      SELECT subject, event_count, first_event_at
      FROM threads
      WHERE source = 'chatgpt'
      ORDER BY event_count DESC
      LIMIT 1
    `);

    // Top words
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
          'using', 'code', 'sure', 'okay', 'yeah', 'well',
          'dont', 'cant', 'wont', '<div', '</div>'
        )
      GROUP BY word
      ORDER BY count DESC
      LIMIT 20
    `);

    // Streak detection
    const streakResult = await query<{ active_date: string }>(`
      SELECT DISTINCT DATE(timestamp) as active_date
      FROM events
      WHERE source = 'chatgpt'
      ORDER BY active_date
    `);
    const activeDates = streakResult.rows.map(r => r.active_date);
    const streaks = computeStreaks(activeDates);

    // Code blocks
    const codeResult = await query<{ count: string }>(`
      SELECT COUNT(*) as count
      FROM events
      WHERE source = 'chatgpt' 
        AND metadata->>'role' = 'user'
        AND text LIKE '%\`\`\`%'
    `);

    // ============================================
    // PHASE B: ENHANCED STATS
    // ============================================

    // Trend analysis - monthly breakdown
    const trendResult = await query<{ month: string; count: string }>(`
      SELECT 
        TO_CHAR(first_event_at, 'YYYY-MM') as month,
        COUNT(*) as count
      FROM threads 
      WHERE source = 'chatgpt' AND first_event_at IS NOT NULL
      GROUP BY month
      ORDER BY month
    `);
    const monthlyTrend = trendResult.rows.map(r => ({ month: r.month, count: parseInt(r.count) }));
    
    // Calculate trend direction (last 3 months vs previous 3 months)
    const recentMonths = monthlyTrend.slice(-3);
    const previousMonths = monthlyTrend.slice(-6, -3);
    const recentAvg = recentMonths.reduce((a, b) => a + b.count, 0) / (recentMonths.length || 1);
    const previousAvg = previousMonths.reduce((a, b) => a + b.count, 0) / (previousMonths.length || 1);
    const trendDirection = previousAvg > 0 ? Math.round((recentAvg - previousAvg) / previousAvg * 100) : 0;

    // Topic evolution - 6 months ago vs recent
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const oldTopicsResult = await query<{ topic: string; count: string }>(`
      SELECT unnest(topic_tags) as topic, COUNT(*) as count
      FROM events
      WHERE source = 'chatgpt' 
        AND timestamp < $1
        AND array_length(topic_tags, 1) > 0
      GROUP BY topic ORDER BY count DESC LIMIT 5
    `, [sixMonthsAgo]);
    
    const recentTopicsResult = await query<{ topic: string; count: string }>(`
      SELECT unnest(topic_tags) as topic, COUNT(*) as count
      FROM events
      WHERE source = 'chatgpt' 
        AND timestamp >= $1
        AND array_length(topic_tags, 1) > 0
      GROUP BY topic ORDER BY count DESC LIMIT 5
    `, [sixMonthsAgo]);

    // Conversation types - short vs long
    const convoTypesResult = await query<{ type: string; count: string }>(`
      SELECT 
        CASE 
          WHEN event_count < 5 THEN 'quick'
          WHEN event_count < 20 THEN 'medium'
          WHEN event_count < 50 THEN 'long'
          ELSE 'marathon'
        END as type,
        COUNT(*) as count
      FROM threads
      WHERE source = 'chatgpt'
      GROUP BY type
    `);
    const conversationTypes: Record<string, number> = {};
    convoTypesResult.rows.forEach(r => conversationTypes[r.type] = parseInt(r.count));

    // Night owl score - % of messages between 10pm-4am
    const nightOwlResult = await query<{ night_msgs: string; total_msgs: string }>(`
      SELECT 
        COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM timestamp) >= 22 OR EXTRACT(HOUR FROM timestamp) < 4) as night_msgs,
        COUNT(*) as total_msgs
      FROM events
      WHERE source = 'chatgpt'
    `);
    const nightOwlScore = parseInt(nightOwlResult.rows[0].total_msgs) > 0
      ? Math.round(parseInt(nightOwlResult.rows[0].night_msgs) / parseInt(nightOwlResult.rows[0].total_msgs) * 100)
      : 0;

    // Weekend warrior - weekend vs weekday ratio
    const weekendTotal = byDayOfWeek[0] + byDayOfWeek[6]; // Sun + Sat
    const weekdayTotal = byDayOfWeek.slice(1, 6).reduce((a, b) => a + b, 0);
    const weekendRatio = weekdayTotal > 0 ? Math.round(weekendTotal / weekdayTotal * 100) / 100 : 0;

    // Day productivity comparison
    const maxDayCount = Math.max(...byDayOfWeek);
    const minDayCount = Math.min(...byDayOfWeek.filter(d => d > 0));
    const mostProductiveDay = DAY_NAMES[byDayOfWeek.indexOf(maxDayCount)];
    const leastProductiveDay = DAY_NAMES[byDayOfWeek.indexOf(minDayCount)];
    const productivityMultiplier = minDayCount > 0 ? Math.round(maxDayCount / minDayCount * 10) / 10 : 1;

    // Model preferences (from metadata if available)
    const modelResult = await query<{ model: string; count: string }>(`
      SELECT 
        COALESCE(metadata->>'model_slug', metadata->>'model', 'unknown') as model,
        COUNT(*) as count
      FROM events
      WHERE source = 'chatgpt' 
        AND metadata->>'role' = 'assistant'
        AND (metadata->>'model_slug' IS NOT NULL OR metadata->>'model' IS NOT NULL)
      GROUP BY model
      ORDER BY count DESC
      LIMIT 5
    `);
    const modelPreferences = modelResult.rows.map(r => ({ model: r.model, count: parseInt(r.count) }));

    const stats = {
      totalConversations,
      totalMessages,
      totalUserMessages,
      averageMessagesPerConversation: totalConversations > 0 
        ? Math.round(totalMessages / totalConversations * 10) / 10 
        : 0,
      firstConversationDate: dateResult.rows[0]?.first_date?.toISOString() || null,
      lastConversationDate: dateResult.rows[0]?.last_date?.toISOString() || null,
      topTopics: topicsResult.rows.map(r => ({ topic: r.topic, count: parseInt(r.count) })),
      byHour,
      byDayOfWeek,
      peakHour,
      peakDay: DAY_NAMES[peakDayIndex],
      longestConversation: longestResult.rows[0] ? {
        title: longestResult.rows[0].subject || 'Untitled',
        messageCount: longestResult.rows[0].event_count,
        date: longestResult.rows[0].first_event_at?.toISOString() || null,
      } : null,
      topWords: wordsResult.rows.map(r => ({ word: r.word, count: parseInt(r.count) })),
      streaks,
      codeBlocksShared: parseInt(codeResult.rows[0].count),
      // Phase B: Enhanced stats
      enhanced: {
        // Trend analysis
        monthlyTrend,
        trendDirection, // +/- percentage change
        trendDescription: trendDirection > 20 ? 'increasing rapidly' : 
                          trendDirection > 0 ? 'slightly increasing' :
                          trendDirection > -20 ? 'slightly decreasing' : 'decreasing',
        // Topic evolution
        topicsOld: oldTopicsResult.rows.map(r => ({ topic: r.topic, count: parseInt(r.count) })),
        topicsRecent: recentTopicsResult.rows.map(r => ({ topic: r.topic, count: parseInt(r.count) })),
        // Conversation types
        conversationTypes,
        quickConvos: conversationTypes.quick || 0,
        marathonConvos: conversationTypes.marathon || 0,
        // Time patterns
        nightOwlScore, // % of messages 10pm-4am
        weekendRatio, // weekend/weekday ratio
        mostProductiveDay,
        leastProductiveDay,
        productivityMultiplier, // how much more productive on best day
        // Model preferences
        modelPreferences,
      },
    };

    res.json(stats);
  } catch (error) {
    console.error('Wrapped stats error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get stats',
    });
  }
});

/**
 * GET /api/wrapped/evolution
 * 
 * Returns stats split into time periods for comparison visualization.
 * 
 * Query params:
 *   ?periods=3        - Number of equal periods to split data into (default: 2)
 *   ?from=2023-01-01  - Custom start date (optional, defaults to first message)
 *   ?to=2024-12-31    - Custom end date (optional, defaults to now)
 * 
 * Example: /api/wrapped/evolution?periods=3
 * Returns stats for: early third, middle third, recent third of your history
 */
app.get('/api/wrapped/evolution', async (req: Request, res: Response) => {
  try {
    const numPeriods = Math.min(Math.max(parseInt(req.query.periods as string) || 2, 2), 6);
    const customFrom = req.query.from ? new Date(req.query.from as string) : null;
    const customTo = req.query.to ? new Date(req.query.to as string) : null;

    // Get the overall date range
    const dateRangeResult = await query<{ first_date: Date; last_date: Date }>(`
      SELECT 
        MIN(timestamp) as first_date,
        MAX(timestamp) as last_date
      FROM events 
      WHERE source = 'chatgpt'
    `);
    
    const firstDate = customFrom || dateRangeResult.rows[0]?.first_date || new Date();
    const lastDate = customTo || dateRangeResult.rows[0]?.last_date || new Date();
    
    // Calculate period boundaries
    const totalMs = lastDate.getTime() - firstDate.getTime();
    const periodMs = totalMs / numPeriods;
    
    const periods: Array<{
      index: number;
      startDate: string;
      endDate: string;
      label: string;
      stats: {
        messageCount: number;
        conversationCount: number;
        avgMessagesPerConvo: number;
        topTopics: Array<{ topic: string; count: number }>;
        peakHour: number;
        nightOwlScore: number;
      };
    }> = [];
    
    for (let i = 0; i < numPeriods; i++) {
      const periodStart = new Date(firstDate.getTime() + (i * periodMs));
      const periodEnd = new Date(firstDate.getTime() + ((i + 1) * periodMs));
      
      // Get stats for this period
      const [msgStats, topicStats, hourStats] = await Promise.all([
        // Message and conversation counts
        query<{ msg_count: string; convo_count: string }>(`
          SELECT 
            COUNT(*) as msg_count,
            COUNT(DISTINCT thread_id) as convo_count
          FROM events 
          WHERE source = 'chatgpt' 
            AND timestamp >= $1 
            AND timestamp < $2
        `, [periodStart, periodEnd]),
        
        // Top topics
        query<{ topic: string; count: string }>(`
          SELECT unnest(topic_tags) as topic, COUNT(*) as count
          FROM events
          WHERE source = 'chatgpt' 
            AND timestamp >= $1 
            AND timestamp < $2
            AND array_length(topic_tags, 1) > 0
          GROUP BY topic 
          ORDER BY count DESC 
          LIMIT 5
        `, [periodStart, periodEnd]),
        
        // Hour distribution for peak hour + night owl
        query<{ hour: number; count: string }>(`
          SELECT 
            EXTRACT(HOUR FROM timestamp)::int as hour,
            COUNT(*) as count
          FROM events
          WHERE source = 'chatgpt'
            AND timestamp >= $1 
            AND timestamp < $2
          GROUP BY hour
        `, [periodStart, periodEnd]),
      ]);
      
      const msgCount = parseInt(msgStats.rows[0]?.msg_count || '0');
      const convoCount = parseInt(msgStats.rows[0]?.convo_count || '0');
      
      // Calculate peak hour and night owl score
      const hourCounts = new Array(24).fill(0);
      for (const r of hourStats.rows) {
        hourCounts[r.hour] = parseInt(r.count);
      }
      const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
      const totalMsgs = hourCounts.reduce((a, b) => a + b, 0);
      const nightMsgs = [...hourCounts.slice(22), ...hourCounts.slice(0, 4)].reduce((a, b) => a + b, 0);
      const nightOwlScore = totalMsgs > 0 ? Math.round(nightMsgs / totalMsgs * 100) : 0;
      
      // Generate label
      const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const label = i === 0 ? 'Early days' : 
                    i === numPeriods - 1 ? 'Recent' : 
                    `Period ${i + 1}`;
      
      periods.push({
        index: i,
        startDate: periodStart.toISOString(),
        endDate: periodEnd.toISOString(),
        label,
        stats: {
          messageCount: msgCount,
          conversationCount: convoCount,
          avgMessagesPerConvo: convoCount > 0 ? Math.round(msgCount / convoCount * 10) / 10 : 0,
          topTopics: topicStats.rows.map(r => ({ topic: r.topic, count: parseInt(r.count) })),
          peakHour,
          nightOwlScore,
        },
      });
    }
    
    // Calculate changes between first and last period
    const firstPeriod = periods[0]?.stats;
    const lastPeriod = periods[periods.length - 1]?.stats;
    
    const changes = {
      messageCount: firstPeriod && lastPeriod && firstPeriod.messageCount > 0
        ? Math.round((lastPeriod.messageCount - firstPeriod.messageCount) / firstPeriod.messageCount * 100)
        : 0,
      conversationCount: firstPeriod && lastPeriod && firstPeriod.conversationCount > 0
        ? Math.round((lastPeriod.conversationCount - firstPeriod.conversationCount) / firstPeriod.conversationCount * 100)
        : 0,
      avgMessagesPerConvo: firstPeriod && lastPeriod && firstPeriod.avgMessagesPerConvo > 0
        ? Math.round((lastPeriod.avgMessagesPerConvo - firstPeriod.avgMessagesPerConvo) / firstPeriod.avgMessagesPerConvo * 100)
        : 0,
      nightOwlScore: firstPeriod && lastPeriod
        ? lastPeriod.nightOwlScore - firstPeriod.nightOwlScore
        : 0,
    };
    
    // Detect milestones (interesting moments)
    const milestones: Array<{ date: string; event: string }> = [];
    
    // Find month with most messages
    const monthlyResult = await query<{ month: string; count: string }>(`
      SELECT 
        TO_CHAR(timestamp, 'YYYY-MM') as month,
        COUNT(*) as count
      FROM events
      WHERE source = 'chatgpt'
      GROUP BY month
      ORDER BY count DESC
      LIMIT 1
    `);
    if (monthlyResult.rows[0]) {
      milestones.push({
        date: monthlyResult.rows[0].month,
        event: `Peak month: ${parseInt(monthlyResult.rows[0].count).toLocaleString()} messages`,
      });
    }
    
    // Find first image generation
    const firstImageResult = await query<{ timestamp: Date }>(`
      SELECT MIN(timestamp) as timestamp
      FROM events
      WHERE source = 'chatgpt'
        AND (text LIKE '%DALL%' OR text LIKE '%image%generat%' OR metadata->>'model_slug' LIKE '%dall%')
    `);
    if (firstImageResult.rows[0]?.timestamp) {
      milestones.push({
        date: firstImageResult.rows[0].timestamp.toISOString().split('T')[0],
        event: 'First AI image generated',
      });
    }
    
    res.json({
      periods,
      changes,
      milestones,
      dateRange: {
        from: firstDate.toISOString(),
        to: lastDate.toISOString(),
        totalDays: Math.round(totalMs / (1000 * 60 * 60 * 24)),
      },
    });
    
  } catch (error) {
    console.error('Evolution stats error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get evolution stats',
    });
  }
});

/**
 * GET /api/wrapped/heatmap
 * 
 * Returns daily activity counts for GitHub-style contribution heatmap.
 * 
 * Query params:
 *   ?year=2024     - Specific year (default: all years)
 *   ?months=12     - Number of months to show (default: 12)
 * 
 * Returns array of { date: "YYYY-MM-DD", count: N, dayOfWeek: 0-6 }
 */
app.get('/api/wrapped/heatmap', async (req: Request, res: Response) => {
  try {
    const year = req.query.year ? parseInt(req.query.year as string) : null;
    const months = Math.min(parseInt(req.query.months as string) || 12, 24);
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    
    // Get daily message counts
    const result = await query<{ date: string; count: string; dow: number }>(`
      SELECT 
        TO_CHAR(DATE(timestamp), 'YYYY-MM-DD') as date,
        COUNT(*) as count,
        EXTRACT(DOW FROM timestamp)::int as dow
      FROM events
      WHERE source = 'chatgpt'
        AND timestamp >= $1
        AND timestamp <= $2
        ${year ? `AND EXTRACT(YEAR FROM timestamp) = ${year}` : ''}
      GROUP BY DATE(timestamp), dow
      ORDER BY DATE(timestamp)
    `, [startDate, endDate]);
    
    // Create a map of all days for easy lookup
    const dayMap = new Map<string, { count: number; dow: number }>();
    result.rows.forEach(r => {
      dayMap.set(r.date, { count: parseInt(r.count), dow: r.dow });
    });
    
    // Fill in all days in the range (including zeros)
    const days: Array<{ date: string; count: number; dayOfWeek: number; week: number }> = [];
    const current = new Date(startDate);
    let weekNum = 0;
    let lastWeekStart = -1;
    
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      const dow = current.getDay();
      
      // Track week number (Sunday = start of week)
      if (dow === 0 && lastWeekStart !== current.getTime()) {
        weekNum++;
        lastWeekStart = current.getTime();
      }
      
      const dayData = dayMap.get(dateStr);
      days.push({
        date: dateStr,
        count: dayData?.count || 0,
        dayOfWeek: dow,
        week: weekNum,
      });
      
      current.setDate(current.getDate() + 1);
    }
    
    // Calculate stats
    const counts = days.map(d => d.count).filter(c => c > 0);
    const maxCount = Math.max(...counts, 1);
    const totalDays = days.length;
    const activeDays = counts.length;
    const totalMessages = counts.reduce((a, b) => a + b, 0);
    
    // Find streaks
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].count > 0) {
        tempStreak++;
        if (i === days.length - 1 || days[i + 1].count > 0) {
          currentStreak = tempStreak;
        }
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 0;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);
    
    // Find busiest day
    const busiestDay = days.reduce((max, d) => d.count > max.count ? d : max, { date: '', count: 0, dayOfWeek: 0, week: 0 });
    
    res.json({
      days,
      stats: {
        totalDays,
        activeDays,
        totalMessages,
        maxCount,
        currentStreak,
        longestStreak,
        busiestDay: busiestDay.count > 0 ? { date: busiestDay.date, count: busiestDay.count } : null,
        activityRate: Math.round((activeDays / totalDays) * 100),
      },
      dateRange: {
        from: startDate.toISOString().split('T')[0],
        to: endDate.toISOString().split('T')[0],
      },
    });
    
  } catch (error) {
    console.error('Heatmap error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get heatmap data',
    });
  }
});

// Cache for AI insights (stored in memory + file)
let cachedInsights: any = null;
const INSIGHTS_CACHE_FILE = path.join(__dirname, '..', 'projects', 'chatgpt-wrapped', '.insights-cache.json');

async function loadCachedInsights(): Promise<any> {
  if (cachedInsights) return cachedInsights;
  
  try {
    const fs = await import('fs/promises');
    const data = await fs.readFile(INSIGHTS_CACHE_FILE, 'utf-8');
    cachedInsights = JSON.parse(data);
    console.log('✓ Loaded cached AI insights from file');
    return cachedInsights;
  } catch {
    return null;
  }
}

async function saveCachedInsights(insights: any): Promise<void> {
  cachedInsights = insights;
  try {
    const fs = await import('fs/promises');
    await fs.writeFile(INSIGHTS_CACHE_FILE, JSON.stringify(insights, null, 2));
    console.log('✓ Saved AI insights to cache file');
  } catch (e) {
    console.error('Failed to save insights cache:', e);
  }
}

/**
 * GET /api/wrapped/insights
 * 
 * AI-generated insights by actually reading conversation content.
 * Uses LLM to analyze patterns and generate fun, personalized observations.
 * 
 * Query params:
 *   ?regenerate=true  - Force regenerate insights (ignores cache)
 * 
 * Results are cached after first generation to avoid repeated LLM calls.
 */
app.get('/api/wrapped/insights', async (req: Request, res: Response) => {
  try {
    const forceRegenerate = req.query.regenerate === 'true';
    
    // Check cache first (unless forced to regenerate)
    if (!forceRegenerate) {
      const cached = await loadCachedInsights();
      if (cached) {
        return res.json({
          ...cached,
          fromCache: true,
        });
      }
    }

    console.log(forceRegenerate ? '🔄 Regenerating AI insights...' : '🤖 Generating AI insights for first time...');

    // Import LLM client
    const { chat } = await import('./lib/llm.js');

    // Get sample of conversations with actual content
    const sampleConvos = await query<{ subject: string; text: string; timestamp: Date }>(`
      SELECT 
        t.subject,
        e.text,
        e.timestamp
      FROM events e
      JOIN threads t ON e.thread_id = t.id
      WHERE e.source = 'chatgpt' 
        AND e.metadata->>'role' = 'user'
        AND length(e.text) > 50
      ORDER BY RANDOM()
      LIMIT 100
    `);

    // Get conversation titles for topic analysis
    const titles = await query<{ subject: string }>(`
      SELECT subject FROM threads 
      WHERE source = 'chatgpt' AND subject IS NOT NULL
      ORDER BY RANDOM()
      LIMIT 200
    `);

    // Get the stats for context
    const statsResult = await query<{ count: string }>(`
      SELECT COUNT(*) as count FROM threads WHERE source = 'chatgpt'
    `);
    const totalConvos = parseInt(statsResult.rows[0].count);

    // Get enhanced stats for richer AI insights
    const enhancedStatsQueries = await Promise.all([
      // Trend direction
      query<{ month: string; count: string }>(`
        SELECT TO_CHAR(first_event_at, 'YYYY-MM') as month, COUNT(*) as count
        FROM threads WHERE source = 'chatgpt' AND first_event_at IS NOT NULL
        GROUP BY month ORDER BY month
      `),
      // Night owl score
      query<{ night_msgs: string; total_msgs: string }>(`
        SELECT 
          COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM timestamp) >= 22 OR EXTRACT(HOUR FROM timestamp) < 4) as night_msgs,
          COUNT(*) as total_msgs
        FROM events WHERE source = 'chatgpt'
      `),
      // Day of week
      query<{ dow: number; count: string }>(`
        SELECT EXTRACT(DOW FROM timestamp)::int as dow, COUNT(*) as count
        FROM events WHERE source = 'chatgpt' GROUP BY dow ORDER BY dow
      `),
      // Conversation types
      query<{ type: string; count: string }>(`
        SELECT 
          CASE WHEN event_count < 5 THEN 'quick' WHEN event_count < 20 THEN 'medium'
               WHEN event_count < 50 THEN 'long' ELSE 'marathon' END as type,
          COUNT(*) as count
        FROM threads WHERE source = 'chatgpt' GROUP BY type
      `),
      // Model preferences
      query<{ model: string; count: string }>(`
        SELECT COALESCE(metadata->>'model_slug', metadata->>'model', 'unknown') as model, COUNT(*) as count
        FROM events WHERE source = 'chatgpt' AND metadata->>'role' = 'assistant'
          AND (metadata->>'model_slug' IS NOT NULL OR metadata->>'model' IS NOT NULL)
        GROUP BY model ORDER BY count DESC LIMIT 5
      `),
      // Topic evolution - old
      query<{ topic: string; count: string }>(`
        SELECT unnest(topic_tags) as topic, COUNT(*) as count FROM events
        WHERE source = 'chatgpt' AND timestamp < NOW() - INTERVAL '6 months'
          AND array_length(topic_tags, 1) > 0
        GROUP BY topic ORDER BY count DESC LIMIT 5
      `),
      // Topic evolution - recent
      query<{ topic: string; count: string }>(`
        SELECT unnest(topic_tags) as topic, COUNT(*) as count FROM events
        WHERE source = 'chatgpt' AND timestamp >= NOW() - INTERVAL '6 months'
          AND array_length(topic_tags, 1) > 0
        GROUP BY topic ORDER BY count DESC LIMIT 5
      `),
    ]);

    const [monthlyTrendRes, nightOwlRes, dowRes, convoTypesRes, modelRes, oldTopicsRes, recentTopicsRes] = enhancedStatsQueries;

    // Calculate enhanced stats
    const monthlyTrend = monthlyTrendRes.rows;
    const recentMonths = monthlyTrend.slice(-3);
    const previousMonths = monthlyTrend.slice(-6, -3);
    const recentAvg = recentMonths.reduce((a, b) => a + parseInt(b.count), 0) / (recentMonths.length || 1);
    const previousAvg = previousMonths.reduce((a, b) => a + parseInt(b.count), 0) / (previousMonths.length || 1);
    const trendPct = previousAvg > 0 ? Math.round((recentAvg - previousAvg) / previousAvg * 100) : 0;

    const nightOwlScore = parseInt(nightOwlRes.rows[0].total_msgs) > 0
      ? Math.round(parseInt(nightOwlRes.rows[0].night_msgs) / parseInt(nightOwlRes.rows[0].total_msgs) * 100) : 0;

    const byDOW = new Array(7).fill(0);
    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    dowRes.rows.forEach(r => byDOW[r.dow] = parseInt(r.count));
    const weekendMsgs = byDOW[0] + byDOW[6];
    const weekdayMsgs = byDOW.slice(1, 6).reduce((a, b) => a + b, 0);
    const weekendRatio = weekdayMsgs > 0 ? Math.round(weekendMsgs / weekdayMsgs * 100) : 0;
    const peakDayIdx = byDOW.indexOf(Math.max(...byDOW));
    const lowDayIdx = byDOW.indexOf(Math.min(...byDOW.filter(d => d > 0)));
    const productivityMultiplier = byDOW[lowDayIdx] > 0 ? Math.round(byDOW[peakDayIdx] / byDOW[lowDayIdx] * 10) / 10 : 1;

    const convoTypes: Record<string, number> = {};
    convoTypesRes.rows.forEach(r => convoTypes[r.type] = parseInt(r.count));
    
    const models = modelRes.rows.map(r => r.model);
    const oldTopics = oldTopicsRes.rows.map(r => r.topic);
    const recentTopics = recentTopicsRes.rows.map(r => r.topic);

    // ============================================
    // SEMANTIC THEME DISCOVERY VIA EMBEDDINGS
    // Use pgvector to find what user ACTUALLY talks about
    // Not keyword matching - semantic meaning!
    // ============================================
    
    // Import embed function
    const { embed } = await import('./lib/embeddings.js');
    
    // Define semantic "probes" - themes we want to discover
    // These are NOT keywords, they're semantic queries
    const themeProbes = [
      { name: 'Business & Entrepreneurship', probe: 'starting a business, startup ideas, entrepreneurship, monetization, making money, business model, revenue' },
      { name: 'AI Image Generation', probe: 'generate an image, create a picture, AI art, visual design, DALL-E, image generation, draw me' },
      { name: 'Career & Growth', probe: 'career advice, job interview, resume, professional development, getting promoted, job search' },
      { name: 'Learning & Education', probe: 'how does this work, explain to me, teach me, understand better, learning about' },
      { name: 'Creative Writing', probe: 'write a story, creative writing, poem, narrative, fiction, screenplay' },
      { name: 'Technical Architecture', probe: 'system design, architecture, scalability, database design, API design, microservices' },
      { name: 'Personal Life', probe: 'relationship advice, personal problems, life decisions, mental health, self improvement' },
      { name: 'Productivity & Organization', probe: 'organize my tasks, productivity tips, time management, planning my day, todo list' },
    ];
    
    // For each theme, use embeddings to find semantically similar messages
    const discoveredThemes: Array<{ name: string; count: number; samples: string[] }> = [];
    
    for (const theme of themeProbes) {
      try {
        // Generate embedding for the semantic probe
        const probeEmbedding = await embed(theme.probe);
        const embeddingStr = `[${probeEmbedding.join(',')}]`;
        
        // Find messages with >0.40 cosine similarity (semantic match)
        // Note: Cross-domain similarity is typically 0.3-0.5, not 0.7+
        const result = await query<{ cnt: string }>(`
          SELECT COUNT(*) as cnt
          FROM events
          WHERE source = 'chatgpt' 
            AND metadata->>'role' = 'user'
            AND embedding IS NOT NULL
            AND 1 - (embedding <=> $1::vector) > 0.40
        `, [embeddingStr]);
        
        const count = parseInt(result.rows[0]?.cnt || '0');
        
        // Only include if significant (>5 messages about this theme)
        if (count > 5) {
          // Get sample messages for this theme
          const samplesResult = await query<{ text: string }>(`
            SELECT text FROM events
            WHERE source = 'chatgpt' AND metadata->>'role' = 'user' AND embedding IS NOT NULL
            ORDER BY embedding <=> $1::vector
            LIMIT 3
          `, [embeddingStr]);
          
          discoveredThemes.push({
            name: theme.name,
            count,
            samples: samplesResult.rows.map(r => r.text.slice(0, 150)),
          });
        }
      } catch (e) {
        console.error(`Theme discovery failed for ${theme.name}:`, e);
      }
    }
    
    // Sort by count (most talked about themes first)
    discoveredThemes.sort((a, b) => b.count - a.count);
    
    console.log('📊 Discovered themes:', discoveredThemes.map(t => `${t.name}: ${t.count}`));

    // Find recurring question patterns via embeddings
    const questionPatterns = await query<{ question: string }>(`
      SELECT text as question
      FROM events
      WHERE source = 'chatgpt'
        AND metadata->>'role' = 'user'
        AND (text ILIKE 'how do%' OR text ILIKE 'what is%' OR text ILIKE 'why%' OR text ILIKE 'can you%')
        AND length(text) < 200
      ORDER BY RANDOM()
      LIMIT 20
    `);
    const sampleQuestions = questionPatterns.rows.map(r => r.question);

    // Prepare content for LLM
    const conversationSamples = sampleConvos.rows
      .map(r => `• "${r.text.slice(0, 300)}${r.text.length > 300 ? '...' : ''}"`)
      .join('\n');

    const titleList = titles.rows
      .map(r => r.subject)
      .join(', ');

    // Generate insights with AI
    const systemPrompt = `You are an AI analyst creating a fun "Spotify Wrapped" style summary for someone's ChatGPT usage.

You're given samples of their actual messages, conversation titles, AND detailed behavioral stats. Your job is to:
1. Identify interesting patterns in what they talk about
2. Make observations about their personality/interests based on the content
3. Be funny, warm, and slightly roast-y (but nice!)
4. Generate specific, personalized insights - NOT generic observations
5. Use the behavioral stats to make data-driven jokes and observations

Output a JSON object with these fields:
{
  "personality": {
    "title": "A fun 2-4 word personality title like 'The Midnight Architect' or 'Code Whisperer Supreme'",
    "description": "A 1-2 sentence description of their ChatGPT personality"
  },
  "topObsession": {
    "topic": "The thing they clearly can't stop talking about",
    "roast": "A funny one-liner roasting them about it"
  },
  "hiddenPattern": "Something surprising you noticed in their usage or stats",
  "aiPrediction": "A funny prediction about what they'll ask ChatGPT next",
  "spiritAnimal": {
    "animal": "An animal that matches their ChatGPT energy (consider their time patterns!)",
    "reason": "Why this animal - reference specific stats"
  },
  "funFacts": [
    "5-6 specific, personalized fun facts - mix content-based AND stat-based observations"
  ],
  "oneLineRoast": "One perfect roast line about their ChatGPT usage",
  "compliment": "One genuine compliment about their curiosity/growth",
  "trendInsight": "What their usage trend says about them (are they becoming more or less dependent?)",
  "timePersonality": "A funny description based on when they use ChatGPT (night owl? weekend warrior?)",
  "evolutionNote": "How their interests have evolved over time (if topics changed)",
  "hiddenTheme": "A surprising hidden theme you found in the semantic clusters",
  "questionStyle": "What their question patterns reveal about how they think"
}

Be specific! Reference actual topics/words AND actual numbers from the stats. Generic responses are boring.`;

    const userPrompt = `This person has had ${totalConvos} conversations with ChatGPT.

📊 BEHAVIORAL STATS:
- Usage trend: ${trendPct > 0 ? '+' : ''}${trendPct}% change (recent vs 6 months ago)
- Night owl score: ${nightOwlScore}% of messages sent between 10pm-4am
- Weekend ratio: ${weekendRatio}% as many messages on weekends vs weekdays
- Peak day: ${DAYS[peakDayIdx]} (${productivityMultiplier}x more than ${DAYS[lowDayIdx]})
- Conversation styles: ${convoTypes.quick || 0} quick chats (<5 msgs), ${convoTypes.marathon || 0} marathon sessions (50+ msgs)
- AI models used: ${models.join(', ') || 'unknown'}
- Old interests (6+ months ago): ${oldTopics.join(', ') || 'none tracked'}
- Recent interests: ${recentTopics.join(', ') || 'none tracked'}

💬 SAMPLE MESSAGES:
${conversationSamples}

📝 CONVERSATION TITLES:
${titleList}

🔮 SEMANTIC THEME DISCOVERY (found via embedding similarity, NOT keywords):
${discoveredThemes.length > 0 
  ? discoveredThemes.map(t => `• ${t.name}: ${t.count} messages\n    Sample: "${t.samples[0]?.slice(0, 100) || 'N/A'}..."`).join('\n')
  : '(Running theme discovery...)'}

❓ SAMPLE QUESTIONS THEY ASK:
${sampleQuestions.slice(0, 10).map(q => `• "${q.slice(0, 100)}"`).join('\n')}

CRITICAL: The semantic theme discovery above shows REAL patterns found by AI embeddings, not keyword matches!
These are the topics this person ACTUALLY talks about, ranked by message count.
Use these themes to generate specific, data-driven insights. Reference actual counts!`;

    const aiResponse = await chat(systemPrompt, userPrompt, {
      model: 'gpt-4o-mini',
      maxTokens: 1000,
      temperature: 0.9,
    });

    // Parse the JSON response
    let insights;
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        insights = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse);
      insights = {
        personality: { title: 'The Curious Mind', description: 'Always asking questions!' },
        topObsession: { topic: 'coding', roast: 'You really love debugging, huh?' },
        hiddenPattern: 'You ask a lot of questions late at night',
        aiPrediction: "You'll probably ask about another JavaScript framework soon",
        spiritAnimal: { animal: 'Owl', reason: 'Wise and nocturnal' },
        funFacts: ['You have a lot of conversations!'],
        oneLineRoast: 'ChatGPT is basically your rubber duck at this point.',
        compliment: 'Your curiosity is genuinely impressive!',
        trendInsight: 'Your ChatGPT usage is evolving!',
        timePersonality: `You're ${nightOwlScore > 20 ? 'a certified night owl' : 'an early bird'}`,
        evolutionNote: 'Your interests are always expanding',
        hiddenTheme: discoveredThemes[0]?.name || 'You have diverse interests',
        questionStyle: 'You ask thoughtful questions',
        error: 'AI response parsing failed, showing defaults',
      };
    }

    const result = {
      insights,
      // Include discovered themes in response (data-driven, not AI-generated)
      discoveredThemes: discoveredThemes.map(t => ({
        name: t.name,
        messageCount: t.count,
        sampleMessage: t.samples[0]?.slice(0, 100) || null,
      })),
      generatedAt: new Date().toISOString(),
      samplesAnalyzed: sampleConvos.rows.length,
      fromCache: false,
    };

    // Save to cache
    await saveCachedInsights(result);

    res.json(result);

  } catch (error) {
    console.error('Wrapped insights error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to generate insights',
    });
  }
});

// Helper function for streak calculation
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

  return { currentStreak, longestStreak, totalActiveDays: dates.length };
}

// ============================================
// EVIDENCE API - Get actual messages for insights
// ============================================

/**
 * GET /api/wrapped/evidence/:theme
 * 
 * Returns the actual messages that match a semantic theme.
 * Used to show "evidence" chat bubbles in the UI.
 */
app.get('/api/wrapped/evidence/:theme', async (req: Request, res: Response) => {
  try {
    const themeName = req.params.theme;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    
    // Theme probes (same as in insights endpoint)
    const themeProbes: Record<string, string> = {
      'business': 'starting a business, startup ideas, entrepreneurship, monetization, making money, business model, revenue',
      'images': 'generate an image, create a picture, AI art, visual design, DALL-E, image generation, draw me',
      'career': 'career advice, job interview, resume, professional development, getting promoted, job search',
      'learning': 'how does this work, explain to me, teach me, understand better, learning about',
      'writing': 'write a story, creative writing, poem, narrative, fiction, screenplay',
      'architecture': 'system design, architecture, scalability, database design, API design, microservices',
      'personal': 'relationship advice, personal problems, life decisions, mental health, self improvement',
      'productivity': 'organize my tasks, productivity tips, time management, planning my day, todo list',
    };
    
    const probe = themeProbes[themeName.toLowerCase()];
    if (!probe) {
      return res.status(400).json({ 
        error: 'Unknown theme',
        availableThemes: Object.keys(themeProbes),
      });
    }
    
    // Import embed function
    const { embed } = await import('./lib/embeddings.js');
    
    // Generate embedding for the probe
    const probeEmbedding = await embed(probe);
    const embeddingStr = `[${probeEmbedding.join(',')}]`;
    
    // Get matching messages with similarity scores
    const result = await query<{ 
      id: string; 
      text: string; 
      timestamp: Date;
      thread_id: string;
      subject: string;
      similarity: number;
    }>(`
      SELECT 
        e.id,
        e.text,
        e.timestamp,
        e.thread_id,
        t.subject,
        1 - (e.embedding <=> $1::vector) as similarity
      FROM events e
      LEFT JOIN threads t ON e.thread_id = t.id
      WHERE e.source = 'chatgpt' 
        AND e.metadata->>'role' = 'user'
        AND e.embedding IS NOT NULL
        AND 1 - (e.embedding <=> $1::vector) > 0.38
      ORDER BY e.embedding <=> $1::vector
      LIMIT $2
    `, [embeddingStr, limit]);
    
    // Format for frontend
    const evidence = result.rows.map(r => ({
      id: r.id,
      message: r.text,
      timestamp: r.timestamp,
      conversationTitle: r.subject || 'Untitled',
      threadId: r.thread_id,
      similarity: Math.round(r.similarity * 100),
      preview: r.text.length > 150 ? r.text.slice(0, 150) + '...' : r.text,
    }));
    
    res.json({
      theme: themeName,
      totalMatches: evidence.length,
      evidence,
    });
    
  } catch (error) {
    console.error('Evidence API error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get evidence',
    });
  }
});

/**
 * GET /api/wrapped/images
 * 
 * Returns both user-uploaded images and DALL-E generated images with context.
 * Images are served from the gallery-manifest.json which maps real image files to prompts.
 * 
 * Query params:
 *   - source: 'all' | 'generated' | 'uploaded' (default: 'all')
 *   - limit: number (default: 500, max: 500)
 */
app.get('/api/wrapped/images', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 500, 500);
    const sourceFilter = (req.query.source as string) || 'all';
    
    // Load the gallery manifest with real images
    const manifestPath = path.join(__dirname, '../projects/chatgpt-wrapped/images/gallery-manifest.json');
    let images: Array<{
      id: number;
      filename: string;
      source: 'uploaded' | 'generated';
      imagePath: string;
      prompt: string;
      title: string;
      conversationId?: string;
      timestamp: number | null;
      relatedGeneratedImages?: string[];  // For uploaded: generated images it inspired
      sourceUploadedImage?: string;       // For generated: uploaded image it was based on
    }> = [];
    
    try {
      const manifest = await fs.readFile(manifestPath, 'utf-8');
      images = JSON.parse(manifest);
    } catch (e) {
      console.warn('Gallery manifest not found, falling back to semantic search');
      // Fall back to semantic search if no manifest
      const { embed } = await import('./lib/embeddings.js');
      const probe = 'generate an image, create a picture, AI art, visual design, DALL-E';
      const probeEmbedding = await embed(probe);
      const embeddingStr = `[${probeEmbedding.join(',')}]`;
      
      const result = await query<{
        id: string;
        text: string;
        timestamp: Date;
        subject: string;
      }>(`
        SELECT e.id, e.text, e.timestamp, t.subject
        FROM events e
        LEFT JOIN threads t ON e.thread_id = t.id
        WHERE e.source = 'chatgpt' 
          AND e.metadata->>'role' = 'user'
          AND e.embedding IS NOT NULL
          AND 1 - (e.embedding <=> $1::vector) > 0.42
        ORDER BY e.timestamp DESC
        LIMIT $2
      `, [embeddingStr, limit]);
      
      return res.json({
        images: result.rows.map((r, idx) => ({
          id: r.id,
          prompt: r.text,
          conversationTitle: r.subject || 'Untitled',
          timestamp: r.timestamp,
          gradientColors: generateGradientFromText(r.text),
          imageType: detectImageType(r.text),
          index: idx + 1,
          hasRealImage: false,
        })),
        totalCount: result.rows.length,
        hasRealImages: false,
      });
    }
    
    // Filter by source if requested
    let filteredImages = images;
    if (sourceFilter === 'generated') {
      filteredImages = images.filter(img => img.source === 'generated');
    } else if (sourceFilter === 'uploaded') {
      filteredImages = images.filter(img => img.source === 'uploaded');
    }
    
    // Format images with real file paths
    const formattedImages = filteredImages.slice(0, limit).map((img, idx) => ({
      id: img.id,
      prompt: img.prompt,
      source: img.source,
      conversationTitle: img.title,
      conversationId: img.conversationId,
      timestamp: img.timestamp ? new Date(img.timestamp * 1000).toISOString() : null,
      imagePath: img.imagePath,
      filename: img.filename,
      gradientColors: generateGradientFromText(img.prompt),
      imageType: img.source === 'uploaded' ? '📤 Uploaded' : detectImageType(img.prompt),
      index: idx + 1,
      hasRealImage: true,
      relatedGeneratedImages: img.relatedGeneratedImages,
      sourceUploadedImage: img.sourceUploadedImage,
    }));
    
    const generatedCount = images.filter(i => i.source === 'generated').length;
    const uploadedCount = images.filter(i => i.source === 'uploaded').length;
    
    res.json({
      images: formattedImages,
      totalCount: filteredImages.length,
      stats: {
        generated: generatedCount,
        uploaded: uploadedCount,
        total: images.length,
      },
      hasRealImages: true,
    });
    
  } catch (error) {
    console.error('Images API error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get images',
    });
  }
});

// Helper: Generate gradient colors based on text content
function generateGradientFromText(text: string): string[] {
  const colorPalettes = [
    ['#667eea', '#764ba2'], // Purple
    ['#f093fb', '#f5576c'], // Pink
    ['#4facfe', '#00f2fe'], // Blue
    ['#43e97b', '#38f9d7'], // Green
    ['#fa709a', '#fee140'], // Sunset
    ['#a8edea', '#fed6e3'], // Pastel
    ['#ff9a9e', '#fecfef'], // Rose
    ['#ffecd2', '#fcb69f'], // Peach
  ];
  
  // Hash the text to pick a consistent palette
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colorPalettes[Math.abs(hash) % colorPalettes.length];
}

// Helper: Detect likely image type from prompt
function detectImageType(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('icon') || lower.includes('logo')) return '🎨 Icon/Logo';
  if (lower.includes('diagram') || lower.includes('flow')) return '📊 Diagram';
  if (lower.includes('thumbnail') || lower.includes('youtube')) return '📹 Thumbnail';
  if (lower.includes('design') || lower.includes('ui') || lower.includes('website')) return '🖥️ UI Design';
  if (lower.includes('photo') || lower.includes('realistic')) return '📷 Photo';
  if (lower.includes('cartoon') || lower.includes('art')) return '🎨 Artwork';
  if (lower.includes('illustration')) return '✏️ Illustration';
  return '🖼️ Image';
}

// ============================================
// IMAGE PAIRS API - Input → Output Transformations
// ============================================

interface ImageManifestEntry {
  id: number;
  filename: string;
  source: 'uploaded' | 'generated';
  imagePath: string;
  prompt: string;
  title: string;
  conversationId?: string;
  timestamp: number | null;
  relatedGeneratedImages?: string[];
  sourceUploadedImage?: string;
}

interface ImagePair {
  uploadedImage: {
    filename: string;
    imagePath: string;
    prompt: string;
    conversationTitle: string;
    timestamp: string | null;
  };
  generatedImages: Array<{
    filename: string;
    imagePath: string;
    prompt: string;
    timestamp: string | null;
  }>;
  transformationPrompt: string; // The text prompt that triggered the generation
}

/**
 * GET /api/wrapped/images/pairs
 * 
 * Returns image transformation pairs: uploaded images that inspired generated images.
 * Each pair contains the source uploaded image and the AI-generated outputs it created.
 * 
 * Query params:
 *   - limit: number (default: 50, max: 100)
 */
app.get('/api/wrapped/images/pairs', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    
    // Load the gallery manifest
    const manifestPath = path.join(__dirname, '../projects/chatgpt-wrapped/images/gallery-manifest.json');
    let images: ImageManifestEntry[] = [];
    
    try {
      const manifest = await fs.readFile(manifestPath, 'utf-8');
      images = JSON.parse(manifest);
    } catch (e) {
      return res.json({
        pairs: [],
        stats: { totalPairs: 0, totalTransformations: 0 },
        message: 'Gallery manifest not found. Run the import script to generate image pairs.',
      });
    }
    
    // Build lookup maps
    const imageByFilename = new Map<string, ImageManifestEntry>();
    for (const img of images) {
      imageByFilename.set(img.filename, img);
    }
    
    // Find all uploaded images that have related generated images
    const pairs: ImagePair[] = [];
    const uploadedImages = images.filter(img => img.source === 'uploaded');
    
    for (const uploaded of uploadedImages) {
      if (!uploaded.relatedGeneratedImages || uploaded.relatedGeneratedImages.length === 0) {
        continue;
      }
      
      // Get the generated images
      const generatedImages = uploaded.relatedGeneratedImages
        .map(filename => imageByFilename.get(filename))
        .filter((img): img is ImageManifestEntry => img !== undefined);
      
      if (generatedImages.length === 0) continue;
      
      // Use the first generated image's prompt as the transformation prompt
      const transformationPrompt = generatedImages[0]?.prompt || 'Create a new image based on this';
      
      pairs.push({
        uploadedImage: {
          filename: uploaded.filename,
          imagePath: uploaded.imagePath,
          prompt: uploaded.prompt,
          conversationTitle: uploaded.title,
          timestamp: uploaded.timestamp ? new Date(uploaded.timestamp * 1000).toISOString() : null,
        },
        generatedImages: generatedImages.map(gen => ({
          filename: gen.filename,
          imagePath: gen.imagePath,
          prompt: gen.prompt,
          timestamp: gen.timestamp ? new Date(gen.timestamp * 1000).toISOString() : null,
        })),
        transformationPrompt,
      });
    }
    
    // Sort by timestamp (most recent first)
    pairs.sort((a, b) => {
      const aTime = a.uploadedImage.timestamp ? new Date(a.uploadedImage.timestamp).getTime() : 0;
      const bTime = b.uploadedImage.timestamp ? new Date(b.uploadedImage.timestamp).getTime() : 0;
      return bTime - aTime;
    });
    
    // Calculate stats
    const totalTransformations = pairs.reduce((sum, p) => sum + p.generatedImages.length, 0);
    
    res.json({
      pairs: pairs.slice(0, limit),
      stats: {
        totalPairs: pairs.length,
        totalTransformations,
        averageOutputsPerInput: pairs.length > 0 ? (totalTransformations / pairs.length).toFixed(1) : 0,
      },
    });
    
  } catch (error) {
    console.error('Image pairs API error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get image pairs',
    });
  }
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

// ============================================
// SERVER STARTUP
// ============================================

async function start() {
  // Check database connection
  console.log('Checking database connection...');
  const dbOk = await checkConnection();
  if (!dbOk) {
    console.error('Failed to connect to database');
    console.error('Make sure PostgreSQL is running: npm run db:start');
    process.exit(1);
  }
  console.log('Database connected ✓');

  // Check OpenAI key for semantic search
  if (!process.env.OPENAI_API_KEY) {
    console.warn('Warning: OPENAI_API_KEY not set - semantic search will fail');
  }

  // Start server
  app.listen(PORT, () => {
    console.log(`\n🚀 Personal Operator API running on http://localhost:${PORT}`);
    console.log(`\nEndpoints:`);
    console.log(`  GET  /health                     Health check`);
    console.log(`  POST /api/search                 Search events`);
    console.log(`  GET  /api/search?q=...           Quick search`);
    console.log(`  POST /api/tasks/utterance        Process natural language`);
    console.log(`  GET  /api/tasks                  List tasks`);
    console.log(`  GET  /api/tasks/:id              Get task details`);
    console.log(`  GET  /api/tasks/session/context  Get session context`);
    console.log(`  GET  /api/wrapped/stats          ChatGPT Wrapped stats`);
    console.log(`  GET  /api/wrapped/insights       AI-generated insights`);
    console.log(`\nDashboard: http://localhost:${PORT}`);
    console.log(`Wrapped:   http://localhost:${PORT}/wrapped/`);
    console.log('');
  });
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down...');
  await closePool();
  process.exit(0);
});

start();

