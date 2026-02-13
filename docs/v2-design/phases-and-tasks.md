# ChatGPT Wrapped V2 — Phases & Task Breakdown

> **Status:** Draft  
> **Date:** February 11, 2026  
> **Parent:** [design-doc.md](./design-doc.md), [workflow.md](./workflow.md)  
> **Purpose:** Break the V2 build into phased execution with clear tasks, dependencies, and review gates.

---

## How This Document Works

1. **Phases** — What gets built and in what order
2. **Tasks** — Specific, actionable units of work within each phase
3. **Dependencies** — What must finish before a task can start
4. **Parallel workstreams** — Tasks within a phase that can run simultaneously
5. **Review gates** — Where we stop, verify, and confirm before proceeding
6. **File ownership** — No two tasks edit the same file

---

## Phase Overview

```
Phase 0: Contracts & Scaffolding       ← Lock shapes, set up project structure. ~1 day.
     ↓
Phase 1: Data Engine                   ← 5 detectors + new data signals. ~2 days.
     ↓                                    (Phase 3 editor shell can start here)
Phase 2: Fact Engine + Narrative       ← Orchestration, LLM writer, validation. ~2 days.
     ↓
Phase 3: Editor Shell & Sequence       ← The cinematic framework. ~2 days.
     ↓
Phase 4: Beat Implementation          ← Build each beat. ~4-5 days.
     ↓
Phase 5: Integration & Polish          ← Wire data to beats, test, ship. ~2 days.
```

**Total estimated effort: 13–17 days**  
**Calendar time with parallelism: ~3 weeks**

---

## Phase 0: Contracts & Scaffolding

> **Goal:** Lock every data shape and set up the project structure. This makes parallel work possible.

**Duration:** 1 day  
**Parallelism:** None — single focused task.  
**Review gate:** All contracts approved before Phase 1 begins.

### Task 0A: Interface Contracts

Define TypeScript interfaces for all data shapes that flow between phases.

**Deliverables:**
- `src/lib/types/insights-v3.ts` — All interfaces

**Contracts to define:**

```
1. ConversationRecord (input to all detectors)
2. MessageRecord (input to all detectors)
3. TemporalProfile (Detector 1A output)
4. BehavioralCorrelation (Detector 1B output)
5. GrowthSignal (Detector 1C output)
6. LifeEventSignal (Detector 1D output)
7. BenchmarkResult (Detector 1E output)
8. InsightFact (Fact Engine output → Narrative Writer input)
9. WrappedInsightsV3 (Final output → Sequence Engine input)
10. WordCloudEntry (new for V2)
11. TopicBreakdownEntry (new for V2)
12. ProfileInsights (new for V2)
13. TrophyRoomAchievement (new for V2)
14. BeatConfig (Sequence Engine config per beat)
```

### Task 0B: Project Scaffolding

Set up the directory structure for V2.

**Deliverables:**
```
src/lib/
  types/insights-v3.ts
  detectors/
    temporal.ts
    correlations.ts
    growth.ts
    life-events.ts
    benchmarks.ts
  engine/
    fact-engine.ts
    narrative-writer.ts
    template-fallback.ts
    validation.ts
  data/
    word-frequency.ts
    topic-breakdown.ts
    daily-activity.ts
projects/chatgpt-wrapped/demo/
  (V2 demo files — separate from existing)
```

---

## Phase 1: Data Engine

> **Goal:** Build all detectors and new data signal computations. Each detector is independent — maximum parallelism.

**Duration:** ~2 days  
**Parallelism:** 7 tasks running simultaneously  
**Depends on:** Phase 0 (contracts locked)  
**Review gate:** All detectors produce correct output for test datasets.

### Task 1A: Temporal Analysis Detector

**File:** `src/lib/detectors/temporal.ts`  
**Produces:** `TemporalProfile`  
**Scope:**
- `computeTemporalProfile()` function
- Topics bucketed by month
- Topic transition matrix
- Monthly conversation count and message count trends
- Usage trend curve (first, peak, recent month + growth multiplier)
- SQL queries for topics by month, keyword evolution

**Input:** `ConversationRecord[]`  
**Output:** `TemporalProfile`  
**Effort:** 1 day

---

### Task 1B: Behavioral Correlation Detector

**File:** `src/lib/detectors/correlations.ts`  
**Produces:** `BehavioralCorrelation[]`  
**Scope:**
- `detectCorrelations()` function
- Hour × message length (night owl detection)
- Hour × topic (day/night behavioral split)
- DOW × message length (mid-week fatigue)
- DOW × conversation frequency
- Minimum sample thresholds (>20 conversations per bucket)
- Correlation strength scoring
- SQL queries for hour × avg length, hour × topic, DOW patterns

**Input:** `ConversationRecord[]`  
**Output:** `BehavioralCorrelation[]` (sorted by strength)  
**Effort:** 1 day

---

### Task 1C: Growth Signal Detector

**File:** `src/lib/detectors/growth.ts`  
**Produces:** `GrowthSignal[]`  
**Scope:**
- `detectGrowth()` function
- Early vs. recent message length (first 25% vs last 25%)
- Topic diversity expansion over time
- Code block usage trend
- Question sophistication comparison

**Input:** `ConversationRecord[]`  
**Output:** `GrowthSignal[]`  
**Effort:** 0.5 day

---

### Task 1D: Life Event Detector

**File:** `src/lib/detectors/life-events.ts`  
**Produces:** `LifeEventSignal[]`  
**Scope:**
- `detectLifeEvents()` function
- Topic velocity by week
- Spike detection (>3x baseline)
- Drop-off detection (active → silence)
- Hard-blocked sensitive topics
- Neutral framing

**Input:** `ConversationRecord[]`  
**Output:** `LifeEventSignal[]`  
**Soft dependency:** Can use `TemporalProfile` from 1A if available, or compute own weekly buckets  
**Effort:** 0.5 day

---

### Task 1E: Benchmark Computation

**File:** `src/lib/detectors/benchmarks.ts`  
**Produces:** `BenchmarkResult[]`  
**Scope:**
- Percentile computation for all 14 metrics
- Anonymous aggregate stats collection (opt-in)
- Published research fallback baselines
- Self-comparison fallback
- `computePercentile()` function

**Input:** `ConversationRecord[]`, `BenchmarkDistributions`  
**Output:** `BenchmarkResult[]`  
**Effort:** 1 day

---

### Task 1F: Word Frequency Analyzer (NEW for V2)

**File:** `src/lib/data/word-frequency.ts`  
**Produces:** `WordCloudEntry[]`  
**Scope:**
- `computeWordFrequencies()` function
- Extract words from user messages
- Filter stop words, common filler
- Compute frequency counts
- Rank by frequency
- Return top 20-30 words with frequencies
- Optional: words per topic

**Input:** `ConversationRecord[]` (user messages)  
**Output:** `WordCloudEntry[]` — `{ word: string, frequency: number }`  
**Effort:** 0.5 day

---

### Task 1G: Daily Activity & Topic Breakdown (NEW for V2)

**File:** `src/lib/data/daily-activity.ts`, `src/lib/data/topic-breakdown.ts`  
**Produces:** `number[]` (365 daily counts), `TopicBreakdownEntry[]`  
**Scope:**

**Daily Activity:**
- `computeDailyActivity()` function
- Conversations per day for the full year (365 values)
- Used for heatmap generation in Beat 15

**Topic Breakdown:**
- `computeTopicBreakdown()` function
- Conversations grouped by topic with counts
- Sample conversation titles per topic (for sidebar in Beat 11)
- Topic color assignment
- Ranked by count descending

**Input:** `ConversationRecord[]`  
**Output:** `number[]`, `TopicBreakdownEntry[]`  
**Effort:** 0.5 day

---

### Phase 1 Review Gate

Before Phase 2:
- [ ] Each detector runs on test data and produces correctly shaped output
- [ ] Output shapes match contracts from Phase 0
- [ ] Correlation and life event detectors respect sample thresholds
- [ ] Word frequency analyzer filters stop words correctly
- [ ] Daily activity produces exactly 365 values (padded with 0s for inactive days)
- [ ] Topic breakdown includes sample titles and correct counts
- [ ] Edge cases: empty data, 1 conversation, 1 month, no code blocks

---

## Phase 2: Fact Engine + Narrative

> **Goal:** Orchestrate detectors, score insights, and produce the final `WrappedInsightsV3` output with LLM-written copy.

**Duration:** ~2 days  
**Parallelism:** 3 tasks after the Fact Engine is done  
**Depends on:** Phase 1  
**Review gate:** Full pipeline produces valid output for 3 test profiles.

### Task 2A: Fact Engine

**File:** `src/lib/engine/fact-engine.ts`  
**Produces:** `InsightFact[]`  
**Scope:**
- Orchestrate all detectors from Phase 1
- Wow score computation (1-10):
  - Specificity (real numbers, dates, names)
  - Surprise (deviation from baseline)
  - Emotional resonance (trajectory > correlation > benchmark > growth > life event)
  - Shareability
- Hook selection: highest-wow behavioral pattern (not benchmark)
- Minimum guaranteed facts for thin data
- `rawNarrative` generation for template fallback
- Expose `_factCount`, `_topWowScore`

**Input:** All Phase 1 outputs  
**Output:** `InsightFact[]` ranked by wow score  
**Effort:** 1 day

---

### Task 2B: LLM Narrative Writer

**File:** `src/lib/engine/narrative-writer.ts`  
**Depends on:** Task 2A  
**Scope:**
- System prompt that takes `InsightFact[]` and writes copy for all `WrappedInsightsV3` fields
- Constraints in prompt:
  - No invented facts/numbers
  - Hook = behavioral pattern
  - Compliment = references specific growth
  - yearOneLine = closing sentence of an essay
  - Profile personality = substantive, not generic
  - Fun facts = specific and quirky
- Temperature tuning
- Output must conform to V3 schema
- Banned phrase list integration

**Input:** `InsightFact[]`  
**Output:** `WrappedInsightsV3`  
**Effort:** 0.5 day

---

### Task 2C: Template Fallback Engine

**File:** `src/lib/engine/template-fallback.ts`  
**Depends on:** Task 2A  
**Scope:**
- Template library with `${placeholder}` substitution for every field in V3 schema
- Uses `InsightFact[]` directly — no LLM
- Deterministic output
- No generic copy — every template embeds numeric facts
- Coverage for all beats including new V2 fields (profile, word cloud, trophy room)
- Fallback for thin data (what to show when fields are null)

**Input:** `InsightFact[]`  
**Output:** `WrappedInsightsV3`  
**Effort:** 1 day

---

### Task 2D: Validation & Recovery Pipeline

**File:** `src/lib/engine/validation.ts`  
**Depends on:** Task 2A  
**Scope:**
- Multi-tier JSON recovery (parse → AI reformat → field-level removal)
- Content quality validation:
  - Number matching (output numbers must exist in input facts)
  - Banned phrase rejection
  - Minimum specificity check
  - Hook must be behavioral pattern
- `_placeholderBeats` population for graceful degradation
- Delete legacy hardcoded fallback block

**Input:** Raw LLM response + `InsightFact[]`  
**Output:** Validated `WrappedInsightsV3`  
**Effort:** 0.5 day

---

### Phase 2 Review Gate

Before Phase 4 (Phase 3 can start during Phase 1):
- [ ] Fact Engine produces ranked output for power user, casual user, thin data profiles
- [ ] Hook selection correctly prefers behavioral patterns
- [ ] LLM writer produces specific, non-generic copy
- [ ] Template fallback produces B+ quality without LLM
- [ ] Validation catches malformed JSON (test with intentionally broken responses)
- [ ] Banned phrases rejected
- [ ] All numbers trace to input facts
- [ ] Thin-data profiles show placeholders, not generic filler

---

## Phase 3: Editor Shell & Sequence Engine

> **Goal:** Build the cinematic framework — the editor shell, fake cursor, transition system, and sequence engine that orchestrates beats.

**Duration:** ~2 days  
**Parallelism:** 2 tasks can start immediately (no data dependency)  
**Can start:** As early as Phase 1 begins  
**Review gate:** Editor shell renders, intro sequence plays, sequence engine can advance through placeholder beats.

### Task 3A: Editor Shell

**File:** `projects/chatgpt-wrapped/demo/css/shell.css`, `js/editor-shell.js` (or evolve existing)  
**Scope:**
- ChatGPT editor replica: header, main, footer, input field, sidebar
- Dark theme (#212121)
- Zoom states (zoomed on input, zoomed on response, zoomed on graph)
- Sidebar slide-in/out
- Footer show/hide with smooth transitions
- Welcome screen ("What can I help with?")
- Responsive: works on desktop and mobile viewport

**Dependencies:** None — purely visual/structural  
**Effort:** 0.25 day (refactor only — **90% already built**)

**⚠️ Already implemented:** The existing demo has a fully working editor shell across `index.html`, `css/shell.css`, `css/sidebar.css`, and `css/base.css`. It includes:
- Complete header with sidebar toggle, model selector, new chat button
- Main area with welcome screen ("What can I help with?")
- Footer with input field, attach button, send button, disclaimer
- Sidebar with new chat button and conversation list
- Zoom states: `editor--zoomed` (input), `editor--zoomed-response` (response), JS-computed (graph)
- Responsive breakpoints at 480px and 769px
- `Outfit` font loaded from Google Fonts

This task is about refactoring the monolithic `editor.js` IIFE into importable modules.

---

### Task 3B: Fake Cursor System

**File:** `projects/chatgpt-wrapped/demo/js/cursor.js`, `css/cursor.css`  
**Scope:**
- `FakeCursor` class with methods:
  - `moveTo(element, duration)` — animate cursor to an element
  - `click(element)` — press/release/ripple on element
  - `show()` / `hide()` — visibility
  - `typeInto(element, text)` — coordinate with typing animation
- Natural easing on movements
- Click feedback animations (press scale, release, ripple)
- Auto-hide when text cursor is active

**Dependencies:** Task 3A (editor shell must exist for cursor targets)  
**Effort:** 0.25 day (refactor only — **most already built**)

**⚠️ Already implemented:** The demo has `moveCursorToSend()`, sidebar click with press/release animation, and `cursorToInput()` for the growth prompt. Uses `cubic-bezier(0.4, 0, 0.15, 1)` easing, 0.6s duration for short moves, 1.1s for sidebar (longer travel). Click feedback: `scale(0.8)` press + background tint on sidebar button, `scale(0.8)` + ripple on send button. The SVG cursor is inline in `index.html`.

---

### Task 3C: Sequence Engine

**File:** `projects/chatgpt-wrapped/demo/js/sequence.js`  
**Scope:**
- `SequenceEngine` class that orchestrates the 24-beat flow
- Each beat is a registered function: `registerBeat(id, fn, config)`
- Beat config: `{ duration, requiresData, skippable, dataFields }`
- Methods:
  - `play()` — start from Beat 1
  - `pause()` / `resume()`
  - `skipTo(beatId)`
  - `setData(wrappedInsights)` — inject V3 data
- Auto-advance with configurable timing per beat
- Skip beats when data is missing (`_placeholderBeats`)
- Emit events: `onBeatStart`, `onBeatComplete`, `onSequenceComplete`

**Dependencies:** None (can be built against interfaces)  
**Effort:** 1 day

---

### Task 3D: Chat Primitives

**File:** `projects/chatgpt-wrapped/demo/js/chat.js`, `css/chat.css`  
**Scope:**
- Reusable chat components used across multiple beats:
  - `typePrompt(text)` — character-by-character typing into input field
  - `sendMessage()` — input text → user bubble, zoom out
  - `showThinkingDots()` — pulsing dots, returns reference for removal
  - `streamAIResponse(parts)` — word-by-word AI response with accent colors
  - `createUserBubble(text)` — right-aligned user message
  - `createAIResponse(parts)` — left-aligned AI response with streaming
- These are called by beat implementations

**Dependencies:** Task 3A  
**Effort:** 0.5 day (much exists in current demo, needs modularization)

---

### Phase 3 Review Gate

Before Phase 4:
- [ ] Editor shell renders correctly (header, main, footer, sidebar)
- [ ] Fake cursor moves naturally and clicks with feedback
- [ ] Sequence engine can register and play through placeholder beats
- [ ] Chat primitives work: type, send, thinking dots, stream response
- [ ] Zoom states work: zoom in on input, zoom in on response, zoom out
- [ ] Sidebar opens/closes cleanly

---

## Phase 4: Beat Implementation

> **Goal:** Build each beat as a self-contained module. This is the bulk of the work.

**Duration:** ~4-5 days  
**Parallelism:** Beats within an act can often be built in parallel  
**Depends on:** Phase 3 (editor shell + sequence engine), Phase 2 (for data-driven beats)  
**Review gate:** Each beat plays correctly in the sequence, animations are smooth.

### Beat Groups (Parallel Where Possible)

#### Group A: Act 1 — The Hook (Beats 1-6)

These beats use the editor shell + chat primitives directly. Mostly animation work.

**Task 4A-1: Intro Sequence (Beats 1-3)**  
**Files:** `js/beats/act1-intro.js`  
**Scope:** Idle → Type → Send → Thinking Dots → AI Hook Response → Bubble Wrap  
**Dependencies:** Tasks 3A, 3B, 3C, 3D  
**Data:** `hook.statement`  
**Effort:** 0.5 day (much exists in current `editor.js`)

**Task 4A-2: Image Generation & Zoom (Beats 4-6)**  
**Files:** `js/beats/act1-image.js`, `css/beats/image.css`  
**Scope:** Image generation effect → Zoom in on time diagram → Zoom out  
**Dependencies:** Task 4A-1  
**Data:** `usageImage`  
**Effort:** 1 day

---

#### Group B: Act 2 — The Deep Dive (Beats 7-12)

The signature sequence — message cascade, stat reveals, sidebar, topic organization.

**Task 4B-1: Message Cascade & Stats (Beats 7-9)**  
**Files:** `js/beats/act2-cascade.js`, `css/beats/cascade.css`  
**Scope:** Ghost bubble cascade → Blur+compress → Hero message stat → Morph to conversations  
**Dependencies:** Tasks 3A, 3C  
**Data:** `yearAtAGlance`  
**Effort:** 1 day (cascade logic exists in current demo, needs refinement)

**Task 4B-2: Sidebar & Topic Organization (Beats 10-12)**  
**Files:** `js/beats/act2-topics.js`, `css/beats/topics.css`  
**Scope:** Click sidebar → Open sidebar with conversations → Color-code by topic → Card-dealing organization → Merge into bar chart → Labels  
**Dependencies:** Tasks 3A, 3B, 3C  
**Data:** `topicBreakdown`  
**Effort:** 1.5 days (card-dealing and bar chart morphing are complex)

---

#### Group C: Act 3 — Growth & Words (Beats 13-19)

Growth prompt, line graph, heatmap, word cloud — the data visualization heart.

**Task 4C-1: Growth Prompt & Graph (Beats 13-14)**  
**Files:** `js/beats/act3-growth.js`, `css/beats/growth.css`, `css/beats/line-graph.css`  
**Scope:** Bar chart collapse → Type growth prompt → Send → AI narrative → Line graph draws → Camera zoom  
**Dependencies:** Tasks 3A, 3B, 3C, 3D  
**Data:** `growth`  
**Effort:** 1 day (line graph exists in current demo)

**Task 4C-2: Heatmap (Beat 15)**  
**Files:** `js/beats/act3-heatmap.js`, `css/beats/heatmap.css`  
**Scope:** Line graph breaks apart → Heatmap cells fill → Fact overlay  
**Dependencies:** Task 4C-1 (for transition from graph)  
**Data:** `heatmap`  
**Effort:** 0.5 day

**Task 4C-3: Word Cloud (Beats 16-19)**  
**Files:** `js/beats/act3-words.js`, `css/beats/words.css`  
**Scope:** Scroll back up → Extract words from messages → Bubble cloud formation → Scale by frequency → Words drop off  
**Dependencies:** Task 3C  
**Data:** `wordCloud`  
**Effort:** 1 day

---

#### Group D: Act 4 — Identity & Conclusion (Beats 20-24)

Profile, images, trophy room, share — the emotional payoff.

**Task 4D-1: Profile Card (Beats 20-21)**  
**Files:** `js/beats/act4-profile.js`, `css/beats/profile.css`  
**Scope:** Click profile → Panel slides in → Scanning effect → Content reveals (personality, style, traits, facts) → Close panel  
**Dependencies:** Tasks 3A, 3B, 3C  
**Data:** `profile`  
**Effort:** 1 day

**Task 4D-2: Image Gallery (Beat 22)**  
**Files:** `js/beats/act4-images.js`, `css/beats/images.css`  
**Scope:** Click images button → Images fan out/expand → Count animation → Hold  
**Dependencies:** Tasks 3A, 3B  
**Data:** `images`  
**Effort:** 0.5 day

**Task 4D-3: Trophy Room & Share (Beats 23-24)**  
**Files:** `js/beats/act4-trophy.js`, `css/beats/trophy.css`, `js/beats/act4-share.js`, `css/beats/share.css`  
**Scope:** Images contract → Trophy room with badges (unlock animations) → Compliment → Year in one line → Editor returns → Share card → Share button  
**Dependencies:** Tasks 3A, 3C  
**Data:** `trophyRoom`, share card content  
**Effort:** 1 day

---

### Phase 4 Review Gate

Before Phase 5:
- [ ] All 24 beats play in sequence without errors
- [ ] Each beat passes the 3-second test (insight absorbed quickly)
- [ ] Animations are smooth (60fps on target devices)
- [ ] Data-driven beats handle missing data gracefully (skip or placeholder)
- [ ] Camera movements (zoom, scroll, pan) feel cinematic
- [ ] Fake cursor movements feel natural
- [ ] Topic card-dealing, bar chart, line graph, heatmap all animate correctly
- [ ] Word cloud layout is balanced and readable
- [ ] Trophy room badges animate with satisfying "unlock" effect
- [ ] Total sequence timing is within 50-70s target

---

## Phase 5: Integration & Polish

> **Goal:** Wire the data engine (Phases 1-2) to the cinematic sequence (Phases 3-4). End-to-end testing with real data.

**Duration:** ~2 days  
**Parallelism:** 2 workstreams  
**Depends on:** All previous phases  
**Review gate:** Full end-to-end test with real user data. Final sign-off.

### Task 5A: Backend Integration

**File:** `src/lib/generate-insights-v3.ts`, existing endpoint files  
**Scope:**
- Wire Fact Engine + Narrative Writer into the API endpoint
- Feed `WrappedInsightsV3` to the Sequence Engine
- Feature flag: `v3_insights` to toggle between V2 and old pipeline
- Cache invalidation: `schemaVersion` + `dataVersion` hash
- Wire benchmark opt-in into data load flow
- Delete legacy hardcoded fallback permanently

**Effort:** 1 day

---

### Task 5B: End-to-End Testing

**File:** `src/__tests__/e2e/v3-pipeline.test.ts`  
**Scope:**
- Test with 3 user profiles:
  - **Power user** (12+ months, 1000+ convos) — all insights, strong hook, multiple badges
  - **Casual user** (3-6 months, 50-200 convos) — trajectory + correlations, some badges, graceful skips
  - **New user** (1 month, <30 convos) — basic stats, published benchmarks, skipped beats
- Verify: no banned phrases, no generic filler, all numbers traceable
- Verify: hook prefers behavioral patterns
- Verify: skipped beats don't break the sequence
- Verify: template fallback works when LLM is disabled
- Performance: sequence renders smoothly, fact engine within budget (≤4s client, ≤2s server)

**Effort:** 1 day

---

### Task 5C: Polish & Timing

**Scope:**
- Fine-tune beat durations based on real data
- Adjust animation timing curves
- Mobile performance optimization (reduce cascade bubbles, simplify effects)
- Share card formatting and export
- Final visual review of complete sequence

**Effort:** 0.5 day

---

### Phase 5 Review Gate (Final)

- [ ] End-to-end pipeline works for all 3 test profiles
- [ ] Feature flag switches cleanly
- [ ] No regressions in existing functionality
- [ ] Performance within budget on mobile and desktop
- [ ] Share card renders correctly
- [ ] Sequence plays smoothly from start to finish
- [ ] All beats with data produce specific, screenshot-worthy content

---

## Task Index

| Task | Phase | Est. | Dependencies | Status |
|------|-------|------|-------------|--------|
| 0A: Interface Contracts | 0 | 0.5d | None | Not Started |
| 0B: Project Scaffolding | 0 | 0.5d | None | Not Started |
| 1A: Temporal Detector | 1 | 1d | 0A | Not Started |
| 1B: Correlation Detector | 1 | 1d | 0A | Not Started |
| 1C: Growth Detector | 1 | 0.5d | 0A | Not Started |
| 1D: Life Event Detector | 1 | 0.5d | 0A | Not Started |
| 1E: Benchmark Computation | 1 | 1d | 0A | Not Started |
| 1F: Word Frequency Analyzer | 1 | 0.5d | 0A | Not Started |
| 1G: Daily Activity & Topics | 1 | 0.5d | 0A | Not Started |
| 2A: Fact Engine | 2 | 1d | 1A-1G | Not Started |
| 2B: LLM Narrative Writer | 2 | 0.5d | 2A | Not Started |
| 2C: Template Fallback | 2 | 1d | 2A | Not Started |
| 2D: Validation & Recovery | 2 | 0.5d | 2A | Not Started |
| 3A: Editor Shell | 3 | 0.5d | None | Not Started |
| 3B: Fake Cursor System | 3 | 0.5d | 3A | Not Started |
| 3C: Sequence Engine | 3 | 1d | None | Not Started |
| 3D: Chat Primitives | 3 | 0.5d | 3A | Not Started |
| 4A-1: Intro (Beats 1-3) | 4 | 0.5d | 3A-3D | Not Started |
| 4A-2: Image+Zoom (Beats 4-6) | 4 | 1d | 4A-1 | Not Started |
| 4B-1: Cascade+Stats (Beats 7-9) | 4 | 1d | 3A,3C | Not Started |
| 4B-2: Sidebar+Topics (Beats 10-12) | 4 | 1.5d | 3A-3C | Not Started |
| 4C-1: Growth+Graph (Beats 13-14) | 4 | 1d | 3A-3D | Not Started |
| 4C-2: Heatmap (Beat 15) | 4 | 0.5d | 4C-1 | Not Started |
| 4C-3: Word Cloud (Beats 16-19) | 4 | 1d | 3C | Not Started |
| 4D-1: Profile (Beats 20-21) | 4 | 1d | 3A-3C | Not Started |
| 4D-2: Images (Beat 22) | 4 | 0.5d | 3A-3B | Not Started |
| 4D-3: Trophy+Share (Beats 23-24) | 4 | 1d | 3A,3C | Not Started |
| 5A: Backend Integration | 5 | 1d | All | Not Started |
| 5B: E2E Testing | 5 | 1d | 5A | Not Started |
| 5C: Polish & Timing | 5 | 0.5d | 5B | Not Started |

---

## Dependency Graph

```
Phase 0:  [0A: Contracts] [0B: Scaffolding]
               ↓
Phase 1:  [1A] [1B] [1C] [1D] [1E] [1F] [1G]    ← all parallel
               ↓                                   
Phase 2:  [2A: Fact Engine]                         Phase 3 starts here ↓
               ↓                                   [3A: Shell] [3C: Sequence]
          [2B: LLM] [2C: Templates] [2D: Validation]    ↓           ↓
                                                   [3B: Cursor] [3D: Chat]
               ↓                                        ↓
Phase 4:  [4A-1: Intro] [4B-1: Cascade] [4C-3: Words] [4D-1: Profile]
               ↓              ↓                              ↓
          [4A-2: Image] [4B-2: Topics]  [4C-1: Growth]  [4D-2: Images]
                                             ↓                ↓
                                        [4C-2: Heatmap] [4D-3: Trophy]
                                                    ↓
Phase 5:  [5A: Integration] → [5B: Testing] → [5C: Polish]
```

---

## Timeline

```
Week 1:
  Day 1:    [0A: Contracts] [0B: Scaffolding]
  Day 2-3:  [1A] [1B] [1C] [1D] [1E] [1F] [1G]  +  [3A: Shell] [3C: Sequence]

Week 2:
  Day 4:    [2A: Fact Engine]  +  [3B: Cursor] [3D: Chat]
  Day 5:    [2B: LLM] [2C: Templates] [2D: Validation]
  Day 6-7:  [4A-1] [4B-1] [4C-3] [4D-1]  ← Beat implementation begins

Week 3:
  Day 8-9:  [4A-2] [4B-2] [4C-1] [4D-2]
  Day 10:   [4C-2] [4D-3]
  Day 11:   [5A: Integration]
  Day 12:   [5B: Testing] [5C: Polish]
```

---

## File Ownership

No two tasks edit the same file.

| File | Owner |
|------|-------|
| `src/lib/types/insights-v3.ts` | 0A |
| `src/lib/detectors/temporal.ts` | 1A |
| `src/lib/detectors/correlations.ts` | 1B |
| `src/lib/detectors/growth.ts` | 1C |
| `src/lib/detectors/life-events.ts` | 1D |
| `src/lib/detectors/benchmarks.ts` | 1E |
| `src/lib/data/word-frequency.ts` | 1F |
| `src/lib/data/daily-activity.ts` | 1G |
| `src/lib/data/topic-breakdown.ts` | 1G |
| `src/lib/engine/fact-engine.ts` | 2A |
| `src/lib/engine/narrative-writer.ts` | 2B |
| `src/lib/engine/template-fallback.ts` | 2C |
| `src/lib/engine/validation.ts` | 2D |
| `demo/js/editor-shell.js`, `demo/css/shell.css` | 3A |
| `demo/js/cursor.js`, `demo/css/cursor.css` | 3B |
| `demo/js/sequence.js` | 3C |
| `demo/js/chat.js`, `demo/css/chat.css` | 3D |
| `demo/js/beats/act1-*.js` | 4A |
| `demo/js/beats/act2-*.js`, `demo/css/beats/cascade.css`, `demo/css/beats/topics.css` | 4B |
| `demo/js/beats/act3-*.js`, `demo/css/beats/growth.css`, etc. | 4C |
| `demo/js/beats/act4-*.js`, `demo/css/beats/profile.css`, etc. | 4D |
| `src/lib/generate-insights-v3.ts` | 5A |
| `src/__tests__/e2e/v3-pipeline.test.ts` | 5B |
