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
- Slides rendered without empty fields; missing data removes the slide (not replaced by filler).
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

#### 4.3.0 Minimum Data Thresholds (Initial vs Target)
- **Principle:** Initial thresholds are **half** of target (industry standard). As the data pool grows, thresholds should be raised to target levels.
- **Trajectory:** Initial ≥6 weeks and ≥25 conversations; Target ≥3 months and ≥50 conversations.
- **Benchmarks:** Initial ≥2 weeks and ≥15 conversations; Target ≥1 month and ≥30 conversations.
- **Correlations:** Initial ≥15 conversations and ≥100 user messages; Target ≥30 conversations and ≥200 user messages.
- **Growth:** Initial ≥6 weeks and ≥25 conversations; Target ≥3 months and ≥50 conversations.
- **Life events:** Initial ≥2 weeks and ≥40 conversations; Target ≥4 weeks and ≥80 conversations; Spike threshold stays ≥5x in both.

#### 4.3.1 Trajectory (Category 1)
- Must compute topic and usage shifts over time.
- Must detect at least one valid arc when ≥3 months of data exist.
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
- Must include: `personality`, `benchmarks`, `trajectory`, `correlations`, `growth`, `lifeEvent`, `funFacts`, `roast`, `compliment`, and metadata fields.
- Must include `_removedSlides` when fields invalid or insufficient.
- Must be backward‑compatible enough for existing slide rendering to map fields or be feature‑flagged.

### 4.7 Validation & Recovery
- Must validate JSON format and required fields.
- Must perform Tiered JSON recovery:
  1. Parse attempt
  2. LLM reformat
  3. Field‑level removal
- Must remove slides rather than insert filler.
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
- Slides should only appear when data supports meaningful narratives.
- Benchmark slides must show both percentile and raw values.
- Trajectory slides must display a time span and arc.
- Correlation slides must include “X vs Y” comparison with numbers.
- Fun facts must be numeric, not qualitative placeholders.
- Maintain the current total slide count. If any slide is removed for redundancy, replace it with a higher‑wow insight slide to keep the total constant.
- **Recommended order to maximize engagement:** Hook (overview stats) → identity/personality → trajectory → benchmark → correlation → growth → topics/themes → fun facts → roast/compliment → achievements → gallery → heatmap → share.
- **Redundancy candidates (consider merging or replacing):**
  - Topics vs themes vs word bubbles: high overlap; keep at most one “topic visualization” slide.
  - Identity/personality vs obsession: consolidate into one identity slide with a single dominant narrative.
  - Fun facts vs achievements: both are list‑style; keep the one with higher wow‑score density.
  - Rationale: reduces repetitive insights and preserves novelty per slide.

---

## 9. Telemetry & Observability
- Track number of facts produced, top wow score, and removed slides.
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
- A dataset with ≥6 months of data produces trajectory + growth + correlation insights.
- A dataset with ≤1 month of data omits trajectory and growth slides, with `_removedSlides` indicating omissions.
- JSON parse failure triggers Tier 2 recovery and still renders valid JSON.
- All numbers in output exist in `dataPoints` from facts.
- No output contains banned phrases or generic templates.

---

## 12. Open Questions (To Confirm)
1. Which **metrics** should get percentile callouts by default (depth, streak, topic diversity, code ratio, active days, etc.)?
2. What is the **default percentile threshold** per metric (choose from 0.01%, 0.1%, 1%, 5%, 10%)?
3. What is the **minimum sample size** required before enabling aggregate benchmarks (e.g., 50 or 100 users)?
4. What is the **opt‑in UX** for benchmark contributions (modal vs settings toggle)?
5. Should the **identity/personality** slide prefer trajectory, correlation, or benchmark facts when multiple are available?
6. What is the **approved banned phrase list** owner and update cadence?
7. Should we apply **topic‑level filters** for life‑event detection beyond the hard‑blocked list?
