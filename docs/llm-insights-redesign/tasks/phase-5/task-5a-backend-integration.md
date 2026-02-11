# Task 5A: Backend Integration

> **Phase:** 5 — Integration + Review  
> **Task ID:** 5A  
> **Estimated Effort:** 1 day  
> **Status:** Not Started

---

## Context Summary

You are working on **ChatGPT Wrapped** — a "Spotify Wrapped"-style experience that analyzes a user's ChatGPT data export and presents personalized insights as a swipeable, poster-style 16-slide deck. The system has been built in parallel phases: Phase 1 detectors compute raw signals, Phase 2's Fact Engine scores and ranks them, Phase 3's Narrative Layer writes copy, and Phase 4's Presentation Layer renders slides. **All of these components exist as independent modules that have never been connected.**

This task is the **wiring** — connecting all modules into the working pipeline, putting it behind feature flags, handling cache invalidation, and replacing the old insights generation code. This is where independent modules become a working product.

---

## Goal

Wire all modules together into the complete pipeline. Replace the existing `generateDataInsights()` (client path) and `/api/wrapped/insights` (server path) with the new v3 pipeline. Add feature flags, cache invalidation, and benchmark opt-in.

---

## Interface Contracts

### The Complete Pipeline

```
ConversationRecord[]
    ↓
[Phase 1 Detectors]  →  DetectorOutputs
    ↓
[Phase 2 Fact Engine]  →  InsightFact[] + hookFactId
    ↓
[Phase 3A LLM Narrative (server)] OR [Phase 3B Templates (client/fallback)]
    ↓
[Phase 3C Validation & Recovery]
    ↓
WrappedInsightsV3
    ↓
[Phase 4 Slides]  →  Rendered 16-slide deck
```

### Key Types (All defined in Task 0)

```typescript
interface ConversationRecord { /* ... */ }
interface DetectorOutputs {
  temporal: TemporalProfile;
  correlations: BehavioralCorrelation[];
  growth: GrowthSignal[];
  lifeEvents: LifeEventSignal[];
  benchmarks: BenchmarkResult[];
}
interface InsightFact { /* ... */ }
interface WrappedInsightsV3 { /* ... */ }
```

---

## Detailed Requirements

### 1. Client Path (File Upload → Browser Processing)

Replace `generateDataInsights()` in the existing client-side code:

**Current flow:**
```
Upload → Parse → computeStats() → generateDataInsights() → Old slide rendering
```

**New flow:**
```
Upload → Parse → computeStats()
                      ↓
              [Run all 5 detectors]  →  DetectorOutputs
                      ↓
              [Fact Engine]  →  InsightFact[]
                      ↓
              [Template Engine]  →  WrappedInsightsV3  (client default)
                      OR
              [LLM via server]  →  WrappedInsightsV3  (opt-in, with privacy note)
                      ↓
              [Validation]
                      ↓
              [New slide rendering]
```

**Implementation steps:**
1. Import all 5 detector functions.
2. Import the Fact Engine's `generateInsightFacts()`.
3. Import the Template Engine's `generateFromTemplates()`.
4. Create an orchestrator function `generateWrappedInsightsV3()` that:
   a. Runs all detectors on the `ConversationRecord[]`.
   b. Passes detector outputs to the Fact Engine.
   c. Passes facts to the Template Engine (default) or LLM (if user opts in).
   d. Runs validation on the output.
   e. Returns `WrappedInsightsV3`.
5. Replace the call to `generateDataInsights()` with `generateWrappedInsightsV3()`.

### 2. Server Path (Database → API Endpoint)

Update `/api/wrapped/insights`:

**Current flow:**
```
Request → Load data from DB → LLM prompt (old) → Parse → Cache → Respond
```

**New flow:**
```
Request → Load data from DB
                ↓
        [Run all 5 detectors]  →  DetectorOutputs
                ↓
        [Fact Engine]  →  InsightFact[]
                ↓
        [LLM Narrative]  →  raw response
                ↓
        [Validation & Recovery]  →  WrappedInsightsV3
                ↓
        If LLM failed: [Template Engine]  →  WrappedInsightsV3
                ↓
        Cache with schemaVersion + dataVersion
                ↓
        Respond
```

**Implementation steps:**
1. Same orchestration as client path, but LLM is the primary path (not templates).
2. If LLM fails (returns `null` from Task 3A), fall back to Template Engine.
3. Cache the result with versioning (see below).

### 3. Feature Flags

Add a `v3_insights` feature flag that controls which pipeline is active:

```typescript
// Feature flag check
const useV3 = featureFlags.get('v3_insights') ?? false;

if (useV3) {
  return generateWrappedInsightsV3(conversations, benchmarkDistributions);
} else {
  return generateDataInsights(stats); // Old path
}
```

**Requirements:**
- Feature flag is a simple boolean.
- Defaults to `false` (old pipeline active).
- Can be toggled per-environment (dev = true, prod = false until ready).
- Both code paths must remain functional during the rollout period.

### 4. Cache Invalidation

Cached insight payloads should be versioned to avoid serving stale data:

```typescript
interface CacheKey {
  userId: string;
  schemaVersion: 'v2' | 'v3';         // Which pipeline produced it
  dataVersion: string;                  // Hash of input data
}

function computeDataVersion(conversations: ConversationRecord[]): string {
  // Hash of: conversation count + last conversation timestamp + total message count
  // This changes whenever the user's data changes
  const key = `${conversations.length}-${conversations[conversations.length - 1]?.create_time}-${conversations.reduce((sum, c) => sum + c.message_count, 0)}`;
  return hashString(key);
}
```

**Rules:**
- If the schema version or data version changes, the cache is invalidated.
- Old v2 caches are not served when `v3_insights` is enabled.
- New v3 caches are not served when `v3_insights` is disabled.

### 5. Benchmark Opt-In

Wire the benchmark contribution into the data load flow:

```typescript
// After generating insights (if user opted in):
if (userOptedInToBenchmarks) {
  const contribution = prepareContribution(conversations); // From Task 1E
  await submitBenchmarkContribution(contribution);         // API call to store anonymous stats
}
```

**Note:** The `submitBenchmarkContribution()` API endpoint needs to be created. It accepts an `AnonymousBenchmarkContribution` object and merges it into the stored `BenchmarkDistributions`.

### 6. Delete Old Code Paths

Once v3 is wired in:
- **Mark for deletion:** The old `generateDataInsights()` function (keep it functional behind the feature flag, but annotate it for removal once v3 is stable).
- **Delete immediately:** The hardcoded fallback block ("The Curious Mind" etc.). This should already be handled by Task 3C, but verify it's gone.
- **Delete immediately:** Any code that serves the old insight schema without going through the new pipeline.

### 7. Error Handling

The pipeline must never crash. Every stage has a fallback:

```
Detectors fail      → Return empty outputs, Fact Engine produces fallback facts
Fact Engine fails   → Return basic stats as InsightFacts (conversation count, dates)
LLM fails           → Template Engine produces output
Templates fail      → Return the rawNarrative strings directly
Validation fails    → Field-level removal, _placeholderSlides populated
```

---

## File Ownership

| File | Action |
|------|--------|
| `src/lib/generate-insights-v3.ts` (or similar) | **CREATE** — Main orchestrator function `generateWrappedInsightsV3()` |
| Existing client-side insights generation file | **MODIFY** — Replace call to old function with v3 behind feature flag |
| Existing server API endpoint file | **MODIFY** — Replace LLM prompt + parse logic with v3 behind feature flag |
| Feature flag configuration file | **MODIFY** — Add `v3_insights` flag |
| Benchmark API endpoint | **CREATE** — `/api/benchmarks/contribute` endpoint |

**Caution:** This task modifies existing files. Be careful to preserve existing functionality behind the feature flag. Do not break the v2 path.

---

## Edge Cases & Constraints

| Scenario | Expected Behavior |
|----------|-------------------|
| **Feature flag is false** | Old pipeline runs. No v3 code executes. |
| **Feature flag is true but detectors fail** | Fallback facts produced. Thin but valid output. |
| **LLM is unavailable on server path** | Template fallback produces the output. |
| **Both LLM and templates fail** | Return `rawNarrative` strings from InsightFacts directly. Not pretty, but factual. |
| **Benchmark distributions file doesn't exist** | Use published fallback values (handled in Task 1E). |
| **User has cached v2 insights but flag switches to v3** | Cache miss (schema version mismatch). v3 pipeline runs fresh. |
| **User has cached v3 insights but uploads new data** | Cache miss (data version mismatch). v3 pipeline runs fresh. |
| **Benchmark opt-in submission fails** | Silent failure. Do not block the insights pipeline. Log the error. |
| **Performance: client pipeline > 4 seconds** | Detectors should be parallelized (`Promise.all()`). If still slow, profile and optimize the slowest detector. |

---

## Acceptance Criteria

- [ ] `generateWrappedInsightsV3()` orchestrator function exists and works
- [ ] Client path: replaces `generateDataInsights()` behind feature flag
- [ ] Server path: replaces old LLM prompt + parse behind feature flag
- [ ] Feature flag `v3_insights` controls which pipeline runs
- [ ] Both v2 and v3 paths are functional simultaneously
- [ ] Cache uses `schemaVersion` + `dataVersion` for invalidation
- [ ] Server path: LLM → Validation → (fallback to Templates if LLM fails)
- [ ] Client path: Templates by default, LLM opt-in with privacy note
- [ ] Benchmark opt-in wired into data load flow
- [ ] Benchmark contribution endpoint created
- [ ] Hardcoded fallback block is deleted (confirmed gone)
- [ ] Pipeline never crashes — every stage has a fallback
- [ ] Detectors run in parallel (`Promise.all()` or equivalent)
- [ ] Client pipeline completes within 4 seconds
- [ ] Server pipeline completes within 2 seconds (p95)

---

## Dependencies

| Direction | Task | Relationship |
|-----------|------|-------------|
| **Depends on** | Task 0 (Interface Contracts) | All types |
| **Depends on** | Tasks 1A–1F (Detectors) | Imports all 5 detector functions |
| **Depends on** | Task 2 (Fact Engine) | Imports `generateInsightFacts()` |
| **Depends on** | Task 3A (LLM Narrative) | Imports `generateNarrative()` |
| **Depends on** | Task 3B (Templates) | Imports `generateFromTemplates()` |
| **Depends on** | Task 3C (Validation) | Imports `validateAndRecover()` |
| **Depends on** | Task 4B (Slides) | Slides consume the `WrappedInsightsV3` output |
| **Unblocks** | Task 5B (End-to-End Testing) | Testing verifies the full pipeline |
