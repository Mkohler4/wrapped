# Task 3A: LLM Narrative Prompt

> **Phase:** 3 — Narrative + Validation  
> **Task ID:** 3A  
> **Estimated Effort:** 0.5 day  
> **Status:** Not Started

---

## Context Summary

You are working on **ChatGPT Wrapped** — a "Spotify Wrapped"-style experience that analyzes a user's ChatGPT data export and presents personalized insights as a 16-slide poster-style deck. The system has three layers: a **deterministic Fact Engine** that computes verified insights, a **Narrative Layer** (this task) that rewrites facts into punchy, Wrapped-style copy, and a **Presentation Layer** that renders slides.

This task builds the **LLM Narrative Writer** — the component that takes verified `InsightFact` objects from the Fact Engine and prompts an LLM to produce entertaining, shareable copy for each slide. The LLM is **not allowed to invent facts or numbers** — it only rephrases what the Fact Engine produced. Think of it as a copywriter who receives a research brief and writes headlines.

---

## Goal

Implement the LLM narrative prompt and the function that sends verified facts to the LLM and parses the response into a `WrappedInsightsV3` object.

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

### 1. System Prompt

The LLM system prompt must enforce these rules:

```
You are a writer for a "Spotify Wrapped" style experience about ChatGPT usage.

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
12. Fun facts should be quirky and specific — the humor comes from specificity, not jokes
13. Every field must contain at least one number from the verified facts
14. The hook must be a SINGLE sentence. Not two. Not a paragraph. One line.
```

### 2. Banned Phrase List

The following phrases must **never** appear in LLM output. Include this list in the prompt as a hard constraint, and also check post-generation:

```typescript
const BANNED_PHRASES = [
  'The Curious Mind',
  'Always asking questions',
  'You have a lot of conversations',
  'Wise and nocturnal',
  'a true',
  'a real',
  'You\'re a',          // Usually leads to generic labels
  'rubber duck',
  'jack of all trades',
  'Renaissance man',
  'Renaissance woman',
  'deep thinker',
  'power user',         // Only allowed with a percentile: "top 2% power user"
  'quite the',
  'truly',
  'certainly',
  'definitely a',
  'an avid',
  'a passionate',
  'a dedicated',
];
```

### 3. Prompt Structure

The user message sent to the LLM should follow this structure:

```
VERIFIED FACTS (sorted by wow score):
[fact-id-1] (wow: 9, category: trajectory) Raw narrative text here...
[fact-id-2] (wow: 8, category: benchmark) Raw narrative text here...
[fact-id-3] (wow: 7, category: correlation) Raw narrative text here...
...

YEAR AT A GLANCE DATA:
totalConversations: 1427
totalMessages: 8934
activeDays: 312
totalDays: 365
firstConversation: "January 3, 2025"
timespan: "January – December 2025"

TOP TOPICS: coding, writing, career

HOOK FACT ID: [the pre-selected hook fact ID from the Fact Engine]

OUTPUT: Return ONLY valid JSON matching the WrappedInsightsV3 schema. No markdown, no explanation, no code fences.
```

### 4. Temperature and Model Selection

- **Model:** Use the same model the server path currently uses (likely GPT-4o or similar). Do not hardcode — make the model configurable.
- **Temperature:** Start at `0.7` (balance between factual accuracy and creative flair). If validation failures are high, lower to `0.5`. Make this configurable.
- **Max tokens:** 2000 (the output is JSON with ~16 fields, each a sentence or two).

### 5. Response Parsing

Parse the LLM response as JSON. Handle common LLM response issues:
- Strip markdown code fences (` ```json `) if present.
- Extract the first `{...}` block from the response.
- Pass the result to the validation pipeline (Task 3C) for quality checks.

### 6. Retry Logic

If the LLM response fails parsing or validation:
1. **First retry:** Same prompt, temperature reduced to `0.3`.
2. **Second retry:** If still fails, return `null` and let the template fallback (Task 3B) handle it.

Do NOT retry more than twice. The template fallback produces acceptable output.

### 7. Fact ID Citations

Every field in the output should map back to a `factId`. The hook already has this. For other fields, the LLM should include the source fact's ID. This enables the validation pipeline (Task 3C) to verify that numbers in the output match numbers in the input facts.

---

## File Ownership

| File | Action |
|------|--------|
| `src/lib/narrative/llm-prompt.ts` | **CREATE** — Contains the system prompt, `generateNarrative()` function, banned phrase list, response parsing, and retry logic. |

**Do NOT** edit any other files. This module sends facts to the LLM and returns parsed output. It does not call the Fact Engine or the validation pipeline — those are wired together in Phase 5.

---

## Edge Cases & Constraints

| Scenario | Expected Behavior |
|----------|-------------------|
| **LLM returns markdown-wrapped JSON** | Strip code fences and parse. |
| **LLM returns explanation text before/after JSON** | Extract the first `{...}` block. |
| **LLM invents a number not in the facts** | Caught by validation pipeline (Task 3C). This module should include the rule in the prompt but doesn't need to validate itself. |
| **LLM returns a banned phrase** | Caught by validation pipeline. Include the ban list in the prompt to minimize occurrence. |
| **LLM returns incomplete JSON** | First retry at lower temperature. Second failure returns `null`. |
| **LLM is unavailable (network error, timeout)** | Return `null` immediately. Template fallback handles it. |
| **No facts provided** | Should not happen (Fact Engine guarantees minimum 5). If it does, return `null`. |
| **Hook fact ID doesn't match any fact** | Use the highest wowScore fact of any category as the hook. |

---

## Acceptance Criteria

- [ ] `generateNarrative()` function exists and is exported from `src/lib/narrative/llm-prompt.ts`
- [ ] Function signature: `(facts: InsightFact[], yearData: YearAtAGlanceData, hookFactId: string, options?: { model?: string, temperature?: number }) => Promise<WrappedInsightsV3 | null>`
- [ ] System prompt enforces all 14 rules listed above
- [ ] Banned phrase list is included in the prompt
- [ ] Response parsing handles markdown-wrapped JSON and extra text
- [ ] Retry logic: temperature reduction on first retry, `null` on second failure
- [ ] No more than 2 retries
- [ ] Model and temperature are configurable
- [ ] Max token limit is set appropriately (2000)
- [ ] Function returns `null` on LLM failure (does not throw)
- [ ] No imports from detector files — only from the shared types file

---

## Dependencies

| Direction | Task | Relationship |
|-----------|------|-------------|
| **Depends on** | Task 0 (Interface Contracts) | Needs `InsightFact` and `WrappedInsightsV3` types |
| **Depends on** | Task 2 (Fact Engine) | Consumes `InsightFact[]` — the verified facts that the LLM rewrites |
| **Unblocks** | Task 3C (Validation Pipeline) | Validation runs on this module's output |
| **Unblocks** | Task 5A (Backend Integration) | Integration wires this into the server API endpoint |
