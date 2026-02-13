# ChatGPT Wrapped V2 — Design Document

> **Status:** Draft  
> **Date:** February 11, 2026  
> **Supersedes:** [../llm-insights-redesign/design-doc.md](../llm-insights-redesign/design-doc.md)  
> **Goal:** Build a cinematic, editor-native ChatGPT Wrapped experience where the entire presentation lives inside a fake ChatGPT editor. Users watch a scripted sequence of typed prompts and AI responses that unfold into full-screen data visualizations, animations, and insight reveals. The LLM engine provides genuine, data-grounded insights while every screen serves the narrative flow.

---

## Table of Contents

1. [What Changed & Why](#1-what-changed--why)
2. [The Experience: Editor-Native Cinema](#2-the-experience-editor-native-cinema)
3. [The Complete Workflow](#3-the-complete-workflow)
4. [Design Principles](#4-design-principles)
5. [The LLM Insight Engine](#5-the-llm-insight-engine)
6. [Data Architecture & Requirements](#6-data-architecture--requirements)
7. [Output Schema (V3)](#7-output-schema-v3)
8. [Validation & Recovery](#8-validation--recovery)
9. [Risks & Mitigations](#9-risks--mitigations)
10. [Open Questions](#10-open-questions)

---

## 1. What Changed & Why

### From Slides to Cinema

The previous design (V1) was a **16-slide swipe deck** — think Spotify Wrapped or Instagram Stories. Each slide was a standalone poster with one insight, swiped left/right. This worked conceptually but missed the meta opportunity: **this is a ChatGPT product about ChatGPT usage**. The medium IS the message.

V2 reimagines the experience as a **scripted cinematic sequence inside a fake ChatGPT editor**. The user watches (or interacts with) a simulated conversation where they "ask" ChatGPT for their Wrapped, and the AI "responds" with animated data reveals that burst out of the chat interface.

### What Stays the Same

- **LLM Insight Engine architecture** — The deterministic Fact Engine → LLM Narrative Writer → Validation pipeline is unchanged. It's the right architecture.
- **Five insight categories** — Trajectory, Benchmarks, Correlations, Growth, Life Events. All still apply.
- **Data requirements** — Same signals are needed: temporal profiles, behavioral correlations, growth detection, life event spikes, benchmark percentiles.
- **"Screenshot-worthy" bar** — Every reveal must pass the screenshot test.
- **Poster, not dashboard** — Each reveal still communicates exactly one thing. The editor is a frame, not a reason to add complexity.

### What Changed

| V1 (Swipe Deck) | V2 (Editor Cinema) |
|------------------|-------------------|
| 16 standalone slides, swiped left/right | Continuous scripted sequence inside a fake editor |
| Slide transitions (dissolve, fade) | Camera-style movements (zoom in/out, scroll, pan) |
| Each slide is a full-bleed color poster | Reveals emerge from the chat, manipulate editor elements |
| Navigation: dots, swipe, arrows | Navigation: the sequence plays like a video; interaction triggers next beats |
| Static share card at the end | Trophy room / conclusion with profile, images, share |
| Linear: Hook → Stats → Patterns → Share | Interactive-feeling: type prompt → get response → explore response |
| No editor metaphor | The entire experience lives inside a ChatGPT editor shell |
| Separate "scenes" with hard transitions | Fluid animations: content morphs between states (bars → graph, messages → stats) |

### Why This Is Better

1. **It's meta.** Asking ChatGPT to analyze your ChatGPT usage, inside ChatGPT. Instantly shareable concept.
2. **The generation moment creates tension.** Typing, sending, thinking dots — real anticipation before each reveal.
3. **Transitions are meaningful.** Content doesn't just fade — messages cascade, numbers morph, bars collapse into graphs. Every transition tells a micro-story.
4. **It feels alive.** A fake cursor clicks buttons, opens sidebars, types prompts. The experience feels like watching someone (you) use ChatGPT, not reading a report.
5. **Shareability is built in.** "Look what ChatGPT told me about myself" is a stronger share hook than "Look at my Wrapped."

---

## 2. The Experience: Editor-Native Cinema

### The Editor Shell

The entire experience lives inside a replica of the ChatGPT interface:
- **Header:** Model selector ("ChatGPT ▾"), sidebar toggle, new chat button
- **Main area:** Chat messages, welcome screen, data visualizations
- **Footer:** Input field with cursor, send button, attach button
- **Sidebar:** Conversation list (slides in from left)

The editor starts as the full UI. As reveals unfold, the editor chrome (header, footer, sidebar) fades, zooms, or repositions to frame the content. The editor is always present as a grounding element — even when a full-screen visualization takes over, you can still see the whisper of the chat interface at the edges.

### The Fake Cursor

A simulated mouse cursor is a key character in the experience. It:
- Appears when interaction is needed (clicking send, clicking sidebar button, clicking profile)
- Travels smoothly with natural easing
- Clicks buttons with visual feedback (press, release, ripple)
- Disappears when the text cursor takes over (during typing)

### Camera Movements

Instead of slide transitions, V2 uses camera-style movements on the editor:
- **Zoom in:** `scale()` on the editor — pushes toward a specific element (input field, graph, response)
- **Zoom out:** Pulls back to show the full editor
- **Scroll:** `scrollTop` on the main area — content flows up/down
- **Pan:** `translateY()` — content slides as if the viewport is moving

All transforms use CSS transitions with cubic-bezier easing for cinematic feel.

### Audio Rhythm (Visual)

Even without audio, the sequence has rhythm:
- **Beats:** Each reveal has a clear start, hold, and exit
- **Pauses:** Deliberate holds after key numbers/insights (2-4 seconds)
- **Acceleration:** The cascade of messages speeds up, then slows
- **Breath:** A moment of empty screen before emotional reveals

---

## 3. The Complete Workflow

This is the scripted sequence the user experiences. Each step is a "beat" in the cinematic flow.

### Act 1: The Hook (Beats 1–4)

| Beat | What Happens | Duration | Data Required |
|------|-------------|----------|---------------|
| **1. Idle** | Editor appears. Empty chat. Cursor blinks. "What can I help with?" welcome screen. | ~1.5s | None |
| **2. Type & Send** | Text types: "Give me my 2025 ChatGPT Wrapped". Fake cursor moves to send button, clicks. Message becomes a user bubble. | ~4s | None |
| **3. AI Response** | Thinking dots pulse → AI response streams word-by-word: the **hook insight** (a behavioral pattern the user never noticed). Response wraps into a styled bubble. | ~4s | `hook.statement` from Fact Engine — must be a behavioral pattern or trajectory, not a raw stat |
| **4. Generate Image** | After the hook, an image is "generated" — a DALL-E style creation representing the user's ChatGPT usage pattern. The image appears as part of the AI response. | ~3s | Generated or pre-selected image based on usage patterns |

### Act 2: The Deep Dive (Beats 5–12)

| Beat | What Happens | Duration | Data Required |
|------|-------------|----------|---------------|
| **5. Zoom In on Image** | Camera zooms into the image. The image represents a diagram/visualization of *when* they use ChatGPT (time-of-day distribution, frequency pattern). As the zoom settles, the diagram elements become readable. | ~3s | `timeOfDayDistribution`, `peakHours`, usage heatmap data |
| **6. Zoom Out** | Camera pulls back to the editor view. The image sits in the chat. | ~1.5s | None |
| **7. Scroll Down Messages** | The chat scrolls down. Ghost message bubbles cascade in rapidly — representing all their conversations. Messages blur and compress. A gradient overlay appears. | ~5s | `totalMessages` count for the cascade density |
| **8. Show Messages** | Hero stat appears over the blurred messages: "**20,000** messages in 2025". Counts up. Shows You/ChatGPT split. | ~4s | `totalMessages`, `userMessages`, `aiMessages` |
| **9. Show Conversations** | Hero number morphs from 20,000 → 847 (or actual count). Label cross-fades to "conversations in 2025". | ~3s | `totalConversations` |
| **10. Click Conversations Button** | Fake cursor moves to sidebar toggle, clicks it. Content slides away with parallax scroll-up effect. | ~3s | None (UI interaction) |
| **11. Organize Conversations** | Sidebar opens with conversation list. Items stagger in. Each item gets color-coded by topic. Items are "pulled out" one by one and organized into topic columns in the main area. | ~5s | `conversationsByTopic` — list of conversations with topic tags |
| **12. Show Topic Diversity** | Topic columns merge into a horizontal bar chart. Bars grow proportionally. Labels appear: #1 Coding, #2 Writing, etc. Subline: "Your most talked-about topics in 2025". | ~4s | `topTopics` with counts, `topicDiversity` score |

### Act 3: Growth & Insights (Beats 13–18)

| Beat | What Happens | Duration | Data Required |
|------|-------------|----------|---------------|
| **13. Show Growth Prompt** | Bar chart collapses. Cursor moves to input field. Types: "Show me my growth in [top topic]". Sends message. | ~4s | `topTopics[0]` for the prompt text |
| **14. Generate Facts & Line Graph** | AI thinking dots → response streams in with growth narrative. A line graph appears below the response (iOS-style: smooth curve, gradient fill, monthly labels). The graph draws itself. Camera zooms in. | ~6s | `monthlyConversations[]`, growth narrative from LLM, `growthMultiplier` |
| **15. Break Into Heatmap** | The line graph breaks apart — data points transform into heatmap cells. A GitHub-style activity grid forms with a fact overlay. | ~4s | `dailyActivity[]` (365 days), a heatmap-related fact from Fact Engine |
| **16. Scroll Back Up Messages** | Heatmap dissolves. Content scrolls back up through the message history, revisiting earlier conversations. | ~2s | None (transition) |
| **17. Collect Words** | Words are extracted from the scrolling messages — key terms, frequently used words pull out and float. | ~3s | `topWords[]` — most frequently used words/terms |
| **18. Bubble Words & Scale** | Extracted words form a bubble cloud. Bubbles scale by frequency — bigger = more used. The cloud arranges and settles. | ~3s | `topWords[]` with frequency counts |

### Act 4: Identity & Conclusion (Beats 19–24)

| Beat | What Happens | Duration | Data Required |
|------|-------------|----------|---------------|
| **19. Words Drop Off** | The word bubbles fall off the bottom of the screen, one by one or in cascading groups. Screen clears. | ~2s | None (animation) |
| **20. Click on Profile** | Fake cursor clicks on a profile button/icon. A profile card or panel slides in. An animation plays — reading/scanning effect on the profile content. The profile shows LLM-generated personality insights. | ~5s | `profileInsights` — personality type, usage style, key traits. From the LLM narrative layer. |
| **21. Close Profile** | Profile panel closes/dismisses. | ~1s | None |
| **22. Click on Images** | Fake cursor clicks on an images/gallery button. The user's DALL-E generated images take center stage — a gallery view or expanding grid. Shows count of images generated. | ~4s | `dalleImageCount`, `dalleImages[]` (thumbnails or manifests) |
| **23. Animate to Conclusion** | Images contract/fade. A trophy room appears — a curated summary of achievements, badges, and key stats. This is the "hall of fame" moment. | ~5s | `achievements[]` — earned badges (Top X%, streak records, milestones). `compliment`, `yearOneLine` from LLM. |
| **24. Share** | The editor returns to its normal state. A formatted share card sits in the chat as the AI's "final response." Share button prominent. | ~∞ | Pre-formatted share card with hook + top stat + badge |

---

## 4. Design Principles

### From V1 (Still Apply)

- **One thing per reveal.** Each beat communicates exactly one insight.
- **3-second test.** The user absorbs the key point in under 3 seconds.
- **Patterns first, stats second.** Behavioral insights before raw numbers.
- **Benchmarks are earned.** "Top X%" appears only after context.
- **Data-grounded.** Every number traces to a verified fact.
- **Screenshot-worthy.** Every reveal passes the "would you post this?" test.

### New for V2

- **The editor is the stage.** Never break the illusion. Everything happens inside the chat interface. No full-screen takeovers that forget the editor exists.
- **The cursor is a character.** It has personality — natural movement, slight hesitation before clicks, satisfying press animations. It guides the user's attention.
- **Transitions are content.** The cascade of messages IS the "you sent a lot" insight. The sidebar organization IS the "your topics" insight. The transition is not between insights — it IS the insight.
- **Generation creates tension.** Every reveal is preceded by a typing/thinking moment. This builds anticipation and makes the payoff hit harder.
- **Morphing, not cutting.** Content transforms: numbers morph (20,000 → 847), bars collapse into graphs, words extract from messages. Nothing just appears and disappears — it evolves.
- **The camera tells the story.** Zoom in = intimacy (look closely at this). Zoom out = perspective (see the big picture). Scroll = progression (time moves forward). Pan = discovery (what's over here?).
- **Rhythm matters.** Fast cascades → slow holds → quick transitions → dramatic pause → big reveal. The pacing should feel like a well-edited video.

### Visual Language

- **Dark editor background** (`#212121`) as the neutral canvas — the reveals bring color.
- **Accent colors by context:** Green for growth/positive, warm amber for time-related, purple for behavioral patterns, pink/magenta for life events, blue for stats.
- **Outfit font** throughout — bold for numbers, regular for narrative text, light for labels.
- **Ghost elements:** Cascade messages are semi-transparent, different widths, staggered heights — suggesting real messages without being readable.
- **Glow effects:** Ambient radial gradients behind hero numbers. Subtle, not overwhelming.
- **No emoji, no icons.** Typography and color do the work.

---

## 5. The LLM Insight Engine

> This section is largely unchanged from V1. The insight engine is architecture-agnostic — it produces structured facts regardless of how they're presented.

### Architecture: Fact Engine → Narrative Writer → Validation

```
[User's ChatGPT Export]
        ↓
  [ Data Pipeline ]         ← unchanged upload/import process
        ↓
  [ Fact Engine ]           ← deterministic, computes all 5 insight categories
        ↓                      + percentiles for 14 metrics
  [ Ranked InsightFact[] ]  ← sorted by wow score; hook = #1 behavioral fact
        ↓
  [ LLM Narrative Writer ]  ← rewrites facts as punchy copy (server path)
        ↓                      OR
  [ Template Fallback ]     ← ${placeholder} substitution (client path / LLM failure)
        ↓
  [ Validated Output ]      ← JSON schema V3, banned phrases, number verification
        ↓
  [ Sequence Engine ]       ← maps validated insights to beats in the cinematic flow
```

### The Five Insight Categories

| # | Category | What It Detects | Wow Factor | V2 Beat Mapping |
|---|----------|----------------|------------|-----------------|
| 1 | **Trajectory** | Topic/skill evolution over time | Highest | Beat 14 (Growth graph), Beat 5 (Image diagram) |
| 2 | **Benchmarks** | "Top X% of users" comparisons | High | Beat 23 (Trophy room), throughout as badges |
| 3 | **Correlations** | Non-obvious behavioral patterns (time × topic) | High | Beat 3 (Hook), Beat 5 (Image/diagram) |
| 4 | **Growth** | User evolution as an AI user | Medium-High | Beat 14 (Line graph), Beat 20 (Profile) |
| 5 | **Life Events** | Topic velocity spikes | Medium | Beat 15 (Heatmap fact), Beat 20 (Profile) |

### Fact Engine Details

The Fact Engine is **deterministic** — same input always produces the same output. No LLM involvement. It runs five parallel detectors:

**1. Temporal Analysis Detector** → `TemporalProfile`
- Topics bucketed by month/quarter
- Topic transition matrix (what followed what over time)
- Monthly conversation count and message count trends
- Usage trend curve (first, peak, recent month + growth multiplier)

**2. Behavioral Correlation Detector** → `BehavioralCorrelation[]`
- Hour-of-day × topic (day/night behavioral split)
- Hour-of-day × message length
- Day-of-week × conversation frequency
- Minimum sample thresholds (>20 conversations in a time bucket)
- Correlation strength scoring

**3. Growth Signal Detector** → `GrowthSignal[]`
- Early vs. recent message length (first 25% vs last 25%)
- Topic diversity expansion over time
- Code block usage trend
- Question sophistication comparison

**4. Life Event Detector** → `LifeEventSignal[]`
- Topic velocity by week (conversations per topic per week)
- Spike detection (>3x baseline in a topic)
- Drop-off detection (active topic → silence)
- Hard-blocked sensitive topics
- Neutral framing only ("Something happened", never "You got the job")

**5. Benchmark Computation** → `BenchmarkResult[]`
- Percentile computation for 14 metrics
- Three sources: aggregate anonymous stats (opt-in), published research fallback, internal self-comparison
- Only surfaces percentiles at extreme ends (top/bottom 10%)

### Wow Score & Hook Selection

Every `InsightFact` gets a wow score (1-10) based on:
- **Specificity:** Has real numbers, dates, topic names
- **Surprise:** How far from the user's baseline
- **Emotional resonance:** Trajectory > Correlation > Benchmark > Growth > Life Event
- **Shareability:** Would someone screenshot this?

The **hook** (Beat 3 — AI response) is always the highest-wow behavioral pattern or trajectory. Benchmarks are deprioritized for the hook — a correlation with wow score 7 beats a benchmark with wow score 8.

### LLM Narrative Writer

Takes verified `InsightFact[]` and rewrites them as punchy, Wrapped-style copy. Constraints:
- No invented facts or numbers
- Every number must trace to input facts
- Hook must be behavioral pattern (not benchmark)
- Compliment must reference specific growth/dedication
- Tone: "a friend who really sees you"
- Banned phrase list enforced

### Template Fallback

When LLM is unavailable, `rawNarrative` strings from the Fact Engine are used directly. Factual and specific, just less polished.

---

## 6. Data Architecture & Requirements

### Required Data Signals

**Tier 1 — Already computed or trivial:**

| Signal | V2 Beat | Source |
|--------|---------|--------|
| Total conversations | Beat 9 | Count |
| Total messages | Beat 8 | Count |
| User vs AI message split | Beat 8 | Count by role |
| First conversation date | Beat 23 (Trophy room) | Min create_time |
| Longest streak + dates | Beat 23 (Trophy room) | `computeStreaks()` |
| Busiest single day | Beat 15 (Heatmap fact) | Max conversations/day |
| Code block ratio | Beat 23 (Trophy room) | Messages with code / total |
| Topic diversity score | Beat 12 | Count distinct topics >5 convos |
| Top keywords per topic | Beat 17 (Word collection) | topWords filtered by topic |
| Average message length | Beat 14 (Growth narrative) | AVG(LENGTH(text)) |

**Tier 2 — New analysis required:**

| Signal | V2 Beat | Cost |
|--------|---------|------|
| Topics by month | Beat 14 (Growth graph) | 1 SQL query, group by month |
| Monthly conversation counts | Beat 14 (Line graph data) | 1 SQL query |
| Daily activity (365 days) | Beat 15 (Heatmap) | 1 SQL query |
| Hour × topic cross-tab | Beat 3 (Hook), Beat 5 (Image) | 1 SQL query |
| Hour × message length | Beat 3 (Hook) | 1 SQL query |
| DOW × behavior patterns | Beat 20 (Profile) | 1 SQL query |
| Early vs. recent message length | Beat 14 (Growth) | Compare first/last 25% |
| Early vs. recent topic diversity | Beat 14 (Growth) | Compare first/last 25% |
| Conversations by topic with titles | Beat 11 (Sidebar organization) | Query with topic tags + titles |
| Top words with frequencies | Beats 17-18 (Word bubbles) | Word frequency analysis |

**Tier 3 — Infrastructure:**

| Signal | V2 Beat | Cost |
|--------|---------|------|
| Benchmark percentiles | Beat 23 (Trophy room badges) | Aggregate table + pipeline |
| Topic velocity by week | Beat 15 (Heatmap fact) | Spike detection algorithm |
| Topic transition matrix | Beat 14 (Trajectory arc) | Month-over-month comparison |
| DALL-E image count + manifests | Beat 22 (Images gallery) | Parse export for images |

### New Data Points for V2

These are specific to V2's editor-native workflow and were not in V1:

| Data Point | What It Enables | Beat |
|------------|----------------|------|
| Sample conversation titles by topic | Sidebar displays real conversation titles | Beat 11 |
| Sample user message snippets | Featured ghost bubbles in cascade have real text | Beat 7 |
| Time-of-day usage diagram data | Image zoom represents when they use ChatGPT | Beat 5 |
| Word frequency cloud data | Word extraction and bubble sizing | Beats 17-18 |
| Profile personality insights | Profile card content (LLM-generated) | Beat 20 |
| DALL-E generation count | Image gallery count | Beat 22 |
| Achievement badges | Trophy room content | Beat 23 |
| Usage pattern image prompt | DALL-E/image generation prompt for Beat 4 | Beat 4 |

### The 14 Benchmark Metrics

Same as V1 — computed for every user, surfaced as "Top X%" badges when in the top 10%:

| Metric | Trophy Room Label |
|--------|------------------|
| Total conversations | "Power User" |
| Total messages | "Usage Volume" |
| Messages per conversation (avg) | "Deep Diver" |
| Average message length | "Prompt Sophistication" |
| Longest streak | "Streak Machine" |
| Active days | "Never Misses a Day" |
| Topic diversity | "Renaissance Mind" |
| Night-owl score | "Certified Night Owl" |
| Code block ratio | "Code-First Thinker" |
| Conversations per month (avg) | "Usage Intensity" |
| Time-of-day distribution | Peak Time Insight |
| Day-of-week distribution | Behavioral Pattern |
| First conversation date | "OG Member" |
| Busiest single day | "Peak Day" |

---

## 7. Output Schema (V3)

The schema maps directly to beats in the sequence. The Sequence Engine consumes this to drive the cinematic flow.

```typescript
interface WrappedInsightsV3 {
  // Beat 3: AI hook response
  hook: {
    statement: string;          // Behavioral pattern, not a stat
    factId: string;
    category: string;           // Prefer 'trajectory' or 'correlation'
  };

  // Beat 4-5: Generated image
  usageImage: {
    prompt: string;             // DALL-E prompt for usage pattern visualization
    timeDistribution: number[]; // 24 values (hourly usage %)
  } | null;

  // Beat 8-9: Message & conversation counts
  yearAtAGlance: {
    totalConversations: number;
    totalMessages: number;
    userMessages: number;
    aiMessages: number;
    timespan: string;           // "January – December 2025"
    activeDays: number;
    totalDays: number;
    firstConversation: string;
  };

  // Beat 11-12: Sidebar + topic organization
  topicBreakdown: {
    topics: Array<{
      name: string;
      count: number;
      color: string;
      sampleTitles: string[];   // Real conversation titles for sidebar
    }>;
    diversityScore: number;
  };

  // Beat 14: Growth prompt + line graph
  growth: {
    topTopic: string;
    monthlyData: Array<{ month: string; value: number }>;
    narrative: string;          // AI-written growth story
    growthMultiplier: number;
    trajectory: {
      arc: string;              // "Python basics → ML → Deployment"
      timespan: string;
    } | null;
  } | null;

  // Beat 15: Heatmap + fact
  heatmap: {
    dailyActivity: number[];    // 365 values (conversations per day)
    fact: string;               // A specific heatmap-related insight
    longestStreak: number;
    busiestDay: { date: string; count: number; topic: string };
  };

  // Beats 17-18: Word collection + bubbles
  wordCloud: {
    words: Array<{ word: string; frequency: number }>;
    topWord: string;
  };

  // Beat 20: Profile
  profile: {
    personality: string;        // LLM-generated personality summary
    usageStyle: string;         // How they use ChatGPT
    keyTraits: string[];        // 3-5 bullet traits
    funFacts: string[];         // 2-3 quirky, specific fun facts
  };

  // Beat 22: Images
  images: {
    totalGenerated: number;
    highlights: string[];       // URLs or references to notable images
  } | null;

  // Beat 23: Trophy room
  trophyRoom: {
    achievements: Array<{
      label: string;            // "Deep Diver"
      metric: string;
      percentile: number;
      userValue: number;
      avgValue: number;
    }>;
    compliment: string;         // Earned, specific, references real data
    yearOneLine: string;        // Closing sentence — essay ending
  };

  // Metadata
  _factCount: number;
  _topWowScore: number;
  _placeholderBeats?: string[]; // Beats showing placeholder state
  _benchmarkSource: 'aggregate' | 'published' | 'self_comparison';
}
```

---

## 8. Validation & Recovery

Same multi-tier approach as V1:

| Tier | Trigger | Action |
|------|---------|--------|
| **Tier 1** | Always | `JSON.parse(llmResponse)` |
| **Tier 2 — AI Reformat** | Parse failure | Send to gpt-4o-mini (temp 0.1) to extract valid JSON |
| **Tier 3 — Beat Removal** | Tier 2 fails | Validate each field individually. Mark missing beats in `_placeholderBeats`. The sequence engine skips or shows placeholder for those beats. |

### Content Quality Validation

- Every number in output must appear in input facts
- Banned phrase list: generic phrases like "The Curious Mind", "Always asking questions"
- Minimum specificity check: no field should be a sentence that applies to any user
- Hook must be a behavioral pattern, not a benchmark

### Graceful Degradation

When data is insufficient for a beat:
- **Beat 4-5 (Image):** Skip image generation, go straight from hook to message cascade
- **Beat 14 (Growth):** Show basic conversation-over-time graph without trajectory arc
- **Beat 15 (Heatmap):** Show heatmap with generic "Here's your year" fact
- **Beat 20 (Profile):** Show basic stats-based profile without deep personality insights
- **Beat 22 (Images):** Skip entirely if no DALL-E images
- **Beat 23 (Trophy room):** Show self-comparison achievements if no benchmark data

---

## 9. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Sequence too long (60s+) | Users drop off before the payoff | Make each beat purposeful. Cut beats that don't earn their place. Target 45-60s total. |
| Editor metaphor confuses users | "Is this real ChatGPT?" | Clear branding: "ChatGPT Wrapped 2025" in the title bar. Stylized enough to not be mistaken for real. |
| Complex animations are janky | Ruins the cinematic feel | GPU-accelerated transforms only (`transform`, `opacity`). Pre-warm compositing layers. Test on mobile. |
| LLM produces generic hook | First impression is weak | Hook selection logic: behavioral patterns ALWAYS preferred. Template fallback uses specific facts. |
| Not enough data for word cloud | Beats 17-18 are empty | Minimum 50 conversations for word cloud. Below threshold, skip to profile beat. |
| DALL-E images unavailable | Beat 22 is empty | Skip beat entirely. Sequence engine handles missing beats gracefully. |
| Benchmark data too thin | Trophy room feels empty | Self-comparison achievements always available ("Your October was 3x your March"). Published baselines as fallback. |
| Performance on mobile | Slow, laggy experience | Reduce cascade bubble count on mobile. Simplify graph animations. Profile performance budget per beat. |

---

## Current Demo Status

The demo at `projects/chatgpt-wrapped/demo/` already implements a significant portion of the cinematic sequence:

| Phase | Implementation | Status |
|-------|---------------|--------|
| Idle → Type → Send | `editor.js` Phases 1-3 | ✅ Complete |
| Thinking dots → AI hook stream | `editor.js` Phases 5-6 | ✅ Complete |
| Highlight response → zoom | `editor.js` Phase 7 | ✅ Complete |
| Ghost bubble cascade (200 bubbles) | `editor.js` Phase 8 | ✅ Complete (GPU-optimized) |
| Compress + blur + hero stat | `editor.js` Phases 9-10 | ✅ Complete |
| Morph 20K → 847 conversations | `editor.js` Phase 10b | ✅ Complete |
| Transition to sidebar + click | `editor.js` Phases 11-12 | ✅ Complete |
| Sidebar open + conversation list | `editor.js` Phase 13 | ✅ Complete |
| Topic grouping → card dealing → bar chart | `editor.js` Phase 14 | ✅ Complete |
| Collapse bars → cursor to input → type growth prompt | `editor.js` Phases 15-16 | ✅ Complete |
| Growth insight → line graph → zoom | `editor.js` Phase 17 | ✅ Complete |
| Heatmap, word cloud, profile, images, trophy, share | Not yet | ❌ Not started |

The demo currently uses hardcoded data (sample messages, topic colors, growth data). V2 wires the LLM Insight Engine's `WrappedInsightsV3` output into this sequence.

**CSS files already built:** base, shell, chat, cascade, stats, sidebar, topics, line-graph, scene-01-hook.

**Key architectural decisions already baked into the demo:**
- `transform-origin: bottom center` with 0.9s `cubic-bezier(0.4, 0, 0.15, 1)` transitions for camera
- 200-bubble cascade with estimated scroll (no layout reads during rAF loop)
- GPU pre-warm via micro-blur before real blur transition
- Card-dealing animation for topic grouping (clones extracted from sidebar)
- Catmull-Rom spline for growth line graph (not linear segments)
- JS-computed `scale + translateY` for graph zoom (not CSS class)
- Uses `Outfit` font from Google Fonts (not system fonts)

---

## 10. Open Questions

1. **Image generation (Beat 4):** Do we generate a DALL-E image in real-time, use a pre-selected template, or skip this beat? Real-time generation adds 10-15s of wait time.
2. **Profile content (Beat 20):** How deep should the personality analysis go? The old "identity" slide was removed for being generic — the profile needs to be substantively different.
3. **Trophy room design (Beat 23):** What does the trophy room look like? A shelf with icons? A hall-of-fame card? Animated badges?
4. **Video export:** Can users export the entire sequence as a video? This is technically complex but extremely shareable.
5. **Interaction points:** Should the sequence be fully automated, or should users be able to interact (e.g., actually type the prompt, click buttons themselves)?
6. **Mobile experience:** The editor metaphor works great on desktop. On mobile, the editor takes up the full screen — do we need a simplified mobile flow?
7. **Sequence length:** 24 beats at ~3s each = ~72s. Should we target shorter (45s) or is the current length appropriate?
8. **Re-watchability:** Can users replay specific sections? Jump to the trophy room? Or is it always start-to-finish?
