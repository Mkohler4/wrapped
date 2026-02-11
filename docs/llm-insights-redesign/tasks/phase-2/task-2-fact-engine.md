# Task 2: Fact Engine

> **Phase:** 2 — Core Engine  
> **Task ID:** 2  
> **Estimated Effort:** 1 day  
> **Status:** Not Started

---

## Context Summary

You are working on **ChatGPT Wrapped** — a "Spotify Wrapped"-style experience that analyzes a user's ChatGPT data export and presents personalized insights as a 16-slide poster-style deck. The system has three layers: a **deterministic Fact Engine** (this task), a **Narrative Layer** that rewrites facts into punchy copy, and a **Presentation Layer** that renders slides.

The Fact Engine is the **brain of the entire system**. It orchestrates 5 detectors (temporal, correlation, growth, life event, benchmark), scores every insight by "wow factor," and produces a ranked array of `InsightFact` objects. Everything downstream — the LLM narrative writer, the template fallback engine, and the 16 slides — depends on this output. If the Fact Engine produces great facts, the rest of the system produces great slides. If it produces weak facts, nothing can save the output.

---

## Goal

Implement the Fact Engine: a function that takes all Phase 1 detector outputs, scores each insight with a wow score, generates machine-readable narratives for each fact, and returns a ranked `InsightFact[]` array with the hook-preferred fact flagged.

---

## Interface Contracts

### Input (All Phase 1 Detector Outputs)

```typescript
interface DetectorOutputs {
  temporal: TemporalProfile;
  correlations: BehavioralCorrelation[];
  growth: GrowthSignal[];
  lifeEvents: LifeEventSignal[];
  benchmarks: BenchmarkResult[];
}

interface TemporalProfile {
  monthlyTopics: Array<{ month: string; topTopics: string[]; conversationCount: number; avgMessageLength: number }>;
  topicArcs: Array<{ from: string; to: string; transitionMonth: string; monthsSpan: number }>;
  usageTrend: { firstMonth: { count: number; month: string }; peakMonth: { count: number; month: string }; recentMonth: { count: number; month: string }; growthMultiplier: number };
}

interface BehavioralCorrelation {
  id: string;
  description: string;
  dimension1: string;
  dimension2: string;
  strength: number;             // 0-1
  dataPoints: Record<string, number | string>;
}

interface GrowthSignal {
  id: string;
  type: 'message_sophistication' | 'topic_expansion' | 'code_evolution' | 'usage_growth';
  description: string;
  earlyValue: number;
  recentValue: number;
  changeRatio: number;
  timespan: string;
}

interface LifeEventSignal {
  topic: string;
  peakWeeks: string;
  peakCount: number;
  baselineCount: number;
  spikeMultiplier: number;
  resolvedAfter: boolean;
  suggestedNarrative: string;
}

interface BenchmarkResult {
  metric: string;
  userValue: number;
  percentile: number;
  populationAvg: number;
  source: 'aggregate' | 'published' | 'self_comparison';
}
```

### Output

```typescript
interface InsightFact {
  id: string;
  category: 'trajectory' | 'benchmark' | 'correlation' | 'growth' | 'life_event';
  wowScore: number;             // 1-10
  rawNarrative: string;         // Factual statement, usable as template fallback
  dataPoints: Record<string, number | string>;
}
```

---

## Detailed Requirements

### 1. Orchestrate All Detectors

The Fact Engine receives pre-computed detector outputs (it does NOT call the detectors itself — that happens in the integration layer). Its job is to:
1. Convert each detector output into `InsightFact` objects.
2. Score each fact.
3. Rank them.
4. Select the hook.
5. Ensure minimum guaranteed facts exist.

### 2. Convert Detector Outputs to InsightFacts

#### From TemporalProfile → Trajectory Facts

For each `topicArc` in the temporal profile, create an InsightFact:

```typescript
// For each topic arc:
{
  id: `trajectory-${arc.from}-to-${arc.to}`,
  category: 'trajectory',
  wowScore: computeTrajectoryWow(arc),
  rawNarrative: `Topic shifted from "${arc.from}" (${findMonthRange(arc.from)}) to "${arc.to}" (starting ${arc.transitionMonth}). ${arc.monthsSpan}-month arc.`,
  dataPoints: {
    fromTopic: arc.from,
    toTopic: arc.to,
    transitionMonth: arc.transitionMonth,
    monthsSpan: arc.monthsSpan,
  },
}
```

Also create a usage trend fact from the `usageTrend`:

```typescript
{
  id: 'trajectory-usage-growth',
  category: 'trajectory',
  wowScore: computeUsageTrendWow(usageTrend),
  rawNarrative: `Usage went from ${usageTrend.firstMonth.count} conversations in ${usageTrend.firstMonth.month} to a peak of ${usageTrend.peakMonth.count} in ${usageTrend.peakMonth.month}. ${usageTrend.growthMultiplier}x growth.`,
  dataPoints: {
    firstMonthCount: usageTrend.firstMonth.count,
    firstMonth: usageTrend.firstMonth.month,
    peakMonthCount: usageTrend.peakMonth.count,
    peakMonth: usageTrend.peakMonth.month,
    growthMultiplier: usageTrend.growthMultiplier,
  },
}
```

#### From BehavioralCorrelation[] → Correlation Facts

For each correlation, create an InsightFact:

```typescript
{
  id: `correlation-${correlation.id}`,
  category: 'correlation',
  wowScore: computeCorrelationWow(correlation),
  rawNarrative: correlation.description,
  dataPoints: correlation.dataPoints,
}
```

#### From GrowthSignal[] → Growth Facts

```typescript
{
  id: `growth-${signal.id}`,
  category: 'growth',
  wowScore: computeGrowthWow(signal),
  rawNarrative: `${signal.description}. Over ${signal.timespan}. Change ratio: ${signal.changeRatio.toFixed(1)}x.`,
  dataPoints: {
    earlyValue: signal.earlyValue,
    recentValue: signal.recentValue,
    changeRatio: signal.changeRatio,
    timespan: signal.timespan,
    type: signal.type,
  },
}
```

#### From LifeEventSignal[] → Life Event Facts

```typescript
{
  id: `life-event-${signal.topic}`,
  category: 'life_event',
  wowScore: computeLifeEventWow(signal),
  rawNarrative: signal.suggestedNarrative,
  dataPoints: {
    topic: signal.topic,
    peakWeeks: signal.peakWeeks,
    peakCount: signal.peakCount,
    baselineCount: signal.baselineCount,
    spikeMultiplier: signal.spikeMultiplier,
    resolvedAfter: signal.resolvedAfter ? 'yes' : 'no',
  },
}
```

#### From BenchmarkResult[] → Benchmark Facts

Only create facts for metrics where the user is in the **top 10%** (percentile ≥ 90):

```typescript
{
  id: `benchmark-${result.metric}`,
  category: 'benchmark',
  wowScore: computeBenchmarkWow(result),
  rawNarrative: `${metricLabel(result.metric)}: ${result.userValue}. ${ordinalPercentile(result.percentile)} percentile — top ${100 - result.percentile}% of users. Average: ${result.populationAvg}.`,
  dataPoints: {
    metric: result.metric,
    userValue: result.userValue,
    percentile: result.percentile,
    populationAvg: result.populationAvg,
    source: result.source,
  },
}
```

### 3. Wow Score Computation

Each fact gets a score from 1 to 10. The scoring formula considers:

| Factor | Weight | Description |
|--------|--------|-------------|
| **Specificity** | 30% | Has real numbers, dates, topic names? Higher = more specific. |
| **Surprise** | 30% | How far from baseline? A 7x spike scores higher than a 2x. |
| **Emotional resonance** | 25% | Category-based bonus: trajectory (+2), correlation (+1.5), growth (+1), life_event (+1), benchmark (+0.5) |
| **Shareability** | 15% | Would someone screenshot this? Patterns > stats. Extreme values score higher. |

**Scoring guidelines by category:**

| Category | Typical Range | What Pushes Score Up |
|----------|--------------|---------------------|
| Trajectory | 6–10 | Longer arcs (more months), recognizable topic names, clear progression |
| Correlation | 5–9 | Stronger ratios (3x+ night/day), topic splits (code by day, write by night) |
| Growth | 5–8 | Larger change ratios, longer timespans, multiple growth signals |
| Life Event | 5–8 | Higher spike multipliers, resolution detected, recognizable topic |
| Benchmark | 4–8 | Higher percentiles (top 1% > top 10%), meaningful metrics (depth > raw count) |

### 4. Hook Selection Logic

The hook is the opening slide — the single most compelling fact. **The system prefers behavioral patterns and trajectories over benchmarks for the hook.**

**Selection algorithm:**
1. Filter facts to only `trajectory`, `correlation`, `growth`, and `life_event` categories.
2. Sort by `wowScore` descending.
3. If the top behavioral fact has `wowScore >= 6`, use it as the hook.
4. If no behavioral fact scores ≥ 6, fall back to the highest-scoring fact of any category (including benchmarks).

The hook fact should be flagged in the output (e.g., by being the first element in the array, or by adding a boolean field).

### 5. Minimum Guaranteed Facts (Fallback)

Even for users with thin data, the engine must produce **at least 5 facts**. If the detectors don't produce enough, generate fallback facts from basic stats:

| Fallback Fact | Always Available |
|---------------|-----------------|
| Total conversation count | Yes (just `conversations.length`) |
| First conversation date | Yes |
| Total active days | Yes |
| Total messages sent | Yes |
| Most active month | Yes (from temporal profile or raw data) |

These fallback facts get a `wowScore` of 2–3 (low, but non-zero). They use `category: 'benchmark'`.

### 6. Raw Narrative Generation

Every `InsightFact` must have a `rawNarrative` — a plain-English factual statement that can be displayed directly if the LLM is unavailable. This is the **template fallback** path.

**Quality standard:** `rawNarrative` should be factual, specific, and include at least one number. It won't be as punchy as LLM-written copy, but it must be infinitely better than generic filler like "You're a curious mind!"

### 7. Telemetry Metadata

The engine must expose:
- `_factCount`: Total number of facts produced.
- `_topWowScore`: The highest wow score in the set.

These are passed through to the final `WrappedInsightsV3` output.

---

## File Ownership

| File | Action |
|------|--------|
| `src/lib/insight-facts.ts` | **CREATE** — Contains the main `generateInsightFacts()` function, wow score computation, hook selection, fallback fact generation, and all helpers. |

**Do NOT** edit any other files. Do not modify detector files. Import types from the shared types file only.

---

## Edge Cases & Constraints

| Scenario | Expected Behavior |
|----------|-------------------|
| **All detector outputs are empty** | Return minimum guaranteed fallback facts (conversation count, first date, active days, etc.) |
| **Only benchmarks available (no temporal, no correlations)** | Benchmarks become the hook (fallback). Still produce 5+ facts. |
| **100+ facts generated** | Return all of them ranked by wowScore. The narrative layer will pick the top ones. |
| **Multiple trajectory arcs compete for hook** | Pick the one with the highest wowScore. |
| **Wow scores tie** | Break ties by category preference: trajectory > correlation > growth > life_event > benchmark. |
| **A benchmark has percentile 99 but a correlation has wow 7** | Hook goes to the correlation (behavioral patterns preferred). The benchmark fact is still in the array for other slides. |
| **User has 0 conversations** | Should not reach the Fact Engine (handled upstream), but if it does, return empty array with `_factCount: 0`. |

---

## Acceptance Criteria

- [ ] `generateInsightFacts()` function exists and is exported from `src/lib/insight-facts.ts`
- [ ] Function signature: `(outputs: DetectorOutputs, conversations: ConversationRecord[]) => { facts: InsightFact[], hookFactId: string, _factCount: number, _topWowScore: number }`
- [ ] All detector output types are correctly converted to `InsightFact` objects
- [ ] Each fact has a `wowScore` between 1 and 10
- [ ] Facts are sorted by `wowScore` descending
- [ ] Hook selection prefers behavioral patterns/trajectories over benchmarks
- [ ] Hook falls back to benchmark only when no behavioral fact scores ≥ 6
- [ ] Minimum 5 facts produced even for thin data (fallback facts fill the gap)
- [ ] Every `rawNarrative` is factual, specific, and includes at least one number
- [ ] `_factCount` and `_topWowScore` are correctly computed
- [ ] Only benchmark facts with percentile ≥ 90 (top 10%) are created
- [ ] No imports from detector files — only from the shared types file

---

## Dependencies

| Direction | Task | Relationship |
|-----------|------|-------------|
| **Depends on** | Task 0 (Interface Contracts) | Needs all type definitions |
| **Depends on** | Tasks 1A–1E (All Detectors) | Consumes their output shapes. Does NOT call them — receives pre-computed results. |
| **Unblocks** | Task 3A (LLM Narrative Prompt) | Narrative writer takes `InsightFact[]` as input |
| **Unblocks** | Task 3B (Template Fallback Engine) | Templates use `InsightFact[]` and `rawNarrative` strings |
| **Unblocks** | Task 3C (Validation Pipeline) | Validator cross-references output against input facts |
