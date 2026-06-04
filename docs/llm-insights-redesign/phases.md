# LLM Insights Redesign — Phases & Execution Plan

> **Status:** Draft  
> **Date:** February 10, 2026  
> **Parent:** [design-doc.md](./design-doc.md), [requirements.md](./requirements.md), [OUTLINE.md](./OUTLINE.md)  
> **Purpose:** Break the redesign into phased execution with clear parallel workstreams, interface contracts, and review gates.

---

## How This Document Works

This is the **master execution plan**. It defines:
1. **Phases** — What gets built and in what order
2. **Parallel workstreams** — Which tasks within a phase can run simultaneously (separate prompts / agents)
3. **Interface contracts** — The agreed-upon data shapes between phases so parallel work doesn't break at integration
4. **Review gates** — Where we stop, review, and confirm before moving forward
5. **Task references** — Each phase lists the tasks from the design doc's task breakdown (§8) that belong to it

Phases are sequential. Tasks within a phase are parallel wherever possible.

---

## Phase Overview

```
Phase 0: Interface Contracts          ← Lock the shapes. ~0.5 day.
     ↓
Phase 1: Data Signals                 ← 5 parallel detectors. ~2 days.
     ↓
Phase 2: Fact Engine                  ← Single focused task. ~1 day.
     ↓                                   (Phase 4 design system starts here in parallel)
Phase 3: Narrative + Validation       ← 3 parallel workstreams. ~1.5 days.
     ↓
Phase 4: Presentation                 ← Slide implementation. ~2-3 days.
     ↓                                   (Design system work overlaps with Phases 1-3)
Phase 5: Integration + Review         ← Wire, test, ship. ~1-2 days.
```

**Total estimated effort: 8–10 days of work**  
**Total calendar time with parallelism: ~2 weeks**

---

## Phase 0: Interface Contracts

> **Goal:** Lock every data shape before anyone writes implementation code. This is what makes parallel work possible.

**Duration:** 0.5 day  
**Parallelism:** None — this is a single focused task that unblocks everything.  
**Review gate:** All contracts approved before Phase 1 begins.

### What Gets Defined

Every interface contract is a TypeScript type definition that two or more phases depend on. By locking these first, parallel agents can write code against the same shapes without coordination.

#### Contract 1: Raw Conversation Input Shape

The shape of the data that all Phase 1 detectors receive. This already exists in the codebase but needs to be formalized — every detector reads from this.

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
```

#### Contract 2: Detector Output Shapes

Each Phase 1 detector produces a specific output shape. The Fact Engine (Phase 2) consumes all of them.

```typescript
// From: Temporal Analysis Detector
interface TemporalProfile {
  monthlyTopics: Array<{ month: string; topTopics: string[]; conversationCount: number; avgMessageLength: number }>;
  topicArcs: Array<{ from: string; to: string; transitionMonth: string; monthsSpan: number }>;
  usageTrend: { firstMonth: { count: number; month: string }; peakMonth: { count: number; month: string }; recentMonth: { count: number; month: string }; growthMultiplier: number };
}

// From: Behavioral Correlation Detector
interface BehavioralCorrelation {
  id: string;
  description: string;
  dimension1: string;
  dimension2: string;
  strength: number;             // 0-1
  dataPoints: Record<string, number | string>;
}

// From: Growth Signal Detector
interface GrowthSignal {
  id: string;
  type: 'message_sophistication' | 'topic_expansion' | 'code_evolution' | 'usage_growth';
  description: string;
  earlyValue: number;
  recentValue: number;
  changeRatio: number;
  timespan: string;
}

// From: Life Event Detector
interface LifeEventSignal {
  topic: string;
  peakWeeks: string;
  peakCount: number;
  baselineCount: number;
  spikeMultiplier: number;
  resolvedAfter: boolean;
  suggestedNarrative: string;
}

// From: Benchmark Computation
interface BenchmarkResult {
  metric: string;
  userValue: number;
  percentile: number;
  populationAvg: number;
  source: 'aggregate' | 'published' | 'self_comparison';
}
```

#### Contract 3: InsightFact (Fact Engine Output)

The universal currency between the Fact Engine (Phase 2) and the Narrative Layer (Phase 3).

```typescript
interface InsightFact {
  id: string;
  category: 'trajectory' | 'benchmark' | 'correlation' | 'growth' | 'life_event';
  wowScore: number;             // 1-10
  rawNarrative: string;         // Factual statement, usable as template fallback
  dataPoints: Record<string, number | string>;
}
```

#### Contract 4: WrappedInsightsV3 (Final Output Schema)

The schema that the Narrative Layer (Phase 3) produces and the Presentation Layer (Phase 4) consumes. Defined in the design doc §6 — referenced here for completeness.

```typescript
interface WrappedInsightsV3 {
  hook: { statement: string; factId: string; category: string };
  yearAtAGlance: { totalConversations: number; totalMessages: number; timespan: string; activeDays: number; totalDays: number; firstConversation: string; narrative: string };
  trajectory: { arc: string; narrative: string; timespan: string } | null;
  correlations: Array<{ description: string; narrative: string }>;
  lifeEvent: { topic: string; narrative: string } | null;
  growth: { signal: string; narrative: string } | null;
  benchmarks: Array<{ metric: string; percentile: number; userValue: number; avgValue: number; label: string; narrative: string }>;
  peakMoment: { date: string; count: number; narrative: string };
  topTopics: string[];
  funFacts: string[];
  compliment: string;
  yearOneLine: string;
  _factCount: number;
  _topWowScore: number;
  _placeholderSlides?: string[];
  _benchmarkSource: 'aggregate' | 'published' | 'self_comparison';
}
```

### Deliverables

- [ ] A single `src/lib/types/insights.ts` file with all interface contracts
- [ ] Reviewed and approved by the team before Phase 1 begins

---

## Phase 1: Data Signals

> **Goal:** Compute all the raw signals from conversation data. Each detector is independent — this is where we get the most parallelism.

**Duration:** ~2 days  
**Parallelism:** 5 workstreams running simultaneously  
**Depends on:** Phase 0 (interface contracts locked)  
**Review gate:** All 5 detectors produce correct output for test datasets before Phase 2 begins.

### Workstreams (All Parallel)

#### 1A: Temporal Analysis Detector
**Design doc tasks:** Task 1  
**Produces:** `TemporalProfile`  
**Agent scope:**
- `computeTemporalProfile()` function
- Topics bucketed by month/quarter
- Topic transition matrix (what topic followed what over time)
- Monthly conversation count and message count trends
- Usage trend curve (first month, peak month, recent month, growth multiplier)
- SQL queries: topics by month, keyword evolution (first 3 months vs. last 3 months)

**Input:** `ConversationRecord[]`  
**Output:** `TemporalProfile`

---

#### 1B: Behavioral Correlation Detector
**Design doc tasks:** Task 2  
**Produces:** `BehavioralCorrelation[]`  
**Agent scope:**
- `detectCorrelations()` function
- Hour-of-day × message length (night owl detection)
- Hour-of-day × topic (day/night behavioral split)
- Day-of-week × message length (mid-week fatigue, Monday planning)
- Day-of-week × conversation frequency
- Minimum sample thresholds to avoid noisy claims (e.g., >20 night conversations)
- Correlation strength scoring for ranking
- SQL queries: hour × avg message length, hour × topic, DOW × behavior

**Input:** `ConversationRecord[]`  
**Output:** `BehavioralCorrelation[]` (sorted by strength, descending)

---

#### 1C: Growth Signal Detector
**Design doc tasks:** Task 3  
**Produces:** `GrowthSignal[]`  
**Agent scope:**
- `detectGrowth()` function
- Early vs. recent message length comparison (first 25% vs. last 25% of conversations)
- Topic diversity expansion over time
- Question sophistication: early questions vs. recent questions
- Code block usage trend

**Input:** `ConversationRecord[]`  
**Output:** `GrowthSignal[]`

---

#### 1D: Life Event Detector
**Design doc tasks:** Task 4  
**Produces:** `LifeEventSignal[]`  
**Agent scope:**
- `detectLifeEvents()` function
- Topic velocity by week (conversations per topic per week)
- Spike detection: periods with >3x the user's average activity in a single topic
- Drop-off detection: topics that were active and then stopped
- Minimum 5x spike threshold for surfacing
- Hard-blocked topics: debt/distress, grief/loss, abuse, addiction
- Neutral framing: "Something happened" not "You got the job"

**Input:** `ConversationRecord[]`, `TemporalProfile` (from 1A — can use monthly topics if available, or compute its own weekly bucketing independently)  
**Output:** `LifeEventSignal[]`

**Note on dependency:** The design doc lists Task 4 as depending on Task 1 (temporal data). In practice, the life event detector only needs topic-by-week bucketing, which it can compute independently from the temporal profile. If 1A finishes first, 1D can reuse its monthly data. If not, 1D computes its own weekly buckets. **This is a soft dependency — 1D can start immediately.**

---

#### 1E: Benchmark Computation
**Design doc tasks:** Task 5  
**Produces:** `BenchmarkResult[]`  
**Agent scope:**
- Percentile computation for all 14 metrics (see requirements §5.3)
- Anonymous aggregate stats collection (opt-in pipeline)
- Percentile distribution storage schema (`benchmarks` table/file)
- Published research fallback values (bootstrapped baselines)
- Internal self-comparison fallback ("Your October was 3x your March")
- `computePercentile()` function

**Input:** `ConversationRecord[]`, `BenchmarkDistributions` (from stored/published data)  
**Output:** `BenchmarkResult[]`

---

#### 1F: Expanded Semantic Probes (Bonus — Low Effort)
**Design doc tasks:** Task 10  
**Agent scope:**
- Expand semantic probes from 8 to 18+ themes
- Add: DevOps, Data Science, UI/UX, Finance, Content Creation, Language Learning, Gaming, Health, Marketing, Hardware/IoT
- Update embedding text for each probe

**This is small enough to bundle with any of the other workstreams or run as a quick standalone task.**

### Phase 1 Review Gate

Before moving to Phase 2:
- [ ] Each detector runs successfully on a test dataset
- [ ] Output shapes match the interface contracts from Phase 0
- [ ] Correlation and life event detectors respect minimum sample thresholds
- [ ] Life event detector respects the hard-blocked topic list
- [ ] Edge cases handled: empty data, 1 conversation, 1 month of data, no code blocks

---

## Phase 2: Fact Engine

> **Goal:** Orchestrate all Phase 1 detectors, score every insight, and produce a ranked array of `InsightFact` objects. This is the brain of the system.

**Duration:** ~1 day  
**Parallelism:** Single focused task (but Phase 4 design system work starts here in parallel)  
**Depends on:** Phase 1 (all detectors complete)  
**Design doc tasks:** Task 6  
**Review gate:** Fact engine produces correct, ranked output for multiple test profiles.

### Agent Scope

- New `src/lib/insight-facts.ts` (or similar)
- Orchestrate all 5 detectors: call each, collect results
- **Wow score computation:** Score each fact 1-10 based on:
  - Specificity (has real numbers, dates, topic names)
  - Surprise factor (how far from the user's own baseline)
  - Emotional resonance (trajectory > benchmark > correlation > growth > life event)
  - Shareability (would someone screenshot this?)
- **Ranking:** Sort all facts by wow score, descending
- **Hook selection logic:** The #1 fact becomes the hook, but **behavioral patterns and trajectories are always preferred over benchmarks.** A correlation or trajectory with wow score 7 beats a benchmark with wow score 8 for hook selection.
- **Minimum guaranteed facts:** Even for thin data, produce fallback facts (conversation count, first date, active days, basic stats)
- **`rawNarrative` generation:** Each `InsightFact` gets a machine-generated factual statement that can serve as the template fallback if the LLM is unavailable
- Expose `_factCount` and `_topWowScore` for telemetry

### Input
All Phase 1 detector outputs: `TemporalProfile`, `BehavioralCorrelation[]`, `GrowthSignal[]`, `LifeEventSignal[]`, `BenchmarkResult[]`

### Output
`InsightFact[]` — ranked by wow score, with the hook-preferred fact flagged.

### Phase 2 Review Gate

Before moving to Phase 3:
- [ ] Fact engine produces ranked output for test datasets (power user, casual user, thin data user)
- [ ] Hook selection correctly prefers behavioral patterns over benchmarks
- [ ] Minimum guaranteed facts present even for thin data
- [ ] Wow scores feel right — trajectory/correlation insights score higher than raw stats
- [ ] `rawNarrative` strings are factual, specific, and usable as fallback copy

---

## Phase 3: Narrative + Validation

> **Goal:** Turn ranked facts into polished, Wrapped-style copy. Build the safety net (recovery, validation, templates) that ensures users never see garbage.

**Duration:** ~1.5 days  
**Parallelism:** 3 workstreams running simultaneously  
**Depends on:** Phase 2 (fact engine complete, `InsightFact` interface locked)  
**Review gate:** Full pipeline (facts → narrative → validation) produces valid `WrappedInsightsV3` for all test profiles.

### Workstreams (All Parallel)

#### 3A: LLM Narrative Prompt
**Design doc tasks:** Task 7  
**Agent scope:**
- New system prompt that takes verified `InsightFact[]` and writes Wrapped-style copy
- Output must conform to `WrappedInsightsV3` schema
- **Constraints enforced in prompt:**
  - No invented facts or numbers
  - Every number must come from the input facts
  - Hook must be behavioral pattern / trajectory (not benchmark) when available
  - Compliment must reference specific growth or dedication from the data
  - `yearOneLine` reads like the closing sentence of an essay
  - Tone: "a friend who really sees you"
- Banned phrase list integration
- Temperature tuning (lower for factual accuracy, higher for creative flair — find the sweet spot)

**Input:** `InsightFact[]`  
**Output:** `WrappedInsightsV3` (via LLM)

---

#### 3B: Template Fallback Engine
**Design doc tasks:** Task 8  
**Agent scope:**
- Client-side templates with `${placeholder}` substitution
- Uses `InsightFact[]` from the fact engine directly
- Template library covering all 16 slide types
- Each template produces output that matches `WrappedInsightsV3` field shapes
- Universal fallbacks for thin data (what to show when trajectory/growth/life event are null)
- **No generic copy.** Every template must embed at least one numeric fact.
- This is the fallback for both: (a) client-path users who don't use the LLM, and (b) server-path users when the LLM fails

**Input:** `InsightFact[]`  
**Output:** `WrappedInsightsV3` (via templates)

---

#### 3C: Validation + Recovery Pipeline
**Design doc tasks:** Task 9  
**Agent scope:**
- **Multi-tier JSON recovery:**
  - Tier 1: `JSON.parse()` attempt
  - Tier 2: LLM reformat (gpt-4o-mini, temp 0.1) to extract valid JSON from malformed response
  - Tier 3: Per-field validation, remove invalid slides, populate `_placeholderSlides`
- **Content quality validation:**
  - Every number in output must appear in input facts
  - Banned phrase rejection
  - Minimum specificity check (no output field should be a sentence that could apply to any user)
- **Delete the hardcoded fallback block** ("The Curious Mind", etc.) — no code path should ever serve it
- Wire `_placeholderSlides` into the output so the UI knows which slides to show as placeholders

**Input:** Raw LLM response string + `InsightFact[]` (for number validation)  
**Output:** Validated `WrappedInsightsV3` or per-field recovery

### Phase 3 Review Gate

Before moving to Phase 5 integration:
- [ ] LLM prompt produces correct, specific, non-generic copy for test datasets
- [ ] Template engine produces B+ quality output without any LLM dependency
- [ ] Recovery pipeline handles malformed JSON (test with intentionally broken responses)
- [ ] Banned phrases are rejected
- [ ] All numbers in output trace back to input facts
- [ ] Thin-data profiles show placeholders, not generic filler

---

## Phase 4: Presentation

> **Goal:** Build the 16-slide poster-style experience. Bold, saturated, mobile-first, shareable.

**Duration:** ~2–3 days  
**Parallelism:** 2 workstreams — design system first, then slide implementation  
**Depends on:** Phase 0 (output schema locked for slide data mapping)  
**Can start:** As early as Phase 2 begins (design system work doesn't need real data)  
**Review gate:** All 16 slides render correctly with test data, pass the squint test, look good in mobile portrait.

### Workstreams

#### 4A: Design System (Can Start During Phase 1-2)
**Agent scope:**
- Color palette system: 6-8 bold, saturated background palettes. Each slide gets one. Adjacent slides use different palettes.
- Typography system: headline font (120pt+), subline font, size contrast ratios
- Animation primitives: count-up for numbers, draw for curves, fill for heatmaps. All under 1 second.
- Dark mode: saturated backgrounds with white/light text
- Layout system: mobile-first portrait, centered single-insight layout, two text layers max
- Share card template: pre-formatted for Instagram Stories (1080×1920)

**This can start immediately once the slide inventory is known (it is — see OUTLINE.md). No data dependency.**

---

#### 4B: Slide Implementation (After 4A + Phase 3)
**Agent scope:**
Build each of the 16 slides. Each slide maps to a field in `WrappedInsightsV3`:

| Slide | Schema Field | Visual Type |
|-------|-------------|-------------|
| 1. The Hook | `hook.statement` | Single sentence, massive type |
| 2. Year at a Glance | `yearAtAGlance.narrative` | Headline + 3 key numbers |
| 3. Usage Over Time | Derived from temporal data | Smooth curve, no axes |
| 4. The Heatmap | Derived from conversation dates | Color grid, no labels |
| 5. Trajectory | `trajectory.narrative` | Narrative arc text |
| 6. Behavioral Split | `correlations[0].narrative` | Split-screen or single statement |
| 7. Life Event | `lifeEvent.narrative` | Single statement |
| 8. Growth | `growth.narrative` | Before/after comparison |
| 9. Top Topics | `topTopics` | Clean list or visual |
| 10. Peak Moment | `peakMoment.narrative` | Date + story |
| 11. Conversation Depth | `benchmarks[depth]` | Number + benchmark badge |
| 12. Your Benchmark | `benchmarks[best]` | Percentile bar + label |
| 13. Fun Facts | `funFacts` | 2-3 quirky lines |
| 14. The Compliment | `compliment` | Single earned statement |
| 15. Your Year, One Line | `yearOneLine` | Single sentence, closing |
| 16. Share | Summary card | Share button + formatted card |

- Placeholder states for slides where data is `null`
- Swipe/navigation between slides
- Animation triggers on slide entry

### Phase 4 Review Gate

Before integration:
- [ ] All 16 slides render with test data
- [ ] Each slide passes the 3-second absorption test
- [ ] Each slide passes the squint test (readable at a distance)
- [ ] Mobile portrait looks correct (test on phone-width viewport)
- [ ] Placeholder slides display cleanly when data is null
- [ ] Animations are smooth, under 1 second, purposeful
- [ ] Share card renders correctly at 1080×1920
- [ ] Adjacent slides use different color palettes

---

## Phase 5: Integration + Review

> **Goal:** Wire everything together, put it behind feature flags, test end-to-end, and ship.

**Duration:** ~1–2 days  
**Parallelism:** 2 workstreams  
**Depends on:** Phases 1–4 complete  
**Design doc tasks:** Task 11  
**Review gate:** Full end-to-end test with real user data. Final sign-off.

### Workstreams

#### 5A: Backend Integration
**Agent scope:**
- Replace `generateDataInsights()` (client path) with the fact engine
- Update `/api/wrapped/insights` (server path) with new LLM prompt + schema v3
- Feature flags: `v3_insights` toggle to switch between v2 and v3 pipelines
- Cache invalidation: use `schemaVersion` + `dataVersion` (hash of input data)
- Wire benchmark opt-in into the data load flow
- Delete the old hardcoded fallback block permanently

---

#### 5B: End-to-End Testing
**Agent scope:**
- Test with 3 user profiles:
  - **Power user** (12+ months, 1000+ conversations) — should produce all 5 insight categories, strong hook, multiple benchmarks
  - **Casual user** (3-6 months, 50-200 conversations) — should produce trajectory + correlations, some benchmarks, graceful placeholders
  - **New user** (1 month, <30 conversations) — should produce basic stats, benchmarks from published data, placeholders for trajectory/growth/life events
- Verify: no banned phrases, no generic filler, all numbers traceable to facts
- Verify: hook prefers behavioral patterns over benchmarks
- Verify: placeholder slides display correctly, `_placeholderSlides` is populated
- Verify: JSON recovery works when LLM output is intentionally broken
- Verify: template fallback produces usable output when LLM is disabled
- Performance: fact engine completes within budget (client ≤4s, server ≤2s p95)

### Phase 5 Review Gate (Final)

- [ ] End-to-end pipeline works for all 3 test profiles
- [ ] Feature flag switches cleanly between v2 and v3
- [ ] No regressions in existing functionality
- [ ] Performance within budget
- [ ] Share card looks correct on mobile
- [ ] Final visual review of all 16 slides

---

## Timeline & Overlap

```
Week 1:
  Day 1:    [Phase 0: Lock interfaces]
  Day 2-3:  [Phase 1A: Temporal] [Phase 1B: Correlations] [Phase 1C: Growth] [Phase 1D: Life Events] [Phase 1E: Benchmarks]
            [Phase 4A: Design system starts ─────────────────────────────────────────────────────]
  Day 4:    [Phase 2: Fact engine]

Week 2:
  Day 5-6:  [Phase 3A: LLM prompt] [Phase 3B: Templates] [Phase 3C: Validation]
            [Phase 4A: Design system continues if needed ─────]
  Day 7-8:  [Phase 4B: Slide implementation]
  Day 9-10: [Phase 5A: Integration] [Phase 5B: Testing]
```

### Maximum Parallel Agents at Any Point

| Time | Parallel Agents | What They're Doing |
|------|----------------|-------------------|
| Day 1 | 1 | Phase 0: Interface contracts |
| Days 2-3 | **6** | Phase 1: 5 detectors + Phase 4A: design system |
| Day 4 | 2 | Phase 2: fact engine + Phase 4A: design system |
| Days 5-6 | **4** | Phase 3: 3 narrative workstreams + Phase 4A/4B overlap |
| Days 7-8 | 1-2 | Phase 4B: slide implementation (may split by slide groups) |
| Days 9-10 | 2 | Phase 5: integration + testing |

### Review Gate Schedule

| Gate | When | What Gets Reviewed | Blocks |
|------|------|-------------------|--------|
| **Gate 0** | End of Day 1 | Interface contracts | Phase 1 |
| **Gate 1** | End of Day 3 | All 5 detector outputs | Phase 2 |
| **Gate 2** | End of Day 4 | Fact engine output + wow scores | Phase 3 |
| **Gate 3** | End of Day 6 | Full narrative pipeline output | Phase 4B, Phase 5 |
| **Gate 4** | End of Day 8 | All 16 slides visual review | Phase 5 |
| **Gate 5 (Final)** | End of Day 10 | End-to-end sign-off | Ship |

---

## Prompting Strategy for Parallel Work

Each parallel workstream gets its own prompt/agent. To avoid conflicts:

1. **Shared read-only context:** Every agent gets the interface contracts (Phase 0 output) and the relevant section of the design doc.
2. **Separate file ownership:** Each agent writes to its own files. No two agents edit the same file.
   - 1A writes `src/lib/detectors/temporal.ts`
   - 1B writes `src/lib/detectors/correlations.ts`
   - 1C writes `src/lib/detectors/growth.ts`
   - 1D writes `src/lib/detectors/life-events.ts`
   - 1E writes `src/lib/detectors/benchmarks.ts`
   - Phase 2 writes `src/lib/insight-facts.ts`
   - 3A writes `src/lib/narrative/llm-prompt.ts`
   - 3B writes `src/lib/narrative/templates.ts`
   - 3C writes `src/lib/narrative/validation.ts`
   - 4A writes `src/styles/wrapped-design-system.*`
   - 4B writes `src/components/slides/*`
3. **Integration happens in Phase 5 only.** No agent imports another agent's code until integration. They code against the interface contracts.
4. **Review between phases.** After each phase completes, a review pass confirms outputs match contracts before the next phase begins.

---

## Risk Checkpoints

| Risk | When to Check | What to Do |
|------|--------------|------------|
| Interface contracts are wrong | Gate 1 (when detectors produce real output) | Revise contracts + update downstream agents |
| Wow scores feel arbitrary | Gate 2 | Tune scoring weights, re-run on test data |
| LLM ignores facts, invents numbers | Gate 3 | Tighten prompt constraints, lower temperature, add post-validation |
| Slides are too busy | Gate 4 | Simplify — remove sublines, increase font size, cut content |
| Performance over budget | Gate 5 | Profile the fact engine, optimize slow detectors, add caching |
| Thin-data users see empty experience | Gates 1-3 | Ensure minimum guaranteed facts, test with 1-month dataset at every gate |
