# Task 5B: End-to-End Testing

> **Phase:** 5 — Integration + Review  
> **Task ID:** 5B  
> **Estimated Effort:** 1 day  
> **Status:** Not Started

---

## Context Summary

You are working on **ChatGPT Wrapped** — a "Spotify Wrapped"-style experience that analyzes a user's ChatGPT data export and presents personalized insights as a swipeable, poster-style 16-slide deck. The entire system has been built in parallel: 5 detectors, a Fact Engine, LLM narrative writer, template fallback, validation pipeline, design system, and 16 slide components. Task 5A wired them all together.

This task is the **final quality gate** — end-to-end testing that verifies the complete pipeline works for different user profiles, edge cases, and failure scenarios. Nothing ships until this passes.

---

## Goal

Test the complete pipeline end-to-end with 3 user profiles (power user, casual user, new user), verify all acceptance criteria from the design doc and requirements, and confirm the system degrades gracefully under failure conditions.

---

## Interface Contracts

This task does not produce new interfaces. It consumes the complete pipeline and validates its output against the specifications.

### Key Types (Reference)

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

---

## Detailed Requirements

### 1. Test Profiles

Create or use 3 test datasets representing different user types:

#### Profile A: Power User
- **Data:** 12+ months of data, 1000+ conversations, diverse topics, active every day.
- **Expected output:**
  - All 5 insight categories present (trajectory, benchmarks, correlations, growth, life events).
  - Strong hook — behavioral pattern or trajectory, not a benchmark.
  - Multiple benchmark callouts (top 10%+ on several metrics).
  - No placeholder slides (all slides have data).
  - `_factCount` ≥ 15.
  - `_topWowScore` ≥ 7.
  - Mix of human task insights and AI task insights.

#### Profile B: Casual User
- **Data:** 3–6 months, 50–200 conversations, 2–3 main topics.
- **Expected output:**
  - Trajectory + correlations present (at least basic patterns).
  - Some benchmarks (at least 1–2 qualifying metrics).
  - Growth may or may not be present (depends on data variation).
  - Life events may show placeholder (insufficient spike data).
  - Hook is still specific and non-generic.
  - `_factCount` ≥ 8.
  - `_placeholderSlides` may have 1–2 entries.

#### Profile C: New User
- **Data:** ≤1 month, <30 conversations, 1–2 topics.
- **Expected output:**
  - Basic stats present (year at a glance, total conversations, active days).
  - Benchmarks from published data (source: 'published').
  - Trajectory: `null` (placeholder slide).
  - Growth: `null` (placeholder slide).
  - Life events: `null` (placeholder slide).
  - `_placeholderSlides` includes at least `['trajectory', 'growth', 'lifeEvent']`.
  - Hook still renders — uses the best available fact (likely a benchmark or basic stat).
  - `_factCount` ≥ 5 (minimum guaranteed facts).

### 2. Content Quality Tests

For each profile, verify:

| Check | Criteria | How to Test |
|-------|----------|------------|
| **No generic filler** | No output field contains generic text like "The Curious Mind", "Always asking questions", etc. | Regex check against banned phrase list. |
| **No invented numbers** | Every number in string fields exists in the `InsightFact[]` dataPoints. | Extract numbers from output strings, cross-reference with input facts. |
| **Hook is behavioral** | For Profile A: hook category is `trajectory`, `correlation`, `growth`, or `life_event` — not `benchmark`. | Check `hook.category`. |
| **Hook fallback works** | For Profile C: hook still renders even with thin data. | Verify `hook.statement` is non-empty and specific. |
| **Percentile accuracy** | Benchmark percentiles are consistent with the user's data and the distribution. | Spot-check 2–3 benchmark values manually. |
| **Placeholder correctness** | `_placeholderSlides` accurately lists all slides with null/empty data. | Compare null fields with `_placeholderSlides` array. |
| **Numbers are real** | `yearAtAGlance.totalConversations` matches actual conversation count. | Compare with `conversations.length`. |

### 3. Pipeline Resilience Tests

#### 3a. LLM Failure Recovery

1. Simulate LLM returning malformed JSON (intentionally broken response).
2. Verify Tier 2 recovery (AI reformat) produces valid JSON.
3. Simulate Tier 2 also failing.
4. Verify Tier 3 (field-level removal) produces partial output with `_placeholderSlides`.
5. Verify template fallback produces complete output when LLM is completely unavailable.

#### 3b. Detector Failure Isolation

1. Simulate one detector throwing an error (e.g., Temporal Detector crashes).
2. Verify the pipeline still completes — other detectors' output is used, and the Fact Engine produces fallback facts for the missing category.
3. The user should still see a usable Wrapped experience (just missing that one insight category).

#### 3c. Empty Data Edge Case

1. Pass an empty `ConversationRecord[]` array.
2. Verify the pipeline does not crash.
3. Output should be minimal but valid — year at a glance with zeros, placeholder slides for everything.

### 4. Performance Tests

| Path | Budget | How to Test |
|------|--------|------------|
| **Client pipeline** | ≤ 4 seconds | Time `generateWrappedInsightsV3()` on Profile A (largest dataset). Detectors should run in parallel. |
| **Server pipeline** | ≤ 2 seconds (p95), ≤ 5 seconds (max) | Time the full server endpoint on Profile A, excluding LLM latency. |
| **Fact Engine alone** | ≤ 500ms | Time `generateInsightFacts()` on Profile A. |

### 5. Visual Tests

For each profile, render the full 16-slide deck and verify:

| Check | Criteria |
|-------|----------|
| **3-second test** | Each slide is understandable at a glance. |
| **Squint test** | Readable at a distance — not too busy. |
| **One insight per slide** | No slide shows two things. |
| **Mobile portrait** | Correct at 375px and 430px viewport width. |
| **Placeholder slides** | Clean, styled, not empty/broken. |
| **Animations** | Smooth, under 1 second, no jank. |
| **Adjacent palette test** | No two adjacent slides share the same color palette. |
| **Share card** | Renders at 1080×1920 with hook + stat + branding. |

### 6. Feature Flag Tests

1. With `v3_insights: false` — verify old pipeline runs, new code is not executed.
2. With `v3_insights: true` — verify new pipeline runs end-to-end.
3. Toggle flag — verify both can operate without corrupting each other.
4. Cached v2 insights are not served when flag is v3, and vice versa.

### 7. Acceptance Test Checklist (From Requirements Doc)

These are the formal acceptance tests from the requirements document. Every one must pass:

- [ ] A dataset with ≥6 months of data produces hook + trajectory + growth + correlation + benchmark insights, with a mix of human and AI task insights.
- [ ] A dataset with ≤1 month of data displays placeholder screens for trajectory and growth slides, with `_placeholderSlides` identifying which slides have insufficient data. Hook slide still renders.
- [ ] The opening hook slide contains a behavioral pattern or trajectory — not a raw stat, not a vanity metric, not a summary.
- [ ] The hook prefers behavioral patterns/trajectories over benchmarks. A benchmark hook is only acceptable when no behavioral pattern exists.
- [ ] JSON parse failure triggers Tier 2 recovery and still renders valid JSON.
- [ ] All numbers in output exist in `dataPoints` from facts.
- [ ] No output contains banned phrases or generic templates.
- [ ] No slide shows generic filler; slides with insufficient data show a clear placeholder message.
- [ ] The total slide count is 16 or fewer — every slide earns its place.
- [ ] Deep pattern slides (trajectory, correlation, life event, growth) appear before benchmark slides in the experience.

---

## File Ownership

| File | Action |
|------|--------|
| `src/__tests__/e2e/wrapped-v3.test.ts` (or similar) | **CREATE** — End-to-end test suite |
| `src/__tests__/fixtures/power-user.json` | **CREATE** — Test dataset for Profile A |
| `src/__tests__/fixtures/casual-user.json` | **CREATE** — Test dataset for Profile B |
| `src/__tests__/fixtures/new-user.json` | **CREATE** — Test dataset for Profile C |

**Note:** File locations depend on the project's test framework. Use whatever convention the existing codebase follows.

**Do NOT** modify any pipeline code. This task is testing only. If bugs are found, file them and fix them in the relevant task's files.

---

## Edge Cases & Constraints

| Scenario | Expected Behavior |
|----------|-------------------|
| **Test dataset has conversations with timezone edge cases** | Timestamps should be processed consistently (UTC or user's timezone, per existing codebase convention). |
| **LLM returns different output on each run** | Template fallback tests should be deterministic. LLM tests should verify structure/format, not exact wording. |
| **Performance test is flaky (network-dependent LLM)** | Performance tests for the client pipeline should exclude LLM latency. Server pipeline performance includes LLM but with a generous timeout. |
| **Test fixtures contain sensitive content** | Use synthetic data only. No real user conversations. |

---

## Acceptance Criteria

- [ ] 3 test profiles created (power, casual, new user)
- [ ] All 10 formal acceptance tests from the requirements doc pass
- [ ] Content quality checks pass: no banned phrases, no invented numbers, hook is behavioral
- [ ] LLM failure recovery works across all 3 tiers
- [ ] Detector failure isolation works (one detector crash doesn't kill the pipeline)
- [ ] Empty data doesn't crash the pipeline
- [ ] Client pipeline completes within 4 seconds for Profile A
- [ ] Server pipeline completes within 2 seconds (p95) for Profile A
- [ ] All 16 slides render for Profile A (no placeholders)
- [ ] Placeholders render correctly for Profile C
- [ ] Feature flag toggles cleanly between v2 and v3
- [ ] Share card renders at 1080×1920
- [ ] All tests are automated and can be run in CI

---

## Dependencies

| Direction | Task | Relationship |
|-----------|------|-------------|
| **Depends on** | Task 5A (Backend Integration) | The complete pipeline must be wired before testing |
| **Depends on** | All previous tasks (0–4B) | Tests the output of every task |
| **Unblocks** | Ship | This is the final gate. When it passes, the system is ready to ship. |
