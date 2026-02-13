# ChatGPT Wrapped V2 — Data Requirements

> **Status:** Draft  
> **Date:** February 11, 2026  
> **Parent:** [design-doc.md](./design-doc.md), [workflow.md](./workflow.md)  
> **Purpose:** Exhaustive mapping of what data each beat needs, where it comes from, and what computation is required.

---

## Beat → Data Dependency Map

Every beat in the cinematic sequence needs specific data. This document maps each beat to its data requirements so that:
1. The Fact Engine knows what to compute
2. The Sequence Engine knows when to skip a beat
3. Integration testing knows what to verify

---

## Data Tiers

| Tier | Description | Source | Availability |
|------|-------------|--------|-------------|
| **T1** | Direct stats | SQL queries on imported conversations | Always (if import succeeded) |
| **T2** | Computed signals | Detector output from Phase 1 | Depends on data volume |
| **T3** | LLM-generated text | Narrative Writer output | Depends on LLM availability |
| **T4** | External references | Benchmark distributions, DALL-E images | Optional / partial |

---

## Beat-by-Beat Data Requirements

### Beat 1: Idle Editor
**Data needed:** None  
**Tier:** N/A  
**Notes:** Pure animation — editor shell with welcome screen

---

### Beat 2: Type Prompt
**Data needed:** None  
**Tier:** N/A  
**Notes:** Hardcoded prompt text: "Give me my year in review"

---

### Beat 3: Send + Thinking
**Data needed:** None  
**Tier:** N/A  
**Notes:** Pure animation — thinking dots

---

### Beat 4: AI Hook Response
| Field | Type | Source | Tier | Required |
|-------|------|--------|------|----------|
| `hook.statement` | `string` | LLM Narrative Writer / Template Fallback | T3 | ✅ Yes |
| `hook.subtext` | `string` | LLM Narrative Writer / Template Fallback | T3 | No |

**Fallback:** If no hook, show total conversation count as "You had X conversations this year"  
**Skip condition:** Never — always has fallback

---

### Beat 5: Image Generation
| Field | Type | Source | Tier | Required |
|-------|------|--------|------|----------|
| `usageImage.url` | `string` | Pre-generated or DALL-E API | T4 | No |
| `usageImage.description` | `string` | LLM Writer | T3 | No |

**Fallback:** Skip this beat if no image available  
**Skip condition:** `usageImage === null`

---

### Beat 6: Zoom In on Image
**Data needed:** Same as Beat 5  
**Skip condition:** Same — skipped if Beat 5 is skipped

---

### Beat 7: Message Cascade
| Field | Type | Source | Tier | Required |
|-------|------|--------|------|----------|
| `sampleMessages` | `string[]` | SQL: random user messages | T1 | ✅ Yes |
| Count of messages to cascade | `number` | Config (default: 40-60 ghost bubbles) | N/A | ✅ Yes |

**Computation:**
```sql
SELECT content FROM messages 
WHERE role = 'user' 
ORDER BY RANDOM() 
LIMIT 20;
```
Truncate to first 50 chars per message for ghost bubbles.

**Fallback:** Use lorem ipsum–style placeholder bubbles  
**Skip condition:** Never — always has fallback

---

### Beat 8: Compress + Hero Stat
| Field | Type | Source | Tier | Required |
|-------|------|--------|------|----------|
| `yearAtAGlance.totalMessages` | `number` | SQL: `COUNT(*)` from messages | T1 | ✅ Yes |

**Computation:**
```sql
SELECT COUNT(*) as total_messages FROM messages WHERE role = 'user';
```

**Fallback:** Always available  
**Skip condition:** Never

---

### Beat 9: Morph to Conversations
| Field | Type | Source | Tier | Required |
|-------|------|--------|------|----------|
| `yearAtAGlance.totalConversations` | `number` | SQL: `COUNT(*)` from conversations | T1 | ✅ Yes |

**Computation:**
```sql
SELECT COUNT(*) as total_conversations FROM conversations;
```

**Fallback:** Always available  
**Skip condition:** Never

---

### Beat 10: Click Sidebar
**Data needed:** None  
**Tier:** N/A  
**Notes:** Pure animation — fake cursor clicks sidebar toggle

---

### Beat 11: Sidebar Opens
| Field | Type | Source | Tier | Required |
|-------|------|--------|------|----------|
| `sampleConversationTitles` | `string[]` | SQL: conversation titles | T1 | ✅ Yes |
| Count to display | `number` | Config (default: 15-25 titles) | N/A | ✅ Yes |

**Computation:**
```sql
SELECT title FROM conversations 
ORDER BY create_time DESC 
LIMIT 25;
```

**Fallback:** Always available  
**Skip condition:** Never

---

### Beat 12: Topic Organization
| Field | Type | Source | Tier | Required |
|-------|------|--------|------|----------|
| `topicBreakdown.topics` | `TopicBreakdownEntry[]` | Topic Breakdown computation (Task 1G) | T2 | ✅ Yes |
| `topicBreakdown.topics[].name` | `string` | Topic classifier | T2 | ✅ Yes |
| `topicBreakdown.topics[].count` | `number` | SQL: `COUNT(*)` per topic | T1 | ✅ Yes |
| `topicBreakdown.topics[].color` | `string` | Assigned by topic breakdown | T2 | ✅ Yes |
| `topicBreakdown.topics[].sampleTitles` | `string[]` | SQL: titles per topic | T1 | No |
| `topicBreakdown.insights` | `string` | LLM Narrative / Template | T3 | No |

**Computation:**
```sql
SELECT topic, COUNT(*) as count, 
       array_agg(title ORDER BY create_time DESC) as titles
FROM conversations 
WHERE topic IS NOT NULL
GROUP BY topic 
ORDER BY count DESC;
```

**Data shape for bar chart:**
```typescript
interface TopicBreakdownEntry {
  name: string;          // "Programming"
  count: number;         // 234
  percentage: number;    // 34.5
  color: string;         // "#4A9EFF"
  sampleTitles: string[];  // ["Fix React bug", "Python async", ...]
}
```

**Color palette (10 topics max):**
```
#4A9EFF  Blue
#FF6B6B  Red
#51CF66  Green  
#FFD43B  Yellow
#CC5DE8  Purple
#FF922B  Orange
#20C997  Teal
#F06595  Pink
#868E96  Gray
#339AF0  Light Blue
```

**Fallback:** If no topics classified, use "Uncategorized" with total count  
**Skip condition:** Never — worst case shows 1 bar

---

### Beat 13: Type Growth Prompt
**Data needed:** None  
**Tier:** N/A  
**Notes:** Hardcoded prompt: "How have I grown?"

---

### Beat 14: Growth Graph
| Field | Type | Source | Tier | Required |
|-------|------|--------|------|----------|
| `growth.narrative` | `string` | LLM Narrative / Template | T3 | No |
| `growth.dataPoints` | `GrowthDataPoint[]` | Growth Detector (Task 1C) + Temporal (Task 1A) | T2 | ✅ Yes |
| `growth.dataPoints[].month` | `string` | Temporal detector | T1 | ✅ Yes |
| `growth.dataPoints[].value` | `number` | Temporal detector (conversations/month) | T1 | ✅ Yes |
| `growth.trend` | `string` | Growth detector | T2 | No |

**Computation:**
```sql
SELECT DATE_TRUNC('month', create_time) as month, 
       COUNT(*) as conversation_count
FROM conversations 
GROUP BY month 
ORDER BY month;
```

**Data shape for line graph:**
```typescript
interface GrowthDataPoint {
  month: string;    // "Jan", "Feb", ...
  value: number;    // conversation count (or messages, configurable)
  label?: string;   // optional annotation
}
```

**Fallback:** Always available (monthly counts are T1)  
**Skip condition:** Never — worst case shows flat line

---

### Beat 15: Heatmap
| Field | Type | Source | Tier | Required |
|-------|------|--------|------|----------|
| `heatmap.dailyCounts` | `number[]` | Daily Activity extractor (Task 1G) | T1 | ✅ Yes |
| `heatmap.maxDay` | `{ date: string, count: number }` | Derived from dailyCounts | T1 | ✅ Yes |
| `heatmap.activeDays` | `number` | `dailyCounts.filter(c => c > 0).length` | T1 | ✅ Yes |
| `heatmap.longestStreak` | `number` | Streak computation | T1 | No |
| `heatmap.factOverlay` | `string` | LLM Narrative / Template | T3 | No |

**Computation:**
```sql
SELECT DATE(create_time) as day, COUNT(*) as count
FROM conversations 
GROUP BY day 
ORDER BY day;
```

Then fill into 365-slot array (Jan 1 = index 0).

**Intensity buckets:**
```typescript
function getIntensity(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0;
  const ratio = count / max;
  if (ratio < 0.25) return 1;
  if (ratio < 0.50) return 2;
  if (ratio < 0.75) return 3;
  return 4;
}
```

**Streak computation:**
```typescript
function longestStreak(dailyCounts: number[]): number {
  let max = 0, current = 0;
  for (const count of dailyCounts) {
    current = count > 0 ? current + 1 : 0;
    max = Math.max(max, current);
  }
  return max;
}
```

**Fallback:** Always available  
**Skip condition:** Never

---

### Beat 16: Scroll Up (Transition)
**Data needed:** None  
**Tier:** N/A  
**Notes:** Pure animation — camera scrolls up past messages

---

### Beat 17: Words Lift Off
| Field | Type | Source | Tier | Required |
|-------|------|--------|------|----------|
| Source messages | In DOM | Already in chat area from earlier beats | N/A | ✅ Yes |

**Notes:** This beat extracts visible words from message bubbles already in the DOM. No new data fetch needed — it's a visual effect on existing content.

**Skip condition:** Never

---

### Beat 18: Word Cloud Forms
| Field | Type | Source | Tier | Required |
|-------|------|--------|------|----------|
| `wordCloud.words` | `WordCloudEntry[]` | Word Frequency Analyzer (Task 1F) | T2 | ✅ Yes |
| `wordCloud.words[].word` | `string` | Analyzer | T2 | ✅ Yes |
| `wordCloud.words[].frequency` | `number` | Analyzer | T1 | ✅ Yes |
| `wordCloud.totalUniqueWords` | `number` | Analyzer | T1 | No |

**Data shape:**
```typescript
interface WordCloudEntry {
  word: string;       // "python"
  frequency: number;  // 847
  rank: number;       // 1
  fontSize: number;   // computed: 48px (rank 1) → 12px (rank 30)
}

// Font size computation
function wordToFontSize(rank: number, totalWords: number): number {
  const minSize = 12;
  const maxSize = 48;
  return maxSize - ((rank - 1) / (totalWords - 1)) * (maxSize - minSize);
}
```

**Fallback:** If fewer than 5 unique words after filtering → skip Beat 18-19  
**Skip condition:** `wordCloud.words.length < 5`

---

### Beat 19: Words Drop Off
**Data needed:** Same as Beat 18 (words are already rendered)  
**Notes:** Pure animation — words fall/fade away  
**Skip condition:** Same as Beat 18

---

### Beat 20: Click Profile
**Data needed:** None  
**Tier:** N/A  
**Notes:** Pure animation — fake cursor clicks profile avatar

---

### Beat 21: Profile Panel
| Field | Type | Source | Tier | Required |
|-------|------|--------|------|----------|
| `profile.personality` | `string` | LLM Narrative | T3 | ✅ Yes |
| `profile.chatStyle` | `string` | LLM Narrative | T3 | No |
| `profile.topTraits` | `string[]` | LLM Narrative / Detectors | T2/T3 | No |
| `profile.funFacts` | `string[]` | Benchmarks + Correlations | T2/T3 | No |
| `profile.memberSince` | `string` | SQL: `MIN(create_time)` | T1 | ✅ Yes |
| `profile.totalConversations` | `number` | SQL: `COUNT(*)` | T1 | ✅ Yes |

**Computation for profile.personality:**

The LLM uses all InsightFacts to synthesize a personality description. Template fallback uses top correlations and benchmarks to construct one:

```typescript
// Template fallback for personality
function generatePersonality(facts: InsightFact[]): string {
  const topCorrelation = facts.find(f => f.category === 'correlation');
  const topBenchmark = facts.find(f => f.category === 'benchmark');
  const topGrowth = facts.find(f => f.category === 'growth');
  
  // Example output: "A methodical night-owl debugger who grew from simple questions to multi-step workflows"
  return `A ${topCorrelation?.dataPoints.trait ?? 'curious'} ${topBenchmark?.dataPoints.role ?? 'user'} who ${topGrowth?.rawNarrative ?? 'keeps coming back for more'}`;
}
```

**Fallback:** Personality and chatStyle can use template fallback. topTraits and funFacts populated from facts.  
**Skip condition:** Never — always has T1 data for memberSince and totalConversations

---

### Beat 22: Image Gallery
| Field | Type | Source | Tier | Required |
|-------|------|--------|------|----------|
| `images.count` | `number` | SQL / DALL-E manifest | T1/T4 | No |
| `images.samples` | `string[]` | Image URLs from DALL-E manifest | T4 | No |
| `images.galleryUrl` | `string` | Link to full gallery | T4 | No |

**Computation:**
```sql
-- If DALL-E data is imported
SELECT COUNT(*) as image_count FROM dalle_images WHERE user_id = ?;
```
Or from `dalle-manifest.json` in the project.

**Fallback:** Skip beat entirely if no image data  
**Skip condition:** `images === null || images.count === 0`

---

### Beat 23: Trophy Room
| Field | Type | Source | Tier | Required |
|-------|------|--------|------|----------|
| `trophyRoom.trophies` | `TrophyRoomAchievement[]` | Benchmark results (top percentiles) | T2/T4 | ✅ Yes |
| `trophyRoom.trophies[].name` | `string` | Hardcoded per metric | N/A | ✅ Yes |
| `trophyRoom.trophies[].icon` | `string` | Hardcoded per metric | N/A | ✅ Yes |
| `trophyRoom.trophies[].unlockMessage` | `string` | LLM / Template | T3 | No |
| `trophyRoom.trophies[].percentile` | `number` | Benchmark computation | T2/T4 | ✅ Yes |
| `trophyRoom.compliment` | `string` | LLM Narrative / Template | T3 | No |
| `trophyRoom.yearOneLine` | `string` | LLM Narrative / Template | T3 | ✅ Yes |

**Trophy definitions:**

| Badge | Metric | Threshold | Icon |
|-------|--------|-----------|------|
| Night Owl | Night-owl score | ≥ 70th percentile | 🦉 |
| Marathon Runner | Longest streak | ≥ 80th percentile | 🏃 |
| Polymath | Topic diversity | ≥ 75th percentile | 🧠 |
| Code Warrior | Code block ratio | ≥ 80th percentile | ⚔️ |
| Power User | Total conversations | ≥ 90th percentile | ⚡ |
| Deep Diver | Messages per conversation | ≥ 80th percentile | 🤿 |
| Early Adopter | First conversation date | Before 2023-06 | 🌅 |
| Consistency King | Active days | ≥ 75th percentile | 👑 |

**Computation:**
```typescript
function computeTrophies(benchmarks: BenchmarkResult[]): TrophyRoomAchievement[] {
  return TROPHY_DEFINITIONS
    .filter(def => {
      const benchmark = benchmarks.find(b => b.metric === def.metric);
      return benchmark && benchmark.percentile >= def.threshold;
    })
    .map(def => ({
      name: def.badge,
      icon: def.icon,
      percentile: benchmarks.find(b => b.metric === def.metric)!.percentile,
      unlockMessage: null, // filled by LLM or template
    }));
}
```

**Fallback:** If no trophies earned (all below threshold), give participation trophy + total conversations stat  
**Skip condition:** Never — always has at least 1 trophy (participation)

---

### Beat 24: Share Card
| Field | Type | Source | Tier | Required |
|-------|------|--------|------|----------|
| `shareCard.title` | `string` | "My ChatGPT Wrapped 2024" | N/A | ✅ Yes |
| `shareCard.hookStatement` | `string` | Same as `hook.statement` | T3 | ✅ Yes |
| `shareCard.totalConversations` | `number` | T1 stat | T1 | ✅ Yes |
| `shareCard.topTopic` | `string` | Top topic from breakdown | T2 | No |
| `shareCard.trophyCount` | `number` | `trophyRoom.trophies.length` | T2 | No |
| `shareCard.yearOneLine` | `string` | Same as `trophyRoom.yearOneLine` | T3 | No |

**Notes:** The share card is a static image/card rendered for export. Not a cinematic beat — it's the end state.

**Fallback:** Always has T1 stats  
**Skip condition:** Never

---

## Complete Data Dependency Summary

### Tier 1: Always Available (SQL)

These are direct database queries. If the import succeeded, these always exist.

| Data | Query | Used By |
|------|-------|---------|
| Total conversations | `COUNT(*) FROM conversations` | Beats 9, 21, 23, 24 |
| Total messages | `COUNT(*) FROM messages WHERE role='user'` | Beat 8 |
| Sample messages | `SELECT content FROM messages LIMIT 20` | Beat 7 |
| Conversation titles | `SELECT title FROM conversations` | Beat 11 |
| Monthly counts | `GROUP BY DATE_TRUNC('month', create_time)` | Beat 14 |
| Daily counts | `GROUP BY DATE(create_time)` | Beat 15 |
| First conversation date | `MIN(create_time)` | Beat 21 |
| Busiest day | `MAX(daily_count)` | Beat 15 |
| Per-topic counts | `GROUP BY topic` | Beat 12 |

### Tier 2: Computed (Detectors)

These require minimum data volumes for meaningful output.

| Data | Detector | Min Data | Used By |
|------|----------|----------|---------|
| Temporal profile | 1A | 2+ months | Beat 12, 14 |
| Correlations | 1B | 20+ convos/bucket | Beat 4 (hook) |
| Growth signals | 1C | 2+ months | Beat 14 |
| Life events | 1D | 4+ weeks active | Beat 14 (annotations) |
| Benchmarks | 1E | Any (has fallbacks) | Beat 23 |
| Word frequencies | 1F | 50+ user messages | Beat 18 |
| Topic breakdown | 1G | 5+ conversations | Beat 12 |

### Tier 3: LLM-Generated

These degrade gracefully to Template Fallback.

| Data | Used By | Template Fallback Quality |
|------|---------|--------------------------|
| Hook statement | Beat 4 | B+ (rawNarrative from facts) |
| Topic insights | Beat 12 | B (fact-based template) |
| Growth narrative | Beat 14 | B (monthly trend description) |
| Heatmap fact overlay | Beat 15 | B+ (streak + max day template) |
| Profile personality | Beat 21 | B (trait-based template) |
| Profile fun facts | Beat 21 | A- (directly from benchmarks) |
| Trophy unlock messages | Beat 23 | B (percentile-based template) |
| Compliment | Beat 23 | B (growth-based template) |
| Year in one line | Beat 23, 24 | B+ (stat-based template) |

### Tier 4: External / Optional

| Data | Source | Used By | If Missing |
|------|--------|---------|------------|
| Benchmark distributions | Aggregate DB / research | Beat 23 | Self-comparison (T3 fallback) |
| DALL-E images | dalle-manifest.json | Beat 22 | Skip beat |
| Usage diagram image | Pre-generated / DALL-E | Beat 5-6 | Skip beats |

---

## Data Volume Thresholds

| User Profile | Conversations | Months | Expected Beats |
|-------------|---------------|--------|----------------|
| **Power user** | 500+ | 6+ | All 24 |
| **Regular** | 100-500 | 3-6 | 20-22 (may skip images, word cloud if thin) |
| **Casual** | 30-100 | 1-3 | 16-18 (skip word cloud, some trophies, images) |
| **Minimal** | < 30 | 1 | 12-14 (core stats only, skip growth, heatmap sparse) |

---

## SQL Query Reference

All queries assume the imported ChatGPT data schema:

```sql
-- conversations table
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  title TEXT,
  create_time TIMESTAMP,
  update_time TIMESTAMP,
  message_count INTEGER,
  topic TEXT,               -- classified topic
  source TEXT DEFAULT 'chatgpt'
);

-- messages table
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT REFERENCES conversations(id),
  role TEXT,                -- 'user' | 'assistant' | 'system'
  content TEXT,
  create_time TIMESTAMP,
  content_type TEXT,
  has_code_block BOOLEAN
);
```

### Precomputed Aggregates (for performance)

Run these once during import and cache:

```sql
-- User stats aggregate
CREATE MATERIALIZED VIEW user_stats AS
SELECT 
  COUNT(DISTINCT c.id) as total_conversations,
  COUNT(m.id) as total_messages,
  COUNT(DISTINCT DATE(c.create_time)) as active_days,
  MIN(c.create_time) as first_conversation,
  MAX(c.create_time) as last_conversation,
  AVG(c.message_count) as avg_messages_per_conversation,
  AVG(LENGTH(m.content)) FILTER (WHERE m.role = 'user') as avg_message_length
FROM conversations c
JOIN messages m ON m.conversation_id = c.id;

-- Topic summary
CREATE MATERIALIZED VIEW topic_summary AS
SELECT 
  topic,
  COUNT(*) as conversation_count,
  array_agg(title ORDER BY create_time DESC) as titles
FROM conversations
WHERE topic IS NOT NULL
GROUP BY topic
ORDER BY conversation_count DESC;

-- Daily activity
CREATE MATERIALIZED VIEW daily_activity AS
SELECT 
  DATE(create_time) as day,
  COUNT(*) as conversation_count
FROM conversations
GROUP BY day
ORDER BY day;

-- Hourly distribution  
CREATE MATERIALIZED VIEW hourly_distribution AS
SELECT 
  EXTRACT(HOUR FROM create_time) as hour,
  COUNT(*) as conversation_count,
  AVG(LENGTH(m.content)) FILTER (WHERE m.role = 'user') as avg_message_length
FROM conversations c
JOIN messages m ON m.conversation_id = c.id
GROUP BY hour
ORDER BY hour;
```
