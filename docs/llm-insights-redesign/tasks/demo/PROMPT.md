# Prompt: Build a Hardcoded Visual Demo of the New 16-Slide Wrapped Experience

> **Purpose:** Hand this to an AI agent. It will build a fully working, hardcoded HTML/CSS/JS demo of the redesigned 16-slide ChatGPT Wrapped experience so the team can see and feel the end product before any backend work begins.

---

## Instructions

You are building a **visual prototype** of the new ChatGPT Wrapped experience — a "Spotify Wrapped"-style slide deck that shows personalized insights about a user's ChatGPT usage. This is a design demo with hardcoded data. No real data pipeline, no APIs, no build tools. Just a single HTML file (with linked CSS/JS) that you can open in a browser and swipe through 16 poster-style slides.

The goal is to make the team say **"Yes, that's the product."**

---

## Step 1: Read These Documents

1. **`docs/llm-insights-redesign/end-product-outline.md`** — The product vision. 16 slides, the philosophy, what each slide shows. Read this first.
2. **`docs/llm-insights-redesign/design-doc.md`** — Section 1 (The Bar), Section 6 (Output Schema for `WrappedInsightsV3`). These define the design language and the data shape.

You also have access to the **existing slide CSS** in `projects/chatgpt-wrapped/css/`. The current design uses:
- `Outfit` font (Google Fonts)
- Dark background (`#0f0f0f`)
- Single accent color (`#10a37f`)
- Frosted glass cards with subtle borders
- Gradient text on numbers
- Emoji icons on slides

**The redesign is a dramatic visual upgrade.** Read the design philosophy below carefully — the new design is fundamentally different from what exists.

---

## Step 2: Understand the Design Upgrade

The current slides look like a **dashboard** — dark cards on a dark background, stat labels, progress bars, emoji icons, micro-stats. The redesign should feel like **posters you'd hang on a wall**. Here's what changes:

### What to Keep from the Existing CSS
- **`Outfit` font** — It's a great sans-serif. Keep using it, but push the weight and size contrast harder.
- **Dark mode** — Keep dark backgrounds, but replace the flat `#0f0f0f` with rich, saturated colors.
- **Smooth animations** — The existing `fadeIn`, count-up, and transition timing are good. Reuse the easing curves.
- **Mobile-first structure** — The existing flexbox centering and responsive breakpoints are solid.

### What Must Change (The Upgrade)
| Current Design | New Design |
|---------------|------------|
| Flat dark background (`#0f0f0f`) on every slide | **Full-bleed saturated color, different palette per slide.** Deep purples, electric blues, warm ambers, ocean teals. Each slide owns the entire screen. |
| White/gray cards floating on dark | **No cards.** The slide IS the canvas. Text sits directly on the saturated background. No borders, no glass morphism, no card containers. |
| Emoji icons on every slide (📊🔥⚡) | **No icons, no emoji.** Typography does ALL the heavy lifting. The text is the design. |
| Multiple stats per slide (micro-stats, progress bars, sub-values) | **One thing per slide, massive.** If it's a number, it's 120px. If it's a sentence, it's the only sentence on screen. No sidebars, no secondary metrics. |
| Gradient text on accent elements | **White text on saturated backgrounds.** The color is in the background, not the text. Text is white or near-white for maximum contrast. Accent color used sparingly for one key number or highlight. |
| Titles + subtitles + stat grids + bars + legends | **Two layers of text max.** A headline (the insight) and a subline (the evidence). Nothing else. No third line. No footnotes. |
| Hover effects, tooltips, scrollable carousels | **Static, immediate.** Every slide communicates in 3 seconds. No interaction needed to understand it. |

### The Visual Test
- **Squint test:** If you squint at a slide and can still tell what it's saying, the design is right.
- **Screenshot test:** If someone would screenshot this and post it on Twitter/Instagram, the design is right.
- **Poster test:** If you'd hang this on a wall, the design is right.

---

## Step 3: Build the Demo

### File Structure

Create everything inside `projects/chatgpt-wrapped/demo/`:

```
projects/chatgpt-wrapped/demo/
  index.html          ← Single entry point, opens in browser
  demo.css            ← All styles for the demo (new design system)
  demo.js             ← Swipe navigation, animations, count-up
```

**Do NOT modify any existing files** in `projects/chatgpt-wrapped/`. The demo is a standalone prototype.

### The 16 Slides (Hardcoded Data)

Use this hardcoded user profile. This is a "power user" example designed to show off every slide type:

```
Name: (not shown — this is about their data, not their identity)
Period: January 2025 – December 2025
Total conversations: 1,427
Total messages: 8,934
Active days: 312 out of 365
First conversation: January 3, 2025
Top topics: #1 Coding, #2 Writing, #3 Career
Longest streak: 47 days
Busiest day: October 15 — 23 conversations, all about "system design"
Night owl score: 34% (top 5%)
Avg messages per conversation: 19 (top 3%)
Avg message length: 247 characters

Trajectory: Started with Python basics (Jan–Mar, 45 convos) → machine learning (Apr–Jun, 67 convos) → deploying ML models (Jul–Sep, 34 convos)
Correlation: Codes during the day (78% of coding before 6pm), writes fiction at night (73% of creative writing after 10pm)
Life event: 23 interview-prep conversations in September, then 0 in October
Growth: Early messages averaged 42 characters. Recent messages average 247 characters. 5.9x growth over 8 months.
Benchmarks: Top 3% conversation depth (19 avg vs 5 avg), Top 5% streak (47 days), Top 5% night owl
```

### Slide-by-Slide Specification

Build each slide using the data above. Every slide gets its own full-bleed background color.

---

**Slide 1 — The Hook**
- Background: Deep purple (`#1a0533` or similar rich violet)
- Content: A single sentence, centered vertically and horizontally:
  > *"You code by day and write fiction by night. 73% of your creative writing happens after 10 PM. You're two different people."*
- Typography: 28–32px, bold, white. This is the only text on screen. Maximum impact.
- Animation: Fade in over 600ms.
- No icons, no subtitle, no decoration. Just the words.

---

**Slide 2 — Year at a Glance**
- Background: Electric blue (`#0c1445`)
- Content: Three key numbers stacked vertically in hero size:
  - **312** days
  - **1,427** conversations  
  - **8,934** messages
- Below the numbers, one subline in smaller text:
  > *"You didn't just use ChatGPT — you made it part of how you think."*
- Typography: Numbers in 80–96px, extra bold, white. Subline in 18px, lighter weight, white/70%.
- Animation: Numbers count up from 0. Subline fades in after.

---

**Slide 3 — Usage Over Time**
- Background: Warm amber (`#3d1c00`)
- Content: A single smooth SVG curve representing monthly usage. No axis labels, no gridlines, no data points. Just the shape of their year. The curve should show low start (Jan: ~40), growth through summer, peak (Aug: ~180), then settling.
- Small caption below: *"Your year, in one shape."*
- Animation: Curve draws itself left-to-right over 1 second.
- The curve should fill 80%+ of the slide width.

---

**Slide 4 — The Heatmap**
- Background: Forest green (`#052e16`)
- Content: A simplified GitHub-style activity grid. 52 columns × 7 rows. Cells colored by intensity (transparent for no activity, green shades for 1-5+ conversations). Use the accent green for cell colors.
- No day labels, no month labels, no legend, no tooltip. The visual speaks for itself.
- Small caption: *"Every day you showed up."*
- Animation: Cells fill in block by block with staggered delay (15ms per cell), scanning left to right.

---

**Slide 5 — Trajectory**
- Background: Deep purple again (or a rich magenta, `#3b0764`)
- Content: A visual arc showing progression:
  > **Python basics → Machine learning → Deploying models**
- Below the arc, the narrative:
  > *"You went from 'how do I write a for loop' to deploying ML models. 9 months. That's not learning — that's a transformation."*
- Typography: Arc items in 20–24px bold, connected by → arrows. Narrative in 18px, white/80%.
- Animation: Arc items appear one at a time, left to right, 300ms stagger.

---

**Slide 6 — Behavioral Split**
- Background: Ocean teal (`#042f2e`)
- Content: Single statement:
  > *"You code during the day and write fiction at night. 73% of your creative writing happens after 10 PM."*
- Typography: 26–30px, bold, white. One line break between the two sentences.
- This is a pattern-reveal slide. Let the words do all the work.

---

**Slide 7 — Life Event**
- Background: Hot pink/magenta (`#4a0028`)
- Content:
  > *"23 interview-prep conversations in September. Then zero in October. We don't know what happened — but something did."*
- Typography: 24–28px, white. The "23" and "zero" should be in the slide's accent color for emphasis.
- Playful, not invasive. A wink.

---

**Slide 8 — Growth**
- Background: Warm amber (`#451a03`)
- Content: A before/after comparison:
  - Left/top: **42** chars (small text, dimmed) — *"Early you"*
  - Right/bottom: **247** chars (large text, bright) — *"Recent you"*
- Below: *"Your messages grew 5.9x. You didn't just learn to use AI — you learned how to think with it."*
- The visual contrast between the small "42" and the large "247" IS the design.
- Animation: "42" appears first (small). Then "247" grows/expands to its full size.

---

**Slide 9 — Top Topics**
- Background: Slate blue (`#1e1b4b`)
- Content: Clean ranked list:
  > **#1** Coding  
  > **#2** Writing  
  > **#3** Career
- Typography: Numbers in accent color, 48px bold. Topic names in white, 36px. One per line.
- Animation: Items appear top to bottom, 200ms stagger.

---

**Slide 10 — Peak Moment**
- Background: Sunset orange (`#431407`)
- Content:
  - **October 15** in hero type (48–64px)
  - **23 conversations** below it
  - Subline: *"Every single one was about system design. You were locked in."*
- Animation: Date counts/fades in. Then the count. Then the subline.

---

**Slide 11 — Conversation Depth**
- Background: Electric blue (`#0f1d4e`)
- Content:
  - **19** in hero number (96–120px) — their average messages per conversation
  - Subline: *"Most people ask a question and leave. You stay for 19 messages. You don't just ask — you think out loud."*
  - Badge: **Top 3%** — small, rounded, accent-colored, positioned near the number.
- Animation: Number counts up. Badge slides in.

---

**Slide 12 — Your Benchmark**
- Background: Slate blue (`#1e1b4b`)
- Content:
  - *"You showed up more consistently than 95% of ChatGPT users."*
  - **47-day streak.** (hero number)
  - A minimal horizontal bar showing their position (a single dot at the 95th percentile on a thin line).
- Animation: Bar fills to their position. Number counts up.

---

**Slide 13 — Fun Facts**
- Background: Hot pink (`#4a0028`)
- Content: 2–3 lines, stacked vertically with spacing:
  > *"Your longest conversation was 147 messages. At 3 AM. On a Tuesday. About fonts."*
  > *"You've typed more words to ChatGPT than most people write in a year."*
  > *"October 15th alone had more conversations than most users have in a month."*
- Typography: 18–22px each. Humor through specificity.
- Animation: Each line fades in one at a time, 400ms stagger.

---

**Slide 14 — The Compliment**
- Background: Warm amber (`#451a03`)
- Content:
  > *"In January you asked 'how do I write a for loop.' By December you were deploying machine learning models. You didn't just learn to code — you became a different engineer."*
- Typography: 24–28px, white, centered. Single statement. Emotional beat.
- Animation: Slow fade in (800ms).

---

**Slide 15 — Your Year, One Line**
- Background: Deep purple (`#1a0533`)
- Content:
  > *"The year you became someone who thinks with AI — and never looked back."*
- Typography: 28–32px, white, centered. Dramatic pause feel. The closing line of an essay.
- Animation: Fade in.

---

**Slide 16 — Share**
- Background: Sunset orange (`#431407`)
- Content:
  - A **share card preview** (a smaller rectangle in the center showing the hook + top stat + "ChatGPT Wrapped 2025" branding)
  - Below it, a **Share** button (large, prominent CTA)
  - Below the button: "Share your Wrapped" in small text
- The share card preview should look like a formatted story card (portrait aspect ratio inside the slide).
- Button: Rounded, white text on accent color, large (200px+ wide).

---

### Swipe Navigation

- **Horizontal swipe** between slides (touch + mouse drag). Use a simple JS swipe handler.
- **Left/right arrow keys** for keyboard navigation.
- **Dot indicators** at the bottom — 16 small dots, current slide highlighted.
- **Smooth transition** between slides: 300ms slide animation.
- Each slide is `100vh` height, `100vw` width. Only one visible at a time.

### Animation Requirements

- **Count-up:** Numbers animate from 0 to their final value over 800ms, ease-out. Trigger when the slide becomes active.
- **Fade-in:** Text fades in over 400–800ms depending on the slide.
- **Stagger:** When multiple elements appear, stagger them by 200–400ms.
- **Draw curve (Slide 3):** SVG `stroke-dasharray` animation, 1 second.
- **Heatmap fill (Slide 4):** Cells transition from transparent to colored with 15ms stagger.
- **All animations under 1 second.** Purposeful reveals, not loading screens.
- **Animations re-trigger** each time a slide becomes active (so swiping back replays them).

### Typography Rules

- Font: `Outfit` from Google Fonts (already used in the project). Weights: 400, 600, 700, 800, 900.
- Hero numbers: 96–120px, weight 800–900.
- Headlines: 24–32px, weight 700.
- Sublines: 16–20px, weight 400, white/70% opacity.
- Captions: 12–14px, weight 400, white/50% opacity.
- **Size contrast is extreme.** The biggest text on a slide should be at least 3x the smallest.

### Color Rules

- **No two adjacent slides share the same background color.**
- All backgrounds are dark and saturated — not pastel, not neon. Deep, rich, cinematic.
- Text is always white (`#ffffff`) or white at reduced opacity. Never colored text on colored backgrounds (except the accent color on key numbers).
- Accent color per slide: a lighter, brighter version of the background hue. Used sparingly — one number, one badge, one highlight.

### Responsive Rules

- **Mobile-first.** Design for 375px width. This is the canonical experience.
- **Desktop:** Center the slide deck in a phone-shaped frame, max 430px wide, centered on screen with a dark surround.
- All text must be readable on a phone screen without zooming.

---

## Step 4: Quality Checks

Before considering this done, verify:

- [ ] All 16 slides render and are swipeable
- [ ] Each slide has a unique, saturated background color
- [ ] No two adjacent slides share the same background
- [ ] No emoji or icons anywhere — typography only
- [ ] No cards, borders, or glass-morphism effects — text directly on background
- [ ] Two text layers max per slide (headline + subline)
- [ ] Hero numbers are 96px+ on mobile
- [ ] Each slide passes the squint test (readable at arm's length)
- [ ] Each slide passes the 3-second test (understandable at a glance)
- [ ] Animations are smooth and under 1 second
- [ ] Count-up animations work on number slides
- [ ] Heatmap fills in block by block
- [ ] Usage curve draws itself
- [ ] Swipe, arrow keys, and dot navigation all work
- [ ] Mobile viewport (375px) looks correct
- [ ] Desktop viewport centers in a phone frame
- [ ] The share slide has a visible share card preview and button
- [ ] Opening the file in a browser requires zero setup (no build tools, no npm)

---

## What NOT to Build

- No data pipeline. All data is hardcoded.
- No file upload. The demo starts on Slide 1.
- No server. Just static HTML/CSS/JS.
- No framework (React, Vue, etc.). Vanilla HTML.
- No build step. Open `index.html` in a browser and it works.
- No connection to the existing codebase. This is a standalone visual prototype.

---

## Reference: Existing CSS You Can Borrow From

You can reference these for animation timing and patterns (but don't import them — write fresh CSS for the new design):

- `projects/chatgpt-wrapped/css/core/variables.css` — Font import, color variables
- `projects/chatgpt-wrapped/css/core/base.css` — Reset, `.slide` base, `fadeIn` keyframe
- `projects/chatgpt-wrapped/css/core/navigation.css` — Nav buttons, dots indicator
- `projects/chatgpt-wrapped/css/slides/slide-01-conversations.css` — Count-up number styling, glow effects
- `projects/chatgpt-wrapped/css/slides/slide-14-heatmap.css` — Heatmap grid, cell animation

Borrow the **timing curves** and **structural patterns**. Discard the **visual aesthetic** (cards, gradients, emoji). The new design is dramatically different.
