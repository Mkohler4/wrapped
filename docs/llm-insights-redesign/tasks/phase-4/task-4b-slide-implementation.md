# Task 4B: Slide Implementation

> **Phase:** 4 — Presentation  
> **Task ID:** 4B  
> **Estimated Effort:** 2-3 days  
> **Status:** Not Started

---

## Context Summary

You are working on **ChatGPT Wrapped** — a "Spotify Wrapped"-style experience that analyzes a user's ChatGPT data export and presents personalized insights as a swipeable, poster-style 16-slide deck. The system produces a `WrappedInsightsV3` JSON object containing all the data for all 16 slides. Your job is to render each slide as a bold, poster-style visual.

This task builds all **16 slides** of the Wrapped experience. Each slide maps to a specific field in the `WrappedInsightsV3` schema and follows the design system established in Task 4A. Every slide must feel like something you'd screenshot and share — bold type, saturated colors, one insight per slide, mobile-first.

---

## Goal

Implement all 16 slide components that consume `WrappedInsightsV3` data and render the Wrapped experience. Includes swipe navigation, animation triggers, and placeholder states.

---

## Interface Contracts

### Input (Consumed from the Narrative Layer Output)

```typescript
interface WrappedInsightsV3 {
  hook: { statement: string; factId: string; category: string };
  yearAtAGlance: { totalConversations: number; totalMessages: number; timespan: string; activeDays: number; totalDays: number; firstConversation: string; narrative: string };
  trajectory: { arc: string; narrative: string; timespan: string } | null;
  correlations: Array<{ description: string; narrative: string }>;
  lifeEvent: { topic: string; narrative: string } | null;
  growth: { signal: string; narrative: string } | null;
  benchmarks: Array<{ metric: string; percentile: number; userValue: number; avgValue: number; label: string; narrative: string }>;
  peakMoment: { date: string; count: number; narrative: string };
  topTopics: string[];
  funFacts: string[];
  compliment: string;
  yearOneLine: string;
  _factCount: number;
  _topWowScore: number;
  _placeholderSlides?: string[];
  _benchmarkSource: 'aggregate' | 'published' | 'self_comparison';
}
```

### Design System (Consumed from Task 4A)

```typescript
interface SlidePalette {
  background: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
}

function getPalette(slideIndex: number): SlidePalette;
```

---

## Detailed Requirements

### The 16 Slides

Each slide has: a schema field it reads from, a visual type, and specific rendering rules.

#### Slide 1: The Hook
- **Schema field:** `hook.statement`
- **Visual:** Single sentence, massive type (headline size or larger). Centered vertically and horizontally.
- **Animation:** Fade in over 400ms.
- **Rule:** One line only. If the statement is long, scale font down but never below 24px.
- **Palette:** #1 (Deep Purple or equivalent).

#### Slide 2: Year at a Glance
- **Schema field:** `yearAtAGlance`
- **Visual:** 3 key numbers (activeDays, totalConversations, totalMessages) in hero-number size, stacked vertically. Below them, the narrative text as a subline.
- **Animation:** Numbers count up from 0. Narrative fades in 200ms after numbers finish.
- **Layout:** Numbers are the dominant visual. Narrative is secondary.
- **Palette:** #2.

#### Slide 3: Usage Over Time
- **Schema field:** Derived from temporal data (monthly conversation counts). The `WrappedInsightsV3` object may need supplementary data for this — use `yearAtAGlance` or pass temporal data separately.
- **Visual:** A single smooth SVG curve — the year in one shape. No axis labels, no gridlines, no data points. Just the silhouette.
- **Animation:** Curve draws itself from left to right over 1000ms.
- **Design rule:** The curve fills 80%+ of the slide. A small caption underneath (e.g., "Your year in one shape").
- **Palette:** #3.

#### Slide 4: The Heatmap
- **Schema field:** Derived from conversation dates (daily activity data).
- **Visual:** GitHub-style activity grid. 52 columns (weeks) × 7 rows (days). Color intensity based on conversation count per day. No annotations, no labels. The visual speaks for itself.
- **Animation:** Cells fill in with staggered delay (20ms per cell), scanning left to right.
- **Design rule:** The grid is the entire slide. Small caption at bottom.
- **Palette:** #6 (Forest Green — matches the heatmap aesthetic).

#### Slide 5: Trajectory
- **Schema field:** `trajectory` (nullable)
- **Visual:** The arc string as a visual timeline or arrow flow: "React basics → Advanced React → Next.js deployment." The narrative as a subline.
- **Animation:** Arc elements appear sequentially, left to right.
- **Placeholder:** If `trajectory === null`, show "Not enough data for this insight" in the design system's placeholder style.
- **Palette:** #1.

#### Slide 6: Behavioral Split
- **Schema field:** `correlations[0]` (the strongest correlation)
- **Visual:** Single statement — the correlation narrative. If it's a topic split (day vs. night), consider a split-screen visual (left = day topic, right = night topic).
- **Animation:** Fade in.
- **Placeholder:** If `correlations.length === 0`, show placeholder.
- **Palette:** #4.

#### Slide 7: Life Event
- **Schema field:** `lifeEvent` (nullable)
- **Visual:** Single statement — the life event narrative. Centered, prominent.
- **Animation:** Fade in.
- **Placeholder:** If `lifeEvent === null`, show placeholder.
- **Palette:** #5.

#### Slide 8: Growth
- **Schema field:** `growth` (nullable)
- **Visual:** Before/after comparison. Show the early value and recent value with a visual contrast (small → big, short → tall). The narrative as a subline.
- **Animation:** Early value appears first, then recent value grows/expands to its final size.
- **Placeholder:** If `growth === null`, show placeholder.
- **Palette:** #3.

#### Slide 9: Top Topics
- **Schema field:** `topTopics`
- **Visual:** Clean numbered list: "#1 Coding · #2 Writing · #3 Career." Large type, one per line or a single line with separators.
- **Animation:** Topics appear one at a time, top to bottom, with 200ms stagger.
- **Palette:** #7.

#### Slide 10: Peak Moment
- **Schema field:** `peakMoment`
- **Visual:** The date in hero-number style. The count prominent. The narrative as a subline.
- **Animation:** Date and count animate in. Narrative fades.
- **Palette:** #8.

#### Slide 11: Conversation Depth
- **Schema field:** First benchmark with metric `conversation_depth` or `avg_messages_per_convo` (or the most relevant depth metric).
- **Visual:** The user's value in hero-number size. Below it, the comparison ("Most people: X. You: Y."). If eligible, a "Top X%" badge.
- **Animation:** Number counts up. Badge slides in.
- **Palette:** #2.

#### Slide 12: Your Benchmark
- **Schema field:** The strongest benchmark (highest percentile from `benchmarks[]`).
- **Visual:** Percentile bar or position indicator. The label as headline. The narrative as subline.
- **Animation:** Bar fills to the user's position.
- **Palette:** #7.

#### Slide 13: Fun Facts
- **Schema field:** `funFacts`
- **Visual:** 2-3 quirky lines stacked vertically. Each fact gets its own line with a small pause between.
- **Animation:** Facts appear one at a time with 300ms stagger.
- **Palette:** #5.

#### Slide 14: The Compliment
- **Schema field:** `compliment`
- **Visual:** Single statement, centered, large type. This is an emotional beat — should feel warm.
- **Animation:** Slow fade in (600ms).
- **Palette:** #3.

#### Slide 15: Your Year, One Line
- **Schema field:** `yearOneLine`
- **Visual:** Single sentence. Centered. The closing line of an essay. Dramatic pause feel.
- **Animation:** Fade in.
- **Palette:** #1.

#### Slide 16: Share
- **Schema field:** Summary of hook + top benchmark.
- **Visual:** Share button (prominent CTA). Below it, a preview of the share card (hook + top stat + "ChatGPT Wrapped" branding). The card format matches the 1080×1920 share template from Task 4A.
- **Actions:** Share button triggers native share API or downloads the share card image.
- **Palette:** #8.

### Swipe Navigation

- Horizontal swipe between slides (left = next, right = previous).
- Dot indicators at the bottom showing position.
- Keyboard support: left/right arrows.
- Smooth transition between slides (300ms slide animation from Task 4A).

### Benchmark Badge Overlay

Any slide can have a benchmark badge ("Top X%") layered on if the user qualifies (top 10% threshold). This is a UI-layer decision:
- Check `benchmarks[]` for metrics relevant to the current slide.
- If the user is top 10% or above for a relevant metric, show a badge in the corner of the slide.
- Badge style: small, rounded, accent-colored, positioned top-right.

### Placeholder State

When `_placeholderSlides` includes a field name that maps to a slide:
- Show the slide with the normal palette and layout.
- Display placeholder text: "Not enough data for this insight."
- Subline: "Keep using ChatGPT and check back next year."
- Do NOT hide the slide. Show it with the placeholder. This communicates completeness.

---

## File Ownership

| File | Action |
|------|--------|
| `src/components/slides/SlideHook.tsx` (or equivalent) | **CREATE** |
| `src/components/slides/SlideYearAtAGlance.tsx` | **CREATE** |
| `src/components/slides/SlideUsageCurve.tsx` | **CREATE** |
| `src/components/slides/SlideHeatmap.tsx` | **CREATE** |
| `src/components/slides/SlideTrajectory.tsx` | **CREATE** |
| `src/components/slides/SlideBehavioralSplit.tsx` | **CREATE** |
| `src/components/slides/SlideLifeEvent.tsx` | **CREATE** |
| `src/components/slides/SlideGrowth.tsx` | **CREATE** |
| `src/components/slides/SlideTopTopics.tsx` | **CREATE** |
| `src/components/slides/SlidePeakMoment.tsx` | **CREATE** |
| `src/components/slides/SlideConversationDepth.tsx` | **CREATE** |
| `src/components/slides/SlideBenchmark.tsx` | **CREATE** |
| `src/components/slides/SlideFunFacts.tsx` | **CREATE** |
| `src/components/slides/SlideCompliment.tsx` | **CREATE** |
| `src/components/slides/SlideYearOneLine.tsx` | **CREATE** |
| `src/components/slides/SlideShare.tsx` | **CREATE** |
| `src/components/slides/SlideDeck.tsx` | **CREATE** — Container with swipe navigation, dot indicators. |
| `src/components/slides/SlidePlaceholder.tsx` | **CREATE** — Reusable placeholder component. |

**Note:** File extensions depend on the project's framework (React/Next.js/Vue/etc.). Use whatever framework the existing codebase uses. If uncertain, default to React `.tsx` files.

**Do NOT** edit files owned by other tasks (detectors, fact engine, narrative). Only import from the shared types file and the design system.

---

## Edge Cases & Constraints

| Scenario | Expected Behavior |
|----------|-------------------|
| **`trajectory` is null** | Show placeholder slide at position 5. |
| **`correlations` is empty** | Show placeholder slide at position 6. |
| **`lifeEvent` is null** | Show placeholder slide at position 7. |
| **`growth` is null** | Show placeholder slide at position 8. |
| **`benchmarks` is empty** | Slides 11 and 12 show placeholders. No benchmark badges on any slide. |
| **`funFacts` has only 1 item** | Show the single fun fact. Don't pad with generic content. |
| **`topTopics` has only 1 topic** | Show "#1 [Topic]" — don't hide the slide. |
| **Very long hook statement** | Scale font down. Never below 24px. Truncate with "..." at 200 characters. |
| **User swipes quickly** | Animations should cancel cleanly if the user swipes before they finish. |
| **Slide data is partially valid** | Render what's available. Missing subfields use the fallback "—". |
| **Desktop viewport** | Center slides in a phone-frame container, max 430px wide. |

---

## Acceptance Criteria

- [ ] All 16 slides render with test data
- [ ] Each slide displays one insight only (poster principle)
- [ ] Each slide passes the 3-second absorption test (immediately understandable)
- [ ] Each slide passes the squint test (readable at a distance — not too busy)
- [ ] Mobile portrait layout is correct (test at 375px and 430px width)
- [ ] Desktop layout centers the deck in a phone-frame container
- [ ] Placeholder slides display when data is `null` or `_placeholderSlides` includes the field
- [ ] Placeholders show "Not enough data" — never generic filler content
- [ ] Swipe navigation works (horizontal swipe, left/right arrows)
- [ ] Dot indicators show current position
- [ ] All animations are under 1 second and feel purposeful
- [ ] Numbers count up on Slides 2, 10, 11
- [ ] Usage curve draws itself on Slide 3
- [ ] Heatmap fills in block-by-block on Slide 4
- [ ] Adjacent slides use different color palettes
- [ ] Benchmark badges appear when user is top 10%+
- [ ] Share card renders at 1080×1920 on Slide 16
- [ ] Share button triggers native share or download
- [ ] No imports from detector or narrative modules — only from shared types and design system

---

## Dependencies

| Direction | Task | Relationship |
|-----------|------|-------------|
| **Depends on** | Task 0 (Interface Contracts) | Needs `WrappedInsightsV3` type for data mapping |
| **Depends on** | Task 4A (Design System) | Inherits palettes, typography, animations, layout |
| **Depends on** | Tasks 3A/3B (Narrative Layer) | Needs sample `WrappedInsightsV3` output for development/testing. Can use mock data initially. |
| **Unblocks** | Task 5B (End-to-End Testing) | Testing verifies slides render with real data |
