# Task 3B: Template Fallback Engine

> **Phase:** 3 — Narrative + Validation  
> **Task ID:** 3B  
> **Estimated Effort:** 1 day  
> **Status:** Not Started

---

## Context Summary

You are working on **ChatGPT Wrapped** — a "Spotify Wrapped"-style experience that analyzes a user's ChatGPT data export and presents personalized insights as a 16-slide poster-style deck. The system has three layers: a **deterministic Fact Engine** that computes verified insights, a **Narrative Layer** (this task is the non-LLM half), and a **Presentation Layer** that renders slides.

This task builds the **Template Fallback Engine** — the deterministic, no-LLM path that converts `InsightFact` objects into `WrappedInsightsV3` output using template substitution. This is the safety net for two scenarios: (a) client-side users who don't use the LLM server, and (b) server-side users when the LLM fails or is unavailable. The output should be B+ quality — factual, specific, always includes numbers — even if it lacks the creative flair of LLM-written copy.

---

## Goal

Implement a template engine that takes `InsightFact[]` from the Fact Engine and produces a complete `WrappedInsightsV3` object using template substitution — no LLM required. Every template must embed at least one numeric fact. No generic copy allowed.

---

## Interface Contracts

### Input

```typescript
interface InsightFact {
  id: string;
  category: 'trajectory' | 'benchmark' | 'correlation' | 'growth' | 'life_event';
  wowScore: number;             // 1-10
  rawNarrative: string;         // Factual statement from the Fact Engine
  dataPoints: Record<string, number | string>;
}
```

### Output

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

### 1. Template Library

Create templates for every field in `WrappedInsightsV3`. Each template is a function that takes relevant `InsightFact` objects (filtered by category) and the year-at-a-glance data, and returns the populated field.

#### Hook Templates

```typescript
// Trajectory hook
`You went from ${dataPoints.fromTopic} to ${dataPoints.toTopic} in ${dataPoints.monthsSpan} months. That's not learning — that's a transformation.`

// Correlation hook
`You ${dataPoints.dayTopic} during the day and ${dataPoints.nightTopic} at night. You're two different people.`

// Life event hook
`${dataPoints.peakCount} ${dataPoints.topic} conversations in ${dataPoints.peakWeeks}. Then silence. Something happened.`

// Growth hook
`Early you: ${dataPoints.earlyValue}-character messages. Recent you: ${dataPoints.recentValue}-character paragraphs. You learned how to think with AI.`

// Benchmark hook (fallback only — used when no behavioral patterns exist)
`You average ${dataPoints.userValue} messages per conversation. Most people stop at ${dataPoints.populationAvg}. You don't just ask — you think out loud.`
```

#### Year at a Glance Template

```typescript
`${yearData.activeDays} days. ${yearData.totalConversations} conversations. You didn't just use ChatGPT — you made it part of how you think.`
```

#### Trajectory Template

```typescript
// If trajectory facts exist:
`${dataPoints.fromTopic} → ${dataPoints.toTopic}` // arc
`You started with ${dataPoints.fromTopic} and ended up at ${dataPoints.toTopic}. ${dataPoints.monthsSpan} months of evolution.` // narrative

// If no trajectory facts: trajectory = null
```

#### Correlation Templates

```typescript
// Night owl
`Your conversations are ${dataPoints.nightAvg / dataPoints.dayAvg}x longer after 10 PM. Late-night you has more patience.`

// Topic split
`You ${dataPoints.dayTopic} during the day and ${dataPoints.nightTopic} at night.`

// DOW pattern
`Your ${metric} peaks on ${dayName}. ${deviation}% above your average.`
```

#### Life Event Template

```typescript
// If life event facts exist:
`${dataPoints.peakCount} ${dataPoints.topic} conversations in ${dataPoints.peakWeeks}${dataPoints.resolvedAfter === 'yes' ? ', then silence' : ''}. Something was happening.`

// If no life event facts: lifeEvent = null
```

#### Growth Template

```typescript
// If growth facts exist:
`Your average message grew from ${dataPoints.earlyValue} to ${dataPoints.recentValue} characters over ${dataPoints.timespan}. You learned how to give context.`

// If no growth facts: growth = null
```

#### Benchmark Templates

```typescript
// Per benchmark fact:
{
  metric: dataPoints.metric,
  percentile: dataPoints.percentile,
  userValue: dataPoints.userValue,
  avgValue: dataPoints.populationAvg,
  label: `Top ${100 - dataPoints.percentile}% for ${metricLabel(dataPoints.metric)}`,
  narrative: `You're in the top ${100 - dataPoints.percentile}% for ${metricLabel(dataPoints.metric)}. Average: ${dataPoints.populationAvg}. You: ${dataPoints.userValue}.`
}
```

#### Fun Facts Template

Generate 2-3 fun facts from the available data. Prioritize:
1. The busiest single day (date, count, and if possible, the dominant topic).
2. The longest single conversation (message count).
3. Any extreme outlier from the data.

```typescript
`Your busiest day was ${date}. ${count} conversations. All about ${topic}.`
`Your longest conversation was ${messageCount} messages. At ${time}. On a ${dayOfWeek}.`
```

#### Compliment Template

```typescript
// Based on growth signal:
`In ${dataPoints.timespan}, your messages grew from ${dataPoints.earlyValue} to ${dataPoints.recentValue} characters. You didn't just use AI — you learned how to think with it.`

// Based on benchmark:
`You showed up ${dataPoints.activeDays} days this year. Top ${100 - dataPoints.percentile}% for dedication. That's commitment.`

// Universal fallback:
`${yearData.totalConversations} conversations over ${yearData.activeDays} days. You kept showing up. That says something.`
```

#### Year One Line Template

```typescript
// Select based on strongest available insight:
`The year you went from ${fromTopic} to ${toTopic} — and never looked back.`
`The year you showed up ${activeDays} days and made AI part of how you think.`
`${totalConversations} conversations. ${activeDays} days. A year of thinking out loud.`
```

### 2. Template Selection Logic

For each field, the template engine:
1. Filters available `InsightFact[]` by the relevant category.
2. Sorts by `wowScore` descending.
3. Picks the best matching template based on what data is available.
4. If no matching facts exist, returns `null` for nullable fields (`trajectory`, `lifeEvent`, `growth`) or uses a universal fallback.

### 3. Placeholder Slide Tracking

If a field is `null` because no matching facts exist, add the field name to `_placeholderSlides`:

```typescript
const placeholderSlides: string[] = [];
if (!trajectory) placeholderSlides.push('trajectory');
if (!lifeEvent) placeholderSlides.push('lifeEvent');
if (!growth) placeholderSlides.push('growth');
```

### 4. No Generic Copy Rule

**Every template must include at least one number from the `InsightFact`'s `dataPoints`.** Templates like "You're a curious person!" or "Great year of learning!" are banned. If a template can't include a number, it shouldn't exist.

### 5. Multiple Template Variants

For each field, provide 2-3 template variants to avoid repetitive output across users. Select the variant based on a hash of the user's data (deterministic but varied):

```typescript
function selectVariant(variants: string[], userId: string): string {
  const hash = simpleHash(userId);
  return variants[hash % variants.length];
}
```

---

## File Ownership

| File | Action |
|------|--------|
| `src/lib/narrative/templates.ts` | **CREATE** — Contains all template functions, the main `generateFromTemplates()` function, variant selection, and placeholder tracking. |

**Do NOT** edit any other files. Do not import from detector files or the LLM prompt module. Code against the interface contracts only.

---

## Edge Cases & Constraints

| Scenario | Expected Behavior |
|----------|-------------------|
| **No facts at all** | Should not happen (Fact Engine guarantees 5+). If it does, produce a minimal output using just yearAtAGlance data. |
| **Only fallback facts (conversation count, active days, etc.)** | Produce yearAtAGlance, basic compliment, basic yearOneLine. All nullable fields are null with `_placeholderSlides` populated. |
| **No trajectory facts** | `trajectory = null`, added to `_placeholderSlides`. |
| **No correlation facts** | `correlations = []`. Hook falls back to growth, life event, or benchmark. |
| **No growth facts** | `growth = null`, added to `_placeholderSlides`. |
| **No life event facts** | `lifeEvent = null`, added to `_placeholderSlides`. |
| **No benchmark facts above top 10%** | `benchmarks = []`. No benchmark slides shown. |
| **Data point values are 0** | Templates should handle zero gracefully. "0 conversations" is technically correct but looks odd — use conditional logic to adjust wording. |
| **Very large numbers (10,000+ conversations)** | Format with commas: `10,000` not `10000`. |

---

## Acceptance Criteria

- [ ] `generateFromTemplates()` function exists and is exported from `src/lib/narrative/templates.ts`
- [ ] Function signature: `(facts: InsightFact[], yearData: YearAtAGlanceData, hookFactId: string) => WrappedInsightsV3`
- [ ] Templates exist for all `WrappedInsightsV3` fields: hook, yearAtAGlance, trajectory, correlations, lifeEvent, growth, benchmarks, peakMoment, topTopics, funFacts, compliment, yearOneLine
- [ ] Every template includes at least one number from the fact's `dataPoints`
- [ ] No generic copy in any template (no "Curious Mind", no "Great year!")
- [ ] Nullable fields (`trajectory`, `lifeEvent`, `growth`) correctly return `null` when no matching facts exist
- [ ] `_placeholderSlides` is populated with field names of null/empty fields
- [ ] Multiple template variants exist for each field (2-3 variants)
- [ ] Output is fully deterministic given the same input
- [ ] Hook selection prefers behavioral patterns over benchmarks (same logic as Fact Engine)
- [ ] Large numbers are formatted with commas
- [ ] Zero-value data points are handled gracefully
- [ ] No imports from detector files or LLM module — only from the shared types file

---

## Dependencies

| Direction | Task | Relationship |
|-----------|------|-------------|
| **Depends on** | Task 0 (Interface Contracts) | Needs `InsightFact` and `WrappedInsightsV3` types |
| **Depends on** | Task 2 (Fact Engine) | Consumes `InsightFact[]` — the verified facts used for template substitution |
| **Unblocks** | Task 5A (Backend Integration) | Used as the fallback when LLM is unavailable |
| **Unblocks** | Task 5B (End-to-End Testing) | Tested as the client-path output generator |
