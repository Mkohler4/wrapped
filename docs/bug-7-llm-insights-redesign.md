# Bug 7 Design Doc — LLM Insights Re‑Design & Analysis Update

> **Status:** Draft — 0/8 tasks complete  
> **Date:** February 8, 2026  
> **Priority:** High  
> **Parent:** [chatgpt-wrapped-data-accuracy-overhaul.md](chatgpt-wrapped-data-accuracy-overhaul.md) — Bug 7  
> **Purpose:** Provides a thorough breakdown of the insight‑quality problem across both data paths, traces root causes to exact lines of code, evaluates five implementation approaches with reference code and feasibility ratings, and defines a safe, non‑destructive iteration workflow.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement — What Is Actually Wrong](#2-problem-statement--what-is-actually-wrong)
3. [Root Cause Analysis — Code Level](#3-root-cause-analysis--code-level)
4. [Current Data Signals Available to the LLM](#4-current-data-signals-available-to-the-llm)
5. [Current Data Signals Missing but Computable](#5-current-data-signals-missing-but-computable)
6. [Approach 1 — Prompt‑Only Refinement](#6-approach-1--prompt-only-refinement)
7. [Approach 2 — Prompt + Output Schema + Citations](#7-approach-2--prompt--output-schema--citations)
8. [Approach 3 — Hybrid Deterministic + LLM Narrative](#8-approach-3--hybrid-deterministic--llm-narrative)
9. [Approach 4 — MAD‑Style Templated Prompts (Fill‑in‑the‑Blank)](#9-approach-4--mad-style-templated-prompts-fill-in-the-blank)
10. [Approach 5 — Batch/Async Reanalysis with Caching](#10-approach-5--batchasync-reanalysis-with-caching)
11. [Approach Comparison Matrix](#11-approach-comparison-matrix)
12. [Recommendation](#12-recommendation)
13. [Safe Iteration Workflow](#13-safe-iteration-workflow)
14. [Task Breakdown](#14-task-breakdown)
15. [Testing Plan](#15-testing-plan)
16. [Risks & Mitigations](#16-risks--mitigations)
17. [Open Questions](#17-open-questions)

---

## 1. Executive Summary

Bug 7 is **not a single prompting bug**. It is a systemic quality problem across **both** data paths that affects every insight‑bearing slide (personality, obsession, roast, compliment, fun facts, spirit animal, question style, hidden themes). The root causes are:

| Layer | What's Wrong | Path A (Client) | Path B (Server) |
|-------|-------------|-----------------|-----------------|
| **Inputs** | Too few signals fed to insight generator | Only topic + 5 hardcoded stats | 8 semantic probes + behavioral stats, but no keywords, deltas, or highlights |
| **Logic** | Client uses static lookups; server prompt has no grounding constraints | `generateDataInsights()` is a lookup table from 5 topics | LLM prompt says "be specific" but has no enforcement |
| **Output** | No validation or fallback for vague responses | Always returns hardcoded strings | Falls back to hardcoded generic on parse failure |

**Scale of impact:** 6 of 11 visible slides consume insight data. Every one of them currently displays either hardcoded or vaguely generated text.

**Why this is more than a bug:** Fixing prompts alone (Approach 1) has a quality ceiling. Fixing inputs alone helps the LLM but doesn't prevent generic output. The solution must address **inputs, prompt constraints, and output validation** together, within cost and latency guardrails.

---

## 2. Problem Statement — What Is Actually Wrong

### Path A: Client‑Side (File Upload) — `generateDataInsights()`

**File:** `projects/chatgpt-wrapped/js/core/analysis.js`, line 498

The function is a **static lookup table** from topic → personality / spirit animal / roast pool. There is zero LLM involvement. The output looks the same for any two users who share the same top topic.

**Current output for a `coding` user:**
```
personality:    { title: 'The Architect', subtitle: 'Building logic, one function at a time' }
spiritAnimal:   { animal: 'owl', reason: 'Night owl who debugs at 3 AM' }
obsessionDetail: "JavaScript, React, and APIs are your favorite tools."
hiddenTheme:    "You're driven by curiosity and the desire to understand and create."
questionStyle:  "You ask thoughtful, specific questions that show genuine engagement."
```

Every one of these is **identical** for every user whose top topic is `coding`. No numbers, no behavioral data, no actual personality analysis.

**If top topic is not in the 5‑key map** (`coding`, `writing`, `learning`, `planning`, `creative`), it falls through to:
```
personality:    { title: 'The Seeker', subtitle: 'Multi-disciplinary explorer' }
spiritAnimal:   { animal: 'owl', reason: 'Wise and observant' }
```

With 50 topic categories after the Bug 1 fix, the vast majority of users will fall through because `web-dev`, `ai-ml`, `data`, `business`, `product`, etc. are not in the lookup table.

### Path B: Server‑Side (Load My Data) — `/api/wrapped/insights`

**File:** `src/server.ts`, lines 1044–1316

This path **does** use an LLM (gpt-4o-mini), which is better. But the prompt has structural problems:

1. **No ban on generic phrases.** The prompt says "Be specific!" but nothing prevents the LLM from returning "The Curious Mind — Always asking questions!" which is the literal parse‑failure fallback (line 1292).
2. **No grounding requirement.** The prompt doesn't require that each insight cite a specific stat, topic, or keyword.
3. **Only 8 semantic probes.** With the new 50‑category topic classifier, 8 probes cover a fraction of possible user profiles.
4. **Similarity threshold is static** (`> 0.40`, line ~1200). For users with few embeddings or niche topics, this may return zero matches, starving the prompt of theme data.
5. **Fallback is fully hardcoded** (lines 1290–1307). If JSON parsing fails, the user sees generic text with an `error` flag — but the UI does not expose the error to the user.
6. **No output validation.** If the LLM returns valid JSON with vague content, it is accepted and cached permanently.

### What "Good" Looks Like

For a user with 1,427 conversations, 47% night‑owl score, top topic `web-dev` (399 conversations), longest streak 21 days:

| Field | ❌ Current (typical) | ✅ Target |
|-------|---------------------|-----------|
| `personality.title` | "The Curious Mind" | "The Midnight Frontend Surgeon" |
| `personality.description` | "Always asking questions!" | "47% of your web-dev questions hit after 10 PM — you debug UIs in your sleep" |
| `spiritAnimal.reason` | "Wise and nocturnal" | "89 late-night coding sessions and a 21-day streak that would make a raccoon jealous" |
| `funFacts[0]` | "You have a lot of conversations!" | "You've opened 399 web-dev threads — that's 1 for every day you've been alive this year" |
| `oneLineRoast` | "ChatGPT is your rubber duck" | "399 web-dev chats and you still Google 'CSS center div'" |

---

## 3. Root Cause Analysis — Code Level

### 3A. Client Path — `generateDataInsights()` (analysis.js:498)

```javascript
// Line 498-505: Only uses top topic + 5 basic stats
const topTopic = stats.topics?.[0]?.[0] || 'technology';
const topicCount = stats.topics?.[0]?.[1] || 0;
const totalConvs = stats.totalConversations || 1;
const totalMsgs = stats.totalMessages || 1;
const avgMsgsPerConv = Math.round(totalMsgs / totalConvs);
const enhanced = stats.enhanced || {};
const marathonCount = enhanced.marathonConvos || 0;
const quickCount = enhanced.quickConvos || 0;
const nightOwl = enhanced.nightOwlScore || 0;
```

**Problems:**
- `topTopic` feeds into static lookup maps (`personalities`, `spiritAnimals`, `topicDescriptions`) that only have 5 keys
- `generateContextualRoast()` (line 509) builds a pool from behavioral stats but falls back to a 5‑topic `topicRoasts` map
- `generateContextualCompliment()` (line 548) same pattern — 5‑topic map
- The remaining fields (`hiddenTheme`, `questionStyle`, `profileSummary`, etc.) at lines 614–627 are **fully static strings with no data references**

### 3B. Server Path — LLM Prompt (server.ts:1267–1285)

```typescript
// system prompt excerpt (line ~1267):
// "Generate specific, personalized insights - NOT generic observations"
// "Be specific! Reference actual topics/words AND actual numbers from the stats."
```

The prompt **asks** for specificity but has:
- No explicit **banned phrase list**
- No requirement that each field **must contain a number**
- No **output schema** beyond field names
- No **validation** step before caching

### 3C. Server Path — Semantic Probes (server.ts:1168–1200)

```typescript
const themeProbes = [
  { name: 'Business & Entrepreneurship', probe: '...' },
  { name: 'AI Image Generation',        probe: '...' },
  { name: 'Career & Growth',            probe: '...' },
  { name: 'Learning & Education',       probe: '...' },
  { name: 'Creative Writing',           probe: '...' },
  { name: 'Technical Architecture',     probe: '...' },
  { name: 'Personal Life',              probe: '...' },
  { name: 'Productivity & Organization',probe: '...' },
];
```

**Only 8 probes.** Missing: DevOps, Data Science, UI/UX, Finance, Content Creation, Language Learning, Gaming, Health/Fitness, Music/Audio, Legal, Marketing, Hardware/IoT. A user whose primary activity is in a missing probe will have a thin `discoveredThemes` array, leading to a less grounded prompt.

### 3D. Server Path — Parse‑Failure Fallback (server.ts:1290–1307)

```typescript
insights = {
  personality: { title: 'The Curious Mind', description: 'Always asking questions!' },
  topObsession: { topic: 'coding', roast: 'You really love debugging, huh?' },
  spiritAnimal: { animal: 'Owl', reason: 'Wise and nocturnal' },
  funFacts: ['You have a lot of conversations!'],
  // ... all hardcoded generics
  error: 'AI response parsing failed, showing defaults',
};
```

If the LLM returns malformed JSON (which happens occasionally with temperature 0.9), the user permanently receives cached hardcoded content.

---

## 4. Current Data Signals Available to the LLM

These are the signals the server prompt **already receives** (server.ts lines 1237–1266):

| Signal | Source | Example Value |
|--------|--------|---------------|
| Total conversations | DB count | 1,427 |
| Usage trend % | Monthly avg comparison | +32% |
| Night owl score | 10pm–4am message ratio | 47% |
| Weekend ratio | Weekend/weekday ratio | 62% |
| Peak day + multiplier | DOW distribution | Wednesday (2.1× more than Sunday) |
| Conversation types | Quick/medium/long/marathon counts | 312 quick, 47 marathon |
| AI models used | Metadata model_slug | gpt-4o, gpt-4o-mini |
| Old topics (6+ months) | topic_tags aggregation | coding, learning |
| Recent topics | topic_tags aggregation | web-dev, ai-ml |
| 100 sample messages | Random user messages > 50 chars | Full message text |
| 200 conversation titles | Random thread subjects | Title strings |
| Semantic theme counts | Embedding similarity > 0.40 | "Technical Architecture: 234 messages" |
| Theme sample messages | Top 3 by similarity | Message excerpts |
| 20 sample questions | Pattern‑matched questions | "How do I…" questions |

**This is a decent signal set.** The problem is not that the data is absent — it's that the prompt doesn't **force** the LLM to use it, and key signals are missing.

---

## 5. Current Data Signals Missing but Computable

These signals exist in the database or can be derived from existing stats, but are **not currently passed to the LLM**:

| Missing Signal | Source | Why It Helps | Computation Cost |
|----------------|--------|-------------|-----------------|
| **Top 10 keywords per major topic** | `topWords` query filtered by topic | Gives the LLM specific vocabulary to reference | 1 additional SQL query |
| **Longest streak + dates** | `computeStreaks()` already in stats endpoint | "21-day streak from Jan 5–25" is a powerful anchor | Already computed, not passed |
| **Busiest single day** | Heatmap endpoint already computes this | "Feb 3: 47 messages" is a great fun fact seed | Already computed, not passed |
| **Average message length** | Simple avg on text length | Distinguishes terse askers from verbose explainers | 1 SQL query |
| **Code block ratio** | Already in stats endpoint | % of messages containing code | Already computed |
| **First conversation date** | Already in stats endpoint | "You've been here since March 2023" | Already computed |
| **Topic diversity score** | Count of topics with >5 conversations | Specialist (2–3 topics) vs generalist (10+) | Trivial to compute |
| **Late-night vs daytime top topics** | Split topic_tags by hour range | "You code during the day but write at night" | 1 SQL query |
| **Conversation length trend** | Average event_count by month | "Your conversations are getting longer" | 1 SQL query |

---

## 6. Approach 1 — Prompt‑Only Refinement

### What Changes

Only the prompt text and output instructions in `server.ts` are updated. No new data signals, no schema changes, no client‑side changes.

### Detailed Implementation

**Step 1: Add banned phrases list to system prompt**

```typescript
// src/server.ts — inside systemPrompt string (~line 1267)
const BANNED_PHRASES = [
  'curious', 'wise', 'observant', 'thoughtful', 'intelligent',
  'passionate', 'dedicated', 'driven', 'creative thinker',
  'The Explorer', 'The Seeker', 'The Thinker', 'The Innovator',
  'always asking questions', 'love to learn',
];

const systemPrompt = `You are an AI analyst creating a fun "Spotify Wrapped" style summary...

CRITICAL CONSTRAINTS:
- NEVER use these words/phrases: ${BANNED_PHRASES.join(', ')}
- Every insight MUST include at least one specific number from the stats provided
- The personality title MUST be 3+ words and reference a specific behavior or topic
- Fun facts MUST cite a specific number — "You sent X messages" is NOT allowed (too obvious)
- Spirit animal reason MUST reference a specific stat (not just a personality trait)

BAD (will be rejected):
- "You're a curious and thoughtful person"
- "Your spirit animal is an owl because you're wise"
- "Fun fact: You had a lot of conversations!"

GOOD:
- "The 3AM Frontend Surgeon — 47% of your web-dev questions land after midnight"
- "Your spirit animal is a raccoon — 89 late-night sessions and a 21-day streak"
- "Fun fact: You rewrote 23 READMEs across 6 projects. Perfectionist much?"
...`;
```

**Step 2: Add post-generation validation**

```typescript
// src/server.ts — after parsing LLM response (~line 1288)
function validateInsightQuality(insights: any): { valid: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const text = JSON.stringify(insights).toLowerCase();

  // Check banned phrases
  for (const phrase of BANNED_PHRASES) {
    if (text.includes(phrase.toLowerCase())) {
      reasons.push(`Contains banned phrase: "${phrase}"`);
    }
  }

  // Check for numbers in key fields
  if (!/\d/.test(insights.personality?.description || '')) {
    reasons.push('personality.description has no numbers');
  }
  if (!/\d/.test(insights.spiritAnimal?.reason || '')) {
    reasons.push('spiritAnimal.reason has no numbers');
  }

  return { valid: reasons.length === 0, reasons };
}

// After parsing:
const quality = validateInsightQuality(insights);
if (!quality.valid) {
  console.warn('⚠️ Insight quality check failed:', quality.reasons);
  // Option A: retry once with stricter temperature
  // Option B: accept but log for review
}
```

### Deep Considerations

- **Quality ceiling.** The LLM only has what we feed it. Without new signals (keywords, deltas, highlights), it can only rephrase the same stats in different ways. After 3–5 regenerations the variety plateaus.
- **Retry cost.** If validation rejects output, a retry doubles the API cost for that request. Must cap retries at 1.
- **Temperature sensitivity.** At 0.9 (current), output is creative but occasionally hallucinates stats. Lowering to 0.7–0.8 reduces hallucination but also reduces fun.
- **Banned phrases are fragile.** The LLM can rephrase ("inquisitive" instead of "curious"). A robust solution needs semantic checking, not just string matching.
- **Does not fix client path.** Path A still uses the static lookup table. This approach only helps Path B users.

### Feasibility

| Dimension | Rating | Notes |
|-----------|--------|-------|
| **Effort** | Very Low (~1 hour) | Edit prompt, add validation function |
| **Quality gain** | Low–Medium | Removes worst generics; doesn't add depth |
| **Cost impact** | None | Same token count, maybe +1 retry |
| **Latency impact** | None | Same call, maybe +1 retry (~2s) |
| **Risk** | Very Low | Prompt change only; fallback intact |
| **Bugs fixed** | Bug 7 (server only, partial) | Client path untouched |

---

## 7. Approach 2 — Prompt + Output Schema + Citations

### What Changes

Redesign the prompt AND require a strict output schema where every insight must include `citations[]` pointing to specific data points. Add server‑side schema validation.

### Detailed Implementation

**Step 1: Define the v2 output schema**

```typescript
// src/lib/insight-schema.ts (new file)

interface Citation {
  type: 'stat' | 'topic' | 'keyword' | 'theme';
  key: string;       // e.g., 'nightOwlScore', 'topTopic', 'longestStreak'
  value: string | number;
}

interface InsightV2 {
  personality: {
    title: string;        // 3+ words, no generic archetypes
    description: string;  // Must reference a specific stat
    citations: Citation[];
  };
  spiritAnimal: {
    animal: string;
    reason: string;       // Must reference behavioral data
    citations: Citation[];
  };
  topObsession: {
    topic: string;
    roast: string;        // Must include a number
    citations: Citation[];
  };
  funFacts: Array<{
    text: string;
    citations: Citation[];
  }>;
  oneLineRoast: string;
  compliment: string;
  trendInsight: string;
  timePersonality: string;
  evolutionNote: string;
  hiddenTheme: string;
  questionStyle: string;
}

function validateSchemaV2(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check top-level fields exist
  const required = ['personality', 'spiritAnimal', 'topObsession', 'funFacts',
                    'oneLineRoast', 'compliment'];
  for (const field of required) {
    if (!data[field]) errors.push(`Missing required field: ${field}`);
  }

  // Check citations exist and are non-empty
  const citationFields = ['personality', 'spiritAnimal', 'topObsession'];
  for (const field of citationFields) {
    if (data[field] && (!Array.isArray(data[field].citations) || data[field].citations.length === 0)) {
      errors.push(`${field} missing citations`);
    }
  }

  // Check funFacts citations
  if (Array.isArray(data.funFacts)) {
    data.funFacts.forEach((f: any, i: number) => {
      if (!Array.isArray(f.citations) || f.citations.length === 0) {
        errors.push(`funFacts[${i}] missing citations`);
      }
    });
  }

  // Check personality title length (3+ words)
  if (data.personality?.title && data.personality.title.split(/\s+/).length < 3) {
    errors.push('personality.title must be 3+ words');
  }

  // Banned phrase check
  const BANNED = ['curious', 'wise', 'observant', 'thoughtful', 'intelligent',
                  'passionate', 'dedicated', 'The Explorer', 'The Seeker'];
  const outputText = JSON.stringify(data).toLowerCase();
  for (const phrase of BANNED) {
    if (outputText.includes(phrase.toLowerCase())) {
      errors.push(`Contains banned phrase: "${phrase}"`);
    }
  }

  return { valid: errors.length === 0, errors };
}
```

**Step 2: Update the system prompt to require citations**

```typescript
const systemPromptV2 = `You are an AI analyst creating a "Spotify Wrapped" style summary...

OUTPUT FORMAT: Return valid JSON matching this EXACT schema. Every personality,
spiritAnimal, topObsession, and funFact MUST include a "citations" array with
at least one entry. Each citation is:
  { "type": "stat"|"topic"|"keyword"|"theme", "key": "fieldName", "value": actualValue }

The citation values MUST match real numbers from the stats I provide.
If a stat is 47, the citation value must be 47, not 50 or "about 47".

CONSTRAINTS:
- NEVER use: curious, wise, observant, thoughtful, intelligent, passionate, dedicated
- Personality title MUST be 3+ words
- Every insight MUST contain at least one number from the stats
- Fun facts cannot just restate message count or conversation count

EXAMPLE OUTPUT:
{
  "personality": {
    "title": "The 3AM Architecture Critic",
    "description": "47% of your system design questions happen after midnight",
    "citations": [
      { "type": "stat", "key": "nightOwlScore", "value": 47 },
      { "type": "theme", "key": "Technical Architecture", "value": 234 }
    ]
  },
  ...
}`;
```

**Step 3: Add version selection and validation**

```typescript
// src/server.ts — in /api/wrapped/insights handler
const promptVersion = process.env.WRAPPED_PROMPT_VERSION || req.query.prompt || 'v1';

// After LLM call:
if (promptVersion === 'v2') {
  const validation = validateSchemaV2(insights);
  if (!validation.valid) {
    console.warn('Schema v2 validation failed:', validation.errors);
    // Retry once with lower temperature
    if (!isRetry) {
      const retryResponse = await chat(systemPromptV2, userPrompt, {
        model: 'gpt-4o-mini', maxTokens: 1200, temperature: 0.7,
      });
      // ... parse and validate again
    }
    // If still failing, fall back to v1
    if (!retryValid) {
      return generateV1Insights(/* ... */);
    }
  }
}
```

### Deep Considerations

- **Token overhead.** Citations add ~200 tokens to output. With gpt-4o-mini at $0.15/1M input + $0.60/1M output, this adds ~$0.00012 per request. Negligible.
- **LLM compliance.** gpt-4o-mini follows JSON schema instructions well at temperature ≤ 0.8. At 0.9, occasional schema drift. Recommend dropping to 0.75.
- **Citation accuracy.** The LLM may "round" stats (47% → "about half"). Strict validation catches this, but may cause unnecessary retries. Consider allowing ±5% tolerance.
- **Schema evolution.** Adding new citation types later requires updating both the schema definition and the prompt example. Keep the schema in a single file.
- **Client consumption.** The client currently reads flat fields (`insights.personality.title`). Adding `citations` is additive — existing code won't break. Citations can be used by the debug panel for verification.
- **Does not fix client path.** Like Approach 1, this only helps Path B.

### Feasibility

| Dimension | Rating | Notes |
|-----------|--------|-------|
| **Effort** | Medium (~1 day) | New schema file, prompt rewrite, validation logic |
| **Quality gain** | High | Forces grounding; catches vagueness |
| **Cost impact** | Minimal | +200 output tokens + potential retry |
| **Latency impact** | Minimal | Potential +1 retry (~2s) |
| **Risk** | Low–Medium | Schema failures need graceful fallback |
| **Bugs fixed** | Bug 7 (server only) | Client path untouched |

---

## 8. Approach 3 — Hybrid Deterministic + LLM Narrative

### What Changes

Deterministic code computes a structured **fact bundle** (numbers + labels only). The LLM's only job is to **rewrite facts into entertaining narrative**. No fact invention allowed.

### Detailed Implementation

**Step 1: Build the deterministic fact engine**

```typescript
// src/lib/insight-facts.ts (new file)

interface InsightFact {
  id: string;
  category: 'personality' | 'behavior' | 'trivia' | 'time' | 'topic';
  rawText: string;    // Machine-generated factual statement
  dataPoints: Record<string, number | string>;
}

function computeInsightFacts(stats: any, themes: any[]): InsightFact[] {
  const facts: InsightFact[] = [];
  const enhanced = stats.enhanced || {};
  const topTopic = stats.topTopics?.[0]?.topic || 'general';
  const topTopicCount = stats.topTopics?.[0]?.count || 0;
  const topicDiversity = (stats.topTopics || []).filter((t: any) => t.count > 5).length;

  // --- Personality facts ---
  if (enhanced.nightOwlScore > 35) {
    facts.push({
      id: 'personality-night-topic',
      category: 'personality',
      rawText: `${enhanced.nightOwlScore}% of messages are between 10pm-4am. Top topic is ${topTopic} with ${topTopicCount} conversations.`,
      dataPoints: { nightOwlScore: enhanced.nightOwlScore, topTopic, topTopicCount },
    });
  }

  if (enhanced.marathonConvos > 10) {
    facts.push({
      id: 'behavior-marathon',
      category: 'behavior',
      rawText: `${enhanced.marathonConvos} marathon sessions (50+ messages each) out of ${stats.totalConversations} total.`,
      dataPoints: { marathonConvos: enhanced.marathonConvos, totalConversations: stats.totalConversations },
    });
  }

  if (stats.streaks?.longestStreak > 7) {
    facts.push({
      id: 'behavior-streak',
      category: 'behavior',
      rawText: `Longest streak: ${stats.streaks.longestStreak} consecutive days.`,
      dataPoints: { longestStreak: stats.streaks.longestStreak },
    });
  }

  facts.push({
    id: 'topic-diversity',
    category: 'topic',
    rawText: topicDiversity <= 3
      ? `Deep specialist: ${topicDiversity} main topics, led by ${topTopic} (${topTopicCount} conversations).`
      : `Broad generalist: ${topicDiversity} distinct topics explored.`,
    dataPoints: { topicDiversity, topTopic, topTopicCount },
  });

  facts.push({
    id: 'time-peak-day',
    category: 'time',
    rawText: `Peak day: ${enhanced.mostProductiveDay} (${enhanced.productivityMultiplier}x more than ${enhanced.leastProductiveDay}).`,
    dataPoints: {
      peakDay: enhanced.mostProductiveDay,
      multiplier: enhanced.productivityMultiplier,
      lowDay: enhanced.leastProductiveDay,
    },
  });

  const trend = enhanced.trendDirection || 0;
  facts.push({
    id: 'behavior-trend',
    category: 'behavior',
    rawText: `Usage trend: ${trend > 0 ? '+' : ''}${trend}% change (recent 3 months vs prior 3 months).`,
    dataPoints: { trendDirection: trend },
  });

  for (const theme of (themes || []).slice(0, 3)) {
    facts.push({
      id: `theme-${theme.name.toLowerCase().replace(/\s+/g, '-')}`,
      category: 'topic',
      rawText: `Semantic theme "${theme.name}": ${theme.messageCount} messages matched.`,
      dataPoints: { themeName: theme.name, themeCount: theme.messageCount },
    });
  }

  return facts;
}
```

**Step 2: Send facts to LLM for narrative rewriting only**

```typescript
// src/server.ts — inside insights handler

const facts = computeInsightFacts(wrappedStats, discoveredThemes);

const narrativePrompt = `You are a comedy writer for a "Spotify Wrapped" experience.

Below are VERIFIED FACTS about a user's ChatGPT usage. Your job:
1. Rewrite each fact as a fun, engaging insight
2. Pick the best fact for each output field
3. DO NOT invent new facts or numbers
4. DO NOT change any numbers — they are verified
5. You MAY combine related facts into a single insight

VERIFIED FACTS:
${facts.map(f => `[${f.id}] ${f.rawText}`).join('\n')}

OUTPUT: JSON with fields: personality.title, personality.description, spiritAnimal,
topObsession, funFacts (5-6), oneLineRoast, compliment. Each field should clearly
derive from the facts above. Reference the fact IDs in a "_source" field.`;
```

**Step 3: Validate that output facts match input facts**

```typescript
function validateFactPreservation(facts: InsightFact[], output: any): boolean {
  const outputText = JSON.stringify(output);
  const outputNumbers = outputText.match(/\d+/g) || [];
  const factNumbers = new Set(
    facts.flatMap(f => Object.values(f.dataPoints))
      .filter((v): v is number => typeof v === 'number')
      .map(String)
  );

  // Numbers in output that don't appear in any fact
  const inventedNumbers = outputNumbers.filter(n =>
    parseInt(n) > 1 && !factNumbers.has(n)
  );

  if (inventedNumbers.length > 2) {
    console.warn('LLM may have invented numbers:', inventedNumbers);
    return false;
  }
  return true;
}
```

### Deep Considerations

- **Strongest grounding of any LLM approach.** Every insight traces directly to a computed fact. Hallucination is structurally impossible if the LLM follows instructions.
- **Fact coverage.** If the fact engine doesn't compute a relevant fact, the LLM can't generate a relevant insight. Must ensure the fact engine covers all output fields.
- **Comedy quality.** Constraining the LLM to only rephrase may reduce creativity. The "comedy writer" framing helps, but the output will be less surprising than a fully creative prompt.
- **Maintenance burden.** Every new stat or signal requires a corresponding fact template in the engine. Two places to update (engine + prompt) instead of one.
- **Partial client path benefit.** The fact engine can also power Path A (client‑side) without any LLM, replacing the static lookup table with data‑driven text. This partially addresses Bug 4 and Bug 8.

### Feasibility

| Dimension | Rating | Notes |
|-----------|--------|-------|
| **Effort** | Medium–High (~2 days) | New fact engine + prompt rewrite + validation |
| **Quality gain** | Very High | Zero hallucination + strong grounding |
| **Cost impact** | Minimal | Shorter prompt (facts are concise) — may actually reduce cost |
| **Latency impact** | Minimal | Fact computation is <10ms; LLM call same |
| **Risk** | Low–Medium | Comedy quality may be lower; fact coverage gaps |
| **Bugs fixed** | Bug 7 (both paths); partial Bug 4, Bug 8 (via fact engine on client) |

---

## 9. Approach 4 — MAD‑Style Templated Prompts (Fill‑in‑the‑Blank)

### Concept

Instead of asking an LLM to generate insights from scratch, we write **pre‑authored narrative templates** with `${placeholder}` blanks. Blanks are filled deterministically from the user's data. Each user gets a unique result because their data is unique — like a Mad Libs story.

Optionally, the filled templates can be sent through a **light LLM polish** for tone/flow, but the core content is deterministic.

### Detailed Implementation

**Step 1: Define the template library and context type**

```typescript
// src/lib/insight-templates.ts (new file)

interface InsightTemplate {
  id: string;
  field: 'personality' | 'spiritAnimal' | 'funFact' | 'roast' | 'compliment';
  condition: (ctx: TemplateContext) => boolean;  // When to use this template
  template: string;                              // Fill-in-the-blank string
  priority: number;                              // Higher = preferred when multiple match
}

interface TemplateContext {
  totalConversations: number;
  totalMessages: number;
  nightOwlScore: number;
  weekendRatio: number;
  topTopic: string;
  topTopicCount: number;
  secondTopic: string;
  secondTopicCount: number;
  longestStreak: number;
  marathonConvos: number;
  quickConvos: number;
  peakDay: string;
  peakHour: number;
  trendDirection: number;
  topicDiversity: number;
  avgMsgsPerConvo: number;
  topTheme: string;
  topThemeCount: number;
  firstDate: string;
  activeDays: number;
  codeBlocksShared: number;
  topWord: string;
  productivityMultiplier: number;
  leastProductiveDay: string;
}
```

**Step 2: Author diverse templates for each insight field**

```typescript
const PERSONALITY_TEMPLATES: InsightTemplate[] = [
  {
    id: 'personality-night-coder',
    field: 'personality',
    condition: (ctx) => ctx.nightOwlScore > 35
      && ['coding', 'web-dev', 'ai-ml', 'devops'].includes(ctx.topTopic),
    template: 'The ${nightOwlScore > 45 ? "Midnight" : "Late-Night"} ${topTopic === "web-dev" ? "Frontend Surgeon" : topTopic === "ai-ml" ? "Model Whisperer" : "Debug Demon"} — ${nightOwlScore}% of your ${topTopic} work happens after 10 PM',
    priority: 10,
  },
  {
    id: 'personality-marathon-runner',
    field: 'personality',
    condition: (ctx) => ctx.marathonConvos > 15,
    template: "The Deep Dive Addict — ${marathonConvos} conversations crossed 50+ messages. You don't chat, you investigate.",
    priority: 8,
  },
  {
    id: 'personality-streak-warrior',
    field: 'personality',
    condition: (ctx) => ctx.longestStreak > 14,
    template: 'The ${longestStreak}-Day Warrior — your longest streak would make gym bros jealous',
    priority: 7,
  },
  {
    id: 'personality-generalist',
    field: 'personality',
    condition: (ctx) => ctx.topicDiversity > 8,
    template: 'The Renaissance Prompter — ${topicDiversity} topics, zero chill. You treat ChatGPT like Wikipedia with opinions.',
    priority: 6,
  },
  {
    id: 'personality-specialist',
    field: 'personality',
    condition: (ctx) => ctx.topicDiversity <= 3 && ctx.topTopicCount > 100,
    template: 'The ${topTopic} Obsessive — ${topTopicCount} conversations in one lane. Focused? Or tunneled?',
    priority: 9,
  },
  {
    id: 'personality-weekend-warrior',
    field: 'personality',
    condition: (ctx) => ctx.weekendRatio > 80,
    template: 'The Weekend Warrior — ${weekendRatio}% weekend-to-weekday ratio. Weekdays are for real work, weekends are for ChatGPT.',
    priority: 7,
  },
  {
    id: 'personality-quick-draw',
    field: 'personality',
    condition: (ctx) => ctx.quickConvos > ctx.totalConversations * 0.7,
    template: 'The Quick-Draw Questioner — ${quickConvos} of ${totalConversations} conversations are under 5 messages. Efficiency or impatience?',
    priority: 6,
  },
  // ... additional templates
];

const ROAST_TEMPLATES: InsightTemplate[] = [
  {
    id: 'roast-night-owl',
    field: 'roast',
    condition: (ctx) => ctx.nightOwlScore > 40,
    template: '${nightOwlScore}% of your messages are after 10 PM. At this point, ChatGPT IS your sleep medication.',
    priority: 8,
  },
  {
    id: 'roast-marathon',
    field: 'roast',
    condition: (ctx) => ctx.marathonConvos > 10,
    template: "${marathonConvos} marathon sessions. You don't ask questions — you hold ChatGPT hostage.",
    priority: 7,
  },
  {
    id: 'roast-quick',
    field: 'roast',
    condition: (ctx) => ctx.quickConvos > ctx.totalConversations * 0.7,
    template: "${quickConvos} out of ${totalConversations} conversations are under 5 messages. You treat ChatGPT like a Magic 8-Ball.",
    priority: 6,
  },
  {
    id: 'roast-topic-obsession',
    field: 'roast',
    condition: (ctx) => ctx.topTopicCount > 100,
    template: '${topTopicCount} conversations about ${topTopic}. At this point just marry the subject.',
    priority: 8,
  },
  {
    id: 'roast-trend-up',
    field: 'roast',
    condition: (ctx) => ctx.trendDirection > 30,
    template: "Your usage is up ${trendDirection}%. You're not getting more productive, you're getting more dependent.",
    priority: 5,
  },
  {
    id: 'roast-code-blocks',
    field: 'roast',
    condition: (ctx) => ctx.codeBlocksShared > 100,
    template: '${codeBlocksShared} code blocks pasted. ChatGPT has reviewed more of your code than any human ever will.',
    priority: 7,
  },
  // ... additional templates
];

const FUN_FACT_TEMPLATES: InsightTemplate[] = [
  {
    id: 'fact-streak',
    field: 'funFact',
    condition: (ctx) => ctx.longestStreak > 7,
    template: "Your longest streak was ${longestStreak} days straight. That's more consistent than most gym memberships.",
    priority: 5,
  },
  {
    id: 'fact-peak-day',
    field: 'funFact',
    condition: () => true,
    template: '${peakDay} is your power day — you\'re ${productivityMultiplier}x more active than on ${leastProductiveDay}.',
    priority: 4,
  },
  {
    id: 'fact-code-blocks',
    field: 'funFact',
    condition: (ctx) => ctx.codeBlocksShared > 50,
    template: "You shared ${codeBlocksShared} code blocks with ChatGPT. That's more code reviews than most teams get in a quarter.",
    priority: 6,
  },
  {
    id: 'fact-since',
    field: 'funFact',
    condition: (ctx) => !!ctx.firstDate,
    template: "You've been at this since ${firstDate}. That's ${activeDays} active days of ChatGPT companionship.",
    priority: 3,
  },
  {
    id: 'fact-topic-evolution',
    field: 'funFact',
    condition: (ctx) => ctx.topTopic !== ctx.secondTopic && ctx.secondTopicCount > 20,
    template: 'Your top topic is ${topTopic} (${topTopicCount} convos), but ${secondTopic} is closing in at ${secondTopicCount}. Plot twist incoming?',
    priority: 5,
  },
  {
    id: 'fact-avg-msgs',
    field: 'funFact',
    condition: (ctx) => ctx.avgMsgsPerConvo > 15,
    template: 'Average conversation: ${avgMsgsPerConvo} messages. You don\'t just ask — you interrogate.',
    priority: 4,
  },
  // ... additional templates
];

const SPIRIT_ANIMAL_TEMPLATES: InsightTemplate[] = [
  {
    id: 'spirit-raccoon',
    field: 'spiritAnimal',
    condition: (ctx) => ctx.nightOwlScore > 35 && ctx.marathonConvos > 5,
    template: 'Raccoon — ${nightOwlScore}% nocturnal activity and ${marathonConvos} deep dives into the dumpster of knowledge.',
    priority: 8,
  },
  {
    id: 'spirit-hummingbird',
    field: 'spiritAnimal',
    condition: (ctx) => ctx.quickConvos > ctx.totalConversations * 0.6,
    template: 'Hummingbird — ${quickConvos} quick hits, always darting to the next question. Focused intensity.',
    priority: 7,
  },
  {
    id: 'spirit-bear',
    field: 'spiritAnimal',
    condition: (ctx) => ctx.longestStreak > 14,
    template: 'Bear — ${longestStreak}-day streak. When you lock in, you LOCK in. Then probably hibernate.',
    priority: 6,
  },
  {
    id: 'spirit-octopus',
    field: 'spiritAnimal',
    condition: (ctx) => ctx.topicDiversity > 8,
    template: 'Octopus — ${topicDiversity} topics, multiple arms in everything. You multitask like you have 8 brains.',
    priority: 7,
  },
  // ... additional templates
];

const COMPLIMENT_TEMPLATES: InsightTemplate[] = [
  {
    id: 'compliment-persistence',
    field: 'compliment',
    condition: (ctx) => ctx.marathonConvos > 10,
    template: '${marathonConvos} deep-dive sessions show you don\'t give up until you truly understand something. That compounds.',
    priority: 7,
  },
  {
    id: 'compliment-streak',
    field: 'compliment',
    condition: (ctx) => ctx.longestStreak > 10,
    template: 'A ${longestStreak}-day streak isn\'t luck — it\'s discipline. You show up consistently and that\'s rare.',
    priority: 6,
  },
  {
    id: 'compliment-growth',
    field: 'compliment',
    condition: (ctx) => ctx.trendDirection > 20,
    template: 'Usage up ${trendDirection}% — you\'re investing more in learning and growth. Your future self will thank you.',
    priority: 5,
  },
  // ... additional templates
];
```

**Step 3: Template resolution engine**

```typescript
function resolveTemplates(ctx: TemplateContext): {
  personality: string;
  roast: string;
  funFacts: string[];
  spiritAnimal: string;
  compliment: string;
} {
  const resolve = (templates: InsightTemplate[]): string[] => {
    return templates
      .filter(t => t.condition(ctx))
      .sort((a, b) => b.priority - a.priority)
      .map(t => t.template.replace(/\$\{(\w+)\}/g, (_, key) => {
        const val = (ctx as any)[key];
        return val !== undefined ? String(val) : `[${key}]`;
      }));
  };

  const personalities = resolve(PERSONALITY_TEMPLATES);
  const roasts = resolve(ROAST_TEMPLATES);
  const funFacts = resolve(FUN_FACT_TEMPLATES);
  const spirits = resolve(SPIRIT_ANIMAL_TEMPLATES);
  const compliments = resolve(COMPLIMENT_TEMPLATES);

  // Use deterministic selection: hash-based index for reproducibility
  const hash = (ctx.totalMessages + ctx.totalConversations) % 1000;
  const pick = (arr: string[]) => arr[hash % arr.length] || arr[0];

  return {
    personality: pick(personalities),
    roast: pick(roasts),
    funFacts: funFacts.slice(0, 6),  // Top 6 by priority
    spiritAnimal: pick(spirits),
    compliment: pick(compliments),
  };
}
```

**Step 4: Universal fallbacks for missing data**

```typescript
const UNIVERSAL_FALLBACKS: Record<string, string> = {
  personality: "The ${totalConversations}-Thread Thinker — you've opened ${totalConversations} conversations since ${firstDate}",
  roast: '${totalConversations} conversations and counting. At what point does ChatGPT start charging rent?',
  funFact: "You've been active for ${activeDays} days since ${firstDate}. That's dedication.",
  spiritAnimal: "Ant — ${totalConversations} conversations, one at a time. Relentless.",
  compliment: "You've shown up ${activeDays} times. Consistency beats talent every single time.",
};
```

**Step 5: (Optional) Light LLM polish pass**

```typescript
async function polishTemplateOutput(resolved: Record<string, string | string[]>): Promise<Record<string, string | string[]>> {
  const polishPrompt = `You are an editor. Below are data-driven insights for a ChatGPT Wrapped experience.
Rewrite each one to sound more natural and fun. Do NOT change any numbers or facts.
Do NOT add new information. Only improve tone and flow. Keep each insight to 1-2 sentences max.

${Object.entries(resolved).map(([field, value]) =>
  `[${field}]: ${Array.isArray(value) ? value.join(' | ') : value}`
).join('\n')}

Return JSON with the same field names.`;

  const response = await chat('You are a copy editor.', polishPrompt, {
    model: 'gpt-4o-mini',
    maxTokens: 600,   // Very small — polish only
    temperature: 0.6,  // Conservative — preserve facts
  });

  // Parse and return, fallback to original if parsing fails
  try {
    return JSON.parse(response.match(/\{[\s\S]*\}/)?.[0] || '{}');
  } catch {
    return resolved;  // Polish failed, use originals
  }
}
```

### Deep Considerations

- **Strongest cost control.** Without the LLM polish step, this approach has **zero API cost** and **zero latency**. Even with the polish step, the input is tiny (~300 tokens, ~$0.00005).
- **Template diversity.** The quality of this approach is directly proportional to the number and creativity of templates. 15 templates per field gives hundreds of unique combinations when you factor in conditional matching based on different stat profiles.
- **Repetitiveness risk.** Two users with very similar stats could get identical output. Mitigate by: (a) randomized selection among top‑priority matching templates, (b) optional LLM polish adds uniqueness.
- **Maintenance.** Adding a new signal requires adding new templates that use it. But templates are easy to write, easy to test, and easy to review — no prompt engineering trial‑and‑error.
- **Client‑side viable.** This is the **only approach that works for Path A** without requiring a server. The template engine can run entirely in the browser by porting `insight-templates.ts` to JavaScript. This simultaneously fixes Bug 4 (hardcoded AI identity) and Bug 8 (no hardcoded insights allowed).
- **Testability.** Each template can be unit tested: given a `TemplateContext`, does the condition match? Does the output contain the expected values? No output is non‑deterministic (unless LLM polish is enabled).
- **Graceful degradation.** If no templates match for a field (unlikely with good coverage), universal fallbacks ensure the user never sees empty or broken content.

### Feasibility

| Dimension | Rating | Notes |
|-----------|--------|-------|
| **Effort** | Medium (~2 days: 1 day engine, 1 day authoring templates) | Template authoring is creative work, not complex code |
| **Quality gain** | Medium–High | Strong grounding; tone depends on template quality |
| **Cost impact** | None (without polish) / Negligible (with polish) | Can be zero‑cost |
| **Latency impact** | None (without polish) / Minimal (with polish) | <1ms without LLM |
| **Risk** | Low–Medium | Repetitiveness if template library is too small |
| **Bugs fixed** | Bug 7 + Bug 4 + Bug 8 (all three) | Only approach that fixes client path |

---

## 10. Approach 5 — Batch/Async Reanalysis with Caching

### What Changes

Instead of generating insights synchronously on request, run a background job that computes insights and stores them. The API serves cached results instantly. This decouples quality from latency.

### Detailed Implementation

**Step 1: Cache keying with data versioning**

```typescript
// src/lib/insights-cache.ts (new file)
import crypto from 'crypto';

function computeDataHash(stats: any): string {
  const relevant = {
    totalConversations: stats.totalConversations,
    totalMessages: stats.totalMessages,
    topTopics: stats.topTopics?.slice(0, 5),
    nightOwlScore: stats.enhanced?.nightOwlScore,
    longestStreak: stats.streaks?.longestStreak,
  };
  return crypto.createHash('md5').update(JSON.stringify(relevant)).digest('hex').slice(0, 12);
}

interface CacheEntry {
  insights: any;
  dataHash: string;
  promptVersion: string;
  generatedAt: string;
  tokenUsage: { input: number; output: number };
}
```

**Step 2: Background generation job**

```typescript
// src/lib/insight-worker.ts (new file)

async function generateInsightsAsync(promptVersion: string): Promise<void> {
  const stats = await fetchWrappedStats();
  const dataHash = computeDataHash(stats);
  const cacheKey = `${dataHash}:${promptVersion}`;

  const existing = await getFromCache(cacheKey);
  if (existing) return;  // Already cached for this data version

  // Can afford higher quality settings since user isn't waiting
  const insights = await generateInsightsFull(stats, {
    model: 'gpt-4o-mini',
    maxTokens: 1500,
    temperature: 0.8,
    maxRetries: 3,   // Can afford retries
    promptVersion,
  });

  await saveToCache(cacheKey, {
    insights,
    dataHash,
    promptVersion,
    generatedAt: new Date().toISOString(),
    tokenUsage: insights._tokenUsage,
  });
}
```

**Step 3: API endpoint serves cached or triggers generation**

```typescript
app.get('/api/wrapped/insights', async (req, res) => {
  const forceRegenerate = req.query.regenerate === 'true';
  const promptVersion = req.query.prompt || process.env.WRAPPED_PROMPT_VERSION || 'v1';

  if (!forceRegenerate) {
    const cached = await loadCachedInsights();
    if (cached && cached.promptVersion === promptVersion) {
      return res.json({ ...cached.insights, fromCache: true });
    }
  }

  // If no cache, try last known good + trigger async regeneration
  const lastKnown = await loadCachedInsights();
  if (lastKnown) {
    generateInsightsAsync(promptVersion).catch(console.error);
    return res.json({
      ...lastKnown.insights,
      fromCache: true,
      regenerating: true,
    });
  }

  // No cache at all — must generate synchronously (first time only)
  const insights = await generateInsightsSynchronous(promptVersion);
  return res.json(insights);
});
```

### Deep Considerations

- **Decouples quality from latency.** Can use more retries, higher token limits, even GPT‑4 instead of mini, since the user isn't waiting.
- **Cache invalidation.** Must regenerate when data changes (new import). The `dataHash` approach handles this: if stats change, the hash changes, and the cache misses automatically.
- **Storage.** Current implementation already uses a file‑based cache (`.insights-cache.json`, line 1006). Extending to support versioned entries is minimal effort.
- **Cold start.** First‑ever request has no cache. Must either generate synchronously (current behavior) or show a "generating insights…" UI state.
- **Complexity.** Most complex approach of all five. Background job management, cache versioning, stale data handling, cold start UX.
- **Does not fix client path.** Server-only improvement.
- **Composable.** This approach can wrap any of the other approaches. Use Approach 2 or 3 as the inner generation strategy, with Approach 5 as the execution wrapper.

### Feasibility

| Dimension | Rating | Notes |
|-----------|--------|-------|
| **Effort** | High (~2–3 days) | Cache layer, background worker, API changes, cold start handling |
| **Quality gain** | Very High | Can afford deeper analysis, more retries, better models |
| **Cost impact** | Medium | More retries = more API calls, but amortized over cache hits |
| **Latency impact** | None (after first load) | Instant from cache; cold start same as current |
| **Risk** | Medium | Cache staleness, cold start UX, operational complexity |
| **Bugs fixed** | Bug 7 (server only) | Client path untouched |

---

## 11. Approach Comparison Matrix

| Dimension | 1. Prompt‑Only | 2. Schema + Citations | 3. Deterministic + LLM | 4. MAD Templates | 5. Async + Cache |
|-----------|---------------|----------------------|----------------------|-----------------|-----------------|
| **Effort** | Very Low | Medium | Medium–High | Medium | High |
| **Quality ceiling** | Low–Medium | High | Very High | Medium–High | Very High |
| **Grounding** | Weak (honor system) | Strong (schema enforced) | Very Strong (fact‑locked) | Very Strong (deterministic) | Depends on inner approach |
| **Cost per request** | Same | Same + retry | Same or lower | Zero (no LLM) to minimal | Higher but amortized |
| **Latency** | Same | Same + retry | Same | Near-zero | Zero (from cache) |
| **Hallucination risk** | Medium | Low | Very Low | None | Depends on inner approach |
| **Fixes client path** | ❌ No | ❌ No | ⚠️ Partial (fact engine) | ✅ Yes (full client-side) | ❌ No |
| **Fixes Bug 4** | ❌ | ❌ | ⚠️ Partial | ✅ | ❌ |
| **Fixes Bug 8** | ❌ | ❌ | ⚠️ Partial | ✅ | ❌ |
| **Testability** | Low | Medium | High | Very High | Medium |

---

## 12. Recommendation

### Best approach: **Approach 4 (MAD Templates) as the foundation + Approach 2 (Schema + Citations) for the server LLM path**

**Rationale:**

1. **MAD Templates solve three bugs at once (7, 4, 8).** The template engine replaces the broken `generateDataInsights()` lookup table on the client side. This is the **only** approach that fixes the client path without requiring a server. Since Bug 4 ("AI Identity Is a Hardcoded Lookup Table") and Bug 8 ("No Hardcoded Insights Allowed") both stem from the same static lookup, the template engine eliminates all three problems simultaneously.

2. **Schema + Citations raises the quality ceiling on the server path.** For users on Path B, the LLM can generate more creative and nuanced output than templates alone. The citation requirement prevents vagueness, and the schema validation prevents regressions.

3. **Templates provide the ultimate fallback.** If the LLM fails, schema validation fails, or the server is unavailable, the template engine produces solid, data‑grounded output with zero cost and zero latency. This fallback is **always better than the current hardcoded strings**.

4. **Incremental delivery.** Templates can ship first (no server dependency, no API cost), then schema v2 can ship as an upgrade to the server path. Neither blocks the other.

5. **Cost and latency are controlled.** Templates add zero cost. Schema v2 adds minimal cost (~$0.0001 extra per request). No new infrastructure required.

6. **Approach 3 is partially absorbed.** The fact computation from Approach 3 naturally becomes the logic that builds the `TemplateContext` for Approach 4. We get the grounding benefits without the LLM overhead.

### Why not the others alone?

- **Approach 1 alone:** Too shallow. Doesn't fix client path. Quality ceiling too low.
- **Approach 2 alone:** Good for server but leaves client path broken. Bug 4 and 8 remain.
- **Approach 3 alone:** Strong grounding but more complex than templates for similar output. Doesn't fully fix client path without porting the LLM call.
- **Approach 5 alone:** Only an execution wrapper — doesn't improve insight quality by itself. Over-engineered for current scale.

### Implementation order:

| Phase | What | Bugs Fixed | Effort |
|-------|------|-----------|--------|
| **Phase 1** | Build template engine + author 15–20 templates per field (personality, roast, funFact, spiritAnimal, compliment) | Bug 7 (client), Bug 4, Bug 8 | 1–2 days |
| **Phase 2** | Wire template engine into `generateDataInsights()` in `analysis.js`, replacing static lookups (behind feature flag) | Bug 4 fully, Bug 8 fully | 0.5 day |
| **Phase 3** | Add missing signals to server LLM prompt (top keywords, longest streak, busiest day, avg message length, topic diversity) + expand semantic probes from 8 to 15+ | Bug 7 (server inputs) | 0.5 day |
| **Phase 4** | Implement schema v2 + citations + validation on server path, with template engine as fallback | Bug 7 (server output) | 1 day |
| **Phase 5** | Optional: LLM polish pass for templates on server path (light, cheap, additive quality bump) | Quality polish | 0.5 day |

**Total estimated effort: 3.5–4.5 days**

---

## 13. Safe Iteration Workflow

### Non‑Destructive Rules

1. **Never delete existing code.** New logic goes in new files. Old functions stay until new ones are promoted.
2. **Feature flag everything.**
   - Template engine: `USE_TEMPLATE_INSIGHTS=true` (env var or JS global)
   - Schema v2: `WRAPPED_PROMPT_VERSION=v2` (env var or query param)
   - Both default to off (`false` / `v1`).
3. **Side‑by‑side comparison.** When both are enabled, generate both v1 and v2 output and log the diff. Inspect via debug panel.
4. **Promote only when quality improves.** Use the QA checklist below before switching defaults.

### Version Control — New Files

```
src/lib/insight-templates.ts     ← NEW: Template engine + all templates (Phase 1)
src/lib/insight-schema.ts        ← NEW: Schema v2 types + validation (Phase 4)
```

### Version Control — Modified Files

```
projects/chatgpt-wrapped/js/core/analysis.js
    ← MODIFIED: Replace generateDataInsights() guts with template engine call (Phase 2)
src/server.ts
    ← MODIFIED: Add missing signals to prompt, add v2 prompt, add schema validation (Phase 3-4)
```

### QA Checklist (Gate for Promotion)

- [ ] Every insight references at least one concrete stat or topic
- [ ] No banned generic phrases appear in any field
- [ ] Fun facts are non‑obvious (not message count, peak hour, or total conversations restated)
- [ ] Roast/compliment include specific numbers
- [ ] Personality title is 3+ words and not a generic archetype
- [ ] Spirit animal reason references behavioral data, not personality traits
- [ ] Test with 3 different datasets — output varies meaningfully between them
- [ ] Latency regression < 20% (server path)
- [ ] Token usage increase < 25% (server path)

---

## 14. Task Breakdown

| # | Task | Phase | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Create `src/lib/insight-templates.ts` with template engine, `TemplateContext` type, `resolveTemplates()`, and universal fallbacks | Phase 1 | None | ⬜ |
| 2 | Author templates: 15–20 personality, 15–20 roast, 15–20 fun fact, 10+ compliment, 10+ spirit animal | Phase 1 | Task 1 | ⬜ |
| 3 | Wire template engine into `generateDataInsights()` in `js/core/analysis.js` behind feature flag, replacing static lookup tables | Phase 2 | Tasks 1–2 | ⬜ |
| 4 | Add missing signals to server LLM prompt: top keywords per topic, longest streak + dates, busiest day, avg message length, code block ratio, topic diversity score | Phase 3 | None | ⬜ |
| 5 | Expand semantic theme probes from 8 to 15+ (add DevOps, Data Science, UI/UX, Finance, Content Creation, Language Learning, Gaming) | Phase 3 | None | ⬜ |
| 6 | Create `src/lib/insight-schema.ts` with v2 schema types, `validateSchemaV2()`, and banned phrase list | Phase 4 | None | ⬜ |
| 7 | Add schema v2 prompt, version selection (`?prompt=v2` / env var), and validation + retry logic to `/api/wrapped/insights` | Phase 4 | Task 6 | ⬜ |
| 8 | Add optional LLM polish pass for template output on server path | Phase 5 | Tasks 1–3 | ⬜ |

---

## 15. Testing Plan

### Unit Tests — Template Engine (Phase 1–2)

For each template:
1. Construct a `TemplateContext` where the template's condition is `true`
2. Verify rendered output contains expected data values (no `${...}` literals, no `[undefined]`)
3. Construct a `TemplateContext` where the condition is `false` — verify template is excluded
4. Verify `resolveTemplates()` always returns non‑empty values for all fields (fallbacks work)
5. Verify that two different `TemplateContext` objects produce different output

### Integration Tests — Server Path (Phase 3–4)

1. Generate insights with `?prompt=v2` on 3 curated datasets with distinct profiles:
   - Dataset A: Night-owl coder, long streaks, coding-heavy
   - Dataset B: Daytime generalist, short conversations, many topics
   - Dataset C: Weekend creative writer, few conversations, long messages
2. Validate output against schema v2 (all citations present, all fields non‑empty)
3. Verify all citation values reference real stats from the input
4. Regenerate 5 times — verify variety (no two identical personality titles)
5. Measure token usage and latency — verify within budget

### Regression Tests

1. Generate insights with `?prompt=v1` — verify output unchanged from current behavior
2. Disable template engine flag — verify `generateDataInsights()` returns same output as before
3. Verify debug panel displays new fields correctly (including citations if present)

### Manual QA

1. Upload a file with distinct patterns (heavy night‑owl coder)
2. Check every insight‑bearing slide for specificity and data grounding
3. Upload a second file with different patterns (daytime writing generalist)
4. Verify insights are meaningfully different between the two
5. Run full QA checklist from Section 13

---

## 16. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| Template library too small → repetitive output | Medium | Medium | Start with 15+ per field; expand based on feedback; add LLM polish as escape valve |
| LLM ignores schema v2 constraints → vague output cached | High | Low | Validation gate + retry + fallback to template engine |
| New signals increase server prompt token count beyond budget | Medium | Low | Add signals incrementally; measure tokens after each addition |
| Template condition logic has edge cases → wrong template selected | Low | Medium | Unit test every condition; use universal fallbacks for zero‑match cases |
| Feature flag complexity → accidental v1/v2 mix in production | Low | Low | Clear flag naming; debug panel shows active version and source |
| LLM polish changes facts in template output | Medium | Low | Validation step after polish; discard polish if numbers change |

---

## 17. Open Questions

1. **Template authorship workflow.** Should templates be co-authored with an LLM (generate candidates → human curates best), or hand‑written entirely?
2. **Polish pass model selection.** If we add LLM polish for templates, should it use gpt-4o-mini (cheap, fast) or gpt-4o (better quality, higher cost)?
3. **A/B logging.** Should we store both v1 and v2 outputs in the cache for quality comparison, or only the active version?
4. **Monthly cost ceiling.** What's the acceptable monthly spend on insight generation API calls? (Current: ~$0.01/generation with gpt-4o-mini.)
5. **Client‑side LLM routing.** Long‑term, should file‑upload users ever route through the server LLM for richer insights? (Privacy implications for local‑only data.)
