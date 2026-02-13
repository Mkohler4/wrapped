# ChatGPT Wrapped V2 — LLM Engine Specification

> **Status:** Draft  
> **Date:** February 11, 2026  
> **Parent:** [design-doc.md](./design-doc.md)  
> **Purpose:** Detailed specification for the Fact Engine, LLM Narrative Writer, Template Fallback, and Validation systems.

---

## Architecture Overview

```
Raw Conversations
       ↓
  ┌─────────────┐
  │  Detectors   │  ← 5 analysis detectors + 2 data signal extractors
  │  (Phase 1)   │
  └──────┬──────┘
         ↓
  ┌─────────────┐
  │ Fact Engine  │  ← Orchestrates detectors, scores insights, ranks
  │   (2A)       │
  └──────┬──────┘
         ↓
  ┌──────┴──────────────────────┐
  │                              │
  ↓                              ↓
┌──────────────┐   ┌───────────────────┐
│ LLM Narrative │   │ Template Fallback │
│ Writer (2B)   │   │ (2C) — no LLM    │
└──────┬───────┘   └────────┬──────────┘
       ↓                     ↓
  ┌─────────────┐      (deterministic)
  │ Validation  │
  │  (2D)       │
  └──────┬──────┘
         ↓
  WrappedInsightsV3
         ↓
  Sequence Engine → Beats
```

### Design Principles

1. **Fact-first** — Deterministic facts are computed before any LLM touches them. The LLM writes prose around verified numbers.
2. **Graceful degradation** — If the LLM fails, template fallback produces B+ quality output. If data is thin, beats are skipped rather than filled with generic copy.
3. **Traceable** — Every number in the final output must trace back to an InsightFact. Validation enforces this.
4. **No hallucination** — The LLM is never asked to analyze data. It only writes narratives around pre-computed facts.

---

## 1. Detectors — Detailed Specification

### 1.1 Temporal Analysis Detector

**Purpose:** Understand how the user's ChatGPT usage evolved over time.

**Inputs:**
```typescript
interface ConversationRecord {
  id: string;
  title: string;
  create_time: string;      // ISO timestamp
  message_count: number;
  topics: string[];          // classified topics
  messages: MessageRecord[];
}
```

**Algorithm:**
1. Bucket conversations by month
2. For each month: count conversations, total messages, unique topics
3. Compute topic transition matrix:
   - For consecutive months, track which topics appeared/disappeared
   - Flag topics that span >3 months as "sustained interests"
   - Flag topics that appear once as "flashes"
4. Identify usage trend:
   - `firstMonth`: first month with >0 conversations
   - `peakMonth`: month with most conversations
   - `recentMonth`: most recent month
   - `growthMultiplier`: recentMonth.count / firstMonth.count

**Output:**
```typescript
interface TemporalProfile {
  monthlyBuckets: {
    month: string;           // "2024-01"
    conversationCount: number;
    messageCount: number;
    topTopics: string[];     // top 3 topics this month
  }[];
  topicTransitions: {
    topic: string;
    firstSeen: string;
    lastSeen: string;
    monthsActive: number;
    category: 'sustained' | 'flash' | 'growing' | 'fading';
  }[];
  usageTrend: {
    firstMonth: { month: string; count: number };
    peakMonth: { month: string; count: number };
    recentMonth: { month: string; count: number };
    growthMultiplier: number;
    trend: 'accelerating' | 'steady' | 'declining' | 'sporadic';
  };
}
```

---

### 1.2 Behavioral Correlation Detector

**Purpose:** Find surprising patterns in when/how the user uses ChatGPT.

**Algorithm:**
1. For each conversation, extract: hour of day, day of week, message count, avg message length, topics
2. Compute cross-tabulations:
   - **Hour × avg message length** → Are late-night messages longer/shorter?
   - **Hour × topic distribution** → Different topics at different times?
   - **DOW × conversation frequency** → Weekday vs weekend patterns
   - **DOW × avg message length** → Mid-week fatigue?
3. Apply minimum sample thresholds:
   - Need ≥20 conversations per hour bucket (combine adjacent hours if needed)
   - Need ≥10 conversations per DOW
4. Score each correlation by deviation from baseline:
   - Calculate baseline (overall average)
   - Calculate bucket average
   - Deviation = |bucket_avg - baseline| / baseline
   - Only report correlations with >25% deviation

**Output:**
```typescript
interface BehavioralCorrelation {
  type: 'hour_length' | 'hour_topic' | 'dow_frequency' | 'dow_length';
  description: string;          // Human-readable: "Your messages after midnight are 2.3x longer"
  factor1: string;              // "hour:23-03"
  factor2: string;              // "avg_length:847"
  baseline: number;             // 368
  actual: number;               // 847
  deviationPercent: number;     // 130
  sampleSize: number;           // 47
  strength: 'strong' | 'moderate' | 'weak';
}
```

---

### 1.3 Growth Signal Detector

**Purpose:** Show how the user's ChatGPT usage matured over time.

**Algorithm:**
1. Split conversations chronologically: first 25% vs last 25%
2. Compare:
   - **Message length** — Are messages getting longer (more detailed prompts)?
   - **Topic diversity** — More topics = broader usage
   - **Code block ratio** — More code = more technical usage
   - **Conversation length** — More messages per conversation = deeper engagement
3. Compute growth percentage for each metric
4. Only report metrics with >15% change
5. Determine overall growth narrative:
   - "Evolved from simple questions to complex multi-turn conversations"
   - "Expanded from 2 topics to 8"

**Output:**
```typescript
interface GrowthSignal {
  metric: 'message_length' | 'topic_diversity' | 'code_ratio' | 'conversation_depth';
  earlyValue: number;
  recentValue: number;
  changePercent: number;
  direction: 'up' | 'down' | 'stable';
  narrative: string;           // Raw narrative for template fallback
}
```

---

### 1.4 Life Event Detector

**Purpose:** Detect major life transitions from topic velocity changes. **Handle with extreme care.**

**Algorithm:**
1. Compute weekly topic velocity: conversations per week per topic
2. Detect spikes: week where a topic's velocity exceeds 3× its 4-week moving average
3. Detect drop-offs: topic active for 4+ weeks, then zero for 2+ weeks
4. Hard-block sensitive topics:
   - Health/medical, legal, financial crisis, relationship crisis
   - Use keyword blocklist + topic classifier
5. Frame neutrally:
   - ✅ "In March, you started exploring Python — 12 conversations in one week"
   - ❌ "You seem to have gone through a difficult time"

**Output:**
```typescript
interface LifeEventSignal {
  type: 'spike' | 'dropoff' | 'new_interest' | 'phase_shift';
  topic: string;
  week: string;               // "2024-W12"
  velocity: number;           // conversations this week
  baseline: number;           // 4-week moving average
  multiplier: number;         // velocity / baseline
  narrative: string;          // Neutral framing
  blocked: boolean;           // true if sensitive topic
}
```

---

### 1.5 Benchmark Computation

**Purpose:** Show how the user compares to other ChatGPT users.

**14 Metrics:**

| # | Metric | Computation |
|---|--------|-------------|
| 1 | Total conversations | COUNT(*) |
| 2 | Total messages | SUM(message_count) |
| 3 | Messages per conversation | AVG(message_count) |
| 4 | Avg message length (chars) | AVG(LENGTH(content)) |
| 5 | Longest streak (days) | Max consecutive active days |
| 6 | Active days | COUNT(DISTINCT DATE(create_time)) |
| 7 | Topic diversity | COUNT(DISTINCT topic) |
| 8 | Night-owl score | % messages between 11pm-5am |
| 9 | Code block ratio | % messages with ``` blocks |
| 10 | Conversations/month | Total / months active |
| 11 | Time-of-day distribution | Entropy of hour distribution |
| 12 | Day-of-week distribution | Entropy of DOW distribution |
| 13 | First conversation date | MIN(create_time) |
| 14 | Busiest single day | MAX(daily conversation count) |

**Percentile Computation:**

```typescript
function computePercentile(
  value: number,
  distribution: BenchmarkDistribution
): number {
  // Binary search through sorted distribution
  // Return 0-100 percentile
  // When no aggregate data: use published research baselines
  // When no research: use self-comparison (top metric vs average)
}
```

**Fallback tiers:**
1. **Tier 1:** Anonymous aggregate data from opted-in users (best)
2. **Tier 2:** Published research / industry reports (good)
3. **Tier 3:** Self-comparison — user's best metric vs their average (acceptable)

**Output:**
```typescript
interface BenchmarkResult {
  metric: string;
  value: number;
  percentile: number;         // 0-100
  tier: 1 | 2 | 3;           // data source quality
  comparison: string;         // "Top 5% of ChatGPT users"
  funFact?: string;           // "That's more conversations than 95% of users"
}
```

---

### 1.6 Word Frequency Analyzer (V2 New)

**Purpose:** Power the word cloud visualization in Beats 16-19.

**Algorithm:**
1. Extract all words from user messages (not AI responses)
2. Lowercase, strip punctuation
3. Remove stop words (the, a, an, is, was, etc. — ~200 words)
4. Remove common ChatGPT filler ("please", "help", "thanks", "can you")
5. Stem or lemmatize (optional, configurable)
6. Count frequency
7. Return top 30, sorted by frequency

**Output:**
```typescript
interface WordCloudEntry {
  word: string;
  frequency: number;
  rank: number;               // 1 = most frequent
  topicAssociation?: string;  // which topic uses this word most
}
```

---

### 1.7 Daily Activity Extractor (V2 New)

**Purpose:** Power the heatmap visualization in Beat 15.

**Algorithm:**
1. For the calendar year, create 365 slots (Jan 1 - Dec 31)
2. Count conversations per day
3. Find max, compute intensity buckets (0, low, med, high, max)

**Output:** `number[]` — 365 values, index 0 = Jan 1

---

## 2. Fact Engine — Detailed Specification

### 2.1 Orchestration

The Fact Engine runs all detectors and collects their outputs into a unified `InsightFact[]`.

```typescript
async function generateFacts(
  conversations: ConversationRecord[]
): Promise<InsightFact[]> {
  // Run detectors in parallel where possible
  const [temporal, correlations, growth, lifeEvents, benchmarks, words, daily] =
    await Promise.all([
      detectTemporal(conversations),
      detectCorrelations(conversations),
      detectGrowth(conversations),
      detectLifeEvents(conversations),
      computeBenchmarks(conversations),
      computeWordFrequencies(conversations),
      computeDailyActivity(conversations),
    ]);

  // Convert detector outputs to InsightFacts
  const facts: InsightFact[] = [
    ...temporalToFacts(temporal),
    ...correlationsToFacts(correlations),
    ...growthToFacts(growth),
    ...lifeEventsToFacts(lifeEvents),
    ...benchmarksToFacts(benchmarks),
  ];

  // Score each fact
  facts.forEach(f => f.wowScore = computeWowScore(f));

  // Sort by wow score descending
  facts.sort((a, b) => b.wowScore - a.wowScore);

  return facts;
}
```

### 2.2 InsightFact Interface

```typescript
interface InsightFact {
  id: string;                    // unique identifier
  category: 'trajectory' | 'benchmark' | 'correlation' | 'growth' | 'life_event';
  subcategory: string;           // e.g., "hour_length", "topic_diversity"
  
  // The hard numbers
  dataPoints: Record<string, number | string>;
  // e.g., { "late_night_avg_length": 847, "baseline_avg_length": 368 }

  // Pre-computed narratives
  rawNarrative: string;          // Template-ready: "Your late-night messages average 847 chars, 2.3x your daytime average"
  
  // Scoring
  wowScore: number;              // 1-10
  specificity: number;           // 1-5 (does it have real numbers/dates/names?)
  surprise: number;              // 1-5 (how far from baseline?)
  emotionalResonance: number;    // 1-5 (does it tell a story?)
  shareability: number;          // 1-5 (would someone screenshot this?)

  // Metadata
  sampleSize: number;            // conversations used to compute this
  confidence: 'high' | 'medium' | 'low';
  beatTargets: string[];         // which beats could use this fact
}
```

### 2.3 Wow Score Computation

```typescript
function computeWowScore(fact: InsightFact): number {
  // Weighted average
  const score = (
    fact.specificity * 0.30 +
    fact.surprise * 0.30 +
    fact.emotionalResonance * 0.25 +
    fact.shareability * 0.15
  );
  
  // Category bonus (trajectory > correlation > benchmark > growth > life_event)
  const categoryBonus: Record<string, number> = {
    trajectory: 0.5,
    correlation: 0.3,
    benchmark: 0.2,
    growth: 0.1,
    life_event: 0.0,  // neutral — sensitive
  };
  
  // Confidence penalty
  const confidencePenalty: Record<string, number> = {
    high: 0,
    medium: -0.5,
    low: -1.0,
  };
  
  return Math.min(10, Math.max(1,
    score * 2 + (categoryBonus[fact.category] ?? 0) + (confidencePenalty[fact.confidence] ?? 0)
  ));
}
```

### 2.4 Hook Selection

The hook is the single most important insight — it's the first thing the user sees.

**Rules:**
1. Hook MUST be a behavioral pattern (correlation or trajectory), NOT a benchmark
2. Hook MUST have wow score ≥ 7
3. Hook MUST have confidence = 'high'
4. Hook MUST be expressible in ≤15 words
5. If no fact meets criteria → use highest-wow benchmark as fallback

```typescript
function selectHook(facts: InsightFact[]): InsightFact {
  const candidates = facts
    .filter(f => f.category === 'correlation' || f.category === 'trajectory')
    .filter(f => f.wowScore >= 7)
    .filter(f => f.confidence === 'high');
  
  if (candidates.length > 0) {
    return candidates[0]; // already sorted by wow score
  }
  
  // Fallback: highest-wow benchmark
  return facts.find(f => f.category === 'benchmark') ?? facts[0];
}
```

### 2.5 Minimum Guaranteed Facts

For thin data profiles (< 30 conversations), ensure at least these facts:
- Total conversations (always available)
- Total messages (always available)
- First conversation date (always available)
- Most active day (always available)
- Top topic (available if ≥5 conversations)

---

## 3. LLM Narrative Writer — Detailed Specification

### 3.1 System Prompt

```
You are writing the narrative text for a ChatGPT Wrapped experience — a personalized year-in-review 
presentation for a user's ChatGPT usage data.

You will receive a set of InsightFacts — pre-computed, verified insights about the user's ChatGPT usage.
Your job is to write compelling, specific narrative text for each section of the Wrapped experience.

CRITICAL RULES:
1. NEVER invent a number, date, topic, or statistic. Every fact you cite must appear in the InsightFacts.
2. NEVER use generic compliments like "You're quite the conversationalist!" or "Impressive usage!"
3. ALWAYS reference specific numbers: "Your 847-char midnight messages" not "Your long messages"
4. The hook must be a behavioral pattern — something surprising about HOW they use ChatGPT.
5. The compliment must reference specific growth: "Your prompts grew from 45 to 312 words" not "You've grown"
6. yearOneLine should read like the closing sentence of a personal essay.
7. Profile personality should be substantive: "methodical debugger who treats ChatGPT as a thinking partner"
   NOT "curious and creative individual"
8. Fun facts must be specific and quirky: "You used the word 'actually' 847 times"
   NOT "You asked lots of interesting questions"

OUTPUT FORMAT:
Return a JSON object conforming to the WrappedInsightsV3 schema. All text fields should be filled.
If you don't have enough data for a field, set it to null — never fill it with generic text.
```

### 3.2 Input Structure

The LLM receives:
1. The system prompt above
2. The ranked `InsightFact[]` (all facts, sorted by wow score)
3. Raw stats: total conversations, total messages, date range
4. The V3 schema definition (so it knows what to fill)

### 3.3 Output Mapping

| V3 Field | Source Facts | Writer Instruction |
|----------|-------------|-------------------|
| `hook.statement` | Top behavioral correlation | ≤15 words, surprising |
| `hook.subtext` | Same fact, expanded | 1 sentence with numbers |
| `yearAtAGlance.totalConversations` | Raw stat | Number only |
| `yearAtAGlance.totalMessages` | Raw stat | Number only |
| `yearAtAGlance.topInsight` | Top trajectory fact | 1 sentence |
| `topicBreakdown.insights` | Temporal profile | 2-3 sentences about topic patterns |
| `growth.narrative` | Growth signals | 2-3 sentences about how usage matured |
| `growth.dataPoints` | Growth detector | Chart data |
| `profile.personality` | Multiple categories | 2-3 adjectives + substantive description |
| `profile.chatStyle` | Correlations + benchmarks | How they interact with ChatGPT |
| `profile.topTraits` | All categories | 3-5 specific traits |
| `profile.funFacts` | Benchmarks + correlations | 3-5 specific, quirky facts |
| `trophyRoom.trophies` | Benchmarks (top percentiles) | Badge name, icon, unlock message |
| `trophyRoom.compliment` | Growth signals | Specific growth reference |
| `trophyRoom.yearOneLine` | All categories | Closing essay sentence |

### 3.4 Temperature & Model Config

```typescript
const NARRATIVE_CONFIG = {
  model: 'gpt-4o',
  temperature: 0.7,          // Creative enough for prose, stable enough for facts
  max_tokens: 4000,
  top_p: 0.9,
  frequency_penalty: 0.3,   // Reduce repetitive phrasing
  presence_penalty: 0.1,
};
```

### 3.5 Banned Phrases

Reject output containing any of these (case-insensitive):

```
"quite the"
"impressive"
"certainly"
"it's clear that"
"you've been busy"
"what a journey"
"power user"
"deep dive" (except as topic name)
"it seems"
"you seem to"
"really stood out"
"fascinating"
"demonstrates"
"showcases"
"a testament to"
"an avid"
"clearly"
"evidently"
"a true"
"no stranger to"
```

If banned phrase detected: retry with explicit instruction to avoid that phrase. Max 2 retries.

---

## 4. Template Fallback Engine — Detailed Specification

### 4.1 Purpose

When the LLM is unavailable, rate-limited, or produces invalid output, the Template Fallback produces deterministic output using `InsightFact[]` directly. Goal: B+ quality without any LLM call.

### 4.2 Template Library

Every V3 field has 3-5 template variants. Template selection is based on the data available.

```typescript
const HOOK_TEMPLATES = {
  hour_length: [
    "Your messages after midnight average ${late_night_avg_length} characters — ${multiplier}x your daytime average.",
    "Between ${start_hour} and ${end_hour}, your messages stretch to ${late_night_avg_length} chars.",
    "Night owl alert: ${late_night_avg_length}-character messages while the world sleeps."
  ],
  hour_topic: [
    "After ${hour}pm, you switch from ${day_topic} to ${night_topic}.",
    "${night_topic} is your midnight companion — ${percent}% of late-night conversations.",
  ],
  topic_velocity: [
    "In ${month}, you went from 0 to ${count} conversations about ${topic}.",
    "${topic} took over your feed in ${month}: ${count} conversations in ${weeks} weeks.",
  ],
  // ... more templates for each subcategory
};

const PROFILE_PERSONALITY_TEMPLATES = [
  "A ${trait1} who treats ChatGPT as a ${relationship} — ${detail}.",
  "${trait1}, ${trait2}, and unapologetically ${trait3}.",
  "Part ${role1}, part ${role2} — with a side of ${quirk}.",
];

const YEAR_ONE_LINE_TEMPLATES = [
  "A year of turning questions into answers, ${total_conversations} conversations at a time.",
  "${total_conversations} conversations, ${total_topics} topics, one relentlessly curious mind.",
  "From ${first_topic} to ${last_topic} — ${total_conversations} conversations that mapped the shape of your thinking.",
];
```

### 4.3 Template Selection

```typescript
function selectTemplate(
  templates: string[],
  facts: InsightFact[],
  field: string
): string {
  // 1. Find the best fact for this field
  const relevantFacts = facts.filter(f => f.beatTargets.includes(field));
  if (relevantFacts.length === 0) return null; // field will be null
  
  const bestFact = relevantFacts[0]; // sorted by wow score
  
  // 2. Find templates matching the fact's subcategory
  const categoryTemplates = templates[bestFact.subcategory];
  if (!categoryTemplates) return bestFact.rawNarrative; // use raw narrative
  
  // 3. Pick template that can be fully populated
  for (const template of categoryTemplates) {
    const placeholders = template.match(/\$\{(\w+)\}/g);
    const allAvailable = placeholders?.every(p => {
      const key = p.slice(2, -1);
      return bestFact.dataPoints[key] !== undefined;
    });
    if (allAvailable) {
      return fillTemplate(template, bestFact.dataPoints);
    }
  }
  
  return bestFact.rawNarrative;
}
```

### 4.4 Quality Rules

- Every template must embed at least one number
- Never output a template with unfilled `${...}` placeholders
- If a field can't be filled: set to `null`, add to `_placeholderBeats`
- Template output should never trigger the banned phrase filter

---

## 5. Validation & Recovery Pipeline

### 5.1 Multi-Tier JSON Recovery

```
Tier 1: JSON.parse(response)
  ↓ fail
Tier 2: Strip markdown fences, retry parse
  ↓ fail
Tier 3: Regex extract JSON object from response
  ↓ fail
Tier 4: Ask LLM to reformat its own output as valid JSON
  ↓ fail
Tier 5: Template Fallback (no LLM)
```

### 5.2 Content Validation

After successful parse, validate content:

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  sanitized: WrappedInsightsV3;
}

function validateInsights(
  output: WrappedInsightsV3,
  facts: InsightFact[]
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  // 1. Number Matching
  // Every number in the output must exist in some InsightFact's dataPoints
  const outputNumbers = extractNumbers(output);
  const factNumbers = new Set(facts.flatMap(f => Object.values(f.dataPoints).filter(v => typeof v === 'number')));
  for (const num of outputNumbers) {
    if (!factNumbers.has(num) && !isCommonNumber(num)) {
      errors.push({ field: num.field, message: `Number ${num.value} not found in facts` });
    }
  }
  
  // 2. Banned Phrase Check
  const allText = extractAllText(output);
  for (const phrase of BANNED_PHRASES) {
    if (allText.toLowerCase().includes(phrase.toLowerCase())) {
      errors.push({ field: 'text', message: `Contains banned phrase: "${phrase}"` });
    }
  }
  
  // 3. Hook Must Be Behavioral
  if (output.hook?.statement) {
    const hookFact = facts.find(f => f.rawNarrative.includes(output.hook.statement));
    if (hookFact && hookFact.category === 'benchmark') {
      warnings.push({ field: 'hook', message: 'Hook is a benchmark, should be behavioral' });
    }
  }
  
  // 4. Minimum Specificity
  // Check that profile.personality is not generic
  if (output.profile?.personality) {
    const genericPhrases = ['curious', 'creative', 'thoughtful', 'interesting'];
    const isGeneric = genericPhrases.some(p => output.profile.personality.startsWith(p));
    if (isGeneric) {
      warnings.push({ field: 'profile.personality', message: 'Personality may be too generic' });
    }
  }
  
  // 5. Required Fields
  const required = ['hook.statement', 'yearAtAGlance.totalConversations', 'yearAtAGlance.totalMessages'];
  for (const field of required) {
    if (!getNestedField(output, field)) {
      errors.push({ field, message: `Required field missing: ${field}` });
    }
  }
  
  return { valid: errors.length === 0, errors, warnings, sanitized: output };
}
```

### 5.3 Recovery Actions

| Condition | Action |
|-----------|--------|
| JSON parse fails (all tiers) | Use Template Fallback |
| Banned phrase detected | Retry LLM with instruction to avoid (max 2) |
| Number not in facts | Strip that sentence, use fact's rawNarrative |
| Required field missing | Fill from Template Fallback for that field only |
| Generic personality | Retry LLM with stricter prompt (max 1) |
| All retries exhausted | Template Fallback for entire output |

### 5.4 _placeholderBeats

```typescript
// Beats that couldn't be populated with quality content
// Sequence Engine will skip these beats
output._meta = {
  _placeholderBeats: ['wordCloud', 'images', 'trophyRoom'],
  _factCount: 23,
  _topWowScore: 8.4,
  _hookCategory: 'correlation',
  _fallbackUsed: false,
  _validationWarnings: ['profile.personality may be too generic'],
};
```

---

## 6. Performance Budget

| Operation | Target | Notes |
|-----------|--------|-------|
| All detectors (parallel) | ≤ 2s | SQL queries + in-memory computation |
| Fact Engine orchestration | ≤ 500ms | Sorting + wow scoring |
| LLM Narrative call | ≤ 5s | Single GPT-4o call |
| Validation | ≤ 200ms | Synchronous |
| Template Fallback | ≤ 100ms | No network calls |
| **Total pipeline** | **≤ 8s** | **With LLM** |
| **Total (fallback)** | **≤ 3s** | **Without LLM** |

---

## 7. Testing Strategy

### Unit Tests

| Component | Test Cases |
|-----------|-----------|
| Each detector | Empty data, 1 conversation, 100 conversations, 1000 conversations |
| Temporal | Single month, 12 months, gaps in months |
| Correlations | Below sample threshold (skip), above threshold (report) |
| Growth | No change (stable), growth, decline |
| Life Events | No spikes, spike detected, sensitive topic blocked |
| Benchmarks | All 14 metrics compute correctly, fallback tiers work |
| Word Frequency | Stop words removed, top 30 correct |
| Fact Engine | Correct ranking, hook selection, minimum facts for thin data |
| Wow Score | Category bonuses applied, confidence penalty applied |
| Template Fallback | Every V3 field has a template, no unfilled placeholders |
| Validation | Banned phrases caught, numbers traced, missing fields detected |

### Integration Tests

| Scenario | Profile | Expected |
|----------|---------|----------|
| Power user | 1000+ convos, 12 months | All beats populated, strong hook, multiple trophies |
| Casual user | 100 convos, 6 months | Most beats populated, some skipped |
| New user | 20 convos, 1 month | Basic stats only, many beats skipped |
| LLM failure | Any profile, LLM disabled | Template fallback produces valid V3 |
| Malformed LLM | Any profile, LLM returns bad JSON | Recovery pipeline produces valid V3 |

---

## 8. Open Questions

1. **Embedding search for profile insights?** — The V1 design mentions embeddings for semantic search. Should we use this for profile personality generation? Or is the Fact Engine + LLM sufficient?
2. **Multi-language support** — Should templates be i18n-ready from the start?
3. **Caching strategy** — Should we cache InsightFacts and only regenerate narratives? Or cache the entire V3 output?
4. **Topic classifier** — What classifier are we using for topic assignment? Is it already built, or does it need to be built in Phase 1?
