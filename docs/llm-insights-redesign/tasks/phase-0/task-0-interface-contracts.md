# Task 0: Interface Contracts

> **Phase:** 0 — Foundation  
> **Task ID:** 0  
> **Estimated Effort:** 0.5 day  
> **Status:** Not Started

---

## Context Summary

You are working on **ChatGPT Wrapped** — a "Spotify Wrapped"-style experience that analyzes a user's ChatGPT data export and presents personalized insights as a swipeable, poster-style 16-slide deck. The system has three layers: a **deterministic Fact Engine** that computes insights from raw data, a **Narrative Layer** (LLM or templates) that rewrites facts into punchy copy, and a **Presentation Layer** that renders 16 mobile-first, poster-style slides.

This task is the **first thing that happens** — before any implementation code is written. You are defining every TypeScript interface that the system depends on. These contracts are what allow 5+ parallel agents to write code simultaneously without breaking at integration.

---

## Goal

Produce a single TypeScript file (`src/lib/types/insights.ts`) containing every interface contract that the system uses. This file is the shared language between all phases. Every downstream agent will import from it.

---

## Interface Contracts

You are **defining** these, not consuming them. Below is the complete specification. Your job is to produce a clean, well-commented TypeScript file containing all of them.

### Contract 1: Raw Conversation Input Shape

The shape of data that all Phase 1 detectors receive. This already exists in the codebase in some form but needs to be formalized.

```typescript
/**
 * A single conversation from the user's ChatGPT export.
 * This is the universal input to all Phase 1 detectors.
 */
interface ConversationRecord {
  id: string;
  create_time: number;          // Unix timestamp
  title: string;
  topic_tags: string[];         // Classified topics (from existing topic classification)
  message_count: number;
  messages: MessageRecord[];
}

/**
 * A single message within a conversation.
 */
interface MessageRecord {
  role: 'user' | 'assistant' | 'system';
  text: string;
  create_time: number;          // Unix timestamp
  has_code_block: boolean;
}
```

### Contract 2: Detector Output Shapes

Each Phase 1 detector produces a specific output shape. The Fact Engine (Phase 2) consumes all of them.

```typescript
/**
 * Output of the Temporal Analysis Detector (Phase 1A).
 * Captures how topics and usage changed over time.
 */
interface TemporalProfile {
  monthlyTopics: Array<{
    month: string;              // "2024-01"
    topTopics: string[];        // ["python", "data-science"]
    conversationCount: number;
    avgMessageLength: number;
  }>;
  topicArcs: Array<{
    from: string;               // "python-basics"
    to: string;                 // "machine-learning"
    transitionMonth: string;    // "2024-07"
    monthsSpan: number;         // 4
  }>;
  usageTrend: {
    firstMonth: { count: number; month: string };
    peakMonth: { count: number; month: string };
    recentMonth: { count: number; month: string };
    growthMultiplier: number;   // peak / first
  };
}

/**
 * Output of the Behavioral Correlation Detector (Phase 1B).
 * Captures non-obvious connections between behaviors.
 */
interface BehavioralCorrelation {
  id: string;
  description: string;          // "Conversations 3x longer after 11pm"
  dimension1: string;           // "time_of_day"
  dimension2: string;           // "message_length"
  strength: number;             // 0-1, how strong the correlation is
  dataPoints: Record<string, number | string>;
}

/**
 * Output of the Growth Signal Detector (Phase 1C).
 * Captures evidence of user evolution over time.
 */
interface GrowthSignal {
  id: string;
  type: 'message_sophistication' | 'topic_expansion' | 'code_evolution' | 'usage_growth';
  description: string;
  earlyValue: number;
  recentValue: number;
  changeRatio: number;
  timespan: string;             // "8 months"
}

/**
 * Output of the Life Event Detector (Phase 1D).
 * Captures topic velocity spikes suggesting real-world events.
 */
interface LifeEventSignal {
  topic: string;
  peakWeeks: string;            // "Sep 1–21, 2024"
  peakCount: number;            // 23 conversations
  baselineCount: number;        // 3 conversations/month normally
  spikeMultiplier: number;      // 7.6x
  resolvedAfter: boolean;       // true if activity dropped to zero after
  suggestedNarrative: string;   // "23 interview prep threads in September, then silence"
}

/**
 * Output of the Benchmark Computation (Phase 1E).
 * How the user compares to other ChatGPT users.
 */
interface BenchmarkResult {
  metric: string;               // "conversation_depth", "longest_streak", etc.
  userValue: number;
  percentile: number;           // 0-100
  populationAvg: number;
  source: 'aggregate' | 'published' | 'self_comparison';
}
```

### Contract 3: Benchmark Distribution Shape

Used by the Benchmark Computation detector (Phase 1E) to compute percentiles.

```typescript
/**
 * Stored percentile distributions for a single metric.
 * Used to compute where a user falls relative to the population.
 */
interface PercentileDistribution {
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
}

/**
 * The complete benchmark dataset.
 * Stored as a JSON file or lightweight table on the server.
 */
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
  lastUpdated: string;          // ISO date
}

/**
 * Anonymous data contributed by opt-in users.
 * No user IDs, no content — just distributions.
 */
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

### Contract 4: InsightFact (Fact Engine Output)

The universal currency between the Fact Engine (Phase 2) and the Narrative Layer (Phase 3).

```typescript
/**
 * A single verified insight produced by the Fact Engine.
 * This is the core data structure of the entire system.
 * The Narrative Layer rewrites these into polished copy.
 * The rawNarrative serves as the template fallback if the LLM is unavailable.
 */
interface InsightFact {
  id: string;
  category: 'trajectory' | 'benchmark' | 'correlation' | 'growth' | 'life_event';
  wowScore: number;             // 1-10
  rawNarrative: string;         // Factual statement, usable as template fallback
  dataPoints: Record<string, number | string>;
}
```

### Contract 5: WrappedInsightsV3 (Final Output Schema)

The schema that the Narrative Layer (Phase 3) produces and the Presentation Layer (Phase 4) consumes.

```typescript
/**
 * The final output of the insight generation pipeline.
 * Maps 1:1 to the 16-slide Wrapped experience.
 */
interface WrappedInsightsV3 {
  hook: {
    statement: string;          // Single compelling opening line — a behavioral pattern
    factId: string;             // Which InsightFact this was drawn from
    category: string;           // Which insight category (prefer trajectory/correlation)
  };
  yearAtAGlance: {
    totalConversations: number;
    totalMessages: number;
    timespan: string;           // "January – December 2025"
    activeDays: number;
    totalDays: number;          // Days since first conversation
    firstConversation: string;  // Date of first conversation
    narrative: string;          // "312 days. 1,427 conversations. You made it part of how you think."
  };
  trajectory: {
    arc: string;                // "React basics → advanced → deployment"
    narrative: string;          // "You speedran a full-stack career in 8 months"
    timespan: string;           // "January – September 2024"
  } | null;                     // null if insufficient temporal data (show placeholder)
  correlations: Array<{
    description: string;        // "3x longer conversations after 10pm"
    narrative: string;          // "You code during the day and think out loud at night"
  }>;
  lifeEvent: {
    topic: string;              // "interview-prep"
    narrative: string;          // "23 threads in September, then silence"
  } | null;                     // null if no signals detected (show placeholder)
  growth: {
    signal: string;             // "message_sophistication"
    narrative: string;          // "You learned how to talk to AI"
  } | null;                     // null if insufficient data (show placeholder)
  benchmarks: Array<{
    metric: string;             // "conversation_depth"
    percentile: number;         // 97
    userValue: number;          // 19
    avgValue: number;           // 5
    label: string;              // "Top 3% for conversation depth"
    narrative: string;          // "Most people ask and leave. You stay for 19 messages."
  }>;
  peakMoment: {
    date: string;               // "October 15"
    count: number;              // 23
    narrative: string;          // "23 conversations in one day. Every one about the same thing."
  };
  topTopics: string[];          // Top 3-5 topics, ordered
  funFacts: string[];           // 2-3 quirky, specific, data-grounded fun facts
  compliment: string;           // Single genuine compliment — earned, specific, with real numbers
  yearOneLine: string;          // One sentence capturing who they were this year

  // Metadata
  _factCount: number;           // How many facts the engine produced
  _topWowScore: number;         // Highest wow score in the fact set
  _placeholderSlides?: string[];// Slides showing placeholder state due to insufficient data
  _benchmarkSource: 'aggregate' | 'published' | 'self_comparison';
}
```

---

## Detailed Requirements

1. **All interfaces must be exported.** Every downstream module imports from this file.
2. **Add JSDoc comments** to every interface and every non-obvious field. Agents reading this file need to understand intent, not just shape.
3. **Use strict types, not `any`.** The `dataPoints` field on `InsightFact` uses `Record<string, number | string>` — that's the loosest type allowed. Everything else should be precise.
4. **No implementation code.** This file is types only — no functions, no constants, no logic.
5. **Include the `PercentileDistribution` and `BenchmarkDistributions` interfaces.** These are consumed by the Benchmark Computation detector (Phase 1E) and need to be part of the shared contract.
6. **Include the `AnonymousBenchmarkContribution` interface.** This defines what opt-in users contribute to the benchmark pool.
7. **Export a `DetectorOutputs` convenience type** that bundles all Phase 1 detector outputs:

```typescript
/**
 * Convenience type bundling all Phase 1 detector outputs.
 * This is what the Fact Engine (Phase 2) receives as input.
 */
interface DetectorOutputs {
  temporal: TemporalProfile;
  correlations: BehavioralCorrelation[];
  growth: GrowthSignal[];
  lifeEvents: LifeEventSignal[];
  benchmarks: BenchmarkResult[];
}
```

---

## File Ownership

| File | Action |
|------|--------|
| `src/lib/types/insights.ts` | **CREATE** — This is the only file this task produces. |

**Do NOT** edit any other files. This task is purely about defining types. No implementation, no tests, no wiring.

---

## Edge Cases & Constraints

- **Nullable fields in `WrappedInsightsV3`:** `trajectory`, `lifeEvent`, and `growth` are `| null` because they require sufficient data. The type must reflect this.
- **`_placeholderSlides`:** This is optional (`?`) because it only appears when some slides lack data.
- **`dataPoints` on `InsightFact`:** Keep as `Record<string, number | string>`. Each detector puts different keys in here and the Fact Engine needs flexibility.
- **`BenchmarkDistributions` must support all 14 metrics** listed in the requirements (total conversations, total messages, messages per conversation, average message length, longest streak, active days, topic diversity, night-owl score, code block ratio, conversations per month, time-of-day distribution, day-of-week distribution, first conversation date, busiest single day). Some of these (time-of-day, DOW, first date) are not distribution-based — decide how to handle them in the type (they may be separate fields or excluded from percentile computation).

---

## Acceptance Criteria

- [ ] A single file `src/lib/types/insights.ts` exists
- [ ] All 8 interfaces are exported: `ConversationRecord`, `MessageRecord`, `TemporalProfile`, `BehavioralCorrelation`, `GrowthSignal`, `LifeEventSignal`, `BenchmarkResult`, `InsightFact`, `WrappedInsightsV3`, `PercentileDistribution`, `BenchmarkDistributions`, `AnonymousBenchmarkContribution`, `DetectorOutputs`
- [ ] Every interface has JSDoc comments
- [ ] No `any` types anywhere
- [ ] No implementation code — types only
- [ ] TypeScript compiles without errors
- [ ] The file can be imported by downstream tasks without modifications

---

## Dependencies

| Direction | Task | Relationship |
|-----------|------|-------------|
| **Blocks** | All Phase 1 tasks (1A–1F) | Detectors need the input/output shapes |
| **Blocks** | Phase 2 (Fact Engine) | Needs `InsightFact` and `DetectorOutputs` |
| **Blocks** | Phase 3 (Narrative Layer) | Needs `WrappedInsightsV3` |
| **Blocks** | Phase 4 (Presentation) | Needs `WrappedInsightsV3` for slide data mapping |
| **No dependencies** | This task has no upstream dependencies | It runs first |
