# Demo Slide Tasks — One Slide at a Time

> **Purpose:** Review each slide individually. For each one, see what currently exists, what the redesign calls for, and add your own design upgrade ideas before handing it to an agent.  
> **Location:** Build in `projects/chatgpt-wrapped/demo/`  
> **Rule:** Each slide is a standalone task. An agent builds one slide, you review, then move to the next.

---

## How to Use This Document

1. Read the **Current State** section for each slide to see what exists today.
2. Read the **Redesign Target** to see what the new design calls for.
3. **Fill in your design ideas** in the `Design Upgrade Ideas` section.
4. Hand that single slide task to an agent.
5. Review the result. Iterate if needed. Move to the next slide.

---

## Hardcoded Demo Data (All Slides Use This)

```
Period: January 2025 – December 2025
Total conversations: 1,427
Total messages: 8,934
Active days: 312 / 365
First conversation: January 3, 2025
Longest streak: 47 days
Busiest day: October 15 — 23 conversations (all about "system design")
Night owl score: 34% (top 5%)
Avg messages per conversation: 19 (top 3%)
Avg message length: 247 characters
Top topics: #1 Coding (612), #2 Writing (298), #3 Career (187), #4 Research (134), #5 Health (96)
Trajectory: Python basics (Jan–Mar) → Machine Learning (Apr–Jun) → Deploying ML Models (Jul–Sep)
Correlation: Codes during day (78%), writes fiction at night (73% after 10 PM)
Life event: 23 interview-prep conversations in Sep, 0 in Oct
Growth: Avg message length went from 42 chars (early) → 247 chars (recent), 5.9x over 8 months
Benchmarks: Top 3% conversation depth, Top 5% streak, Top 5% night owl
Monthly conversations: Jan:40, Feb:55, Mar:72, Apr:98, May:115, Jun:130, Jul:155, Aug:180, Sep:165, Oct:148, Nov:140, Dec:129
```

---

## Slide 1: The Hook

### Current State
**No direct equivalent.** The current slide 1 is "Total Conversations" — a big count-up number with floating chat bubbles, micro-stats (per day, per week), and a progress bar. It's a stat slide, not a hook.

**Existing files:**
- `slides/slide-01-conversations.html`
- `css/slides/slide-01-conversations.css`
- `js/slides/slide-01-conversations.js`

### Redesign Target
A single compelling behavioral pattern — one sentence, centered, no stats. The opening line of an essay. Example: *"You code by day and write fiction by night. 73% of your creative writing happens after 10 PM. You're two different people."*

**Rules:** One sentence. No numbers in hero size. No icons. No secondary stats. The text IS the slide.

### Demo Content
> *"You code by day and write fiction by night. 73% of your creative writing happens after 10 PM. You're two different people."*

### Design Upgrade Ideas
<!-- 
YOUR NOTES HERE — What should this slide feel like? 
Color? Typography? Animation? What's the vibe?
What makes someone stop and say "how did it know that?"
-->



---

## Slide 2: Year at a Glance

### Current State
Currently split across **two separate slides**: Slide 1 (total conversations count-up) and Slide 2 (total messages count-up with user/AI breakdown, trend chart). Both are stat-heavy with progress bars, micro-stats, and gradient text.

**Existing files:**
- `slides/slide-01-conversations.html`, `css/slides/slide-01-conversations.css`
- `slides/slide-02-messages.html`, `css/slides/slide-02-messages.css`

### Redesign Target
**One slide** that consolidates the key numbers. Three hero numbers (days, conversations, messages) + one human-truth subline. No progress bars, no breakdowns, no trend charts. The numbers speak for themselves.

### Demo Content
- **312** days · **1,427** conversations · **8,934** messages
- *"You didn't just use ChatGPT — you made it part of how you think."*

### Design Upgrade Ideas
<!-- 
YOUR NOTES HERE — How should the numbers be arranged?
Stacked vertically? Horizontal? Size hierarchy?
What makes this feel like a "wow" moment instead of a report?
-->



---

## Slide 3: Usage Over Time

### Current State
Slide 8 ("Your ChatGPT Journey") has a line chart with area fill, grid lines, axis labels, hover tooltips, time range buttons, and metric cards below. It's interactive and data-dense — a dashboard, not a poster.

**Existing files:**
- `slides/slide-08-evolution.html`, `css/slides/slide-08-evolution.css`
- `js/slides/slide-08-evolution.js`

### Redesign Target
A **single smooth curve** — the silhouette of their year. No axis labels. No gridlines. No data points. No tooltips. No interactivity. Just the shape. The user sees the rise and fall and recognizes their own year in the curve.

### Demo Content
Monthly data plotted as a smooth curve: 40 → 55 → 72 → 98 → 115 → 130 → 155 → 180 → 165 → 148 → 140 → 129. Small caption: *"Your year, in one shape."*

### Design Upgrade Ideas
<!-- 
YOUR NOTES HERE — What should the curve look like?
Thick line? Thin? Gradient fill underneath? Glow effect?
Should it animate (draw itself)? What color?
-->



---

## Slide 4: The Heatmap

### Current State
Slide 14 is already a GitHub-style heatmap — and it's well-built. But it has: a title with emoji icon, subtitle, month labels, day labels, a legend, stat cards below (active days, longest streak, % of days), and a "busiest day" highlight card. Too much on one slide.

**Existing files:**
- `slides/slide-14-heatmap.html`, `css/slides/slide-14-heatmap.css`
- `js/slides/slide-14-heatmap.js`

### Redesign Target
**Just the grid.** No title, no labels, no legend, no stat cards, no highlight callout. The visual speaks for itself. One small caption below. The heatmap fills 80%+ of the slide.

### Demo Content
52×7 grid. Generate realistic activity data from the monthly counts. Small caption: *"Every day you showed up."*

### Design Upgrade Ideas
<!-- 
YOUR NOTES HERE — Keep the existing grid rendering logic?
Change cell colors? Cell size? Remove all chrome around it?
Should cells be rounded or square? Glow on active cells?
Animation: fill in block by block, or all at once?
-->



---

## Slide 5: Trajectory

### Current State
Slide 8 ("Evolution") has a "Then vs Now" section at the bottom with early topics → recent topics, but it's buried under a chart, metric cards, and a time range selector. The trajectory insight doesn't have its own slide.

**Existing files:**
- `slides/slide-08-evolution.html` — The "Early Days → Now" section at the bottom
- `css/slides/slide-08-evolution.css`

### Redesign Target
**Its own dedicated slide.** A visual arc: "Python basics → Machine learning → Deploying models" with a narrative underneath. The arc is the hero element. The narrative is the subline.

### Demo Content
- Arc: **Python basics** → **Machine learning** → **Deploying ML models**
- *"You went from 'how do I write a for loop' to deploying ML models. 9 months. That's not learning — that's a transformation."*

### Design Upgrade Ideas
<!-- 
YOUR NOTES HERE — How should the arc be visualized?
Arrows? Timeline? Steps? Horizontal or vertical?
Font treatment for each stage? Animation (sequential reveal)?
-->



---

## Slide 6: Behavioral Split

### Current State
Slide 7 ("When You Think") has a day/night breakdown with a 24-hour clock wheel, emoji icons, bar charts, and a "Night Owl" badge. It shows the time pattern but in a dashboard style with many competing elements.

**Existing files:**
- `slides/slide-07-time-personality.html`, `css/slides/slide-07-time-personality.css`
- `js/slides/slide-07-time-personality.js`

### Redesign Target
**A single statement.** No clock wheel, no bar charts, no badges. Just the behavioral insight as text. This is a "how did it know?" slide — the words carry all the impact.

### Demo Content
> *"You code during the day and write fiction at night. 73% of your creative writing happens after 10 PM."*

### Design Upgrade Ideas
<!-- 
YOUR NOTES HERE — Pure text, or add a subtle visual element?
Split screen (day/night halves)? Color gradient shift?
How to make a text-only slide feel dynamic and not boring?
-->



---

## Slide 7: Life Event

### Current State
**No equivalent.** Life event detection is entirely new. Nothing in the current slides surfaces topic velocity spikes or "something happened" moments.

### Redesign Target
A single statement about a detected topic spike and its resolution. Playful, never invasive. A wink, not a therapy session.

### Demo Content
> *"23 interview-prep conversations in September. Then zero in October. We don't know what happened — but something did."*

### Design Upgrade Ideas
<!-- 
YOUR NOTES HERE — What's the emotional tone?
Should "23" and "zero" be highlighted somehow?
What color palette fits a "life event" moment?
Animation: reveal the twist ("then zero") with a pause?
-->



---

## Slide 8: Growth

### Current State
Slide 8 ("Evolution") has metric delta cards (+21% messages/week, +45% avg length) but they're small comparison cards, not a hero moment. The growth insight is buried.

**Existing files:**
- `slides/slide-08-evolution.html` — The metric delta cards
- `css/slides/slide-08-evolution.css`

### Redesign Target
A **before/after comparison** that IS the visual. A small "42" (early) next to a massive "247" (recent). The size difference between the two numbers tells the story.

### Demo Content
- Early: **42** chars → Recent: **247** chars
- *"Your messages grew 5.9x. You didn't just learn to use AI — you learned how to think with it."*

### Design Upgrade Ideas
<!-- 
YOUR NOTES HERE — How extreme should the size contrast be?
42 in tiny faded text vs 247 in massive bold white?
Side by side or stacked? Labels ("Early you" / "Recent you")?
Animation: 42 appears first, then 247 grows into frame?
-->



---

## Slide 9: Top Topics

### Current State
Slide 3 ("Topics") has a hero #1 topic with emoji icon, a grid of additional topic cards, and a "topic diversity" meter at the bottom. Slide 9 ("Themes") is a separate theme visualization. Too much spread across two slides.

**Existing files:**
- `slides/slide-03-topics.html`, `css/slides/slide-03-topics.css`
- `slides/slide-09-themes.html`, `css/slides/slide-09-themes.css`

### Redesign Target
**One clean list.** #1, #2, #3 — that's it. No cards, no meter, no diversity indicator, no emoji. Large type, numbered, ranked.

### Demo Content
> **#1** Coding · **#2** Writing · **#3** Career

### Design Upgrade Ideas
<!-- 
YOUR NOTES HERE — Vertical list or horizontal?
How big should the rank numbers be vs topic names?
Accent color on rank numbers? Staggered animation?
Include conversation counts next to each? Or just names?
-->



---

## Slide 10: Peak Moment

### Current State
The heatmap slide (14) has a "Busiest day" highlight card at the bottom, but it's a small callout, not a hero moment. The peak day doesn't have its own slide.

**Existing files:**
- `slides/slide-14-heatmap.html` — The busiest day highlight card

### Redesign Target
**Its own slide.** The date in hero type. The count prominent. A narrative subline that tells the story of that day.

### Demo Content
- **October 15** (hero size)
- **23 conversations**
- *"Every single one was about system design. You were locked in."*

### Design Upgrade Ideas
<!-- 
YOUR NOTES HERE — How to make a date feel dramatic?
Date in massive type? The count below it?
What color palette fits a "peak moment"?
Animation: date appears, then count, then narrative?
-->



---

## Slide 11: Conversation Depth

### Current State
**No direct equivalent.** The current slides show total conversations and total messages but never show "messages per conversation" as a hero metric, and never benchmark it against other users.

### Redesign Target
The user's average messages per conversation as a hero number, with a comparison to the population average and a "Top X%" badge.

### Demo Content
- **19** (hero number — their avg messages per conversation)
- *"Most people ask a question and leave. You stay for 19 messages. You don't just ask — you think out loud."*
- Badge: **Top 3%**

### Design Upgrade Ideas
<!-- 
YOUR NOTES HERE — How to display the benchmark badge?
Small rounded pill? Corner badge? Integrated into the text?
Should the comparison ("most people: 5") be explicit or just narrative?
How prominent is the "Top 3%" badge?
-->



---

## Slide 12: Your Benchmark

### Current State
**No equivalent.** The current system has no benchmark comparisons at all — no percentiles, no "top X%", no population comparisons.

### Redesign Target
The user's strongest benchmark — a percentile position, a hero stat, and a minimal visual showing where they stand.

### Demo Content
- *"You showed up more consistently than 95% of ChatGPT users."*
- **47-day streak** (hero number)
- A minimal position indicator (a dot on a line at the 95th percentile)

### Design Upgrade Ideas
<!-- 
YOUR NOTES HERE — How to visualize the percentile?
Horizontal bar with a dot? Radial gauge? Just text?
What makes "top 5%" feel like an achievement, not a stat?
How does this differ from the depth slide (11)?
-->



---

## Slide 13: Fun Facts

### Current State
Slide 13 ("Cosmic Revelations") is a horizontal scrolling carousel of fun fact cards with a cosmic/stars background, flip animations, and a "swipe to explore" hint. The fun facts are generated by the LLM.

**Existing files:**
- `slides/slide-13-fun-facts.html`, `css/slides/slide-13-fun-facts.css`
- `js/slides/slide-13-fun-facts.js`

### Redesign Target
**No carousel.** 2–3 quirky lines stacked vertically on one screen. The humor comes from specificity, not from flashy card UI. Each fact should make you laugh because it's so oddly specific.

### Demo Content
> *"Your longest conversation was 147 messages. At 3 AM. On a Tuesday. About fonts."*  
> *"You've typed more words to ChatGPT than most people write in a year."*  
> *"October 15th alone had more conversations than most users have in a month."*

### Design Upgrade Ideas
<!-- 
YOUR NOTES HERE — How should the 3 facts be laid out?
All visible at once, or staggered reveal?
Same font size or varied? Spacing between them?
Should the punchline words be highlighted?
-->



---

## Slide 14: The Compliment

### Current State
Slide 15 ("The Verdict") has both a roast card and a compliment card — two glass-morphism cards with quote marks, confidence meters, and "based on X messages analyzed" footers. The roast is being removed.

**Existing files:**
- `slides/slide-15-roast-compliment.html`, `css/slides/slide-15-verdict.css`
- `js/slides/slide-15-verdict.js`

### Redesign Target
**Just the compliment.** One genuine, earned statement with real numbers. No card chrome, no confidence meter, no quote marks. A warm emotional beat.

### Demo Content
> *"In January you asked 'how do I write a for loop.' By December you were deploying machine learning models. You didn't just learn to code — you became a different engineer."*

### Design Upgrade Ideas
<!-- 
YOUR NOTES HERE — What's the emotional tone?
Warm amber background? Slow animation?
How big should the text be? (It's a longer statement.)
Should it feel like the climax of the experience?
-->



---

## Slide 15: Your Year, One Line

### Current State
**No equivalent.** The current slides don't have a "closing line" or essay-ending moment.

### Redesign Target
A single sentence. Centered. The closing line of an essay about this person. Dramatic pause feel.

### Demo Content
> *"The year you became someone who thinks with AI — and never looked back."*

### Design Upgrade Ideas
<!-- 
YOUR NOTES HERE — How to make one sentence feel like a finale?
Extra white space? Slow fade? Long pause before it appears?
Should it feel like the last page of a book?
What palette closes out the experience before the share screen?
-->



---

## Slide 16: Share

### Current State
Slide 18 ("Share") has a "That's a wrap!" title, summary stats, share buttons (Create Video, Save Image, Share on X, Start Over), and a #ChatGPTWrapped hashtag. Sparkle background.

**Existing files:**
- `slides/slide-18-share.html`, `css/slides/slide-18-share.css`
- `js/slides/slide-18-share.js`

### Redesign Target
A **share card preview** (showing the hook + top stat in a story-formatted rectangle) with a prominent share button below it. The card preview shows what the user would share.

### Demo Content
- Share card preview showing: the hook line + "Top 3% conversation depth" + "ChatGPT Wrapped 2025"
- **Share** button (large CTA)
- Small text: *"Share your Wrapped"*

### Design Upgrade Ideas
<!-- 
YOUR NOTES HERE — What should the share card preview look like?
A phone-shaped card in the center? Instagram Story aspect ratio?
How prominent is the Share button? Color? Size?
Keep "Create Video" and "Save Image" or just one share action?
-->



---

## Task Order & Approach

**Recommended build order:** Start with the slides that have the most existing code to build on, then move to the new ones.

| Priority | Slide | Reason |
|----------|-------|--------|
| 1 | Slide 4 (Heatmap) | Strongest existing implementation — strip it down |
| 2 | Slide 2 (Year at a Glance) | Consolidate existing stat slides 1+2 |
| 3 | Slide 3 (Usage Over Time) | Simplify existing evolution chart |
| 4 | Slide 9 (Top Topics) | Simplify existing topics slide |
| 5 | Slide 13 (Fun Facts) | Simplify existing carousel |
| 6 | Slide 16 (Share) | Evolve existing share slide |
| 7 | Slide 14 (Compliment) | Extract from existing verdict slide |
| 8 | Slide 1 (The Hook) | New — text only, simple to build |
| 9 | Slide 6 (Behavioral Split) | New — text only |
| 10 | Slide 7 (Life Event) | New — text only |
| 11 | Slide 15 (Year One Line) | New — text only |
| 12 | Slide 5 (Trajectory) | New — needs arc visualization |
| 13 | Slide 8 (Growth) | New — needs before/after visual |
| 14 | Slide 10 (Peak Moment) | New — hero date + count |
| 15 | Slide 11 (Conversation Depth) | New — hero number + badge |
| 16 | Slide 12 (Your Benchmark) | New — percentile visualization |

After all 16 are built individually, wire them together with swipe navigation and dot indicators.

---

## Existing Files Reference

| Existing File | Maps To New Slide(s) | Relationship |
|---------------|---------------------|-------------|
| `slide-01-conversations` | Slide 2 (Year at a Glance) | Consolidate into |
| `slide-02-messages` | Slide 2 (Year at a Glance) | Consolidate into |
| `slide-03-topics` | Slide 9 (Top Topics) | Simplify |
| `slide-04-identity` | **REMOVED** | Hook replaces it |
| `slide-05-obsession` | **REMOVED** | Absorbed into Topics |
| `slide-07-time-personality` | Slide 6 (Behavioral Split) | Drastically simplify |
| `slide-08-evolution` | Slides 3, 5, 8 | Split & simplify |
| `slide-09-themes` | Slide 9 (Top Topics) | Merge with slide-03 |
| `slide-10-gallery` | **REMOVED** | Not in new design |
| `slide-13-fun-facts` | Slide 13 (Fun Facts) | Simplify |
| `slide-14-heatmap` | Slide 4 (Heatmap) | Strip down |
| `slide-15-roast-compliment` | Slide 14 (Compliment) | Remove roast, keep compliment |
| `slide-16-achievements` | **REMOVED** | Absorbed into benchmarks |
| `slide-17-word-bubbles` | **REMOVED** | Not in new design |
| `slide-18-share` | Slide 16 (Share) | Evolve |
