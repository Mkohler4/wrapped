# ChatGPT Wrapped V2 — Product Workflow

> **Status:** Draft  
> **Date:** February 11, 2026  
> **Purpose:** The definitive beat-by-beat specification of what the user sees and experiences. Every beat maps to required data, animation, and LLM output. This is the source of truth for build tasks.

---

## Overview

The experience is a **continuous cinematic sequence** inside a fake ChatGPT editor. The user watches a scripted interaction where they "ask" ChatGPT for their Wrapped and receive animated data reveals as responses. The sequence plays automatically but supports pause/replay.

**Total beats:** 24  
**Target duration:** 45–70 seconds (varies by data density)  
**Format:** Editor-native (desktop), full-screen (mobile)

---

## Beat-by-Beat Specification

### Beat 1: Idle Editor

**What the user sees:** A ChatGPT editor appears. Empty chat. Welcome screen ("What can I help with?"). Cursor blinks in the input field.

**Duration:** ~1.5s  
**Animation:** Fade in editor shell. Cursor blink (530ms on/off).  
**Data required:** None  
**LLM output used:** None

**Technical notes:**
- The editor shell renders: header (model selector, sidebar toggle, new chat), main area (welcome), footer (input field, send button)
- Sidebar is closed
- All editor chrome at full opacity

---

### Beat 2: Type & Send

**What the user sees:** Text types into the input field: *"Give me my 2025 ChatGPT Wrapped"*. The editor zooms in on the input area as typing begins. A fake mouse cursor appears, travels to the send button, and clicks it. The message becomes a user bubble (right-aligned). Editor zooms back out.

**Duration:** ~4s  
**Animation:**
- Character-by-character typing (~44ms/char, +85ms on spaces, +150ms pause after "2025")
- Editor `scale(1.6) translateY(-12%)` on first character
- Fake cursor arc to send button (0.6s cubic-bezier)
- Button press/release/ripple effect
- Zoom out to normal
- Text slides up into user bubble (right-aligned, `rgba(255,255,255,0.08)` background)

**Data required:** None  
**LLM output used:** None

---

### Beat 3: AI Response (The Hook)

**What the user sees:** Three pulsing dots appear (AI thinking). Then the AI response streams in word-by-word — the **hook insight**. This is the first personalized moment. The response wraps into a styled bubble.

**Duration:** ~4s  
**Animation:**
- Thinking dots: 3 dots pulse in sequence (1.5s normal, 0.5s intensified)
- Word-by-word streaming (~55ms/word with jitter)
- Accent-colored key phrases (numbers, key terms)
- Response wraps into bubble with background animation

**Data required:** `hook.statement` — the #1 behavioral insight  
**LLM output used:** The hook statement from WrappedInsightsV3

**Example content:**
> "You code by day and write fiction by night. **73%** of your creative writing happens after **10 PM**. You're two different people."

**Quality bar:** Must be a behavioral pattern or trajectory. Must reference specific data. Must create a "how did it know?" moment.

---

### Beat 4: Generate Image

**What the user sees:** After the hook text, the AI "generates" an image — a visual representation of the user's ChatGPT usage pattern. The image appears in the response area, loading progressively (like DALL-E generation).

**Duration:** ~3s  
**Animation:**
- Image placeholder shimmer → progressive reveal (top-to-bottom or blur-to-sharp)
- Image represents usage patterns (abstract or diagrammatic)

**Data required:** `usageImage.prompt` or a pre-selected image based on usage archetype  
**LLM output used:** Image generation prompt (optional — could be template-based)

**Fallback:** If image generation is skipped/unavailable, hold on the hook text for an extra beat, then proceed to Beat 5 as a zoom on a generated time-of-day diagram.

---

### Beat 5: Zoom In on Image

**What the user sees:** The camera zooms into the generated image. As the zoom settles, the image reveals itself to be a diagram of *when* they use ChatGPT — time-of-day distribution, frequency patterns. The diagram elements become readable at zoom.

**Duration:** ~3s  
**Animation:**
- `scale()` increase on editor, centered on the image
- Image diagram elements fade in labels/annotations as zoom settles
- Could be a radial clock, hour-bar chart, or abstract time pattern

**Data required:** `usageImage.timeDistribution` (24 hourly values), `peakHours`  
**LLM output used:** None (data visualization)

**Design notes:** The diagram should be beautiful first, informative second. Think of it as an abstract art piece that happens to encode time-of-day usage.

---

### Beat 6: Zoom Out

**What the user sees:** Camera pulls back to show the full editor. The image sits in the chat alongside the hook text.

**Duration:** ~1.5s  
**Animation:** `scale(1)` on editor. Smooth ease-out.  
**Data required:** None  
**LLM output used:** None

---

### Beat 7: Scroll Down Messages (Cascade)

**What the user sees:** The chat begins scrolling down. Ghost message bubbles cascade in rapidly — hundreds of them, alternating left (AI) and right (user). Some are featured (contain real text snippets). Messages blur and compress. A gradient overlay fades in over the blurred messages.

**Duration:** ~5s  
**Animation:**
- Ghost bubbles created in rapid succession (200 bubbles over 4.8s)
- Asymmetric easing: slow ramp-up, fast cruise, quick ease-out
- Bubbles vary in width (30-85%), height (12-20px), opacity
- ~15% are "featured" — contain real sample text, slightly taller
- Editor footer fades out at ~30% through
- At end: messages blur (`filter: blur`) and gradient overlay appears

**Data required:** `totalMessages` (determines cascade density), sample user/AI message snippets  
**LLM output used:** None

**Technical notes:**
- Use `will-change: filter, opacity` for GPU promotion
- Estimate scroll height from bubble count — no `scrollHeight` reads during animation
- Featured messages come from sample conversation snippets

---

### Beat 8: Show Messages Count

**What the user sees:** A hero stat appears over the blurred messages: the total message count in massive type. Counts up from 0. Below it: You/ChatGPT split with individual counts.

**Duration:** ~4s  
**Animation:**
- Ambient glow (`radial-gradient`) fades in behind the number
- Hero number counts up (ease-out cubic, 1.8s)
- "messages in 2025" label fades in after count completes
- You/ChatGPT split slides up, both counts animate simultaneously (1.2s)
- Hold for 2.5s

**Data required:** `yearAtAGlance.totalMessages`, `yearAtAGlance.userMessages`, `yearAtAGlance.aiMessages`  
**LLM output used:** None

**Example content:**
- **20,000** messages in 2025
- **8,000** You · **12,000** ChatGPT

---

### Beat 9: Show Conversations

**What the user sees:** The hero number morphs from the total messages count down to the conversation count. The label cross-fades from "messages in 2025" to "conversations in 2025".

**Duration:** ~3s  
**Animation:**
- You/ChatGPT split fades out (0.5s)
- Hero number counts down to conversation count (1.2s, ease-in)
- Label cross-fades (0.3s fade out, 0.4s fade in)
- Subtle glow color shift
- Hold for 2.5s

**Data required:** `yearAtAGlance.totalConversations`  
**LLM output used:** None

**Example content:**
- **20,000** → **847** conversations in 2025

---

### Beat 10: Click on Conversations Button

**What the user sees:** The stat and message backdrop scroll away with a parallax effect (content slides down as if the viewport is panning up). The fake cursor appears, travels to the sidebar toggle button (top-left), and clicks it.

**Duration:** ~3s  
**Animation:**
- Stat display: `translateY(80%) scale(0.92)`, fades out (2.2s)
- Backdrop messages: `translateY(70%)`, delayed fade (starts 1.6s in)
- Backdrop gradient: fades (2s)
- Fake cursor appears mid-screen, travels to sidebar button (1.1s)
- Button click animation (press/release, 0.27s)
- Cursor disappears

**Data required:** None  
**LLM output used:** None

---

### Beat 11: Organize Conversations

**What the user sees:** The sidebar slides open with a conversation list. Items stagger in. Each conversation gets color-highlighted by topic. Then conversations are "pulled out" one by one — like dealing cards — and organized into topic columns in the main area.

**Duration:** ~5s  
**Animation:**
- Sidebar slides in from left (0.3s)
- Conversation items stagger in (40ms apart)
- Topic color-highlighting: colored left borders + background tint (70ms per item)
- Card-dealing: each item cloned, original collapses, clone flies to topic column (120ms stagger)
- Topic column labels appear above each group (80ms stagger)
- Sidebar closes after organization (0.6s)
- Clones re-center after sidebar closes (0.5s)

**Data required:** `topicBreakdown.topics[]` with `name`, `color`, `sampleTitles[]`  
**LLM output used:** None

**Design notes:**
- Topic colors: Coding=purple, Writing=orange, Learning=blue, Career=green, Lifestyle=pink
- Sample titles should be real conversation titles from the user's data
- The card-dealing effect is the signature moment — conversations physically moving from a list to organized groups

---

### Beat 12: Show Topic Diversity

**What the user sees:** The organized conversation clones merge into topic bars. Each topic's clones collapse to one position, shrink, and become a colored bar. The bars reposition into a horizontal bar chart. Bars grow proportionally with overshoot easing. Labels appear: rank number, topic name, count. Subline: "Your most talked-about topics in 2025".

**Duration:** ~4s  
**Animation:**
- Clones merge: all clones per topic collapse to same Y, shrink to 8px height (0.5s)
- Extra clones removed, one bar per topic remains
- Bars reposition into vertical chart layout (0.6s)
- Bars grow proportionally with `cubic-bezier(0.34, 1.56, 0.64, 1)` overshoot (300ms stagger)
- Rank labels (#1, #2…), topic names, count badges stagger in (50ms + 150ms per row)
- Subline fades in (0.3s)
- Hold for 3s

**Data required:** `topicBreakdown.topics[]` with counts, ranked by count descending  
**LLM output used:** None

**Example content:**
- #1 Coding (5) · #2 Writing (3) · #3 Learning (3) · #4 Career (1) · #5 Lifestyle (1)
- *"Your most talked-about topics in 2025"*

---

### Beat 13: Show Growth Prompt

**What the user sees:** The bar chart collapses (bars shrink, labels fade). The editor footer returns. A fake cursor moves to the input field and clicks. Text types: "Show me my growth in [top topic]". Cursor moves to send, clicks. Message becomes a user bubble.

**Duration:** ~4s  
**Animation:**
- Bars shrink to 0, labels fade (0.3s + 0.5s)
- Footer restored (opacity fade in, 0.4s)
- Cursor appears mid-screen, travels to input (0.6s)
- Input click animation
- Typing animation (~44ms/char)
- Cursor to send, click, zoom out, bubble appears

**Data required:** `growth.topTopic` — for the prompt text  
**LLM output used:** None

**Example prompt:** *"Show me my growth in Coding"*

---

### Beat 14: Generate Facts & Line Graph

**What the user sees:** AI thinking dots → response streams in with a growth narrative. A line graph appears below the response (iOS-style: smooth Catmull-Rom curve, gradient fill, monthly labels). The line draws itself left-to-right. Key value callouts appear. The camera zooms in on the graph.

**Duration:** ~6s  
**Animation:**
- Thinking dots (0.8s normal + 0.4s intense)
- AI response streams word-by-word with accent-colored numbers
- Response wraps into bubble
- Graph container fades in below (0.4s)
- Line draws via `stroke-dashoffset` transition (1.5s)
- Area gradient fill fades in (1.2s, delayed 0.3s)
- Month labels stagger in (30ms each)
- Key value callouts fade in (120ms stagger)
- Camera zooms: `scale(1.3) translateY(offset)` (0.9s)
- Hold for 4s at zoom

**Data required:** `growth.monthlyData[]`, `growth.narrative`, `growth.growthMultiplier`, `growth.trajectory`  
**LLM output used:** `growth.narrative` — the AI-written growth story

**Example content:**
- *"You started with **40 conversations** in January. By August you hit **180**. You didn't just use ChatGPT more — you made it part of how you think. **4.5x growth** in 8 months."*
- Line graph: Jan:40 → Feb:55 → Mar:72 → … → Aug:180 → … → Dec:129

---

### Beat 15: Break Into Heatmap + Fact

**What the user sees:** The line graph's data points break apart. Individual points transform into heatmap cells. A GitHub-style activity grid (52×7) forms — cells fill in with staggered animation, colored by intensity. A fact about their usage pattern appears alongside.

**Duration:** ~4s  
**Animation:**
- Graph data points explode outward, reform as grid cells
- OR: graph fades, heatmap cells fill in block-by-block (4ms per cell, left to right)
- Fact text fades in below or beside the heatmap
- Hold for 2.5s

**Data required:** `heatmap.dailyActivity[]` (365 values), `heatmap.fact`, `heatmap.longestStreak`, `heatmap.busiestDay`  
**LLM output used:** `heatmap.fact`

**Example fact:** *"47-day streak starting June 3rd. You didn't miss a single day."*

---

### Beat 16: Scroll Back Up Messages

**What the user sees:** The heatmap dissolves. The view scrolls back up through the message history — past the earlier conversations, past the hook. A transition beat that returns to the message context.

**Duration:** ~2s  
**Animation:** Smooth scroll up. Ghost messages briefly visible during scroll. Content blurs slightly during motion.  
**Data required:** None  
**LLM output used:** None

---

### Beat 17: Collect Words

**What the user sees:** As the scroll passes through the messages, individual words start to "pull out" — key terms, frequently used words detach from the ghost message bubbles and float freely. Words drift upward and gather.

**Duration:** ~3s  
**Animation:**
- Words emerge from message positions with slight randomness
- Each word has a subtle glow or highlight
- Words drift upward with slight physics (varying speeds, slight wobble)
- 15-25 words extracted total

**Data required:** `wordCloud.words[]` — most frequently used words/terms  
**LLM output used:** None

---

### Beat 18: Bubble Words & Scale

**What the user sees:** The floating words form a bubble cloud. Each word is enclosed in a bubble/pill that scales proportionally to its frequency. The cloud arranges and settles into a balanced layout. The most-used word is prominently large in the center.

**Duration:** ~3s  
**Animation:**
- Words acquire bubble/pill containers
- Bubbles scale up/down based on frequency (CSS scale transforms)
- Physics-based arrangement: bubbles settle into stable positions
- OR: grid/cluster layout with size variation
- Top word pulses or glows

**Data required:** `wordCloud.words[]` with `frequency` values, `wordCloud.topWord`  
**LLM output used:** None

---

### Beat 19: Words Drop Off

**What the user sees:** The word bubbles begin falling off the bottom of the screen. They drop in cascading groups — some fast, some slow, with a slight bounce or splash effect. The screen clears.

**Duration:** ~2s  
**Animation:**
- Bubbles fall with gravity-like easing (accelerating downward)
- Staggered: center bubbles first, then edges (or random)
- Slight rotation on each bubble as it falls
- Brief "splash" or fade at screen edge
- Screen ends clean/empty

**Data required:** None  
**LLM output used:** None

---

### Beat 20: Click on Profile

**What the user sees:** A fake cursor appears and clicks on a profile button/icon (in the header or sidebar area). A profile card/panel slides in. An animation plays — a "scanning" or "reading" effect rolls across the profile content, as if the AI is analyzing the user. The profile reveals personality insights, usage style, key traits, and fun facts.

**Duration:** ~5s  
**Animation:**
- Cursor travels to profile button, clicks
- Profile panel slides in from right (or center modal)
- Scanning effect: a horizontal light bar sweeps top-to-bottom
- Content reveals in sections (personality → style → traits → facts), staggered
- Each trait/fact has a subtle entrance animation

**Data required:** `profile.personality`, `profile.usageStyle`, `profile.keyTraits[]`, `profile.funFacts[]`  
**LLM output used:** All profile fields — LLM-generated personality analysis

**Example content:**
- **Personality:** "The Builder — You don't just ask questions, you construct solutions."
- **Style:** "You write long, detailed prompts with context. You think out loud."
- **Traits:** "Night owl", "Deep diver", "Multi-disciplinary"
- **Fun facts:** "Your longest conversation: 147 messages, 3 AM, about fonts."

**Quality bar:** The profile must be substantive — not generic labels like "The Curious Mind." Every trait should be backed by data.

---

### Beat 21: Close Profile

**What the user sees:** The profile panel closes/dismisses. Slide-out animation.

**Duration:** ~1s  
**Animation:** Panel slides out (reverse of entrance). Slight fade.  
**Data required:** None  
**LLM output used:** None

---

### Beat 22: Click on Images

**What the user sees:** A fake cursor clicks on an images/gallery button. The user's DALL-E generated images take center stage — expanding from a grid or fan layout to fill the main area. A count appears: "X images generated in 2025".

**Duration:** ~4s  
**Animation:**
- Cursor travels to images button, clicks
- Images appear from a central point, fanning out or expanding in a grid
- Each image has a slight tilt/rotation for visual interest
- Image count appears with count-up animation
- Hold for 2s

**Data required:** `images.totalGenerated`, `images.highlights[]` (image references)  
**LLM output used:** None

**Fallback:** If no DALL-E images exist, skip this beat entirely. The sequence engine handles the jump gracefully.

---

### Beat 23: Animate to Conclusion — Trophy Room

**What the user sees:** The images contract/fade. A trophy room appears — a curated display of achievements, benchmark badges, and milestones. Think of it as a hall of fame or achievement shelf. Each badge animates in with a satisfying "unlock" effect. Below the badges: the compliment (an earned, specific statement about who they were this year). Then: the "year in one line" — the closing sentence.

**Duration:** ~5s  
**Animation:**
- Images contract to center, fade
- Trophy room layout appears (shelf, grid, or card layout)
- Badges animate in one-by-one (300ms stagger): scale up with slight bounce
- Each badge has: icon/visual + label + "Top X%" + the metric
- Compliment text fades in below badges (0.6s)
- Year-in-one-line fades in last — slow, deliberate (0.8s)
- Hold for 3s

**Data required:** `trophyRoom.achievements[]` (with `label`, `percentile`, `userValue`, `avgValue`), `trophyRoom.compliment`, `trophyRoom.yearOneLine`  
**LLM output used:** `trophyRoom.compliment`, `trophyRoom.yearOneLine`

**Example content:**
- 🏆 **Deep Diver** — Top 3% conversation depth (19 avg vs 5 avg)
- 🏆 **Streak Machine** — Top 5% (47-day streak)
- 🏆 **Night Owl** — Top 5% (34% activity after 10 PM)
- *"In January you asked 'how do I write a for loop.' By December you were deploying ML models. You didn't just learn to code — you became a different engineer."*
- *"The year you became someone who thinks with AI — and never looked back."*

---

### Beat 24: Share

**What the user sees:** The editor returns to its normal state. The trophy room content contracts and becomes a formatted share card sitting in the chat as the AI's "final response." The editor chrome (header, footer) returns to full opacity. A prominent Share button appears below the card.

**Duration:** ∞ (final state — user interacts)  
**Animation:**
- Trophy room contracts into a chat-sized share card (0.8s)
- Editor header and footer fade back in (0.5s)
- Share button appears with a gentle pulse animation
- The experience is "complete" — user can interact

**Data required:** Share card content = hook statement + top achievement + "ChatGPT Wrapped 2025"  
**LLM output used:** `hook.statement`, top achievement label

**User actions available:**
- **Share** — exports the share card as an image (Instagram Story format, 1080×1920)
- **Replay** — restarts the sequence from Beat 1
- **Explore** — opens a static view of all insights (optional)

---

## Timing Summary

| Act | Beats | Duration | Purpose |
|-----|-------|----------|---------|
| Act 1: The Hook | 1–4 | ~12s | Establish the editor metaphor, deliver the hook, generate image |
| Act 2: The Deep Dive | 5–12 | ~28s | Time-of-day, message count, conversations, topic organization |
| Act 3: Growth & Words | 13–18 | ~22s | Growth narrative, line graph, heatmap, word cloud |
| Act 4: Identity & Conclusion | 19–24 | ~17s | Profile, images, trophy room, share |
| **Total** | 24 beats | **~79s** | |

**Note:** Target is 50-70s. Beats can be shortened or skipped based on data availability. The sequence engine adjusts timing dynamically.

---

## Data Dependency Map

```
No data needed:
  Beat 1 (Idle), Beat 2 (Type), Beat 6 (Zoom out), Beat 10 (Click sidebar),
  Beat 16 (Scroll up), Beat 19 (Words drop), Beat 21 (Close profile)

hook.statement:
  Beat 3 (AI Response)

usageImage:
  Beat 4 (Generate Image), Beat 5 (Zoom In)

yearAtAGlance:
  Beat 7 (Cascade density), Beat 8 (Messages count), Beat 9 (Conversations count)

topicBreakdown:
  Beat 11 (Organize), Beat 12 (Topic diversity)

growth:
  Beat 13 (Prompt text), Beat 14 (Line graph + narrative)

heatmap:
  Beat 15 (Heatmap + fact)

wordCloud:
  Beat 17 (Collect words), Beat 18 (Bubble words)

profile:
  Beat 20 (Profile card)

images:
  Beat 22 (Image gallery)

trophyRoom:
  Beat 23 (Trophy room), Beat 24 (Share card)
```
