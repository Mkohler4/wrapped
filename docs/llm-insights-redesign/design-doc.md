# LLM Insights Redesign — Design Doc

> **Status:** Draft  
> **Date:** February 9, 2026  
> **Priority:** High  
> **Parent:** [chatgpt-wrapped-data-accuracy-overhaul.md](../chatgpt-wrapped-data-accuracy-overhaul.md) — Bug 7  
> **Goal:** Transform insights from "competent and grounded" to "screenshot-worthy." Every slide should make the user feel like the AI genuinely *understands* them — not just counted their messages.

---

## Table of Contents

1. [The Bar — What "Amazing" Actually Looks Like](#1-the-bar--what-amazing-actually-looks-like)
2. [Why the Current System Can't Get There](#2-why-the-current-system-cant-get-there)
3. [The Five Insight Categories](#3-the-five-insight-categories)
4. [New Data Architecture](#4-new-data-architecture)
5. [Comparative Benchmarks — "Top X% of Users"](#5-comparative-benchmarks--top-x-of-users)
6. [Implementation Strategy](#6-implementation-strategy)
7. [Multi-Tier JSON Recovery](#7-multi-tier-json-recovery)
8. [Task Breakdown](#8-task-breakdown)
9. [Risks & Mitigations](#9-risks--mitigations)
10. [Open Questions](#10-open-questions)

---

## 1. The Bar — What "Amazing" Actually Looks Like

Spotify Wrapped doesn't amaze people because it says "you listened to 4,000 minutes of music." It amazes them because it says "you listen to sad music on Tuesdays" — a pattern the user never noticed about themselves. The insight feels like it *sees* them.

**The current system produces this:**

```
personality:    "The Curious Mind — Always asking questions!"
funFact:        "You have a lot of conversations!"
spiritAnimal:   "Owl — Wise and nocturnal"
roast:          "ChatGPT is your rubber duck"
```

**The target system should produce this:**

| Insight Type | Example |
|-------------|---------|
| **Trajectory** | "You stopped asking 'what is a React hook' on March 14th. You never needed to ask again." |
| **Behavioral correlation** | "You code during the day and write fiction at night. 73% of your creative writing happens after 10 PM. You're two different people." |
| **Life event detection** | "23 interview-prep threads in September, then silence in October. We don't know what happened — but something did." |
| **Growth recognition** | "January you: 8-word questions. December you: 200-word context paragraphs with code samples. You didn't just learn to use AI — you learned how to think with it." |
| **Comparative positioning** | "Most people ask a question and leave. You stay for 19 messages. You don't just ask — you think out loud." |

The difference isn't better copywriting. It's a fundamentally different class of analysis happening underneath the text.

### What Makes Users Screenshot

1. **Self-recognition** — "That IS me, how did it know?"
2. **Surprise** — A pattern they never noticed about themselves
3. **Relative positioning** — "Top 2%" feels like an achievement
4. **Narrative arc** — Seeing their own growth story reflected back
5. **Emotional awareness** — Acknowledging what they were going through, not just what they typed

The current system achieves zero of these. Even with perfect templates and grounded citations, plugging numbers into pre-authored text achieves at best #1 (weak self-recognition). The system needs to be rebuilt around all five.

### The Hook — Opening Like an Essay

Every great essay opens with a hook. The Wrapped experience should do the same. The very first slide the user sees should be **one single, specific, compelling statement** — not a summary screen, not a dashboard of numbers, not "Welcome to your Wrapped."

The hook must be a **behavioral pattern or trajectory** — something the user never noticed about themselves. Not a vanity metric, not a stat, not a flex. A mirror.

Think of it as the difference between:

**Bad (stat opening):**
> "You had 1,427 conversations this year. Here's your breakdown."

**Bad (vanity metric opening):**
> "You're in the top 1% of ChatGPT power users. Let's show you why."

**Good (behavioral pattern):**
> "You ask about Python every morning and write fiction every night. You're two different people."

**Good (trajectory):**
> "You stopped asking 'what is a React hook' on March 14th. You never needed to ask again."

**Good (life event hint):**
> "You had 23 interview-prep conversations in September. Then zero. Something happened."

The hook does three things:
1. **Creates immediate self-recognition** — "That IS me, how did it know?"
2. **Signals depth** — this isn't going to be generic; the system actually analyzed their data
3. **Sets the emotional tone** — this is personal, surprising, and specific

After the hook, the second slide transitions to a **"Year at a Glance"** overview — one slide with key numbers (days, conversations, timespan) framed as a human truth, not a report. Then the remaining slides move quickly into the deep pattern slides before presenting benchmarks and the emotional payoff.

**How to pick the hook:** The fact engine produces a ranked list of insights sorted by wow score. The hook is the #1 fact — but **behavioral patterns and trajectories are always preferred over raw benchmarks.** A pattern the user never noticed about themselves ("you code by day, write by night") will always beat a percentile ("top 1%"). Only fall back to benchmark hooks if no strong behavioral pattern exists. The hook should always feel like the system *sees* the user.

### Human Tasks & AI Tasks — The Dual Portrait

The best Wrapped insights don't just describe how someone used ChatGPT — they describe **who that person was this year**. The system should produce two complementary types of insights:

**Human task insights** reflect real-world activities visible through AI usage:
- "23 interview-prep threads in September, then silence in October. Something happened."
- "You went from learning Python to building production apps."
- "A creative writing burst in March — 34 conversations in 3 weeks."

These feel powerful because they acknowledge what the user was *going through*, not just what they typed.

**AI task insights** capture how the user interacts with ChatGPT relative to others:
- "You're in the top 1% of users for conversation depth."
- "You average 19 messages per thread — most people stop at 4."
- "Your night-owl score puts you in the top 5%."

These feel powerful because they give the user a sense of identity and achievement within the ChatGPT user base.

A great insight set includes both. The human task insights create emotional resonance ("that IS me"), while the AI task insights create shareable bragging rights ("I'm in the top 1%"). Together they paint a complete portrait.

### Design Principle: Poster, Not Dashboard

The current slides have too much going on. The redesign follows a strict principle: **every slide communicates exactly one thing, and it should feel like a poster you'd hang on a wall.**

- **No secondary metrics.** If a slide shows your usage over time, that's all it shows. No sidebar stats, no additional callouts, no "also here's your top topic."
- **3-second test.** The user should absorb the insight in under 3 seconds. If it needs explanation, it's too complex.
- **Two layers of text, max.** Every slide has at most a headline (the insight) and a subline (the evidence). No third line. No footnotes.

### Visual Design Language

The slides should feel like Spotify Wrapped — bold, saturated, shareable.

- **Full-bleed color, one palette per slide.** Each slide owns the entire screen with a bold, saturated background — deep purples, electric blues, warm ambers, soft greens. No white cards on gray. Adjacent slides use different palettes so swiping feels like a gallery.
- **One thing, massive.** If it's a number, 120pt font. If it's a sentence, it's the only sentence on screen. If it's a chart, it fills 80% of the space. Readable from across the room.
- **Typography does the heavy lifting.** No icons, no illustrations. Bold sans-serif type, dramatic size contrast between headline and subline. The type *is* the design.
- **Data visualizations are shapes, not charts.** The usage curve has no gridlines or axis labels — just the silhouette of the year. The heatmap is a clean grid of color blocks. Benchmarks are one line, one dot, one label.
- **Motion makes it alive.** Numbers count up. Curves draw themselves. The heatmap fills in block by block. Under 1 second, purposeful — a reveal, not a loading screen.
- **Mobile-first, portrait.** The canonical experience is a phone held vertically — like Wrapped, like Instagram Stories. The share card is pre-formatted for story posts.
- **Dark mode default, high contrast.** Saturated backgrounds with white or light text. Better in screenshots, better on OLED, signals premium.

**The test:** If you squint at a slide and can still tell what it's saying, the design is right. If you have to lean in and read, it's too busy.

**The identity/personality slide is removed.** It consistently produced generic content ("The Curious Mind") and doesn't survive the simplicity test. The hook slide replaces its role.

**The roast slide is removed.** Too easy to feel mean or generic. The fun facts slide handles humor better through specificity — a weird 3 AM conversation about fonts is funnier and more personal than any pre-written burn.

---

## 2. Why the Current System Can't Get There

### What's Broken (Quick Summary)

| Layer | Path A (Client) | Path B (Server) |
|-------|----------------|----------------|
| **Data** | Only top topic + 5 basic stats | 14 signals, all aggregated totals — no temporal data, no comparisons |
| **Analysis** | Static lookup table from 5 topics | LLM prompt says "be specific" with no enforcement |
| **Output** | Identical for all users with same top topic | Occasionally vague; falls back to hardcoded on parse failure |

### The Deeper Problem

The system treats every conversation as an equal data point and computes **aggregate statistics** — totals, ratios, averages. This is spreadsheet analysis. It answers "how much?" but never:

- **"How did you change?"** — No temporal segmentation. A user who went from coding in January to writing in December looks identical to someone who did both all year.
- **"What were you going through?"** — No intent detection. 50 "career-change" conversations in September is a life event, not a topic count.
- **"How do you compare?"** — No benchmarks. "1,427 conversations" means nothing without context. Is that a lot? Compared to what?
- **"What patterns do you have?"** — No behavioral correlation. The system knows nightOwlScore and topTopic separately, but doesn't connect them ("you code during the day but write at night").
- **"How did you grow?"** — No progression tracking. A user whose questions evolved from "what is X" to "how should I architect X" shows genuine skill growth — invisible to the current system.

### Root Cause: Code Level

**Path A — `generateDataInsights()` (analysis.js:498)**

```javascript
// Only uses top topic + 5 basic stats
const topTopic = stats.topics?.[0]?.[0] || 'technology';
// ... feeds into static lookup maps with only 5 keys
// 50 topic categories after Bug 1 fix → vast majority fall through to generic
```

**Path B — Server LLM prompt (server.ts:1267–1285)**

```typescript
// Prompt asks for specificity but has:
// - No banned phrase list
// - No requirement for numbers in each field
// - No output schema beyond field names
// - No validation before caching
// - Only 8 semantic probes (missing DevOps, Data Science, UI/UX, Finance, etc.)
```

**Path B — Parse failure (server.ts:1290–1307)**

```typescript
// Falls back to hardcoded generics permanently cached
insights = {
  personality: { title: 'The Curious Mind', description: 'Always asking questions!' },
  // ... all hardcoded
};
```

---

## 3. The Five Insight Categories

Every insight slide should draw from one or more of these categories. The categories are ranked by "wow factor" — how likely they are to make a user screenshot.

### Category 1: Trajectory Insights (Highest Wow Factor)

**What it is:** How the user's behavior or topics changed over time. Narrative arcs, pivots, evolution.

**Example outputs:**
- "You started with Python basics in March, hit machine learning by July, and were deploying models by November. You speedran an ML career in 9 months."
- "Your top topic shifted from 'learning' to 'building' between Q2 and Q4. You graduated."
- "In January you had 12 conversations. By August you had 89. Your ChatGPT dependency grew 7x."

**What data is needed:**
- Topics bucketed by month/quarter (not just overall)
- Topic transition matrix: what topic followed what topic over time
- Monthly conversation count and message count trends
- Keyword evolution: what terms appeared in early conversations vs. recent ones

**Computation:**

```typescript
interface TemporalProfile {
  // Monthly breakdown
  monthlyTopics: Array<{
    month: string;            // "2024-01"
    topTopics: string[];      // ["python", "data-science"]
    conversationCount: number;
    avgMessageLength: number;
  }>;

  // Topic transitions
  topicArcs: Array<{
    from: string;             // "python-basics"
    to: string;               // "machine-learning"
    transitionMonth: string;  // "2024-07"
    monthsSpan: number;       // 4
  }>;

  // Growth curve
  usageTrend: {
    firstMonth: { count: number; month: string };
    peakMonth: { count: number; month: string };
    recentMonth: { count: number; month: string };
    growthMultiplier: number;  // peak / first
  };
}
```

**SQL queries needed:**

```sql
-- Topics by month
SELECT
  strftime('%Y-%m', datetime(create_time, 'unixepoch')) as month,
  json_extract(topic_tags, '$[0]') as primary_topic,
  COUNT(*) as conv_count
FROM conversations
GROUP BY month, primary_topic
ORDER BY month;

-- Keyword evolution (first 3 months vs last 3 months)
SELECT word, SUM(count) as total
FROM top_words
WHERE conversation_id IN (
  SELECT id FROM conversations
  WHERE create_time > ? AND create_time < ?
)
GROUP BY word ORDER BY total DESC LIMIT 20;
```

### Category 2: Comparative Benchmarks (High Wow Factor)

**What it is:** How the user compares to other ChatGPT users. Percentiles, rankings, "top X%."

**Example outputs:**
- "You're in the top 2% for conversation depth. Most users average 4 messages — you average 19."
- "Your 21-day streak puts you in the top 5% of consistent users."
- "You've explored 14 different topics. 80% of users stick to 3 or fewer."
- "Your night-owl score of 47% is 3x the average user's 15%."

**Where does the benchmark data come from?** (See Section 5 for full detail)

| Source | What It Provides | Privacy |
|--------|-----------------|---------|
| **Aggregate stats from our own users** | Percentile distributions for every metric (conversations, message length, streaks, topics, etc.) | Fully anonymous — we store distributions, not individual data |
| **Published ChatGPT research** | Baseline averages (avg conversations per user, avg message length, common topics) | Public data |
| **Internal self-comparison** | "Your October was 3x your March" — no external data needed | Zero privacy concern |

**Data needed:**
- A `benchmarks` table/file storing percentile distributions
- Updated periodically from aggregate anonymous stats
- Fallback to published research numbers if our user base is too small

### Category 3: Behavioral Correlations (High Wow Factor)

**What it is:** Non-obvious connections between different behaviors. Time × topic, mood × length, day × activity type.

**Example outputs:**
- "Your conversations get 3x longer after 11 PM. Late-night you has more patience."
- "You code during the day but write creatively at night."
- "On Wednesdays, your messages are 40% shorter. Mid-week fatigue?"
- "You ask the most questions on Mondays — planning your week?"

**What data is needed:**
- Cross-tabulation: hour-of-day × topic, day-of-week × message length, day-of-week × topic
- Variance detection: which behaviors deviate most from the user's own average

**Computation:**

```typescript
interface BehavioralCorrelation {
  id: string;
  description: string;          // "Conversations 3x longer after 11pm"
  dimension1: string;           // "time_of_day"
  dimension2: string;           // "message_length"
  strength: number;             // 0-1, how strong the correlation is
  dataPoints: Record<string, number>;
}

function detectCorrelations(conversations: any[]): BehavioralCorrelation[] {
  const correlations: BehavioralCorrelation[] = [];

  // Time-of-day × message length
  const dayAvgLength = avgMessageLength(conversations.filter(c => hour(c) >= 6 && hour(c) < 22));
  const nightAvgLength = avgMessageLength(conversations.filter(c => hour(c) >= 22 || hour(c) < 6));
  if (nightAvgLength > dayAvgLength * 1.5) {
    correlations.push({
      id: 'night-longer-messages',
      description: `Conversations ${Math.round(nightAvgLength / dayAvgLength)}x longer after 10 PM`,
      dimension1: 'time_of_day',
      dimension2: 'message_length',
      strength: nightAvgLength / dayAvgLength / 5, // normalize
      dataPoints: { dayAvg: dayAvgLength, nightAvg: nightAvgLength },
    });
  }

  // Time-of-day × topic
  const dayTopics = topTopics(conversations.filter(c => hour(c) >= 6 && hour(c) < 22));
  const nightTopics = topTopics(conversations.filter(c => hour(c) >= 22 || hour(c) < 6));
  if (dayTopics[0] !== nightTopics[0] && nightTopics.length > 0) {
    correlations.push({
      id: 'day-night-topic-split',
      description: `You ${dayTopics[0]} during the day but ${nightTopics[0]} at night`,
      dimension1: 'time_of_day',
      dimension2: 'topic',
      strength: 0.8,
      dataPoints: { dayTopic: dayTopics[0], nightTopic: nightTopics[0] },
    });
  }

  // Day-of-week × message length
  // ... similar pattern for each DOW

  // Day-of-week × conversation frequency (planning Mondays, creative Fridays)
  // ... similar pattern

  return correlations.sort((a, b) => b.strength - a.strength);
}
```

**SQL queries needed:**

```sql
-- Hour × avg message length
SELECT
  CASE WHEN CAST(strftime('%H', datetime(create_time, 'unixepoch')) AS INT) >= 22
       OR CAST(strftime('%H', datetime(create_time, 'unixepoch')) AS INT) < 6
    THEN 'night' ELSE 'day' END as period,
  AVG(LENGTH(text)) as avg_length,
  COUNT(*) as msg_count
FROM messages WHERE role = 'user'
GROUP BY period;

-- Hour × topic
SELECT
  CASE WHEN CAST(strftime('%H', datetime(c.create_time, 'unixepoch')) AS INT) >= 22
       OR CAST(strftime('%H', datetime(c.create_time, 'unixepoch')) AS INT) < 6
    THEN 'night' ELSE 'day' END as period,
  json_extract(c.topic_tags, '$[0]') as topic,
  COUNT(*) as count
FROM conversations c
GROUP BY period, topic
ORDER BY count DESC;
```

### Category 4: Growth Recognition (Medium-High Wow Factor)

**What it is:** Evidence that the user has grown, learned, or evolved in how they use ChatGPT.

**Example outputs:**
- "Early you asked 8-word questions. By December you were writing 200-word context paragraphs. You learned how to talk to AI."
- "Your conversations used to be mostly questions. Now 40% of your messages include your own analysis before asking. You're thinking out loud, not just asking."
- "You went from 1 topic to 14 over 8 months. Your curiosity is expanding."

**What data is needed:**
- Average message length by month (are they writing more context over time?)
- Question sophistication: early questions vs. recent questions (sample comparison)
- Topic diversity over time (are they exploring more or narrowing?)
- Code block usage trend (are they sharing more code over time?)

**Computation:**

```typescript
interface GrowthSignal {
  id: string;
  type: 'message_sophistication' | 'topic_expansion' | 'code_evolution' | 'usage_growth';
  description: string;
  earlyValue: number;
  recentValue: number;
  changeRatio: number;
  timespan: string;     // "8 months"
}

function detectGrowth(conversations: any[]): GrowthSignal[] {
  const signals: GrowthSignal[] = [];
  const sorted = conversations.sort((a, b) => a.create_time - b.create_time);
  const earlySlice = sorted.slice(0, Math.floor(sorted.length * 0.25));
  const recentSlice = sorted.slice(Math.floor(sorted.length * 0.75));

  // Message length evolution
  const earlyAvgLen = avg(earlySlice.map(c => c.avgMessageLength));
  const recentAvgLen = avg(recentSlice.map(c => c.avgMessageLength));
  if (recentAvgLen > earlyAvgLen * 1.5) {
    signals.push({
      id: 'message-length-growth',
      type: 'message_sophistication',
      description: `Average message grew from ${Math.round(earlyAvgLen)} to ${Math.round(recentAvgLen)} characters`,
      earlyValue: earlyAvgLen,
      recentValue: recentAvgLen,
      changeRatio: recentAvgLen / earlyAvgLen,
      timespan: monthsBetween(earlySlice, recentSlice),
    });
  }

  // Topic diversity expansion
  const earlyTopicCount = uniqueTopics(earlySlice).length;
  const recentTopicCount = uniqueTopics(recentSlice).length;
  if (recentTopicCount > earlyTopicCount * 1.5 && recentTopicCount > 5) {
    signals.push({
      id: 'topic-expansion',
      type: 'topic_expansion',
      description: `Went from ${earlyTopicCount} topics to ${recentTopicCount}`,
      earlyValue: earlyTopicCount,
      recentValue: recentTopicCount,
      changeRatio: recentTopicCount / earlyTopicCount,
      timespan: monthsBetween(earlySlice, recentSlice),
    });
  }

  return signals;
}
```

### Category 5: Life Event / Intent Detection (Medium Wow Factor, Handle with Care)

**What it is:** Detecting that a user was going through something — career change, learning push, creative project, health journey — based on topic clustering in a short time window.

**Example outputs:**
- "23 'interview prep' threads in September, then zero in October. Something happened."
- "You had a creative writing burst in March — 34 conversations in 3 weeks. Deadline or inspiration?"
- "Career-related topics spiked 5x in Q3. Big decisions brewing?"

**What data is needed:**
- Topic velocity: conversations per topic per week (detect spikes)
- Topic drop-off: topics that were active and then stopped (detect resolution)
- Intensity windows: periods with >2x the user's average activity in a single topic

**Important constraints:**
- **Never assume specifics.** Say "Something happened" not "You got the job."
- **Keep it playful.** This should feel like a wink, not a therapy session.
- **Only surface strong signals.** A 2x spike is noise. A 5x spike in a 3-week window is a signal.

**Computation:**

```typescript
interface LifeEventSignal {
  topic: string;
  peakWeeks: string;            // "Sep 1–21, 2024"
  peakCount: number;            // 23 conversations
  baselineCount: number;        // 3 conversations/month normally
  spikeMultiplier: number;      // 7.6x
  resolvedAfter: boolean;       // true if activity dropped to zero after
  suggestedNarrative: string;   // "23 interview prep threads in September, then silence"
}

function detectLifeEvents(conversations: any[]): LifeEventSignal[] {
  // Group by topic × week
  // For each topic, compute weekly baseline
  // Flag windows where weekly count > 3x baseline
  // Check if topic activity dropped after the spike (resolved)
  // Return top 3 strongest signals
}
```

---

## 4. New Data Architecture

### Current vs. Required Analysis

| Capability | Current | Required | Gap |
|-----------|---------|----------|-----|
| **Aggregate stats** | Total conversations, messages, night-owl score, etc. | Same | None — keep |
| **Topic classification** | 50 categories, overall top topics | Topics by month/quarter, topic transitions | Need temporal bucketing |
| **Behavioral correlation** | None | Hour × topic, DOW × message length, time × behavior | New computation layer |
| **User benchmarks** | None | Percentile rankings across all metrics | New benchmark table + data pipeline |
| **Growth detection** | None | Early vs. recent message sophistication, topic expansion | New analysis comparing time slices |
| **Life event detection** | None | Topic velocity spikes, drop-offs | New spike detection algorithm |
| **Semantic probes** | 8 themes | 15–20 themes | Expand existing array |
| **Keyword context** | None per-topic | Top keywords per topic | 1 SQL query |

### New Data Signals to Compute

**Tier 1 — Low effort, high impact (already computed or trivial):**

| Signal | Source | Cost |
|--------|--------|------|
| Longest streak + dates | `computeStreaks()` — already exists | Pass-through |
| Busiest single day | Heatmap endpoint — already exists | Pass-through |
| Code block ratio | Stats endpoint — already exists | Pass-through |
| First conversation date | Stats endpoint — already exists | Pass-through |
| Topic diversity score | Count topics with >5 convos | Trivial |
| Top keywords per topic | topWords filtered by topic | 1 SQL query |
| Average message length | AVG(LENGTH(text)) | 1 SQL query |

**Tier 2 — Medium effort, high impact (new analysis):**

| Signal | What It Enables | Cost |
|--------|----------------|------|
| Topics by month | Trajectory insights, topic arcs | 1 SQL query, group by month |
| Hour × topic cross-tab | "You code by day, write by night" | 1 SQL query |
| Hour × message length | "Conversations 3x longer after 11pm" | 1 SQL query |
| DOW × behavior patterns | "Monday is your planning day" | 1 SQL query |
| Early vs. recent message length | "You learned to give context" | Compare first/last 25% |
| Early vs. recent topic diversity | "Your curiosity expanded" | Compare first/last 25% |

**Tier 3 — Higher effort, highest impact (new infrastructure):**

| Signal | What It Enables | Cost |
|--------|----------------|------|
| Benchmark percentiles | "Top 2% for depth" | Aggregate table + update pipeline |
| Topic velocity by week | Life event detection | 1 SQL query + spike detection |
| Topic transition matrix | "You went from X to Y" | Month-over-month topic comparison |
| Question sophistication score | "You learned to talk to AI" | Sample early/late questions, compare length + structure |

### Expanded Semantic Probes

Current: 8 probes. Required: 18+.

**Add these:**

| Probe | Embedding Text |
|-------|---------------|
| DevOps & Infrastructure | "CI/CD pipelines, Docker containers, Kubernetes, cloud deployment" |
| Data Science & Analytics | "Data analysis, pandas, statistical modeling, visualization" |
| UI/UX Design | "User interface design, wireframes, accessibility, responsive layout" |
| Finance & Investing | "Stock market, financial planning, budgeting, cryptocurrency" |
| Content Creation | "Blog writing, social media content, YouTube scripts, newsletters" |
| Language Learning | "Learning Spanish, vocabulary practice, grammar correction, translation" |
| Gaming & Game Dev | "Game mechanics, Unity, game design, RPG systems, multiplayer" |
| Health & Fitness | "Workout routines, nutrition planning, mental health, meditation" |
| Marketing & Growth | "SEO strategy, email campaigns, conversion optimization, analytics" |
| Hardware & IoT | "Arduino, Raspberry Pi, sensor data, embedded systems, electronics" |

---

## 5. Comparative Benchmarks — "Top X% of Users"

This is the "You're in the top 0.5% of Taylor Swift listeners" moment. It requires knowing how the current user compares to others. Here's how we get that data.

### Source 1: Aggregate Anonymous Stats from Our Own Users

Every time a user generates their Wrapped, we can (with consent) store anonymous aggregate stats into a shared benchmarks table. **No identifying information — just distributions.**

```typescript
// What we store (anonymous):
interface AnonymousBenchmarkContribution {
  // Distributions only — no user IDs, no content
  totalConversations: number;
  totalMessages: number;
  avgMessagesPerConvo: number;
  nightOwlScore: number;
  longestStreak: number;
  topicDiversity: number;
  marathonConvos: number;
  avgMessageLength: number;
  codeBlockRatio: number;
  activeDays: number;
}

// Stored as percentile distributions:
interface BenchmarkDistributions {
  totalConversations: { p10: number; p25: number; p50: number; p75: number; p90: number; p95: number; p99: number };
  avgMessagesPerConvo: { p10: number; p25: number; p50: number; p75: number; p90: number; p95: number; p99: number };
  // ... same for each metric
  sampleSize: number;
  lastUpdated: string;
}
```

**Privacy model:**
- User opts in at data load time ("Help improve benchmarks for future users")
- We store only the aggregate numbers, never conversation content or user IDs
- Stored in a simple JSON file or lightweight table on the server
- Updated incrementally — new user stats merged into existing distributions

**Cold start:** Until we have 50+ users, use Source 2 as the baseline.

### Source 2: Published ChatGPT Usage Research

Public data points to bootstrap benchmarks before we have enough users:

| Metric | Estimated Average | Source |
|--------|------------------|--------|
| Conversations per active user | ~150/year | OpenAI usage reports, third-party research |
| Messages per conversation | ~4–6 | Industry analysis of ChatGPT usage patterns |
| Active days per month | ~8–12 | Engagement research |
| Topics explored | ~2–4 primary topics | User behavior studies |
| Night usage (10pm–4am) | ~12–18% of activity | Time-of-day usage research |

These are **rough estimates** and should be clearly labeled as such. As our own user base grows, Source 1 gradually replaces these.

### Source 3: Internal Self-Comparison

No external data needed. Compare the user to themselves:

- "Your October was 3x your March"
- "Your average conversation in Q4 was 40% longer than Q1"
- "You asked about 8 topics in H1 but 14 in H2"

This is the safest and often the most powerful — because the user *lived* both time periods and can immediately feel the truth of the comparison.

### How Percentiles Are Computed

```typescript
function computePercentile(value: number, distribution: PercentileDist): number {
  // Binary search through distribution to find where this user falls
  const thresholds = [
    { percentile: 99, value: distribution.p99 },
    { percentile: 95, value: distribution.p95 },
    { percentile: 90, value: distribution.p90 },
    { percentile: 75, value: distribution.p75 },
    { percentile: 50, value: distribution.p50 },
    { percentile: 25, value: distribution.p25 },
    { percentile: 10, value: distribution.p10 },
  ];

  for (const t of thresholds) {
    if (value >= t.value) return t.percentile;
  }
  return 5; // Below p10
}

// Usage:
const depthPercentile = computePercentile(user.avgMessagesPerConvo, benchmarks.avgMessagesPerConvo);
// → 97 (top 3%)

// Narrated:
// "You're in the top 3% for conversation depth. Most users average 5 messages — you average 19."
```

### What Gets a Percentile Slide

Not every metric deserves a "top X%" callout. Only surface percentiles that are:
1. **Extreme** — top 10% or bottom 10% (otherwise it's "you're average" which isn't interesting)
2. **Meaningful** — conversation depth matters more than raw message count
3. **Positive framing** — "top 5% for dedication" not "bottom 5% for brevity"

| Metric | Percentile Slide If... |
|--------|----------------------|
| Conversations per month | Top 10% ("power user") |
| Avg messages per convo | Top 15% ("deep diver") |
| Longest streak | Top 10% ("streak machine") |
| Topic diversity | Top 15% ("renaissance mind") or bottom 10% ("laser focused") |
| Night owl score | Top 15% ("certified night owl") |
| Code block ratio | Top 20% ("code-first thinker") |
| Active days | Top 10% ("never misses a day") |

---

## 6. Implementation Strategy

### Architecture: Deterministic Fact Engine + LLM Narrative Writer

**The core insight:** The analysis (Categories 1–5) must be deterministic. The LLM's only job is to make the facts sound entertaining.

```
[Raw Data] → [Fact Engine] → [Verified Facts] → [LLM Narrative Writer] → [Validated Output]
                                     ↓
                              (Also used as fallback
                               if LLM fails)
```

**Layer 1 — Fact Engine (deterministic, no LLM)**

Computes all five insight categories from raw data:
- Temporal profiles (trajectories, topic arcs)
- Behavioral correlations (time × topic, DOW × length)
- Benchmark percentiles (vs. other users)
- Growth signals (early vs. recent behavior)
- Life event signals (topic velocity spikes)

Output: A structured array of `InsightFact` objects with exact numbers, verified data points, and pre-computed narratives.

```typescript
interface InsightFact {
  id: string;
  category: 'trajectory' | 'benchmark' | 'correlation' | 'growth' | 'life_event';
  wowScore: number;           // 1-10, how likely to make user screenshot
  rawNarrative: string;       // Machine-generated factual statement
  dataPoints: Record<string, number | string>;
}

// Example output:
[
  {
    id: 'trajectory-react-learning',
    category: 'trajectory',
    wowScore: 9,
    rawNarrative: 'Topic shifted from "react-basics" (Jan-Mar, 45 convos) to "react-advanced" (Apr-Jun, 67 convos) to "nextjs-deployment" (Jul-Sep, 34 convos). 8-month full-stack learning arc.',
    dataPoints: { earlyTopic: 'react-basics', earlyCount: 45, midTopic: 'react-advanced', midCount: 67, lateTopic: 'nextjs-deployment', lateCount: 34, monthsSpan: 8 },
  },
  {
    id: 'benchmark-depth-top2',
    category: 'benchmark',
    wowScore: 8,
    rawNarrative: 'Average 19 messages per conversation. 97th percentile — top 3% of all users. Average user: 5 messages.',
    dataPoints: { userAvg: 19, populationAvg: 5, percentile: 97 },
  },
  {
    id: 'correlation-night-length',
    category: 'correlation',
    wowScore: 7,
    rawNarrative: 'Messages after 10pm average 312 characters vs 104 during the day. 3x longer at night.',
    dataPoints: { nightAvg: 312, dayAvg: 104, ratio: 3 },
  },
]
```

**Layer 2 — LLM Narrative Writer**

Takes the top-scoring facts and rewrites them into entertaining, Wrapped-style copy. The LLM is **not allowed to invent facts or numbers** — only rephrase what the fact engine produced.

```typescript
const narrativePrompt = `You are a writer for a "Spotify Wrapped" style experience about ChatGPT usage.

Below are VERIFIED FACTS about a user, ranked by how surprising/interesting they are.
Your job:
1. Pick the best facts for each output field (hook, fun facts, compliment, etc.)
2. Rewrite each fact as fun, punchy, shareable copy — the tone is "a friend who really sees you"
3. DO NOT invent new facts or numbers — every number must come from the facts below
4. DO NOT change any numbers — they are verified
5. Prioritize facts with higher wow scores
6. For the hook, ALWAYS prefer behavioral patterns or trajectories over raw benchmarks
7. For "top X%" facts, always include the comparison ("most people stop at X — you stay for Y")
8. For trajectory facts, tell the story as a narrative arc with a beginning and end
9. For correlation facts, frame them as "X, but Y" surprises — patterns the user never noticed
10. The compliment must feel earned — reference specific growth or dedication from the data
11. The "year in one line" should read like the closing sentence of an essay about this person

VERIFIED FACTS (sorted by wow score):
${facts.map(f => `[${f.id}] (wow: ${f.wowScore}) ${f.rawNarrative}`).join('\n')}

OUTPUT: JSON with fields...`;
```

**Layer 3 — Validation + Recovery**

Same multi-tier recovery pipeline from Section 7, plus content quality validation:
- Numbers in output must match numbers in input facts
- Banned phrases rejected
- Citations required per field
- Format recovery (Tier 2 AI reformat → Tier 3 slide removal) for malformed JSON

**Layer 4 — Template Fallback (no LLM needed)**

If the LLM is unavailable or fails, the fact engine's `rawNarrative` strings are used directly. They're factual and specific — not as entertaining as LLM copy but infinitely better than "The Curious Mind."

For the client-side path (Path A), the fact engine runs entirely in the browser with no server dependency. Templates with `${placeholder}` substitution provide the narrative layer without any LLM.

### Output Schema

```typescript
interface WrappedInsightsV3 {
  hook: {
    statement: string;      // Single compelling opening line — a behavioral pattern, not a stat
    factId: string;         // Which InsightFact this was drawn from
    category: string;       // Which insight category it belongs to (prefer trajectory/correlation)
  };
  yearAtAGlance: {
    totalConversations: number;
    totalMessages: number;
    timespan: string;       // "January – December 2025"
    activeDays: number;
    totalDays: number;      // Days since first conversation
    firstConversation: string; // Date of first conversation
    narrative: string;      // "312 days. 1,427 conversations. You made it part of how you think."
  };
  // personality field REMOVED — the hook slide replaces its role as the identity moment
  // roast field REMOVED — fun facts handles humor better through specificity
  trajectory: {
    arc: string;            // "React basics → advanced → deployment"
    narrative: string;      // "You speedran a full-stack career in 8 months"
    timespan: string;       // "January – September 2024"
  } | null;                 // null if insufficient temporal data (show placeholder)
  correlations: Array<{
    description: string;    // "3x longer conversations after 10pm"
    narrative: string;      // "You code during the day and think out loud at night"
  }>;
  lifeEvent: {
    topic: string;          // "interview-prep"
    narrative: string;      // "23 threads in September, then silence"
  } | null;                 // null if no signals detected (show placeholder)
  growth: {
    signal: string;         // "message_sophistication"
    narrative: string;      // "You learned how to talk to AI"
  } | null;                 // null if insufficient data (show placeholder)
  benchmarks: Array<{
    metric: string;         // "conversation_depth"
    percentile: number;     // 97
    userValue: number;      // 19
    avgValue: number;       // 5
    label: string;          // "Top 3% for conversation depth"
    narrative: string;      // "Most people ask and leave. You stay for 19 messages."
  }>;
  peakMoment: {
    date: string;           // "October 15"
    count: number;          // 23
    narrative: string;      // "23 conversations in one day. Every one about the same thing."
  };
  topTopics: string[];      // Top 3-5 topics, ordered
  funFacts: string[];       // 2-3 quirky, specific, data-grounded fun facts
  compliment: string;       // Single genuine compliment — earned, specific, with real numbers
  yearOneLine: string;      // One sentence capturing who they were this year

  // Metadata
  _factCount: number;       // How many facts the engine produced
  _topWowScore: number;     // Highest wow score in the fact set
  _placeholderSlides?: string[]; // Slides showing placeholder state due to insufficient data
  _benchmarkSource: 'aggregate' | 'published' | 'self_comparison';
}
```

---

## 7. Multi-Tier JSON Recovery

This applies to **all** server-path LLM calls. Triggers **only on format errors** (malformed JSON), not content quality.

| Tier | Trigger | Action | Success Rate |
|------|---------|--------|-------------|
| **Tier 1** | Always | `JSON.parse(llmResponse)` | ~90% |
| **Tier 2 — AI Reformat** | `catch(parseError)` | Send malformed response to second LLM (gpt-4o-mini, temp 0.1) to extract valid JSON | ~99% of Tier 1 failures |
| **Tier 3 — Screen Removal** | Tier 2 returns null | Validate each field individually. Remove slides with invalid format. User sees fewer slides but never generic filler. | Always succeeds |

**Separate from quality validation.** Quality checks (banned phrases, missing numbers, vague content) run on successfully parsed JSON and trigger retries with stricter temperature. Format recovery runs only when parsing fails.

**The hardcoded fallback block ("The Curious Mind", etc.) is deleted entirely.** No code path should ever serve it.

```typescript
async function recoverMalformedJSON(rawResponse: string, expectedSchema: string): Promise<any | null> {
  if (!rawResponse || rawResponse.length === 0) return null;
  try {
    const reformatResponse = await chat(
      'You are a JSON repair tool. Extract the data from the malformed response and return ONLY valid JSON. Do not invent data.',
      `EXPECTED FIELDS: ${expectedSchema}\n\nMALFORMED RESPONSE:\n${rawResponse.slice(-8000)}`,
      { model: 'gpt-4o-mini', maxTokens: 1200, temperature: 0.1 }
    );
    return JSON.parse(reformatResponse.match(/\{[\s\S]*\}/)?.[0] || '');
  } catch {
    return null;
  }
}

function removeFieldsWithInvalidFormat(insights: any): any {
  const expectedFields: Record<string, 'object' | 'string' | 'array'> = {
    hook: 'object', yearAtAGlance: 'object', trajectory: 'object', benchmarks: 'array',
    correlations: 'array', funFacts: 'array', compliment: 'string', yearOneLine: 'string',
  };
  const cleaned: any = {};
  const removed: string[] = [];
  for (const [field, type] of Object.entries(expectedFields)) {
    const v = insights[field];
    const valid = type === 'object' ? (v && typeof v === 'object' && !Array.isArray(v))
                : type === 'array' ? (Array.isArray(v) && v.length > 0)
                : (typeof v === 'string' && v.trim().length > 0);
    if (valid) cleaned[field] = v;
    else removed.push(field);
  }
  if (removed.length > 0) cleaned._placeholderSlides = removed;
  return cleaned;
}
```

---

## 8. Task Breakdown

| # | Task | Dependencies | Effort | Impact |
|---|------|-------------|--------|--------|
| 1 | **Temporal analysis engine** — Topics by month, topic transitions, usage trend curve. New `computeTemporalProfile()` function. | None | 1 day | Enables trajectory insights (Category 1) |
| 2 | **Behavioral correlation detector** — Hour × topic, DOW × message length, time × behavior cross-tabs. New `detectCorrelations()` function. | None | 1 day | Enables correlation insights (Category 3) |
| 3 | **Growth signal detector** — Early vs. recent message length, topic diversity expansion, question sophistication. New `detectGrowth()` function. | None | 0.5 day | Enables growth insights (Category 4) |
| 4 | **Life event detector** — Topic velocity by week, spike detection, drop-off detection. New `detectLifeEvents()` function. | Task 1 (temporal data) | 0.5 day | Enables life event insights (Category 5) |
| 5 | **Benchmark data pipeline** — Anonymous aggregate stats collection (opt-in), percentile distribution storage, published research fallback values. New `benchmarks` table/file. | None | 1 day | Enables "top X%" insights (Category 2) |
| 6 | **Fact engine** — Orchestrates all detectors, computes wow scores, produces ranked `InsightFact[]` array. New `src/lib/insight-facts.ts`. | Tasks 1–5 | 1 day | Core engine that powers everything |
| 7 | **LLM narrative prompt** — New system prompt that takes verified facts and writes Wrapped-style copy. Schema v3 with benchmarks, trajectory, correlations. Banned phrase list. | Task 6 | 0.5 day | Server-path quality |
| 8 | **Template fallback engine** — Client-side templates with `${placeholder}` substitution for Path A. Uses fact engine output. Universal fallbacks for thin data. | Task 6 | 1 day | Client-path fix + server fallback |
| 9 | **Multi-tier JSON recovery** — `recoverMalformedJSON()`, `removeFieldsWithInvalidFormat()`, wire `_placeholderSlides` into UI, delete hardcoded fallback block. | None | 0.5 day | Parse failure resilience |
| 10 | **Expand semantic probes** — From 8 to 18+ themes. | None | 0.5 day | Better theme coverage |
| 11 | **Wire into existing endpoints** — Replace `generateDataInsights()` with fact engine (client), update `/api/wrapped/insights` with new prompt + schema (server). Feature flags. | Tasks 6–9 | 1 day | Integration |
| 12 | **New slide types + visual design** — 16-slide poster-style layout. Full-bleed color palettes, bold typography, mobile-first portrait, dark mode, animated reveals. Slide types: year-at-a-glance, usage curve, heatmap, trajectory timeline, behavioral split, life event, growth, top topics, peak moment, benchmark bar, fun facts, compliment, year-in-one-line, share card. | Task 11 | 2–3 days | Presentation layer |

**Total estimated effort: 10–13 days**

### Parallel execution plan

```
Week 1 (foundation):
  [Task 1: Temporal]  [Task 2: Correlations]  [Task 5: Benchmarks]  [Task 9: Recovery]  [Task 10: Probes]
  [Task 3: Growth]    [Task 4: Life events]

Week 2 (assembly):
  [Task 6: Fact engine]  →  [Task 7: LLM prompt]  →  [Task 11: Wire in]
                         →  [Task 8: Templates]   →
                                                      [Task 12: New slides]
```

---

## 9. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| Not enough users for meaningful benchmarks | High — "top X%" loses credibility | High initially | Bootstrap with published research + self-comparison ("your October was 3x your March"). Phase in real benchmarks as user base grows. Be transparent: "Based on estimated ChatGPT averages." |
| Temporal analysis thin for new users (<3 months of data) | Medium — trajectory and growth insights show placeholder state | Medium | Display placeholder screens explaining data is insufficient (use `_placeholderSlides`). Focus on benchmarks and correlations which work with any amount of data. Hook slide still renders using the best available fact. |
| Life event detection feels invasive ("Did you get the job?") | High — creepy not cool | Low | Never assume specifics. Use playful framing: "Something happened" not "You got the job." Only surface 5x+ spikes. Let users opt out of this category. |
| Behavioral correlations are weak/noisy for users with few conversations | Medium | Medium | Require minimum sample sizes (e.g., >20 night conversations to report night patterns). Only surface correlations with strength > 0.7. |
| LLM ignores verified facts, invents numbers | High | Low | Post-generation validation: every number in output must appear in input facts. Reject and retry once. Fall back to raw fact narratives. |
| LLM returns malformed JSON | High | Medium (~10% at temp 0.9) | Multi-tier recovery: AI reformat → per-field validation → slide removal. User never sees generic content. |
| Fact engine produces too few interesting facts for a user | Medium | Low | Universal fallback facts (conversation count, first date, active days) guarantee minimum content. Template engine provides deterministic baseline. |
| Benchmark percentiles feel wrong ("I'm not really top 2%") | Medium | Medium | Show the raw numbers alongside the percentile: "You average 19 messages — most users average 5." Let the user evaluate for themselves. |
| Scope creep — 12 tasks is a lot | High | Medium | Ship in waves. Wave 1: Tasks 1–4, 6, 8, 9 (core engine + templates). Wave 2: Tasks 5, 7, 10–12 (benchmarks + LLM + slides). Wave 1 alone is already a massive upgrade. |

---

## 10. Open Questions

1. **Benchmark opt-in UX.** How do we ask users to contribute anonymous stats? Modal at load time? Checkbox in settings? Default opt-in with opt-out?
2. **Published ChatGPT stats accuracy.** OpenAI doesn't publish detailed per-user averages. How much can we trust third-party estimates? Should we label benchmark comparisons as "estimated" until we have 100+ real users?
3. **Minimum data thresholds.** How many conversations/months of data does a user need before trajectory and growth insights are meaningful? 3 months? 6 months? 50 conversations?
4. **Slide count.** Current presentation has 11 slides. Adding benchmark, trajectory, correlation, and growth slides could push to 15+. Is that too many? Should we cap at 12 and only show the highest-wow slides?
5. **Client path LLM routing.** Should file-upload users (Path A) ever route through the server for LLM narrative writing? This would give them better copy but requires sending their data to the server. Privacy tradeoff.
6. **Life event sensitivity.** Some topics are sensitive (health, relationships, legal). Should life event detection skip certain topic categories entirely?
7. **Benchmark staleness.** If we aggregate user stats, how often should percentile distributions be recomputed? Every new user? Daily? Weekly?
8. **Template vs. LLM quality gap.** If the fact engine + templates produce B+ output and the LLM produces A output, is the complexity of the LLM path worth maintaining long-term? Or should we invest more in template quality and drop the LLM dependency?
