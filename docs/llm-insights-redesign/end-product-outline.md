# ChatGPT Wrapped — Product Outline

> What the end product looks like, at a glance.

---

## The Philosophy

Spotify Wrapped doesn't amaze people because it says "you listened to 4,000 minutes of music." It amazes them because it says "you listen to sad music on Tuesdays" — a pattern the user never noticed about themselves. The insight feels like it *sees* them.

Every slide in this experience should pass one test: **"Would the user screenshot this?"** If the answer is no, the slide doesn't earn its place.

---

## The Experience

User uploads their ChatGPT export (unchanged from today). The system analyzes their data and presents a **16-slide Wrapped experience** — one insight per slide, pattern-first, not stats-first.

---

## Visual Design: Poster, Not Dashboard

Every slide should feel like something you'd hang on a wall — not something you'd open in a spreadsheet.

- **Full-bleed color, one palette per slide.** Each slide owns the entire screen with a bold, saturated background — deep purples, electric blues, warm ambers, soft greens. No white cards on gray backgrounds. No UI chrome. Adjacent slides use different palettes so swiping feels like a gallery.
- **One thing, massive.** The key insight dominates. If it's a number, that number is 120pt font. If it's a sentence, it's the only sentence on screen. If it's a chart, it fills 80% of the space. Readable from across the room.
- **Two layers of text, max.** Every slide has at most a headline (the insight) and a subline (the evidence). No third line. No footnotes. If it needs more, split it into two slides.
- **Typography does the heavy lifting.** No icons, no illustrations. Bold sans-serif type, dramatic size contrast. The type *is* the design.
- **Data visualizations are shapes, not charts.** The usage curve has no gridlines or axis labels — just the silhouette of their year. The heatmap is a clean grid of color blocks. Benchmarks are one line, one dot, one label.
- **Motion makes it alive.** Numbers count up. Curves draw themselves. The heatmap fills in block by block. Under 1 second, purposeful — a reveal, not a loading screen.
- **Mobile-first, portrait.** The canonical experience is a phone held vertically — exactly like Wrapped, exactly like Instagram Stories. The share card is pre-formatted for story posts.
- **Dark mode default, high contrast.** Saturated backgrounds with white or light text. Looks better in screenshots, better on OLED, signals premium.

**The test:** If you squint at a slide and can still tell what it's saying, the design is right. If you have to lean in and read, it's too busy.

---

## The Slides

### Act 1: The Hook

| # | Slide | The User Sees |
|---|-------|--------------|
| 1 | **The Hook** | *"You ask about Python every morning and write fiction every night. You're two different people."* |

One line. Not a stat — a **pattern**. The single most specific behavioral insight the system found. This is the "how did it know that?" moment that makes the user want to keep swiping.

**More hook examples** (the system picks whichever is strongest for that user):
- *"You stopped asking 'what is a React hook' on March 14th. You never needed to ask again."*
- *"Every time you started a new project, you were back within 4 minutes. Every single time."*
- *"You had 23 interview-prep conversations in September. Then zero. Something happened."*

The hook is never a summary, never a dashboard, never "Welcome to your Wrapped." It's the opening line of an essay.

---

### Act 2: Who You Were This Year

| # | Slide | The User Sees |
|---|-------|--------------|
| 2 | **Your Year at a Glance** | *"312 days. 1,427 conversations. You didn't just use ChatGPT — you made it part of how you think."* |
| 3 | **Usage Over Time** | A single smooth curve — their year in one shape. No axis labels, no gridlines. The silhouette tells the story. |
| 4 | **The Heatmap** | GitHub-style activity grid. No annotations. The visual speaks for itself — they'll find their own patterns. |

Three slides to ground the user. The numbers are here, but they're framed as a human truth ("you made it part of how you think"), not a report ("here are your statistics"). The chart and heatmap are pure visuals — the user discovers their own story in the shapes.

---

### Act 3: How You Used It (The Deep Patterns)

This is the heart of the experience. Every slide here is a **connection** — not an observation, not a number.

| # | Slide | The User Sees |
|---|-------|--------------|
| 5 | **Trajectory** | *"You went from 'how do I center a div' to architecting microservices. 8 months. That's not learning — that's a transformation."* |
| 6 | **Behavioral Split** | *"You code during the day and think out loud at night. 73% of your creative writing happens after 10 PM."* |
| 7 | **Life Event** | *"23 interview-prep threads in September, then silence in October. We don't know what happened — but something did."* |
| 8 | **Growth** | *"January you: 8-word questions. December you: 200-word context paragraphs. You didn't just learn to use AI — you learned how to think with it."* |

These are the "how did it know?" slides. Moved up from the old position (slides 16-19) because they're the reason people share. Each one reveals a pattern the user never noticed about themselves.

---

### Act 4: Where You Stand

| # | Slide | The User Sees |
|---|-------|--------------|
| 9 | **Top Topics** | *#1 Coding · #2 Writing · #3 Career* — clean, simple, one visual |
| 10 | **Peak Moment** | *"October 15th. 23 conversations in one day. Every single one was about the same thing."* |
| 11 | **Conversation Depth** | *"Most people ask a question and leave. You stay for 19 messages. You don't just ask — you think out loud."* · **Top 1%** |
| 12 | **Your Benchmark** | *"You showed up more consistently than 97% of ChatGPT users. 47-day streak. No days off."* |

Benchmarks hit harder *after* the user already feels seen. By this point they've had 4 slides of pattern recognition — now "Top 1%" feels earned, not empty.

---

### Act 5: The Payoff

| # | Slide | The User Sees |
|---|-------|--------------|
| 13 | **Fun Facts** | *"Your longest conversation was 147 messages. At 3 AM. On a Tuesday. About fonts."* |
| 14 | **The Compliment** | *"In January you asked 'how do I center a div.' By December you were architecting microservices. You didn't just learn to code — you became a different engineer."* |
| 15 | **Your Year, One Line** | A single sentence that captures everything — the system's best attempt at saying who they were this year. |
| 16 | **Share** | Share button + pre-formatted story card with their hook + top stat + benchmark |

---

## Key Design Rules

- **One insight per slide.** No exceptions.
- **3 seconds.** If you can't absorb the slide in 3 seconds, it's too complex.
- **Patterns first, stats second.** The deep insights come early (slides 5-8). The numbers come after the user already feels seen.
- **Benchmarks are earned, not given.** "Top X%" shows up only after the user has context for why it matters. Layered onto slides when the user qualifies (top 10% floor).
- **Placeholders, not hiding.** If data is insufficient for a slide, show a clean placeholder — don't silently skip it.
- **Two types of insights.** Human tasks (what you were doing in your life) + AI tasks (how you used ChatGPT vs. others). Both must be present.
- **Every slide earns its place.** If it wouldn't make someone screenshot, it doesn't belong.

---

## What Powers It

```
User's ChatGPT Export
        ↓
  [ Data Pipeline ]     ← unchanged upload process
        ↓
  [ Fact Engine ]       ← deterministic, computes all 5 insight categories
        ↓                  + percentiles for 14 metrics
  [ Ranked Facts ]      ← sorted by wow score; hook = #1 fact
        ↓
  [ Narrative Layer ]   ← LLM rewrites facts as punchy copy (or templates as fallback)
        ↓
  [ Validated Output ]  ← JSON schema v3, banned phrase check, tiered recovery
        ↓
  [ 16 Slides ]         ← poster-style, one insight each, mobile-first
```

---

## The 5 Insight Categories

| Category | What It Detects | Wow Factor |
|----------|----------------|------------|
| **Trajectory** | How topics/skills evolved over time | Highest |
| **Benchmarks** | "Top X% of users" comparisons | High |
| **Correlations** | Non-obvious behavioral patterns (time × topic, day × length) | High |
| **Growth** | How the user evolved as an AI user | Medium-High |
| **Life Events** | Topic spikes that suggest real-world events | Medium |

---

## The 14 Benchmark Metrics

Every one of these is computed for every user. The UI shows a "top X%" badge when the user is in the top 10%.

| Metric | Example Callout |
|--------|----------------|
| Total conversations | "Power user" |
| Total messages | Usage volume |
| Messages per conversation | "Deep diver — Top 1%" |
| Average message length | Prompt sophistication |
| Longest streak | "Streak machine — Top 2%" |
| Active days | "Never misses a day — Top 3%" |
| Topic diversity | "Renaissance mind" |
| Night-owl score | "Certified night owl — Top 5%" |
| Code block ratio | "Code-first thinker — Top 10%" |
| Conversations per month | Usage intensity |
| Time-of-day distribution | Peak time insights |
| Day-of-week distribution | Behavioral patterns |
| First conversation date | Tenure |
| Busiest single day | Peak day |

---

## What's NOT in the Product

- ~~Identity/personality slide~~ — removed (produced generic content like "The Curious Mind")
- ~~The Roast slide~~ — removed (too easy to feel mean; the fun facts slide handles humor better with specificity)
- ~~5 consecutive stat slides~~ — collapsed into one "Year at a Glance" slide
- ~~Multiple topic visualizations~~ — consolidated into one clean "Top Topics" slide
- ~~Achievements slide~~ — absorbed into individual slides with benchmark badges
- ~~New upload requirements~~ — upload process stays exactly the same
