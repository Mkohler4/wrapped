# Task 1D: Life Event Detector

> **Phase:** 1 — Data Signals  
> **Task ID:** 1D  
> **Estimated Effort:** 0.5 day  
> **Status:** Not Started

---

## Context Summary

You are working on **ChatGPT Wrapped** — a "Spotify Wrapped"-style experience that analyzes a user's ChatGPT data export and presents personalized insights as a 16-slide poster-style deck. The system has a **deterministic Fact Engine** that computes insights from raw data, a **Narrative Layer** that rewrites facts into punchy copy, and a **Presentation Layer** that renders the slides.

This task builds the **Life Event Detector** — one of 5 parallel detectors in Phase 1. This detector answers: **"Was the user going through something — a career change, a learning push, a creative project — based on topic clustering?"** It produces insights like "23 interview-prep threads in September, then silence in October. Something happened." This is medium wow-factor but must be handled with extreme care to avoid being invasive.

---

## Goal

Implement a `detectLifeEvents()` function that takes an array of `ConversationRecord` objects and returns `LifeEventSignal[]` capturing topic velocity spikes that suggest real-world events.

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
interface LifeEventSignal {
  topic: string;
  peakWeeks: string;            // "Sep 1–21, 2024"
  peakCount: number;            // 23 conversations
  baselineCount: number;        // 3 conversations/month normally
  spikeMultiplier: number;      // 7.6x
  resolvedAfter: boolean;       // true if activity dropped to zero/near-zero after
  suggestedNarrative: string;   // "23 interview prep threads in September, then silence"
}
```

---

## Detailed Requirements

### 1. Topic Velocity by Week

Group all conversations by (topic, week). A "week" is a 7-day window aligned to ISO weeks (Monday–Sunday).

For each topic, compute:
- **Weekly baseline:** The average number of conversations per week for that topic across the entire dataset.
- **Weekly peaks:** Any week where the count exceeds 3x the baseline.

### 2. Spike Detection

A spike is a **contiguous window of 1–4 weeks** where a single topic's conversation count exceeds the user's baseline for that topic by a significant multiplier.

**Algorithm:**
1. For each topic with at least 5 total conversations, compute the weekly baseline (total conversations for that topic / total weeks in dataset).
2. Find all weeks where the topic count > 3x baseline.
3. Merge adjacent spike weeks into a single window (e.g., weeks 35, 36, 37 become one spike window).
4. For each spike window, compute:
   - `peakCount`: Total conversations in the spike window.
   - `baselineCount`: The weekly baseline × number of weeks in the window (what you'd expect normally).
   - `spikeMultiplier`: `peakCount / baselineCount`.
5. **Only surface spikes with multiplier ≥ 5x.** A 2–3x spike is normal variation. A 5x+ spike is a signal.

### 3. Drop-Off Detection

After a spike, check if the topic activity dropped to zero or near-zero (≤1 conversation in the 4 weeks following the spike). If yes, set `resolvedAfter: true`. This enables narratives like "23 threads, then silence. Something happened."

### 4. Suggested Narrative Generation

Generate a factual narrative string for each signal. Format: `"{peakCount} {topic} conversations in {peakWeeks}{resolution}"`

Examples:
- `"23 interview-prep conversations in Sep 1–21, then silence"`
- `"34 creative-writing conversations in Mar 1–21"`

**Tone rules:**
- **Never assume specific outcomes.** Say "Something happened" not "You got the job."
- **Keep it playful, not invasive.** This should feel like a wink, not a therapy session.
- **Use neutral language.** "Then silence" is fine. "Then you stopped because..." is not.

### 5. Hard-Blocked Topics

The following topic categories must **never** be surfaced as life events, even if they spike. Skip them entirely:

| Blocked Topic | Reason |
|---------------|--------|
| `debt`, `financial-distress` | Too sensitive |
| `grief`, `loss`, `bereavement` | Too sensitive |
| `abuse`, `domestic-violence` | Too sensitive |
| `addiction`, `substance-abuse` | Too sensitive |

Implementation: Maintain a `BLOCKED_TOPICS` set. Before adding a signal, check if the topic matches any blocked topic (case-insensitive, substring match).

### 6. Cautious Topics

The following topics are allowed but require neutral framing:

| Topic Category | Requirement |
|----------------|-------------|
| Health / medical | No outcome claims. "A burst of health-related conversations" not "You were dealing with illness." |
| Mental health | No outcome claims. Never suggest diagnosis or state. |
| Relationships / sexuality | No assumptions about relationship status or outcomes. |
| Legal / criminal | No assumptions about legal outcomes. |
| Financial planning | Allowed if framed as activity, not distress. |

The `suggestedNarrative` for cautious topics should use the format: "A burst of {topic} conversations in {period}" — no editorializing.

### 7. Return Top 3 Signals

Sort detected signals by `spikeMultiplier` descending. Return at most 3 — the Fact Engine will decide how many to use.

---

## File Ownership

| File | Action |
|------|--------|
| `src/lib/detectors/life-events.ts` | **CREATE** — Contains `detectLifeEvents()`, the blocked topics list, and all helper functions. |

**Do NOT** edit any other files. Do not import from other detector files. Code against the interface contracts only.

---

## Edge Cases & Constraints

| Scenario | Expected Behavior |
|----------|-------------------|
| **Empty conversations array** | Return an empty `LifeEventSignal[]`. |
| **Fewer than 10 conversations** | Not enough data for meaningful spike detection. Return empty. |
| **All conversations are the same topic** | Compute weekly baseline for that topic. If no week spikes above 5x baseline, return empty. |
| **No topic tags on conversations** | Cannot detect life events. Return empty. |
| **A blocked topic spikes** | Skip it entirely. Do not include in output. |
| **Spike window exceeds 4 weeks** | Cap at 4 weeks. Longer sustained activity is a habit, not an event. |
| **Multiple spikes for the same topic** | Report the strongest one (highest multiplier). |
| **User has only 1 month of data** | Still try to detect — weekly spikes within a single month are valid if the threshold is met. |
| **Spike occurs in the last week of data** | Cannot determine `resolvedAfter`. Set to `false`. |
| **Topic baseline is near zero (e.g., 0.1 conversations/week)** | Be careful with multiplier math. If baseline is < 0.5/week and the spike is only 3 conversations, that's noise. Require at least 5 conversations in a spike window to report it. |

---

## Acceptance Criteria

- [ ] `detectLifeEvents()` function exists and is exported from `src/lib/detectors/life-events.ts`
- [ ] Function signature: `(conversations: ConversationRecord[]) => LifeEventSignal[]`
- [ ] Detects topic velocity spikes of ≥5x the user's baseline for that topic
- [ ] Merges adjacent spike weeks into windows (max 4 weeks)
- [ ] Computes `resolvedAfter` by checking if activity dropped to ≤1 conversation in the 4 weeks following
- [ ] Generates factual, neutral `suggestedNarrative` strings
- [ ] Hard-blocked topics (debt/distress, grief/loss, abuse, addiction) are never surfaced
- [ ] Cautious topics use neutral framing with no outcome assumptions
- [ ] Returns at most 3 signals, sorted by spike multiplier descending
- [ ] Requires at least 5 conversations in a spike window to report it
- [ ] Empty input returns an empty array, not an error
- [ ] Fewer than 10 total conversations returns an empty array
- [ ] No imports from other detector files — only from the shared types file

---

## Dependencies

| Direction | Task | Relationship |
|-----------|------|-------------|
| **Depends on** | Task 0 (Interface Contracts) | Needs `ConversationRecord` and `LifeEventSignal` types |
| **Soft dependency on** | Task 1A (Temporal Detector) | Can optionally reuse monthly topic data, but can compute its own weekly bucketing independently. **This is a soft dependency — this task can start immediately.** |
| **Unblocks** | Task 2 (Fact Engine) | Fact Engine consumes `LifeEventSignal[]` to generate life event `InsightFact` objects |
