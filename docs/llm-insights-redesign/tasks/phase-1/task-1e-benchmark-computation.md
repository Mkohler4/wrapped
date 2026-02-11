# Task 1E: Benchmark Computation

> **Phase:** 1 — Data Signals  
> **Task ID:** 1E  
> **Estimated Effort:** 1 day  
> **Status:** Not Started

---

## Context Summary

You are working on **ChatGPT Wrapped** — a "Spotify Wrapped"-style experience that analyzes a user's ChatGPT data export and presents personalized insights as a 16-slide poster-style deck. The system has a **deterministic Fact Engine** that computes insights from raw data, a **Narrative Layer** that rewrites facts into punchy copy, and a **Presentation Layer** that renders the slides.

This task builds the **Benchmark Computation** module — one of 5 parallel detectors in Phase 1. This module answers: **"How does this user compare to other ChatGPT users?"** It produces insights like "You're in the top 2% for conversation depth — most users average 5 messages, you average 19." Benchmarks are the "Top 0.5% of Taylor Swift listeners" moment — high wow factor that creates shareable bragging rights.

---

## Goal

Implement a `computeBenchmarks()` function that takes user metrics and benchmark distributions, and returns `BenchmarkResult[]` with percentile rankings for all supported metrics. Also implement the infrastructure for storing and updating benchmark distributions.

---

## Interface Contracts

### Input

```typescript
interface ConversationRecord {
  id: string;
  create_time: number;          // Unix timestamp
  title: string;
  topic_tags: string[];         // Classified topics
  message_count: number;
  messages: MessageRecord[];
}

interface MessageRecord {
  role: 'user' | 'assistant' | 'system';
  text: string;
  create_time: number;
  has_code_block: boolean;
}

interface PercentileDistribution {
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
}

interface BenchmarkDistributions {
  totalConversations: PercentileDistribution;
  totalMessages: PercentileDistribution;
  avgMessagesPerConvo: PercentileDistribution;
  avgMessageLength: PercentileDistribution;
  longestStreak: PercentileDistribution;
  activeDays: PercentileDistribution;
  topicDiversity: PercentileDistribution;
  nightOwlScore: PercentileDistribution;
  codeBlockRatio: PercentileDistribution;
  conversationsPerMonth: PercentileDistribution;
  busiestSingleDay: PercentileDistribution;
  sampleSize: number;
  lastUpdated: string;
}

interface AnonymousBenchmarkContribution {
  totalConversations: number;
  totalMessages: number;
  avgMessagesPerConvo: number;
  avgMessageLength: number;
  nightOwlScore: number;
  longestStreak: number;
  topicDiversity: number;
  codeBlockRatio: number;
  activeDays: number;
  conversationsPerMonth: number;
  busiestSingleDay: number;
}
```

### Output

```typescript
interface BenchmarkResult {
  metric: string;               // "conversation_depth", "longest_streak", etc.
  userValue: number;
  percentile: number;           // 0-100
  populationAvg: number;        // The p50 or estimated average
  source: 'aggregate' | 'published' | 'self_comparison';
}
```

---

## Detailed Requirements

### 1. Compute User Metrics from Raw Data

From the `ConversationRecord[]`, compute the following 11 metrics (matching the `AnonymousBenchmarkContribution` shape):

| Metric | Computation |
|--------|------------|
| `totalConversations` | `conversations.length` |
| `totalMessages` | Sum of all `message_count` across conversations |
| `avgMessagesPerConvo` | `totalMessages / totalConversations` |
| `avgMessageLength` | Average character length of all user messages (`role === 'user'`) |
| `longestStreak` | Maximum number of consecutive calendar days with at least 1 conversation |
| `activeDays` | Count of distinct calendar days with at least 1 conversation |
| `topicDiversity` | Count of distinct `topic_tags[0]` values across all conversations |
| `nightOwlScore` | Percentage of user messages sent between 10 PM and 4 AM (as a decimal 0-1) |
| `codeBlockRatio` | Percentage of user messages containing a code block (as a decimal 0-1) |
| `conversationsPerMonth` | `totalConversations / activeMonths` (number of distinct months with data) |
| `busiestSingleDay` | Maximum number of conversations in a single calendar day |

#### Longest Streak Computation

```typescript
function computeLongestStreak(conversations: ConversationRecord[]): number {
  // Extract all unique dates (YYYY-MM-DD) from conversation create_times
  const dates = [...new Set(
    conversations.map(c => {
      const d = new Date(c.create_time * 1000);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })
  )].sort();

  if (dates.length === 0) return 0;

  let maxStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  return maxStreak;
}
```

### 2. Percentile Computation

Given a user's value and a `PercentileDistribution`, determine where the user falls.

```typescript
function computePercentile(value: number, distribution: PercentileDistribution): number {
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
```

### 3. Published Research Fallback Values

Until the aggregate user base is large enough (50+ users), use these estimated baselines as `BenchmarkDistributions`:

| Metric | p10 | p25 | p50 | p75 | p90 | p95 | p99 |
|--------|-----|-----|-----|-----|-----|-----|-----|
| totalConversations | 10 | 30 | 80 | 200 | 500 | 800 | 2000 |
| totalMessages | 30 | 100 | 300 | 800 | 2000 | 4000 | 10000 |
| avgMessagesPerConvo | 2 | 3 | 4 | 6 | 10 | 15 | 30 |
| avgMessageLength | 20 | 40 | 80 | 150 | 250 | 400 | 800 |
| longestStreak | 1 | 2 | 4 | 8 | 15 | 25 | 60 |
| activeDays | 3 | 10 | 25 | 60 | 120 | 200 | 330 |
| topicDiversity | 1 | 2 | 3 | 5 | 8 | 12 | 20 |
| nightOwlScore | 0.02 | 0.05 | 0.12 | 0.20 | 0.30 | 0.40 | 0.55 |
| codeBlockRatio | 0.0 | 0.0 | 0.05 | 0.15 | 0.30 | 0.45 | 0.70 |
| conversationsPerMonth | 2 | 5 | 10 | 20 | 40 | 60 | 150 |
| busiestSingleDay | 1 | 2 | 3 | 5 | 10 | 15 | 30 |

**These are rough estimates** based on publicly available ChatGPT usage research and industry analysis. Store them as a default `BenchmarkDistributions` object with `source: 'published'` and `sampleSize: 0` (indicating these are estimates, not observed data).

### 4. Benchmark Source Labeling

Each `BenchmarkResult` must include a `source` field:
- `'aggregate'` — When percentiles are computed from real anonymous user data (sampleSize > 50).
- `'published'` — When using the fallback published research estimates.
- `'self_comparison'` — When comparing the user to themselves (e.g., "Your October was 3x your March"). This is always available as a supplementary comparison.

### 5. Self-Comparison (Always Available)

In addition to population-based percentiles, compute internal self-comparisons:
- Compare the user's most active month to their least active month.
- Compare their most active day-of-week to their least active.
- Compare their early-period metrics to recent-period metrics.

These are returned as additional `BenchmarkResult` entries with `source: 'self_comparison'`.

### 6. Opt-In Contribution Preparation

Create a `prepareContribution()` function that takes `ConversationRecord[]` and returns an `AnonymousBenchmarkContribution` object. This will be used by the integration layer (Phase 5) to submit anonymous stats.

**This function does NOT submit data.** It only prepares the payload. Submission is handled in Phase 5.

---

## File Ownership

| File | Action |
|------|--------|
| `src/lib/detectors/benchmarks.ts` | **CREATE** — Contains `computeBenchmarks()`, `computePercentile()`, `prepareContribution()`, published fallback values, and helper functions. |

**Do NOT** edit any other files. Do not import from other detector files. Code against the interface contracts only.

---

## Edge Cases & Constraints

| Scenario | Expected Behavior |
|----------|-------------------|
| **Empty conversations array** | Return `BenchmarkResult[]` with all metrics at 0 and percentile 5. |
| **Only 1 conversation** | Compute metrics as normal. Many will be trivial (streak=1, activeDays=1) but still valid for benchmarking. |
| **No user messages** | `avgMessageLength` and `nightOwlScore` default to 0. Other conversation-level metrics still computed. |
| **No topic tags** | `topicDiversity` = 0. |
| **All conversations on one day** | `longestStreak` = 1, `activeDays` = 1, `busiestSingleDay` = total count. |
| **`sampleSize` < 50 in distributions** | Use published fallback values. Label source as `'published'`. |
| **User metric exactly equals a percentile threshold** | The user is AT that percentile (use `>=` comparison). |
| **Benchmark distributions JSON file doesn't exist yet** | Fall back to the hardcoded published estimates. |

---

## Acceptance Criteria

- [ ] `computeBenchmarks()` function exists and is exported from `src/lib/detectors/benchmarks.ts`
- [ ] Function signature: `(conversations: ConversationRecord[], distributions: BenchmarkDistributions) => BenchmarkResult[]`
- [ ] Computes all 11 user metrics from raw conversation data
- [ ] `computePercentile()` correctly maps user values to percentile positions
- [ ] Published fallback distributions are provided as defaults
- [ ] Each result includes the correct `source` label (`aggregate`, `published`, or `self_comparison`)
- [ ] Self-comparisons are always included (independent of external benchmark data)
- [ ] `prepareContribution()` function produces a valid `AnonymousBenchmarkContribution`
- [ ] Longest streak computation handles non-consecutive days correctly
- [ ] Night owl score correctly identifies messages in the 10 PM – 4 AM window
- [ ] Empty input returns valid results with zero/default values, not an error
- [ ] No imports from other detector files — only from the shared types file

---

## Dependencies

| Direction | Task | Relationship |
|-----------|------|-------------|
| **Depends on** | Task 0 (Interface Contracts) | Needs all benchmark-related types |
| **Unblocks** | Task 2 (Fact Engine) | Fact Engine consumes `BenchmarkResult[]` to generate benchmark `InsightFact` objects |
| **Unblocks** | Task 5A (Backend Integration) | Integration layer uses `prepareContribution()` for opt-in data collection |
