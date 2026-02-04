#!/usr/bin/env tsx
/**
 * Deep Profile Analysis
 * 
 * Analyzes your ChatGPT history to extract a comprehensive profile:
 * - Communication style
 * - Professional context
 * - Interests & expertise
 * - Decision patterns
 * - Technical preferences
 * 
 * Usage:
 *   npm run profile:analyze
 *   npm run profile:analyze --output ./my-profile.md
 */

import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { checkConnection, closePool, query } from '../lib/db';
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// TYPES
// ============================================

interface MessageSample {
  text: string;
  timestamp: Date;
  topic_tags: string[];
  thread_subject: string | null;
}

interface TopicDistribution {
  topic: string;
  count: number;
}

interface ProfileAnalysis {
  summary: string;
  communication: {
    style: string;
    averageLength: string;
    formality: number;
    usesCodeBlocks: boolean;
    preferredFormat: string;
    vocabulary: string[];
  };
  professional: {
    role: string;
    company: string;
    industry: string;
    skills: string[];
    expertise: string[];
  };
  interests: {
    topics: string[];
    learningAreas: string[];
    recurringThemes: string[];
  };
  technical: {
    languages: string[];
    frameworks: string[];
    tools: string[];
    platforms: string[];
    preferences: Record<string, string>;
  };
  patterns: {
    problemSolving: string;
    decisionMaking: string;
    questionStyle: string;
    workPatterns: string;
  };
  insights: string[];
}

// ============================================
// MAIN
// ============================================

async function main() {
  const args = process.argv.slice(2);
  const outputIdx = args.indexOf('--output');
  const outputPath = outputIdx !== -1 
    ? args[outputIdx + 1] 
    : './profile-analysis.md';

  console.log('Deep Profile Analysis');
  console.log('=====================\n');

  // Check environment
  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL is required');
    process.exit(1);
  }

  if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY or OPENAI_API_KEY is required for analysis');
    process.exit(1);
  }

  const useOpenAI = !process.env.ANTHROPIC_API_KEY || args.includes('--openai');
  if (useOpenAI) {
    console.log('Using OpenAI GPT-4 for analysis');
  } else {
    console.log('Using Claude for analysis');
  }

  // Check database
  console.log('Connecting to database...');
  const dbOk = await checkConnection();
  if (!dbOk) {
    console.error('Error: Could not connect to database');
    process.exit(1);
  }
  console.log('Database connected ✓\n');

  try {
    // Step 1: Get overview stats
    console.log('Step 1: Gathering statistics...');
    const stats = await getStats();
    console.log(`  Total messages: ${stats.totalMessages}`);
    console.log(`  User messages: ${stats.userMessages}`);
    console.log(`  Conversations: ${stats.conversations}`);
    console.log(`  Date range: ${stats.dateRange.earliest.toLocaleDateString()} - ${stats.dateRange.latest.toLocaleDateString()}`);
    console.log('');

    // Step 2: Get topic distribution
    console.log('Step 2: Analyzing topic distribution...');
    const topics = await getTopicDistribution();
    console.log('  Topics:');
    for (const t of topics.slice(0, 5)) {
      console.log(`    ${t.topic}: ${t.count}`);
    }
    console.log('');

    // Step 3: Sample messages across topics
    console.log('Step 3: Sampling representative messages...');
    const samples = await sampleMessages(topics);
    console.log(`  Sampled ${samples.length} messages across ${topics.length} topics`);
    console.log('');

    // Step 4: Analyze communication style
    console.log('Step 4: Analyzing communication patterns...');
    const styleStats = analyzeMessagePatterns(samples);
    console.log(`  Average length: ${styleStats.avgLength} chars`);
    console.log(`  Uses code: ${styleStats.usesCode ? 'yes' : 'no'} (${styleStats.codePercent}%)`);
    console.log(`  Uses bullets: ${styleStats.usesBullets ? 'yes' : 'no'}`);
    console.log('');

    // Step 5: Run LLM analysis
    console.log('Step 5: Running deep analysis...');
    console.log('  (This may take 30-60 seconds)');
    const profile = useOpenAI 
      ? await analyzeWithOpenAI(samples, stats, topics, styleStats)
      : await analyzeWithLLM(samples, stats, topics, styleStats);
    console.log('  Analysis complete ✓');
    console.log('');

    // Step 6: Generate profile document
    console.log('Step 6: Generating profile document...');
    const markdown = generateProfileMarkdown(profile, stats, topics);
    
    // Write to file
    const fullPath = path.resolve(outputPath);
    fs.writeFileSync(fullPath, markdown);
    console.log(`  Written to: ${fullPath}`);
    console.log('');

    // Print summary
    console.log('═'.repeat(60));
    console.log('PROFILE SUMMARY');
    console.log('═'.repeat(60));
    console.log('');
    console.log(profile.summary);
    console.log('');
    console.log('─'.repeat(60));
    console.log('Professional:');
    console.log(`  Role: ${profile.professional.role}`);
    console.log(`  Company: ${profile.professional.company}`);
    console.log(`  Skills: ${profile.professional.skills.slice(0, 5).join(', ')}`);
    console.log('');
    console.log('Technical:');
    console.log(`  Languages: ${profile.technical.languages.join(', ')}`);
    console.log(`  Frameworks: ${profile.technical.frameworks.slice(0, 5).join(', ')}`);
    console.log('');
    console.log('Communication:');
    console.log(`  Style: ${profile.communication.style}`);
    console.log(`  Formality: ${profile.communication.formality}/5`);
    console.log('─'.repeat(60));
    console.log('');
    console.log(`Full profile saved to: ${fullPath}`);

  } catch (error) {
    console.error('Analysis failed:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

// ============================================
// DATA GATHERING
// ============================================

async function getStats() {
  const result = await query<{
    total_messages: string;
    user_messages: string;
    conversations: string;
    earliest: Date;
    latest: Date;
  }>(`
    SELECT 
      COUNT(*) as total_messages,
      COUNT(*) FILTER (WHERE metadata->>'role' = 'user') as user_messages,
      COUNT(DISTINCT thread_id) as conversations,
      MIN(timestamp) as earliest,
      MAX(timestamp) as latest
    FROM events
    WHERE source = 'chatgpt'
  `);

  const row = result.rows[0];
  return {
    totalMessages: parseInt(row.total_messages),
    userMessages: parseInt(row.user_messages),
    conversations: parseInt(row.conversations),
    dateRange: {
      earliest: row.earliest,
      latest: row.latest,
    },
  };
}

async function getTopicDistribution(): Promise<TopicDistribution[]> {
  const result = await query<{ topic: string; count: string }>(`
    SELECT 
      unnest(topic_tags) as topic,
      COUNT(*) as count
    FROM events
    WHERE source = 'chatgpt'
      AND array_length(topic_tags, 1) > 0
    GROUP BY topic
    ORDER BY count DESC
  `);

  return result.rows.map(r => ({
    topic: r.topic,
    count: parseInt(r.count),
  }));
}

async function sampleMessages(topics: TopicDistribution[]): Promise<MessageSample[]> {
  const samples: MessageSample[] = [];
  const samplesPerTopic = 15;
  const maxMessageLength = 2000;

  // Sample from each topic
  for (const topic of topics.slice(0, 8)) { // Top 8 topics
    const result = await query<MessageSample>(`
      SELECT 
        LEFT(e.text, $3) as text,
        e.timestamp,
        e.topic_tags,
        t.subject as thread_subject
      FROM events e
      LEFT JOIN threads t ON e.thread_id = t.id
      WHERE e.source = 'chatgpt'
        AND e.metadata->>'role' = 'user'
        AND $1 = ANY(e.topic_tags)
        AND LENGTH(e.text) > 50
      ORDER BY RANDOM()
      LIMIT $2
    `, [topic.topic, samplesPerTopic, maxMessageLength]);

    samples.push(...result.rows);
  }

  // Also sample some "general" messages without specific topics
  const generalResult = await query<MessageSample>(`
    SELECT 
      LEFT(e.text, $2) as text,
      e.timestamp,
      e.topic_tags,
      t.subject as thread_subject
    FROM events e
    LEFT JOIN threads t ON e.thread_id = t.id
    WHERE e.source = 'chatgpt'
      AND e.metadata->>'role' = 'user'
      AND LENGTH(e.text) > 100
    ORDER BY RANDOM()
    LIMIT $1
  `, [20, maxMessageLength]);

  samples.push(...generalResult.rows);

  return samples;
}

function analyzeMessagePatterns(samples: MessageSample[]) {
  const lengths = samples.map(s => s.text.length);
  const avgLength = Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length);

  const withCode = samples.filter(s => 
    s.text.includes('```') || 
    s.text.includes('function ') || 
    s.text.includes('const ') ||
    s.text.includes('import ')
  ).length;

  const withBullets = samples.filter(s => 
    s.text.includes('- ') || 
    s.text.includes('* ') ||
    /^\d+\./m.test(s.text)
  ).length;

  const withQuestions = samples.filter(s => s.text.includes('?')).length;

  return {
    avgLength,
    usesCode: withCode > samples.length * 0.1,
    codePercent: Math.round((withCode / samples.length) * 100),
    usesBullets: withBullets > samples.length * 0.1,
    questionPercent: Math.round((withQuestions / samples.length) * 100),
  };
}

// ============================================
// LLM ANALYSIS
// ============================================

function buildAnalysisPrompt(
  samples: MessageSample[],
  stats: Awaited<ReturnType<typeof getStats>>,
  topics: TopicDistribution[],
  styleStats: ReturnType<typeof analyzeMessagePatterns>
): string {
  const sampleText = samples
    .slice(0, 60) // Limit samples
    .map((s, i) => `[${i + 1}] (${s.thread_subject || 'untitled'})\n${s.text}`)
    .join('\n\n---\n\n');

  const topicSummary = topics
    .slice(0, 10)
    .map(t => `${t.topic}: ${t.count}`)
    .join(', ');

  return `You are analyzing a user's ChatGPT conversation history to build a comprehensive profile. 

## Statistics
- Total messages: ${stats.totalMessages}
- User messages: ${stats.userMessages}
- Conversations: ${stats.conversations}
- Date range: ${stats.dateRange.earliest.toLocaleDateString()} to ${stats.dateRange.latest.toLocaleDateString()}
- Topic distribution: ${topicSummary}
- Average message length: ${styleStats.avgLength} characters
- Uses code blocks: ${styleStats.codePercent}% of messages
- Question-based: ${styleStats.questionPercent}% of messages

## Sample Messages
Here are representative messages from this user:

${sampleText}

## Your Task
Analyze these messages to extract a comprehensive profile. Return ONLY a valid JSON object (no markdown, no explanation) with this structure:

{
  "summary": "A 2-3 sentence summary of who this person is",
  "communication": {
    "style": "Description of their communication style",
    "averageLength": "short/medium/long with context",
    "formality": 1-5 scale (1=very casual, 5=very formal),
    "usesCodeBlocks": true/false,
    "preferredFormat": "prose/bullets/mixed",
    "vocabulary": ["notable words or phrases they use"]
  },
  "professional": {
    "role": "Their job title/role",
    "company": "Company they work for",
    "industry": "Industry/domain",
    "skills": ["list of skills mentioned"],
    "expertise": ["areas of deep knowledge"]
  },
  "interests": {
    "topics": ["topics they frequently discuss"],
    "learningAreas": ["things they're trying to learn"],
    "recurringThemes": ["themes that come up repeatedly"]
  },
  "technical": {
    "languages": ["programming languages"],
    "frameworks": ["frameworks and libraries"],
    "tools": ["tools and services"],
    "platforms": ["platforms they work with"],
    "preferences": {"key": "value pairs of preferences"}
  },
  "patterns": {
    "problemSolving": "How they approach problems",
    "decisionMaking": "How they make decisions",
    "questionStyle": "How they ask questions",
    "workPatterns": "Patterns in how they work"
  },
  "insights": ["5-10 specific insights about this person that would help an AI assistant serve them better"]
}

Be specific and evidence-based. Only include things you can infer from the actual messages.`;
}

function parseProfileResponse(text: string): ProfileAnalysis {
  // Try to extract JSON from response (handle markdown code blocks)
  let jsonStr = text;
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  }

  // Also try to find raw JSON object
  const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    jsonStr = objectMatch[0];
  }

  try {
    return JSON.parse(jsonStr.trim());
  } catch (e) {
    console.error('Failed to parse LLM response:', jsonStr.slice(0, 500));
    throw new Error('Failed to parse profile analysis');
  }
}

async function analyzeWithLLM(
  samples: MessageSample[],
  stats: Awaited<ReturnType<typeof getStats>>,
  topics: TopicDistribution[],
  styleStats: ReturnType<typeof analyzeMessagePatterns>
): Promise<ProfileAnalysis> {
  const anthropic = new Anthropic();
  const prompt = buildAnalysisPrompt(samples, stats, topics, styleStats);

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type');
  }

  return parseProfileResponse(content.text);
}

async function analyzeWithOpenAI(
  samples: MessageSample[],
  stats: Awaited<ReturnType<typeof getStats>>,
  topics: TopicDistribution[],
  styleStats: ReturnType<typeof analyzeMessagePatterns>
): Promise<ProfileAnalysis> {
  const openai = new OpenAI();
  const prompt = buildAnalysisPrompt(samples, stats, topics, styleStats);

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  return parseProfileResponse(content);
}

// ============================================
// OUTPUT GENERATION
// ============================================

function generateProfileMarkdown(
  profile: ProfileAnalysis,
  stats: Awaited<ReturnType<typeof getStats>>,
  topics: TopicDistribution[]
): string {
  const now = new Date().toISOString().split('T')[0];

  return `# Personal Profile Analysis

> **Generated:** ${now}  
> **Based on:** ${stats.userMessages.toLocaleString()} messages across ${stats.conversations.toLocaleString()} conversations  
> **Date Range:** ${stats.dateRange.earliest.toLocaleDateString()} - ${stats.dateRange.latest.toLocaleDateString()}

---

## Summary

${profile.summary}

---

## Professional Context

| Attribute | Value |
|-----------|-------|
| **Role** | ${profile.professional.role} |
| **Company** | ${profile.professional.company} |
| **Industry** | ${profile.professional.industry} |

### Skills
${profile.professional.skills.map(s => `- ${s}`).join('\n')}

### Areas of Expertise
${profile.professional.expertise.map(e => `- ${e}`).join('\n')}

---

## Communication Style

| Attribute | Value |
|-----------|-------|
| **Style** | ${profile.communication.style} |
| **Message Length** | ${profile.communication.averageLength} |
| **Formality** | ${profile.communication.formality}/5 |
| **Format** | ${profile.communication.preferredFormat} |
| **Uses Code Blocks** | ${profile.communication.usesCodeBlocks ? 'Yes' : 'No'} |

### Notable Vocabulary
${profile.communication.vocabulary.map(v => `- "${v}"`).join('\n')}

---

## Technical Profile

### Languages
${profile.technical.languages.map(l => `- ${l}`).join('\n')}

### Frameworks & Libraries
${profile.technical.frameworks.map(f => `- ${f}`).join('\n')}

### Tools & Services
${profile.technical.tools.map(t => `- ${t}`).join('\n')}

### Platforms
${profile.technical.platforms.map(p => `- ${p}`).join('\n')}

### Preferences
${Object.entries(profile.technical.preferences).map(([k, v]) => `- **${k}:** ${v}`).join('\n')}

---

## Interests & Focus Areas

### Primary Topics
${profile.interests.topics.map(t => `- ${t}`).join('\n')}

### Learning Areas
${profile.interests.learningAreas.map(l => `- ${l}`).join('\n')}

### Recurring Themes
${profile.interests.recurringThemes.map(t => `- ${t}`).join('\n')}

---

## Behavioral Patterns

| Pattern | Description |
|---------|-------------|
| **Problem Solving** | ${profile.patterns.problemSolving} |
| **Decision Making** | ${profile.patterns.decisionMaking} |
| **Question Style** | ${profile.patterns.questionStyle} |
| **Work Patterns** | ${profile.patterns.workPatterns} |

---

## Key Insights

These insights can help an AI assistant better serve this user:

${profile.insights.map((insight, i) => `${i + 1}. ${insight}`).join('\n')}

---

## Topic Distribution

\`\`\`
${topics.slice(0, 10).map(t => `${t.topic.padEnd(15)} ${'█'.repeat(Math.min(Math.round(t.count / 20), 30))} ${t.count}`).join('\n')}
\`\`\`

---

## How to Use This Profile

1. **System Prompts:** Include the summary and communication style in system prompts
2. **Context Selection:** Prioritize topics from their interest areas
3. **Response Format:** Match their preferred format (${profile.communication.preferredFormat})
4. **Technical Level:** Assume expertise in ${profile.professional.expertise.slice(0, 3).join(', ')}
5. **Tone:** Maintain formality level ${profile.communication.formality}/5

---

*This profile was automatically generated from ChatGPT conversation history. Review and edit as needed.*
`;
}

main();

