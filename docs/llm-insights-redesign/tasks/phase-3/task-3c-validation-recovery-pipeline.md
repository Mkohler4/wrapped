# Task 3C: Validation & Recovery Pipeline

> **Phase:** 3 — Narrative + Validation  
> **Task ID:** 3C  
> **Estimated Effort:** 0.5 day  
> **Status:** Not Started

---

## Context Summary

You are working on **ChatGPT Wrapped** — a "Spotify Wrapped"-style experience that analyzes a user's ChatGPT data export and presents personalized insights as a 16-slide poster-style deck. The system has three layers: a **deterministic Fact Engine**, a **Narrative Layer** (LLM or templates), and a **Presentation Layer**.

This task builds the **Validation & Recovery Pipeline** — the safety net that ensures users **never** see malformed JSON, generic filler content, or invented numbers. It has two responsibilities: (1) recovering from malformed LLM output (JSON parse failures), and (2) validating content quality (banned phrases, fact accuracy, specificity). This is the last gate before output reaches the user.

---

## Goal

Implement a multi-tier recovery pipeline for malformed JSON, a content quality validator, and the logic to delete the legacy hardcoded fallback block. The pipeline must ensure that every output is either valid `WrappedInsightsV3` or a gracefully degraded version with `_placeholderSlides`.

---

## Interface Contracts

### Input

```typescript
// Raw LLM response (string) — may be malformed JSON
// InsightFact[] — verified facts for number cross-referencing

interface InsightFact {
  id: string;
  category: 'trajectory' | 'benchmark' | 'correlation' | 'growth' | 'life_event';
  wowScore: number;
  rawNarrative: string;
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

interface ValidationResult {
  valid: boolean;
  insights: WrappedInsightsV3 | null;
  warnings: string[];           // Non-fatal issues (e.g., banned phrase replaced)
  errors: string[];             // Fatal issues that triggered recovery
  recoveryTier: 0 | 1 | 2 | 3; // 0 = no recovery needed, 1 = parse success, 2 = AI reformat, 3 = field removal
}
```

---

## Detailed Requirements

### 1. Multi-Tier JSON Recovery

This is the format recovery pipeline. It triggers **only on JSON parse failures**, not on content quality issues.

#### Tier 1: Direct Parse

```typescript
function tier1Parse(rawResponse: string): WrappedInsightsV3 | null {
  try {
    // Strip markdown code fences if present
    const cleaned = rawResponse
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '');

    // Try to extract JSON object
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;

    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}
```

**Expected success rate:** ~90% of LLM responses parse on first attempt.

#### Tier 2: AI Reformat

If Tier 1 fails, send the malformed response to a secondary LLM call to extract valid JSON.

```typescript
async function tier2AIReformat(rawResponse: string): Promise<WrappedInsightsV3 | null> {
  if (!rawResponse || rawResponse.length === 0) return null;

  const expectedFields = 'hook, yearAtAGlance, trajectory, correlations, lifeEvent, growth, benchmarks, peakMoment, topTopics, funFacts, compliment, yearOneLine';

  try {
    const reformatResponse = await llmCall({
      systemPrompt: 'You are a JSON repair tool. Extract the data from the malformed response and return ONLY valid JSON. Do not invent data. Do not add fields that are not present in the input.',
      userMessage: `EXPECTED FIELDS: ${expectedFields}\n\nMALFORMED RESPONSE:\n${rawResponse.slice(-8000)}`,
      model: 'gpt-4o-mini',   // Fast, cheap model for reformatting
      maxTokens: 1200,
      temperature: 0.1,        // Near-deterministic for format correction
    });

    const match = reformatResponse.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}
```

**Expected success rate:** ~99% of Tier 1 failures recovered.

#### Tier 3: Field-Level Removal

If Tier 2 also fails (or returns partially valid JSON), validate each field individually. Remove fields with invalid format. The user sees fewer slides but never generic filler.

```typescript
function tier3FieldRemoval(insights: any): Partial<WrappedInsightsV3> {
  const expectedFields: Record<string, 'object' | 'string' | 'array'> = {
    hook: 'object',
    yearAtAGlance: 'object',
    trajectory: 'object',
    correlations: 'array',
    lifeEvent: 'object',
    growth: 'object',
    benchmarks: 'array',
    peakMoment: 'object',
    topTopics: 'array',
    funFacts: 'array',
    compliment: 'string',
    yearOneLine: 'string',
  };

  const cleaned: any = {};
  const removed: string[] = [];

  for (const [field, type] of Object.entries(expectedFields)) {
    const v = insights[field];
    const valid =
      type === 'object' ? (v && typeof v === 'object' && !Array.isArray(v)) :
      type === 'array'  ? (Array.isArray(v) && v.length > 0) :
      (typeof v === 'string' && v.trim().length > 0);

    if (valid) {
      cleaned[field] = v;
    } else {
      removed.push(field);
    }
  }

  if (removed.length > 0) {
    cleaned._placeholderSlides = removed;
  }

  return cleaned;
}
```

**This always succeeds** — it just might produce a sparse output.

### 2. Content Quality Validation

Runs on **successfully parsed JSON**. Separate from format recovery.

#### 2a. Number Verification

Every number in the output must appear in the input facts' `dataPoints`. This prevents the LLM from inventing statistics.

```typescript
function verifyNumbers(output: WrappedInsightsV3, facts: InsightFact[]): string[] {
  const validNumbers = new Set<number>();
  for (const fact of facts) {
    for (const value of Object.values(fact.dataPoints)) {
      if (typeof value === 'number') validNumbers.add(value);
    }
  }

  const warnings: string[] = [];
  // Walk all string fields in the output and extract numbers
  const outputNumbers = extractNumbersFromStrings(output);
  for (const num of outputNumbers) {
    if (!validNumbers.has(num) && !isCommonNumber(num)) {
      warnings.push(`Number ${num} in output not found in input facts`);
    }
  }
  return warnings;
}

// Numbers like 1, 2, 3, 100, percentages derived from percentile values
// are allowed without being in the facts
function isCommonNumber(n: number): boolean {
  return n <= 10 || n === 100 || (n >= 1 && n <= 100 && n % 1 === 0);
}
```

#### 2b. Banned Phrase Rejection

Check all string fields against the banned phrase list. If a banned phrase is found, log a warning. The validation result should flag it.

```typescript
const BANNED_PHRASES = [
  'The Curious Mind',
  'Always asking questions',
  'You have a lot of conversations',
  'Wise and nocturnal',
  'a true',
  'a real',
  'You\'re a',
  'rubber duck',
  'jack of all trades',
  'Renaissance man',
  'Renaissance woman',
  'deep thinker',
  'power user',
  'quite the',
  'truly',
  'certainly',
  'definitely a',
  'an avid',
  'a passionate',
  'a dedicated',
];

function checkBannedPhrases(output: WrappedInsightsV3): string[] {
  const allText = extractAllStrings(output).join(' ').toLowerCase();
  return BANNED_PHRASES
    .filter(phrase => allText.includes(phrase.toLowerCase()))
    .map(phrase => `Banned phrase detected: "${phrase}"`);
}
```

**Note:** "power user" is allowed when accompanied by a percentile (e.g., "top 2% power user"). Only ban standalone usage.

#### 2c. Minimum Specificity Check

Every string field with narrative content must contain at least one number. If a field is a sentence that could apply to any user ("You had a great year!"), flag it.

```typescript
function checkSpecificity(text: string): boolean {
  return /\d/.test(text); // At minimum, contains a number
}
```

### 3. Delete Legacy Hardcoded Fallback

Find and **delete** the existing hardcoded fallback block in the codebase. This is the code that returns:

```typescript
insights = {
  personality: { title: 'The Curious Mind', description: 'Always asking questions!' },
  // ... all hardcoded
};
```

**This code path must be removed entirely.** No code should ever serve hardcoded generic content. The template fallback engine (Task 3B) replaces this role.

**Note:** The exact file location needs to be found in the codebase. Based on the design doc, it's likely in `server.ts` around lines 1290-1307 (the parse failure handler).

### 4. Main Validation Pipeline Function

```typescript
async function validateAndRecover(
  rawResponse: string | null,
  facts: InsightFact[],
  options?: { skipAIReformat?: boolean }
): Promise<ValidationResult> {
  // 1. If rawResponse is null, return failure (caller should use template fallback)
  // 2. Tier 1: Try direct parse
  // 3. If parse fails, Tier 2: AI reformat (unless skipAIReformat)
  // 4. If Tier 2 fails, Tier 3: Field-level removal
  // 5. On any successfully parsed output, run content quality checks
  // 6. Return ValidationResult with all details
}
```

---

## File Ownership

| File | Action |
|------|--------|
| `src/lib/narrative/validation.ts` | **CREATE** — Contains all recovery tiers, quality validators, banned phrase list, and the main `validateAndRecover()` function. |
| The existing hardcoded fallback block (likely in `server.ts`) | **DELETE** the hardcoded fallback assignment. Replace with a call to the template fallback engine or a `null` return that triggers proper recovery. |

**Do NOT** edit any other files beyond removing the hardcoded fallback block.

---

## Edge Cases & Constraints

| Scenario | Expected Behavior |
|----------|-------------------|
| **rawResponse is null** | Return `{ valid: false, insights: null, recoveryTier: 0 }`. Caller should use template fallback. |
| **rawResponse is empty string** | Same as null. |
| **rawResponse is valid JSON but wrong schema** | Tier 1 parses it, but Tier 3 field removal strips invalid fields. |
| **rawResponse has all fields valid** | Tier 1 succeeds, quality checks run, `recoveryTier: 1`. |
| **rawResponse is completely garbled** | Tier 1 fails, Tier 2 attempts AI reformat, Tier 3 catches whatever remains. |
| **Quality check finds invented numbers** | Return `warnings` list. Do NOT reject the output — warnings are informational for telemetry. |
| **Quality check finds banned phrases** | Return `warnings` list. Flag for retry in the calling code. |
| **Tier 2 LLM call fails (network error)** | Skip to Tier 3. |
| **All tiers fail** | Return `{ valid: false, insights: null, recoveryTier: 3 }`. Caller must use template fallback. |

---

## Acceptance Criteria

- [ ] `validateAndRecover()` function exists and is exported from `src/lib/narrative/validation.ts`
- [ ] Function signature: `(rawResponse: string | null, facts: InsightFact[], options?: { skipAIReformat?: boolean }) => Promise<ValidationResult>`
- [ ] Tier 1 (direct parse) handles markdown fences and extra text
- [ ] Tier 2 (AI reformat) uses gpt-4o-mini at temperature 0.1
- [ ] Tier 3 (field removal) validates each field type individually
- [ ] `_placeholderSlides` is populated with removed field names
- [ ] Number verification catches invented numbers
- [ ] Banned phrase list matches the specification (18+ phrases)
- [ ] "power user" with a percentile is allowed; standalone "power user" is banned
- [ ] Minimum specificity check requires at least one number in narrative fields
- [ ] `ValidationResult` includes `recoveryTier` indicating which tier was used
- [ ] Legacy hardcoded fallback block is identified and marked for deletion
- [ ] Null/empty input returns a proper failure result without throwing
- [ ] No imports from detector files — only from the shared types file

---

## Dependencies

| Direction | Task | Relationship |
|-----------|------|-------------|
| **Depends on** | Task 0 (Interface Contracts) | Needs `InsightFact` and `WrappedInsightsV3` types |
| **Depends on** | Task 2 (Fact Engine) | Uses `InsightFact[]` for number verification |
| **Consumes output from** | Task 3A (LLM Narrative Prompt) | Validates the LLM's raw response |
| **Unblocks** | Task 5A (Backend Integration) | Integration wires this into the server pipeline |
| **Unblocks** | Task 5B (End-to-End Testing) | Tested with intentionally broken LLM output |
