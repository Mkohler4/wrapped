# Task 1A: Temporal Analysis Detector

> **Phase:** 1 — Data Signals  
> **Task ID:** 1A  
> **Estimated Effort:** 1 day  
> **Status:** Not Started

---

## Context Summary

You are working on **ChatGPT Wrapped** — a "Spotify Wrapped"-style experience that analyzes a user's ChatGPT data export and presents personalized insights as a 16-slide poster-style deck. The system has a **deterministic Fact Engine** that computes insights from raw data, a **Narrative Layer** that rewrites facts into punchy copy, and a **Presentation Layer** that renders the slides.

This task builds the **Temporal Analysis Detector** — one of 5 parallel detectors in Phase 1. This detector answers the question: **"How did the user's behavior and topics change over time?"** It produces trajectory insights like "You went from Python basics in March to deploying ML models by November" — the highest wow-factor insight category in the system.

---

## Goal

Implement a `computeTemporalProfile()` function that takes an array of `ConversationRecord` objects and returns a `TemporalProfile` containing monthly topic breakdowns, topic transition arcs, and a usage trend curve.

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
```

---

## Detailed Requirements

### 1. Monthly Topic Bucketing

Group all conversations by month (format: `"YYYY-MM"`). For each month, compute:
- **Top topics:** The 1–3 most frequent topic tags from `conversation.topic_tags[0]` (primary topic) for conversations in that month.
- **Conversation count:** How many conversations happened that month.
- **Average message length:** Average character length of user messages across all conversations that month.

**SQL-equivalent logic:**

```sql
SELECT
  strftime('%Y-%m', datetime(create_time, 'unixepoch')) as month,
  json_extract(topic_tags, '$[0]') as primary_topic,
  COUNT(*) as conv_count
FROM conversations
GROUP BY month, primary_topic
ORDER BY month;
```

Implement this in TypeScript, operating on the in-memory `ConversationRecord[]` array.

### 2. Topic Transition Matrix (Topic Arcs)

Detect when the user's **dominant topic shifted** from one month to the next. A topic arc is defined as:
- The dominant topic in month N is different from the dominant topic in month N+K (where K ≥ 2 months).
- The transition represents a meaningful shift (not just noise from a single conversation).

**Logic:**
1. For each month, find the dominant topic (most frequent primary topic).
2. Walk through months chronologically. When the dominant topic changes and stays changed for ≥2 consecutive months, record a topic arc.
3. Each arc has: `from` (the old dominant topic), `to` (the new dominant topic), `transitionMonth` (the first month with the new topic dominant), and `monthsSpan` (how many months the old topic was dominant before the shift).

**Example output:**
```typescript
{
  from: "react-basics",
  to: "react-advanced",
  transitionMonth: "2024-04",
  monthsSpan: 3  // was dominant Jan-Mar
}
```

### 3. Usage Trend Curve

Compute the overall usage shape:
- **First month:** The earliest month with data — its conversation count and month label.
- **Peak month:** The month with the highest conversation count.
- **Recent month:** The most recent month with data.
- **Growth multiplier:** `peakMonth.count / firstMonth.count`. If `firstMonth.count` is 0, use 1 as denominator.

### 4. Keyword Evolution (Optional Enhancement)

If feasible, sample the first 3 months and last 3 months of conversations and extract the most frequent words from user messages (excluding stop words). This enables insights like "Early you talked about 'basics' and 'tutorial.' Recent you talks about 'architecture' and 'deployment.'" This is an optional enhancement — prioritize the three required computations above.

---

## File Ownership

| File | Action |
|------|--------|
| `src/lib/detectors/temporal.ts` | **CREATE** — Contains `computeTemporalProfile()` and all helper functions. |

**Do NOT** edit any other files. Do not import from other detector files. Code against the interface contracts only.

---

## Edge Cases & Constraints

| Scenario | Expected Behavior |
|----------|-------------------|
| **Empty conversations array** | Return a `TemporalProfile` with empty `monthlyTopics`, empty `topicArcs`, and a `usageTrend` with zero counts and `growthMultiplier: 1`. |
| **Only 1 conversation** | `monthlyTopics` has one entry. `topicArcs` is empty (no transitions possible). `usageTrend` has first = peak = recent, multiplier = 1. |
| **Only 1 month of data** | `monthlyTopics` has one entry. `topicArcs` is empty. Trend shows same month for first/peak/recent. |
| **No topic tags on conversations** | Use `"uncategorized"` as the topic. Still compute monthly counts and message lengths. |
| **Conversations with `create_time` of 0 or null** | Skip these conversations. Do not let them corrupt the monthly bucketing. |
| **Multiple topics tied for dominant** | Pick the first alphabetically for consistency. |
| **Months with 0 conversations (gaps)** | Do not include empty months in `monthlyTopics`. The arc detection should handle gaps — a 2-month gap doesn't break an arc. |

---

## Acceptance Criteria

- [ ] `computeTemporalProfile()` function exists and is exported from `src/lib/detectors/temporal.ts`
- [ ] Function signature: `(conversations: ConversationRecord[]) => TemporalProfile`
- [ ] Monthly topics are correctly bucketed with accurate conversation counts
- [ ] Topic arcs are detected when dominant topics shift across months
- [ ] Usage trend curve correctly identifies first, peak, and recent months
- [ ] Growth multiplier is computed correctly (peak / first, with division-by-zero protection)
- [ ] Empty input returns a valid (empty) `TemporalProfile`, not an error
- [ ] Single-conversation input returns a valid profile with no arcs
- [ ] Single-month input returns a valid profile with no arcs
- [ ] Conversations with missing/invalid `create_time` are skipped gracefully
- [ ] No imports from other detector files — only from the shared types file

---

## Dependencies

| Direction | Task | Relationship |
|-----------|------|-------------|
| **Depends on** | Task 0 (Interface Contracts) | Needs `ConversationRecord` and `TemporalProfile` types |
| **Soft dependency from** | Task 1D (Life Event Detector) | 1D can optionally reuse monthly topic data from this detector, but can also compute its own |
| **Unblocks** | Task 2 (Fact Engine) | Fact Engine consumes `TemporalProfile` to generate trajectory `InsightFact` objects |
