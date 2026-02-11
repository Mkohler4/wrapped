# LLM Insights Redesign — Requirements

> **Status:** Draft  
> **Date:** February 9, 2026  
> **Owner:** Product + Eng  
> **Scope:** ChatGPT Wrapped LLM Insights redesign (client + server paths)

---

## 1. Purpose & Outcomes

### 1.1 Primary Objectives
- Produce insights that are **specific, data-grounded, and screenshot‑worthy**.
- Transform output from generic labels to **user‑recognition narratives**.
- Ensure **robustness**: no malformed JSON, no generic fallback content, and graceful degradation when data is thin.

### 1.2 Success Criteria (Definition of Done)
- ≥90% of generated insight sets contain **at least 3 “high‑wow” facts** (trajectory, benchmark, correlation, or growth).
- 0% of users see legacy generic fallback content (e.g., “The Curious Mind”).
- Output is always valid JSON or fully recovered without hard errors.
- Slides rendered without empty fields; insufficient data displays a graceful **placeholder screen** explaining the data is unavailable (never generic filler content).
- Every numerical claim maps to a verified fact source.

---

## 2. Scope & Non‑Goals

### 2.1 In Scope
- Server‑path LLM insights pipeline (fact engine → LLM writer → validation & recovery).
- Client‑path insights pipeline (fact engine → template fallback; LLM enabled by default with privacy note for opt‑in).
- New data signals, temporal analysis, correlations, growth, life‑event detection, and benchmarks.
- Expanded semantic probes and topic coverage.
- Updated insight schema (v3) and compatible UI rendering.

### 2.2 Out of Scope (for this phase)
- Multi‑language localization.
- New visual slide designs beyond wiring into existing slide framework (unless explicitly approved).
- Cross‑device sync of insights.

---

## 3. Users & Use Cases

### 3.1 Personas
- **Power users** with large datasets; expect deep analysis and comparisons.
- **Casual users** with small datasets; expect concise but still specific insights.
- **Privacy‑sensitive users**; must be able to opt out of benchmark contribution.

### 3.2 Core Use Cases
- Generate Wrapped insights from uploaded export (client path).
- Generate Wrapped insights from server database (server path).
- Re‑run insights without data changes (deterministic facts should be stable).

---

## 4. Functional Requirements

### 4.1 Data Ingestion & Availability
- **Upload and data ingestion process remains unchanged** from the current system. No new upload formats, no new file requirements, no changes to how users provide their data.
- Must use existing conversation/messages data and augment with new derived signals.
- Must compute monthly/weekly aggregates using timestamps.
- Must compute per‑topic aggregates using existing topic tags.
- Must handle missing or sparse metadata gracefully.

### 4.2 Fact Engine (Deterministic)
- Must produce a ranked list of `InsightFact` objects containing:
  - `id`, `category`, `wowScore`, `rawNarrative`, and `dataPoints`.
- Must be deterministic given the same input dataset.
- Must include **minimum guaranteed facts** (fallback facts) when higher‑wow facts are absent.
- Must expose counts of facts and top wow score for telemetry.

### 4.3 Insight Categories (Required)

#### 4.3.1 Trajectory (Category 1)
- Must compute topic and usage shifts over time.
- Must attempt arc detection on available temporal data; if data is insufficient, display a placeholder screen rather than silently omitting the slide.
- Must compute timespan and month labels for narrative.

#### 4.3.2 Comparative Benchmarks (Category 2)
- Must compute percentiles for supported metrics.
- Must label benchmark source: `aggregate`, `published`, or `self_comparison`.
- Must only surface percentile slides when extreme (top/bottom thresholds configurable).
- Percentile callout thresholds must be selected from: 0.01%, 0.1%, 1%, 5%, 10% (top and bottom).
- Must support opt‑in for aggregate contributions.

#### 4.3.3 Behavioral Correlations (Category 3)
- Must detect correlations across time‑of‑day, day‑of‑week, and topic/length.
- Must include minimum sample thresholds to avoid noisy claims.
- Must compute correlation strength score for ranking.

#### 4.3.4 Growth Recognition (Category 4)
- Must compare early vs recent slices (configurable percentile splits).
- Must detect message length growth and topic diversity growth at minimum.

#### 4.3.5 Life Event / Intent Signals (Category 5)
- Must detect spikes in topic velocity and drop‑offs.
- Must never assert specific outcomes; use neutral framing.
- Must allow category opt‑out (sensitive topics configurable).

### 4.3.6 Hook / Intro (Opening Slide)
- The Wrapped experience **must open with a single compelling hook** — one personalized, specific statement that makes the user feel *seen*. Think of it like the opening line of an essay: it should create self‑recognition immediately.
- The hook must be a **behavioral pattern or trajectory** — something the user never noticed about themselves. Not a vanity metric, not a raw statistic, not a percentile flex. A mirror.
- The hook must be **data‑grounded** — drawn from the user's highest‑wow fact, with strong preference for trajectory arcs, behavioral correlations, and life event hints over raw benchmarks.
- The hook must **not** be a summary or overview. It is a single punchy insight, not a dashboard.
- After the hook, the next slide is a **"Year at a Glance"** — one slide with key numbers (days, conversations, timespan) framed as a human truth, not a report. Then the experience moves quickly into the deep pattern slides.
- The hook should be selected automatically from the fact engine's top‑ranked fact, **preferring behavioral patterns and trajectories over benchmarks.** Only fall back to a benchmark hook if no strong behavioral pattern exists.
- Example hooks (strong — behavioral patterns):
  - *"You ask about Python every morning and write fiction every night. You're two different people."*
  - *"You stopped asking 'what is a React hook' on March 14th. You never needed to ask again."*
  - *"You had 23 interview‑prep conversations in September. Then zero. Something happened."*
- Example hooks (weak — avoid unless no better option):
  - *"You're in the top 1% of ChatGPT power users."* (vanity metric, doesn't *see* the user)
  - *"You had 1,427 conversations this year."* (raw stat, not a pattern)

### 4.3.7 Human Tasks & AI Tasks (Dual Insight Layer)
- Insights must reflect **both** what the user was doing in their life (human tasks) **and** how they used AI (AI tasks). The Wrapped should feel like it understands the person, not just their chat logs.
- **Human task insights** capture real‑world activities reflected through AI usage: career preparation, learning journeys, creative projects, life events, skill development.
  - Examples: "23 interview‑prep threads in September — something big was happening," "You went from learning Python to building full apps."
- **AI task insights** capture how the user interacts with ChatGPT relative to other users: usage intensity, conversation depth, behavioral patterns, benchmarks.
  - Examples: "In the top 1% of users for conversation depth," "You average 19 messages per thread — most people stop at 4," "Your night‑owl score puts you in the top 5%."
- Every insight set should include a mix of both human and AI task insights to create a well‑rounded portrait.
- Benchmark and comparative insights (AI tasks) must pull from ChatGPT usage data to enable statements like "top 1% of users."

### 4.4 LLM Narrative Writer (Server Path)
- Must accept only verified facts from the fact engine.
- Must never invent numbers; all numbers must match inputs.
- Must produce JSON matching the v3 schema.
- Must include citations or references to facts per field.
- Must prioritize higher wowScore facts when generating copy.

### 4.5 Template Narrative Writer (Client Path)
- Must support template substitution for core fields.
- Must support deterministic fallbacks when LLM not used.
- Must avoid generic copy; templates must embed numeric facts.
- Client path should call the server LLM by default, with a clear privacy note and an optional opt‑in toggle for stricter privacy.

### 4.6 Output Schema (v3)
- Must include: `hook`, `yearAtAGlance`, `trajectory`, `correlations`, `lifeEvent`, `growth`, `benchmarks`, `peakMoment`, `topTopics`, `funFacts`, `compliment`, `yearOneLine`, and metadata fields.
- The `personality` field has been removed — the hook slide replaces its role.
- The `roast` field has been removed — the fun facts slide handles humor better through specificity.
- The `overallStats` field has been replaced by `yearAtAGlance`, which includes a narrative framing the numbers as a human truth.
- Must include `_placeholderSlides` when fields have insufficient data, identifying which slides are showing placeholder states.
- Must be backward‑compatible enough for existing slide rendering to map fields or be feature‑flagged.

### 4.7 Validation & Recovery
- Must validate JSON format and required fields.
- Must perform Tiered JSON recovery:
  1. Parse attempt
  2. LLM reformat
  3. Field‑level removal
- Must display **placeholder screens** for slides where data is insufficient, clearly stating the data could not be loaded. Never insert generic filler content.
- Must enforce banned phrases or generic placeholders.

---

## 5. Data & Metrics Requirements

### 5.1 New Computed Metrics (Required)
- Conversations per month / week.
- Topics per month; topic transition arcs.
- Hour‑of‑day × topic and × message length.
- Day‑of‑week × message length and activity.
- Message length by month.
- Topic diversity by month.
- Code block ratio trend (optional but recommended).

### 5.2 Benchmarks Dataset
- Must store percentile distributions per metric with sample size and last updated.
- Must support incremental updates from opt‑in contributions.
- Must support published baseline values when sample size is low.
- **Begin collecting immediately** — no minimum sample size gate. Use published research as fallback until pool is large enough.

### 5.3 Required ChatGPT Data Points for Benchmarks

The following data points must be computed per user (from their ChatGPT export) to enable benchmark comparisons. The data pipeline computes percentiles for **all** of these; the UI layer decides which to surface based on the top 10% threshold.

| Metric | What It Enables | Source |
|--------|----------------|--------|
| Total conversations | "Power user" callout | Count of conversations |
| Total messages | Usage volume benchmark | Count of all messages |
| Messages per conversation (avg) | "Deep diver" / conversation depth | Messages / conversations |
| Average message length (chars) | Prompt sophistication benchmark | AVG(LENGTH(user messages)) |
| Longest streak (days) | "Streak machine" callout | Consecutive active days |
| Active days (total) | "Never misses a day" callout | Distinct days with activity |
| Topic diversity (unique topics) | "Renaissance mind" vs "laser focused" | Count of distinct topic tags |
| Night-owl score (% activity 10pm-4am) | "Certified night owl" callout | Night messages / total messages |
| Code block ratio (% messages with code) | "Code-first thinker" callout | Messages with code blocks / total |
| Conversations per month (avg) | Usage intensity over time | Total convos / active months |
| Time-of-day distribution | Peak usage time insights | Hour-of-day bucketing |
| Day-of-week distribution | Behavioral pattern insights | DOW bucketing |
| First conversation date | Tenure / "member since" | Earliest create_time |
| Busiest single day | Peak day callout | MAX conversations in one day |

---

## 6. Privacy, Safety & Compliance Requirements
- User must be able to opt‑out of benchmark contribution.
- No raw conversation content stored in benchmarks or shared datasets.
- Life‑event insights must avoid sensitive or medical/legal conclusions.
- Must allow per‑category disablement for sensitive topics.
- **Life‑event exclusions (hard block):** debt/distress, grief/loss, abuse, addiction.
- **Guardrails (allowed with caution):** health/medical, mental health, relationships/sexuality, legal/criminal, immigration/asylum, financial planning. Require neutral phrasing and avoid outcome claims.

---

## 7. Performance & Reliability
- Fact engine must complete within a target time budget (client ≤2–4s; server ≤1–2s p95, ≤5s max).
- LLM calls must have timeouts and retry limits.
- If LLM fails, insights still render via facts/templates.
- Client path should run without server dependency by default.

---

## 8. UX & Presentation Requirements

### 8.1 Core Design Principle: Poster, Not Dashboard
- **One insight per slide.** Every slide communicates exactly one thing. No secondary metrics, no sidebars, no "also here's this." If a slide needs a paragraph to explain, it's too complex.
- **3‑second test.** Each slide should be immediately understandable at a glance. The user should absorb the insight in under 3 seconds. If you have to lean in and read, it's too busy.
- **Two layers of text, max.** Every slide has at most a headline (the insight) and a subline (the evidence). No third line. No footnotes.
- **Patterns first, stats second.** The deep insight slides (trajectory, correlation, life event, growth) come early in the experience. Benchmarks and stats come after the user already feels seen.

### 8.1.1 Visual Design Language
The slides must feel like Spotify Wrapped — bold, saturated, shareable. Not a dashboard. Not a report.
- **Full‑bleed color, one palette per slide.** Each slide owns the entire screen with a bold, saturated background. Adjacent slides use different palettes so swiping feels like a gallery.
- **One thing, massive.** Key insight dominates the screen. Numbers in 120pt+ font. Sentences as the only text on screen. Charts fill 80%+ of the space.
- **Typography does the heavy lifting.** Bold sans‑serif type, dramatic size contrast. No icons or illustrations — the type *is* the design.
- **Data visualizations are shapes, not charts.** Usage curves have no gridlines or axis labels — just the silhouette. Heatmaps are clean grids of color. Benchmarks are one line, one dot, one label.
- **Motion/animation.** Numbers count up. Curves draw themselves. Heatmaps fill in block by block. Under 1 second, purposeful reveals.
- **Mobile‑first, portrait.** Canonical experience is a phone held vertically. Share cards pre‑formatted for Instagram Stories.
- **Dark mode default, high contrast.** Saturated backgrounds with white/light text. Better in screenshots, better on OLED.

### 8.2 Slide Inventory

The Wrapped experience follows an **essay structure**: hook the user with a pattern, ground them quickly, then go deep. **Patterns and insights come early — stats and benchmarks come after the user already feels seen.** Every slide communicates one thing. Any slide can have a benchmark callout ("top X%") layered on if the user qualifies (top 10% floor).

#### Act 1: The Hook
| # | Slide | What It Shows | Example |
|---|-------|--------------|---------|
| 1 | **The Hook** | A behavioral pattern or trajectory — the single most specific thing the system found. Not a stat, not a flex. A mirror. | "You ask about Python every morning and write fiction every night. You're two different people." |

#### Act 2: Who You Were This Year
| # | Slide | What It Shows | Example |
|---|-------|--------------|---------|
| 2 | **Year at a Glance** | Key numbers framed as a human truth, not a report. One slide, not five. | "312 days. 1,427 conversations. You didn't just use ChatGPT — you made it part of how you think." |
| 3 | **Usage Over Time** | A single smooth curve — their year in one shape. No axis labels, no gridlines. The silhouette tells the story. | Monthly usage curve from first month to now |
| 4 | **The Heatmap** | GitHub-style activity grid. No annotations. The visual speaks for itself. | Green-shaded calendar heatmap |

#### Act 3: How You Used It (The Deep Patterns)
| # | Slide | What It Shows | Example |
|---|-------|--------------|---------|
| 5 | **Trajectory** | How their topics/skills evolved. A narrative arc with a beginning and end. | "You went from 'how do I center a div' to architecting microservices. 8 months. That's not learning — that's a transformation." |
| 6 | **Behavioral Split** | A non-obvious connection between behaviors — time × topic, day × length. | "You code during the day and think out loud at night. 73% of your creative writing happens after 10 PM." |
| 7 | **Life Event** | A detected spike in a topic area. Playful, never assumes outcomes. | "23 interview-prep threads in September, then silence in October. We don't know what happened — but something did." |
| 8 | **Growth** | How they evolved as an AI user. Early vs. late comparison. | "January you: 8-word questions. December you: 200-word context paragraphs. You didn't just learn to use AI — you learned how to think with it." |

#### Act 4: Where You Stand
| # | Slide | What It Shows | Example |
|---|-------|--------------|---------|
| 9 | **Top Topics** | Clean visual of their top 3-5 topics. One simple list. | "#1 Coding · #2 Writing · #3 Career" |
| 10 | **Peak Moment** | Their busiest day, framed as a story. | "October 15th. 23 conversations in one day. Every single one was about the same thing." |
| 11 | **Conversation Depth** | How they compare in depth. Benchmark if eligible. | "Most people ask a question and leave. You stay for 19 messages. You don't just ask — you think out loud." + Top 1% |
| 12 | **Your Benchmark** | Their strongest benchmark callout. | "You showed up more consistently than 97% of ChatGPT users. 47-day streak. No days off." |

#### Act 5: The Payoff
| # | Slide | What It Shows | Example |
|---|-------|--------------|---------|
| 13 | **Fun Facts** | 2-3 quirky, specific, data-grounded facts. Humor through specificity. | "Your longest conversation was 147 messages. At 3 AM. On a Tuesday. About fonts." |
| 14 | **The Compliment** | One genuine, earned compliment with real numbers. | "In January you asked 'how do I center a div.' By December you were architecting microservices. You didn't just learn to code — you became a different engineer." |
| 15 | **Your Year, One Line** | A single sentence capturing who they were this year. The closing line of an essay. | The system's best attempt at saying who they were. |
| 16 | **Share** | End screen with share CTA + pre-formatted story card. | Share button + summary card with hook + top stat + benchmark |

**Notes:**
- This is the **maximum slide inventory** (16 slides). Not every user will see every slide — slides with insufficient data show a placeholder.
- The exact slide count will vary per user. Every slide must earn its place with a real insight.
- Any slide can have a benchmark callout ("top X%") layered on. This is a **UI-layer decision** based on the tiered threshold (top 10% floor, top 5% solid, top 1% strongest). The data pipeline always computes all percentiles. (See §12, Decision 1–2.)
- The **identity/personality slide has been removed** — the hook serves as the identity moment.
- The **roast slide has been removed** — the fun facts slide handles humor better through specificity.

### 8.3 Slide Content Standards
- **One insight per slide.** Reinforced here: no slide should try to show two things at once.
- **Every slide earns its place.** If it wouldn't make someone screenshot, it doesn't belong.
- When data is insufficient, show a **placeholder screen** — never hide the slide silently or insert generic filler.
- Every insight set must include a **mix of human task insights** and **AI task insights**. (See §4.3.7.)

### 8.4 Slides Removed
- **Identity/personality** — replaced by the hook. Produced generic content and does not add value.
- **The Roast** — removed. Too easy to feel mean or generic. The fun facts slide handles humor better through specificity.
- **5 consecutive stat slides** — collapsed into one "Year at a Glance" slide. Numbers framed as human truths, not a report.
- **Topics/themes/word bubbles** — consolidated into a single clean "Top Topics" slide.
- **Achievements** — overlaps with fun facts and benchmark callouts; absorbed into individual stat slides.

---

## 9. Telemetry & Observability
- Track number of facts produced, top wow score, and placeholder slides.
- Track LLM parse failures and recovery tier usage.
- Track user opt‑in rates for benchmark contributions.
- Telemetry may be deferred initially, but the schema must be defined now to avoid refactors later.

---

## 10. Compatibility & Migration
- Existing endpoints must continue to function during rollout.
- Feature flags should allow switching between v2 and v3 pipelines.
- Cached insight payloads should be versioned.
- Use `schemaVersion` and `dataVersion` (hash of input data) for cache invalidation; default to industry‑standard explicit version fields unless a better project‑specific strategy emerges.

---

## 11. Acceptance Tests (High‑Level)
- A dataset with ≥6 months of data produces hook + trajectory + growth + correlation + benchmark insights, with a mix of human and AI task insights.
- A dataset with ≤1 month of data displays placeholder screens for trajectory and growth slides, with `_placeholderSlides` identifying which slides have insufficient data. Hook slide still renders using the best available fact.
- The opening hook slide contains a **behavioral pattern or trajectory** — not a raw stat, not a vanity metric, not a summary.
- The hook prefers behavioral patterns/trajectories over benchmarks. A benchmark hook is only acceptable when no behavioral pattern exists.
- JSON parse failure triggers Tier 2 recovery and still renders valid JSON.
- All numbers in output exist in `dataPoints` from facts.
- No output contains banned phrases or generic templates.
- No slide shows generic filler; slides with insufficient data show a clear placeholder message.
- The total slide count is **16 or fewer** — every slide earns its place.
- Deep pattern slides (trajectory, correlation, life event, growth) appear **before** benchmark slides in the experience.

---

## 12. Resolved Decisions

1. **Percentile callout metrics:** All supported metrics (conversation depth, streak length, topic diversity, code block ratio, active days, message length, night‑owl score) are eligible for percentile callouts. **The data layer always computes percentiles for every metric.** Whether a callout is displayed is a **UI‑side decision only** — the data pipeline does not gate on this.
2. **Percentile display threshold:** Tiered system. Only surface callouts when the user is in the **top 10% or above**. Use "top 1%" for the strongest callouts, "top 5%" as solid, "top 10%" as the floor. Anything below top 10% is not shown. This is enforced in the UI layer, not the data layer.
3. **Benchmark sample size:** No minimum required to start collecting. Begin collecting anonymous aggregate stats immediately. Use published ChatGPT research as fallback baselines until the user pool is large enough for reliable percentiles. Data needed from ChatGPT: total conversations, messages per conversation, average message length, active days, streak length, topic count, time‑of‑day distribution, code block ratio.
4. **Opt‑in UX for benchmarks:** Deferred to the detailed UI/UX slide‑by‑slide specification pass (separate doc). For now, assume a simple toggle or consent prompt at data load time.
5. **Identity/personality slide:** **Removed.** This slide does not add value and produces generic content. The hook slide replaces its role as the opening identity moment.
6. **Banned phrase list:** A maintained list of generic phrases the system must never output. Examples: "The Curious Mind", "Always asking questions!", "You have a lot of conversations!", "Wise and nocturnal", any phrase that could apply to any user. Owned by product; updated whenever new generic patterns are identified in output. Enforced in the validation layer.
7. **Topic‑level filters for life events:** Use the existing hard‑blocked list (debt/distress, grief/loss, abuse, addiction) as the filter. For other sensitive topics (health, relationships, legal), allow detection but require neutral framing. No additional filters beyond the hard‑block list for now.
8. **Roast slide removed.** Too easy to feel mean or generic. The fun facts slide handles humor better through specificity — a weird 3 AM conversation about fonts is funnier and more personal than any pre-written burn.
9. **Stat slides consolidated.** The previous 5 consecutive stat slides (total conversations, total messages, member since, active days, longest streak) are collapsed into one "Year at a Glance" slide. Numbers are framed as a human truth, not a report.
10. **Patterns first, stats second.** Deep insight slides (trajectory, correlation, life event, growth) are positioned early in the experience (slides 5–8). Benchmarks and stats come after the user already feels seen.
11. **Visual design: poster, not dashboard.** Full‑bleed saturated backgrounds, bold sans‑serif typography, two layers of text max, dark mode default, mobile‑first portrait, animated reveals. Every slide should pass the squint test.

---

## 13. Open Questions (Remaining)
1. Detailed **slide‑by‑slide UI/UX specification** — what exactly each slide shows, layout, and design. To be done in a separate pass once slide inventory is finalized.
2. **Benchmark data collection pipeline** — exact schema for anonymous aggregate stats and how/when to ingest published ChatGPT research baselines.
3. **Slide inventory finalization** — which slides make the final cut, pending a full review of the current slide deck.
