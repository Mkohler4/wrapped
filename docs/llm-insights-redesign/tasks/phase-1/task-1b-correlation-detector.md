# Task 1B: Behavioral Correlation Detector

> **Phase:** 1 — Data Signals  
> **Task ID:** 1B  
> **Estimated Effort:** 1 day  
> **Status:** Not Started

---

## Context Summary

You are working on **ChatGPT Wrapped** — a "Spotify Wrapped"-style experience that analyzes a user's ChatGPT data export and presents personalized insights as a 16-slide poster-style deck. The system has a **deterministic Fact Engine** that computes insights from raw data, a **Narrative Layer** that rewrites facts into punchy copy, and a **Presentation Layer** that renders the slides.

This task builds the **Behavioral Correlation Detector** — one of 5 parallel detectors in Phase 1. This detector answers: **"What non-obvious connections exist between the user's behaviors?"** It finds patterns like "You code during the day and write fiction at night" or "Your conversations get 3x longer after 11 PM." These are high wow-factor insights because they reveal patterns the user never noticed about themselves.

---

## Goal

Implement a `detectCorrelations()` function that takes an array of `ConversationRecord` objects and returns `BehavioralCorrelation[]` sorted by correlation strength, descending.

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
interface BehavioralCorrelation {
  id: string;
  description: string;          // "Conversations 3x longer after 11pm"
  dimension1: string;           // "time_of_day"
  dimension2: string;           // "message_length"
  strength: number;             // 0-1, how strong the correlation is
  dataPoints: Record<string, number | string>;
}
```

---

## Detailed Requirements

### Correlation Types to Detect

Implement the following cross-tabulations. Each one compares two behavioral dimensions and looks for significant deviations from the user's own baseline.

#### 1. Time-of-Day × Message Length (Night Owl Detection)

Split conversations into "day" (6:00–21:59) and "night" (22:00–05:59) based on the user message's `create_time`. Compute the average user message length (character count) for each period.

**Trigger:** Night average > day average × 1.5 (i.e., messages are at least 50% longer at night).

```typescript
// Reference implementation:
const dayMessages = conversations.filter(c => {
  const hour = new Date(c.create_time * 1000).getHours();
  return hour >= 6 && hour < 22;
});
const nightMessages = conversations.filter(c => {
  const hour = new Date(c.create_time * 1000).getHours();
  return hour >= 22 || hour < 6;
});

const dayAvgLength = avgUserMessageLength(dayMessages);
const nightAvgLength = avgUserMessageLength(nightMessages);

if (nightAvgLength > dayAvgLength * 1.5) {
  correlations.push({
    id: 'night-longer-messages',
    description: `Conversations ${Math.round(nightAvgLength / dayAvgLength)}x longer after 10 PM`,
    dimension1: 'time_of_day',
    dimension2: 'message_length',
    strength: Math.min(nightAvgLength / dayAvgLength / 5, 1), // normalize to 0-1
    dataPoints: { dayAvg: Math.round(dayAvgLength), nightAvg: Math.round(nightAvgLength) },
  });
}
```

**Minimum sample:** At least 20 night conversations to report this pattern.

#### 2. Time-of-Day × Topic (Day/Night Behavioral Split)

Find the dominant topic during day hours and night hours. If they differ, the user has a "behavioral split."

```typescript
const dayTopics = topTopics(dayConversations);   // Most frequent topic_tags[0]
const nightTopics = topTopics(nightConversations);

if (dayTopics[0] !== nightTopics[0] && nightConversations.length >= 15) {
  correlations.push({
    id: 'day-night-topic-split',
    description: `${dayTopics[0]} during the day, ${nightTopics[0]} at night`,
    dimension1: 'time_of_day',
    dimension2: 'topic',
    strength: 0.8,  // High strength — this is a very shareable pattern
    dataPoints: { dayTopic: dayTopics[0], nightTopic: nightTopics[0],
                  dayCount: dayConversations.length, nightCount: nightConversations.length },
  });
}
```

**Minimum sample:** At least 15 night conversations with topic data.

**SQL-equivalent logic:**

```sql
SELECT
  CASE WHEN CAST(strftime('%H', datetime(c.create_time, 'unixepoch')) AS INT) >= 22
       OR CAST(strftime('%H', datetime(c.create_time, 'unixepoch')) AS INT) < 6
    THEN 'night' ELSE 'day' END as period,
  json_extract(c.topic_tags, '$[0]') as topic,
  COUNT(*) as count
FROM conversations c
GROUP BY period, topic
ORDER BY count DESC;
```

#### 3. Day-of-Week × Message Length (Mid-Week Fatigue)

Compute average user message length for each day of the week (0=Sunday, 6=Saturday). Find the day with the shortest messages and the day with the longest. If the difference is ≥40%, report it.

**Example output:** "On Wednesdays, your messages are 40% shorter. Mid-week fatigue?"

**Minimum sample:** At least 10 conversations for the shortest-day and longest-day groups.

#### 4. Day-of-Week × Conversation Frequency (Planning Mondays, Creative Fridays)

Count conversations per day of week. Find the day with the highest count. If it's ≥50% above the average, report it.

**Example output:** "You ask the most questions on Mondays — planning your week?"

**Minimum sample:** At least 50 total conversations (so each DOW has a reasonable sample).

### Strength Scoring

Each correlation gets a `strength` score from 0 to 1:
- **0.0–0.3:** Weak correlation. Don't surface.
- **0.3–0.6:** Moderate. Surface only if nothing better exists.
- **0.6–1.0:** Strong. Definitely surface.

For ratio-based correlations (night/day length), normalize: `strength = Math.min(ratio / 5, 1)`.
For topic splits, start at 0.8 (inherently interesting).
For DOW patterns, base on deviation from mean: `strength = Math.min(deviation / 2, 1)`.

### Return

Sort all detected correlations by `strength` descending. Return the full array — the Fact Engine will decide how many to use.

---

## File Ownership

| File | Action |
|------|--------|
| `src/lib/detectors/correlations.ts` | **CREATE** — Contains `detectCorrelations()` and all helper functions. |

**Do NOT** edit any other files. Do not import from other detector files. Code against the interface contracts only.

---

## Edge Cases & Constraints

| Scenario | Expected Behavior |
|----------|-------------------|
| **Empty conversations array** | Return an empty `BehavioralCorrelation[]`. |
| **Fewer than 20 night conversations** | Do not report time-of-day × message length correlation. |
| **Fewer than 15 night conversations** | Do not report time-of-day × topic split. |
| **Fewer than 50 total conversations** | Do not report day-of-week patterns. |
| **All conversations at the same time of day** | No time-based correlations. Return empty or only DOW patterns if eligible. |
| **No topic tags on any conversation** | Cannot compute topic split. Only report message length correlations. |
| **Same dominant topic day and night** | No topic split to report. Only report message length differences. |
| **Very low conversation count (<10)** | Return empty. Minimum thresholds are not met for any correlation type. |

---

## Acceptance Criteria

- [ ] `detectCorrelations()` function exists and is exported from `src/lib/detectors/correlations.ts`
- [ ] Function signature: `(conversations: ConversationRecord[]) => BehavioralCorrelation[]`
- [ ] Detects time-of-day × message length correlations (night owl pattern) with ≥1.5x threshold
- [ ] Detects time-of-day × topic splits (day/night behavioral split)
- [ ] Detects day-of-week × message length patterns (mid-week fatigue)
- [ ] Detects day-of-week × conversation frequency patterns
- [ ] All correlations have a `strength` score between 0 and 1
- [ ] Results are sorted by strength descending
- [ ] Minimum sample thresholds are enforced (20 night convos, 15 night convos with topics, 50 total for DOW)
- [ ] Empty input returns an empty array, not an error
- [ ] No imports from other detector files — only from the shared types file

---

## Dependencies

| Direction | Task | Relationship |
|-----------|------|-------------|
| **Depends on** | Task 0 (Interface Contracts) | Needs `ConversationRecord` and `BehavioralCorrelation` types |
| **Unblocks** | Task 2 (Fact Engine) | Fact Engine consumes `BehavioralCorrelation[]` to generate correlation `InsightFact` objects |
