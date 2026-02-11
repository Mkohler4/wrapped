# Task 1C: Growth Signal Detector

> **Phase:** 1 — Data Signals  
> **Task ID:** 1C  
> **Estimated Effort:** 0.5 day  
> **Status:** Not Started

---

## Context Summary

You are working on **ChatGPT Wrapped** — a "Spotify Wrapped"-style experience that analyzes a user's ChatGPT data export and presents personalized insights as a 16-slide poster-style deck. The system has a **deterministic Fact Engine** that computes insights from raw data, a **Narrative Layer** that rewrites facts into punchy copy, and a **Presentation Layer** that renders the slides.

This task builds the **Growth Signal Detector** — one of 5 parallel detectors in Phase 1. This detector answers: **"How has the user evolved over time in how they use ChatGPT?"** It produces insights like "Your messages went from 8 words to 200-word paragraphs — you learned how to talk to AI." Growth recognition is medium-high wow factor because it reflects the user's own development back at them.

---

## Goal

Implement a `detectGrowth()` function that takes an array of `ConversationRecord` objects and returns `GrowthSignal[]` capturing how the user's behavior evolved from their early conversations to their recent ones.

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
```

### Output

```typescript
interface GrowthSignal {
  id: string;
  type: 'message_sophistication' | 'topic_expansion' | 'code_evolution' | 'usage_growth';
  description: string;
  earlyValue: number;
  recentValue: number;
  changeRatio: number;
  timespan: string;             // "8 months"
}
```

---

## Detailed Requirements

### Time Slicing

Sort conversations by `create_time` ascending. Split into:
- **Early slice:** First 25% of conversations (chronologically)
- **Recent slice:** Last 25% of conversations (chronologically)

The middle 50% is ignored for growth comparison — we want the contrast between beginning and end.

### Growth Signal Types to Detect

#### 1. Message Sophistication (`message_sophistication`)

Compare the average user message length (character count) between the early and recent slices.

**Trigger:** Recent average > early average × 1.5 (messages are at least 50% longer).

```typescript
const earlyAvgLen = avg(earlySlice.flatMap(c =>
  c.messages.filter(m => m.role === 'user').map(m => m.text.length)
));
const recentAvgLen = avg(recentSlice.flatMap(c =>
  c.messages.filter(m => m.role === 'user').map(m => m.text.length)
));

if (recentAvgLen > earlyAvgLen * 1.5) {
  signals.push({
    id: 'message-length-growth',
    type: 'message_sophistication',
    description: `Average message grew from ${Math.round(earlyAvgLen)} to ${Math.round(recentAvgLen)} characters`,
    earlyValue: Math.round(earlyAvgLen),
    recentValue: Math.round(recentAvgLen),
    changeRatio: recentAvgLen / earlyAvgLen,
    timespan: computeTimespan(earlySlice, recentSlice),
  });
}
```

#### 2. Topic Expansion (`topic_expansion`)

Count the number of unique topics (from `topic_tags[0]`) in the early slice vs. the recent slice.

**Trigger:** Recent unique topic count > early unique topic count × 1.5 **AND** recent count > 5.

```typescript
const earlyTopicCount = new Set(earlySlice.map(c => c.topic_tags[0]).filter(Boolean)).size;
const recentTopicCount = new Set(recentSlice.map(c => c.topic_tags[0]).filter(Boolean)).size;

if (recentTopicCount > earlyTopicCount * 1.5 && recentTopicCount > 5) {
  signals.push({
    id: 'topic-expansion',
    type: 'topic_expansion',
    description: `Went from ${earlyTopicCount} topics to ${recentTopicCount}`,
    earlyValue: earlyTopicCount,
    recentValue: recentTopicCount,
    changeRatio: recentTopicCount / earlyTopicCount,
    timespan: computeTimespan(earlySlice, recentSlice),
  });
}
```

#### 3. Code Evolution (`code_evolution`)

Compare the percentage of user messages containing code blocks between the early and recent slices.

**Trigger:** Recent code ratio > early code ratio × 2 **AND** recent code ratio > 0.1 (at least 10% of messages have code).

```typescript
const earlyCodeRatio = earlySlice.flatMap(c => c.messages.filter(m => m.role === 'user'))
  .filter(m => m.has_code_block).length / totalEarlyUserMessages;
const recentCodeRatio = recentSlice.flatMap(c => c.messages.filter(m => m.role === 'user'))
  .filter(m => m.has_code_block).length / totalRecentUserMessages;

if (recentCodeRatio > earlyCodeRatio * 2 && recentCodeRatio > 0.1) {
  signals.push({
    id: 'code-evolution',
    type: 'code_evolution',
    description: `Code usage went from ${pct(earlyCodeRatio)} to ${pct(recentCodeRatio)}`,
    earlyValue: earlyCodeRatio,
    recentValue: recentCodeRatio,
    changeRatio: recentCodeRatio / (earlyCodeRatio || 0.01), // avoid division by zero
    timespan: computeTimespan(earlySlice, recentSlice),
  });
}
```

#### 4. Usage Growth (`usage_growth`)

Compare the conversation frequency (conversations per month) between the early period and recent period.

**Trigger:** Recent monthly rate > early monthly rate × 2 (doubled their usage).

### Helper: `computeTimespan()`

Given the early and recent slices, compute a human-readable timespan string:
- Calculate the months between the median `create_time` of the early slice and the median of the recent slice.
- Return a string like `"8 months"` or `"1 year"`.

---

## File Ownership

| File | Action |
|------|--------|
| `src/lib/detectors/growth.ts` | **CREATE** — Contains `detectGrowth()` and all helper functions. |

**Do NOT** edit any other files. Do not import from other detector files. Code against the interface contracts only.

---

## Edge Cases & Constraints

| Scenario | Expected Behavior |
|----------|-------------------|
| **Empty conversations array** | Return an empty `GrowthSignal[]`. |
| **Fewer than 8 conversations** | The 25% slices would be very small (1-2 conversations). Return empty — not enough data for meaningful growth comparison. |
| **All conversations in the same month** | `timespan` should be `"<1 month"` or similar. Signals are still valid if the thresholds are met. |
| **No topic tags on any conversation** | Cannot compute `topic_expansion`. Still compute other signals. |
| **No code blocks in any message** | Cannot compute `code_evolution`. Still compute other signals. |
| **Early slice has 0 code blocks** | Use a small epsilon (0.01) as divisor instead of 0 to compute `changeRatio`. |
| **User got LESS sophisticated over time** | Do not report negative growth. The system only surfaces positive evolution — it's a compliment, not a report card. |
| **Division by zero** | Protect all ratio calculations. If early value is 0, use 1 (or 0.01 for ratios) as denominator. |

---

## Acceptance Criteria

- [ ] `detectGrowth()` function exists and is exported from `src/lib/detectors/growth.ts`
- [ ] Function signature: `(conversations: ConversationRecord[]) => GrowthSignal[]`
- [ ] Detects message sophistication growth (average message length increase ≥1.5x)
- [ ] Detects topic expansion (unique topic count increase ≥1.5x AND >5 recent topics)
- [ ] Detects code evolution (code block ratio increase ≥2x AND >10% recent code)
- [ ] Detects usage growth (monthly conversation rate increase ≥2x)
- [ ] Only reports positive growth — no negative signals
- [ ] All `changeRatio` values are protected from division by zero
- [ ] `timespan` is a human-readable string ("8 months", "1 year", etc.)
- [ ] Empty input returns an empty array, not an error
- [ ] Fewer than 8 conversations returns an empty array
- [ ] No imports from other detector files — only from the shared types file

---

## Dependencies

| Direction | Task | Relationship |
|-----------|------|-------------|
| **Depends on** | Task 0 (Interface Contracts) | Needs `ConversationRecord` and `GrowthSignal` types |
| **Unblocks** | Task 2 (Fact Engine) | Fact Engine consumes `GrowthSignal[]` to generate growth `InsightFact` objects |
