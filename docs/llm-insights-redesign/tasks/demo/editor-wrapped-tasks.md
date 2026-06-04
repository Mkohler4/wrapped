# The Editor Wrapped — Concept & Task List

> **The Big Idea:** The entire Wrapped experience lives inside a fake AI chat editor. The user "types" a prompt, the AI "generates" a response — and that response explodes out of the chat interface into a full-screen, cinematic insight experience. The chat editor is the stage. The insights are the performance.

---

## The Vision

Imagine opening the experience and seeing a familiar chat interface — dark background, input field at the bottom, blinking cursor. You watch as text types itself into the input: *"Give me my 2025 ChatGPT Wrapped."* The message sends. The AI thinking indicator pulses. Then — the response doesn't arrive as text. It **erupts** out of the response area. The first insight materializes, pushes the editor chrome to the edges, and takes over the entire screen as a bold, full-bleed poster.

From that moment, every insight flows as a connected sequence — each one emerging from the AI, taking the stage, then dissolving as the next one forms. The editor frame stays as a whisper in the background (a subtle top bar, a faint input field) — just enough to remind you that this is all happening inside a conversation.

The whole thing plays as a continuous video. But you can also navigate with dots, swipe, or arrows — and every transition reverses cleanly when you go backward.

**Why this works:**
- **It's meta.** You're asking ChatGPT to reflect on your ChatGPT usage. The editor IS the medium.
- **The generation moment creates tension.** The typing, the send, the thinking dots — it builds anticipation before the first reveal.
- **Transitions feel alive.** Instead of hard cuts between slides, each insight *generates* out of the previous one, like the AI is thinking in real time.
- **It's instantly shareable.** "Look what ChatGPT said about me" — the editor frame makes it feel like a real conversation.

---

## Architecture

### The Four Layers

```
┌─────────────────────────────────────────────────┐
│  1. EDITOR SHELL (always present, fades to BG)  │
│  ┌───────────────────────────────────────────┐  │
│  │  2. SCENE CANVAS (where insights appear)  │  │
│  │                                           │  │
│  │       [Current Scene / Insight]           │  │
│  │                                           │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │  3. TRANSITION LAYER (between scenes)     │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │  4. NAVIGATION (dots, controls)           │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

**Layer 1 — Editor Shell:** The fake chat interface. Starts prominent (intro sequence), then fades to a subtle frame once insights begin. Always present as a grounding element.

**Layer 2 — Scene Canvas:** Where each insight (slide) lives. Full-screen when active. Each scene is a self-contained component.

**Layer 3 — Transition Layer:** Handles the animation between scenes. Entrance animations (how a scene appears), exit animations (how it leaves), and the "generation" effect that connects them.

**Layer 4 — Navigation:** Dot indicators, swipe detection, keyboard arrows, autoplay timer.

### Key Principles

1. **Scenes are still separate in code.** Each insight is its own HTML/CSS/JS module — self-contained and independently buildable. The transition system connects them.
2. **Every animation is reversible.** Going backward plays the entrance animation in reverse (or plays a dedicated reverse animation). No forward-only effects.
3. **Video mode = autoplay.** The entire experience auto-advances on a timer, playing every entrance animation in sequence. Tapping/clicking pauses autoplay and switches to manual navigation.
4. **The editor is a metaphor, not a clone.** Inspired by a chat UI, but styled for Wrapped. Use the Wrapped color palette, not a literal ChatGPT screenshot.

---

## Hardcoded Demo Data

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
Top topics: #1 Coding (612), #2 Writing (298), #3 Career (187)
Trajectory: Python basics (Jan–Mar) → Machine Learning (Apr–Jun) → Deploying ML Models (Jul–Sep)
Correlation: Codes during day (78%), writes fiction at night (73% after 10 PM)
Life event: 23 interview-prep conversations in Sep, 0 in Oct
Growth: Avg message length 42 → 247 chars, 5.9x over 8 months
Benchmarks: Top 3% conversation depth, Top 5% streak, Top 5% night owl
Monthly conversations: Jan:40, Feb:55, Mar:72, Apr:98, May:115, Jun:130, Jul:155, Aug:180, Sep:165, Oct:148, Nov:140, Dec:129
```

---

## Task 0: The Editor Shell

### What It Is
The persistent fake chat editor frame that the entire experience lives inside. It starts as the full UI (intro sequence) and then recedes to a subtle frame once insights begin.

### Editor Elements

**Full editor (during intro):**
```
┌──────────────────────────────────────────┐
│ ● ● ●                     ChatGPT        │  ← Title bar (macOS-style dots + title)
├──────────────────────────────────────────┤
│                                          │
│                                          │
│  (empty chat area — dark, minimal)       │
│                                          │
│                                          │
│                                          │
├──────────────────────────────────────────┤
│  [  Message ChatGPT...              ↑ ]  │  ← Input field with blinking cursor
└──────────────────────────────────────────┘
```

**Receded editor (during insights):**
- Title bar shrinks to a thin, barely-visible line at the top (or fades to 10% opacity).
- Input field shrinks to a thin bar at the bottom (or fades out).
- The chat area becomes the full-screen scene canvas.
- The editor chrome is a whisper — just enough that if someone squints, they recognize "this is happening inside a chat."

### Visual Style
- Dark background: `#0f0f0f` or `#1a1a1a` (neutral, not saturated — the scenes bring the color).
- Input field: Rounded rectangle, dark gray border, subtle. Placeholder text: "Message ChatGPT..."
- Title bar: Minimal. Three colored dots (red/yellow/green) on the left. "ChatGPT" centered in muted text.
- No sidebar. This is the simplified, focused chat view.
- The editor itself uses the `Outfit` font to match the Wrapped aesthetic (not a system font clone).

### Design Upgrade Ideas
<!-- 
YOUR NOTES HERE — How much editor chrome should show during insights?
Should the title bar disappear entirely or stay as a thin strip?
Should the input field pulse/glow when transitioning between insights (like the AI is "thinking")?
What about a subtle sidebar with a "2025 Wrapped" conversation highlighted?
How literal vs. stylized should the editor be?
-->



---

## Task 1: The Intro Sequence

### What It Is
The opening animation that plays before any insights appear. This is the "cold open" — it sets the tone and builds anticipation. It should feel like watching someone (you) type a message and seeing the AI wake up to respond.

### The Sequence (Timed)

| Time | What Happens | Duration |
|------|-------------|----------|
| 0.0s | Editor appears. Empty chat. Cursor blinks in input field. | 1.0s pause |
| 1.0s | Text begins typing: "Give me my 2025 ChatGPT Wrapped" | 2.0s (character by character, ~40ms per char, natural pauses) |
| 3.0s | Typing stops. Brief pause. | 0.5s |
| 3.5s | The message "sends" — text moves up into the chat area as a user message bubble. Input field clears. | 0.4s |
| 3.9s | AI thinking indicator appears below the user message (three pulsing dots). | 1.5s |
| 5.4s | The thinking dots intensify — glow brighter, pulse faster. | 0.5s |
| 5.9s | **THE BREAK:** The AI response area erupts. The editor chrome pushes outward/fades. The first insight (The Hook) materializes from the center of where the response would be — expanding to fill the screen with color and text. | 1.0s |
| 6.9s | Slide 1 (The Hook) is fully visible. The experience has begun. | — |

**Total intro: ~7 seconds.**

### Typing Animation Details
- Characters appear one at a time, left to right.
- Speed: ~40ms per character, but with natural variation:
  - Slight pause (100ms) after spaces.
  - Slight pause (150ms) after "2025" (like the user is thinking).
  - No pause inside common words.
- Cursor: Blinking pipe `|` that moves with the text. Standard blink rate (530ms on/off).

### The "Send" Animation
- Text slides up from the input field into the chat area.
- Appears as a user message bubble (right-aligned, subtle background like `rgba(255,255,255,0.08)`, rounded corners).
- Input field fades back to empty state with the placeholder text.

### The AI Thinking Dots
- Three dots in a row, pulsing in sequence (like ChatGPT's actual thinking indicator).
- Left-aligned (AI response position).
- Start subtle, then accelerate/brighten as the response "builds."

### The Break / Eruption
This is the signature moment. The AI "response" doesn't arrive as text — it **breaks out** of the editor. Ideas for the eruption:
- A burst of particles/light from the response area that reform into the first insight.
- The editor frame cracks/shatters outward as color floods in from behind.
- A shockwave ripple from the center that pushes the editor chrome to the edges and reveals the insight behind it.
- The response text starts typing, then the letters dissolve into particles that swirl and reform as the Hook text in massive poster type.

**Pick ONE of these or invent something better.** The key is: the transition from "normal chat" to "wrapped experience" should be a surprise. The user should think they're getting a text response and then get something way more dramatic.

### Design Upgrade Ideas
<!-- 
YOUR NOTES HERE — What should the eruption/break moment feel like?
Particle explosion? Color flood? Shatter effect? Gentle expansion?
How dramatic vs. subtle? Think about what would make someone go "whoa."
Should there be a sound design element (even if we can't play audio, think about the visual rhythm)?
How fast or slow should the break happen?
-->



---

## Task 2: The Transition System

### What It Is
The animation layer that connects scenes (slides). Every transition must:
1. Exit the current scene.
2. Show a brief "generation" beat (the AI is producing the next insight).
3. Enter the next scene.
4. Be fully reversible.

### Transition Concept: "The AI Is Thinking"

Between every scene, there's a brief moment (300–500ms) where the editor reasserts itself — the current insight dissolves, a subtle pulse comes from the chat area (the AI is generating the next thought), and then the next insight materializes.

**Forward transition (Scene N → Scene N+1):**
```
Scene N fully visible
    ↓ (300ms) Scene N dissolves / contracts toward center
    ↓ (200ms) Brief "generation" pulse — a shimmer or glow at the center
    ↓ (300ms) Scene N+1 materializes / expands from center
Scene N+1 fully visible
```

**Backward transition (Scene N → Scene N-1):**
The reverse. Scene N contracts, pulse, Scene N-1 materializes. Should feel like "rewinding."

### Transition Variations (Optional)

Not every transition has to be identical. Some could be more dramatic:
- **After the Hook (Scene 1 → 2):** The hook text dissolves into particles that reform as the Year at a Glance numbers.
- **Into the Heatmap (→ Scene 4):** The previous insight's background desaturates and reveals the grid cells fading in behind it.
- **Into the Life Event (→ Scene 7):** A brief "pause" — longer than other transitions — as if the AI hesitated before this sensitive insight.
- **Into the Share (→ Scene 16):** The editor frame gradually comes back into full view, as if the conversation is wrapping up.

### Reversibility Rules

- **Every entrance animation has a corresponding exit.** If Scene 5 enters by expanding from center, it exits by contracting to center.
- **Dot navigation skips intermediate scenes** but still plays an abbreviated transition (not instant cut).
- **Arrow keys / swipe:** Play the full transition animation.

### Design Upgrade Ideas
<!-- 
YOUR NOTES HERE — What should the transition feel like?
Same transition for every scene, or varied?
How much should the editor frame show during transitions?
Should the "generation pulse" look like the AI thinking dots, or something new?
How long should transitions be? (Fast and snappy, or slow and cinematic?)
-->



---

## Task 3: Navigation & Video System

### What It Is
The controls that let the user move through the experience, plus the autoplay mode that plays it as a continuous video.

### Navigation Elements

**Dot indicators:**
- 18 dots total (1 intro + 16 scenes + 1 isn't needed since intro leads into scene 1... actually: 1 intro + 16 scenes = 17 positions, or just 16 dots for the insight scenes with the intro being a pre-sequence).
- Decision: **16 dots for the 16 insight scenes.** The intro plays once automatically and isn't navigable via dots.
- Current scene's dot is highlighted (accent color, slightly larger).
- Clicking a dot jumps to that scene (with abbreviated transition).
- Position: Fixed at the bottom, centered. Semi-transparent until hovered.

**Swipe:**
- Horizontal swipe left = next scene, right = previous scene.
- Touch events on mobile, mouse drag on desktop.

**Keyboard:**
- Right arrow / Down arrow = next scene.
- Left arrow / Up arrow = previous scene.
- Space = toggle autoplay.

**Autoplay (Video Mode):**
- Default: ON. The experience starts and auto-advances.
- Timing: Each scene stays visible for 4–6 seconds (varies by content density), then auto-transitions.
- The intro plays first (~7 seconds), then scenes auto-advance.
- Tapping anywhere or pressing any key pauses autoplay and switches to manual mode.
- A subtle "play" indicator (small, bottom corner) shows autoplay status.

### Reversibility

- Going backward must look intentional, not like a glitch.
- Scene exit animations play in reverse (CSS `animation-direction: reverse` or explicit reverse keyframes).
- The "generation pulse" between scenes plays in both directions.

### Design Upgrade Ideas
<!-- 
YOUR NOTES HERE — Should autoplay be default or opt-in?
How visible should the dots be? (Spotify Wrapped hides them until you interact.)
Should there be a progress bar instead of/in addition to dots?
Should autoplay have a visible timer per slide?
Keyboard shortcuts — anything beyond arrows?
-->



---

## Scenes (Slides)

Each scene below is a self-contained insight that lives on the Scene Canvas. It has:
- **Entrance animation:** How it materializes from the transition/editor.
- **Resting state:** What the user sees when the scene is fully visible.
- **Content:** The hardcoded text/data.
- **Background:** The full-bleed color that takes over during this scene.
- **Design Upgrade Ideas:** Your notes.

The scenes are numbered 1–16 and correspond to the 16 Wrapped insights.

---

### Scene 1: The Hook

**Entrance:** This is the first scene — it emerges directly from the intro eruption. The AI response area explodes with color and this text materializes from the particles/energy.

**Background:** Deep violet (`#1a0533`)

**Content:**
> *"You code by day and write fiction by night. 73% of your creative writing happens after 10 PM. You're two different people."*

**Resting State:** Single sentence, centered, massive type (28–32px bold white). Nothing else on screen. The editor frame is a whisper at the edges.

**Exit:** Text dissolves into points of light that stream downward, reforming as the numbers on the next scene.

**Current Codebase:** No direct equivalent. Replaces the old identity/personality slide (`slide-04-identity`).

**Design Upgrade Ideas**
<!-- 
YOUR NOTES HERE —
-->



---

### Scene 2: Year at a Glance

**Entrance:** Points of light from the Hook coalesce into the three hero numbers, counting up from zero.

**Background:** Electric blue (`#0c1445`)

**Content:**
- **312** days · **1,427** conversations · **8,934** messages
- *"You didn't just use ChatGPT — you made it part of how you think."*

**Resting State:** Three numbers in hero size (80–96px), stacked or in a row. Subline below (18px, white/70%). Count-up animation on the numbers.

**Exit:** Numbers scatter/dissolve, one streams upward to form the usage curve on the next scene.

**Current Codebase:** Consolidates `slide-01-conversations` + `slide-02-messages`.

**Design Upgrade Ideas**
<!-- 
YOUR NOTES HERE —
-->



---

### Scene 3: Usage Over Time

**Entrance:** A single point of light from the previous scene's numbers traces the curve from left to right, drawing the usage shape.

**Background:** Warm amber (`#3d1c00`)

**Content:** A smooth SVG curve (monthly data: 40→55→72→98→115→130→155→180→165→148→140→129). No axes, no labels, no gridlines. Small caption: *"Your year, in one shape."*

**Resting State:** The curve fills 80%+ of the width. Caption below in small white text.

**Exit:** The curve's data points become individual cells that rearrange into the heatmap grid.

**Current Codebase:** Simplified from `slide-08-evolution` (which has interactive chart, time range selector, metric cards).

**Design Upgrade Ideas**
<!-- 
YOUR NOTES HERE —
-->



---

### Scene 4: The Heatmap

**Entrance:** Cells materialize from the dissolving curve — staggered, 15ms per cell, scanning left to right.

**Background:** Forest green (`#052e16`)

**Content:** 52×7 grid of activity cells. Color intensity by activity level. No labels, no legend. Caption: *"Every day you showed up."*

**Resting State:** Clean grid filling the center of the screen. Caption below.

**Exit:** Cells compress and flow together into a horizontal line that becomes the trajectory arc arrow.

**Current Codebase:** Stripped-down `slide-14-heatmap` (remove title, labels, legend, stat cards, tooltip).

**Design Upgrade Ideas**
<!-- 
YOUR NOTES HERE —
-->



---

### Scene 5: Trajectory

**Entrance:** The compressed line from the heatmap exit splits into three segments, each labeling itself as a topic stage.

**Background:** Rich magenta (`#3b0764`)

**Content:**
- Arc: **Python basics** → **Machine learning** → **Deploying ML models**
- *"You went from 'how do I write a for loop' to deploying ML models. 9 months. That's not learning — that's a transformation."*

**Resting State:** Arc elements (three labels connected by → arrows) as hero visual. Narrative subline below.

**Exit:** The arc compresses into a split — left half and right half — setting up the behavioral split.

**Current Codebase:** The "Early Days → Now" section at the bottom of `slide-08-evolution`. Gets its own scene now.

**Design Upgrade Ideas**
<!-- 
YOUR NOTES HERE —
-->



---

### Scene 6: Behavioral Split

**Entrance:** Scene splits visually into two halves (day/night, warm/cool) and the text materializes.

**Background:** Ocean teal (`#042f2e`)

**Content:**
> *"You code during the day and write fiction at night. 73% of your creative writing happens after 10 PM."*

**Resting State:** Text centered. Possibly a subtle visual split (left half slightly warmer, right half slightly cooler) behind the text.

**Exit:** The two halves merge back into one, compressing into a concentrated point that expands as the life event.

**Current Codebase:** Drastically simplified from `slide-07-time-personality` (remove clock wheel, bar charts, badges).

**Design Upgrade Ideas**
<!-- 
YOUR NOTES HERE —
-->



---

### Scene 7: Life Event

**Entrance:** A concentrated pulse expands into the scene. Slight hesitation in the transition — like the AI paused before saying this.

**Background:** Hot pink / magenta (`#4a0028`)

**Content:**
> *"23 interview-prep conversations in September. Then zero in October. We don't know what happened — but something did."*

**Resting State:** Text centered. "23" and "zero" in accent color for emphasis.

**Exit:** The text fades, and two values (a small number and a large number) start to emerge — teasing the growth comparison.

**Current Codebase:** Entirely new. No existing equivalent.

**Design Upgrade Ideas**
<!-- 
YOUR NOTES HERE —
-->



---

### Scene 8: Growth

**Entrance:** A small "42" appears first (faded, small), then a massive "247" grows into frame beside/below it — the size difference IS the visual.

**Background:** Warm amber (`#451a03`)

**Content:**
- **42** chars (small, faded) → **247** chars (massive, bright)
- *"Your messages grew 5.9x. You didn't just learn to use AI — you learned how to think with it."*

**Resting State:** The before/after contrast is the dominant visual. Narrative subline below.

**Exit:** Both numbers merge into a single ranked list — #1, #2, #3 — morphing into the topics.

**Current Codebase:** Metric delta cards from `slide-08-evolution`. Gets its own scene now.

**Design Upgrade Ideas**
<!-- 
YOUR NOTES HERE —
-->



---

### Scene 9: Top Topics

**Entrance:** Numbers morph from the growth scene into the rank numbers (#1, #2, #3), and topic labels type themselves in beside each rank.

**Background:** Slate blue (`#1e1b4b`)

**Content:**
> **#1** Coding · **#2** Writing · **#3** Career

**Resting State:** Clean ranked list. Numbers in accent color (48px bold), names in white (36px). Stacked vertically.

**Exit:** The list collapses into a single highlighted date — October 15 — focusing attention.

**Current Codebase:** Simplified from `slide-03-topics` + `slide-09-themes` (remove cards, meter, diversity indicator).

**Design Upgrade Ideas**
<!-- 
YOUR NOTES HERE —
-->



---

### Scene 10: Peak Moment

**Entrance:** A date stamp materializes in hero type — dramatic, like a calendar page flipping to that day.

**Background:** Sunset orange (`#431407`)

**Content:**
- **October 15** (hero size, 48–64px)
- **23 conversations**
- *"Every single one was about system design. You were locked in."*

**Resting State:** Date dominates. Count below. Narrative as subline.

**Exit:** The "23" transforms into "19" (average depth) as the camera "zooms into" a single conversation.

**Current Codebase:** Expanded from the busiest-day highlight card in `slide-14-heatmap`. Gets its own scene now.

**Design Upgrade Ideas**
<!-- 
YOUR NOTES HERE —
-->



---

### Scene 11: Conversation Depth

**Entrance:** The "19" from the peak moment transition grows into hero size, and a "Top 3%" badge slides in.

**Background:** Electric blue (`#0f1d4e`)

**Content:**
- **19** (hero number, 96–120px)
- *"Most people ask a question and leave. You stay for 19 messages. You don't just ask — you think out loud."*
- Badge: **Top 3%**

**Resting State:** Hero number with badge. Narrative subline.

**Exit:** The "Top 3%" badge expands, and the percentile concept carries into the benchmark scene.

**Current Codebase:** Entirely new. No existing equivalent.

**Design Upgrade Ideas**
<!-- 
YOUR NOTES HERE —
-->



---

### Scene 12: Your Benchmark

**Entrance:** A horizontal line draws itself, and a dot slides to the 95th percentile position.

**Background:** Slate blue (`#1e1b4b`)

**Content:**
- *"You showed up more consistently than 95% of ChatGPT users."*
- **47-day streak** (hero number)
- Minimal percentile bar (a dot on a line)

**Resting State:** Statement + hero number + position indicator.

**Exit:** The benchmark bar and number dissolve into scattered text fragments — setting up the fun facts.

**Current Codebase:** Entirely new. No existing equivalent.

**Design Upgrade Ideas**
<!-- 
YOUR NOTES HERE —
-->



---

### Scene 13: Fun Facts

**Entrance:** Text fragments swirl in from the edges and settle into readable lines — like the AI is assembling thoughts.

**Background:** Hot pink (`#4a0028`)

**Content:**
> *"Your longest conversation was 147 messages. At 3 AM. On a Tuesday. About fonts."*
> *"You've typed more words to ChatGPT than most people write in a year."*
> *"October 15th alone had more conversations than most users have in a month."*

**Resting State:** 2–3 lines stacked vertically with spacing. 18–22px each.

**Exit:** The fun facts fade, and a warm glow builds — the emotional tone shifts for the compliment.

**Current Codebase:** Simplified from `slide-13-fun-facts` (remove carousel, card chrome, cosmic background).

**Design Upgrade Ideas**
<!-- 
YOUR NOTES HERE —
-->



---

### Scene 14: The Compliment

**Entrance:** Slow fade-in (800ms). The warm background color blooms from the center outward. The text appears gently — no dramatic entrance. This is an emotional beat, not a reveal.

**Background:** Warm amber (`#451a03`)

**Content:**
> *"In January you asked 'how do I write a for loop.' By December you were deploying machine learning models. You didn't just learn to code — you became a different engineer."*

**Resting State:** Single statement, centered, 24–28px white. Warm background. Emotional weight.

**Exit:** The text gently fades. A single sentence begins to form — the final line.

**Current Codebase:** The compliment half of `slide-15-roast-compliment` (roast removed).

**Design Upgrade Ideas**
<!-- 
YOUR NOTES HERE —
-->



---

### Scene 15: Your Year, One Line

**Entrance:** A slow, deliberate fade-in. Maybe a brief pause (0.5s of empty screen) before the text appears — a dramatic breath.

**Background:** Deep violet (`#1a0533`)

**Content:**
> *"The year you became someone who thinks with AI — and never looked back."*

**Resting State:** One sentence. Centered. 28–32px white. The closing line of an essay.

**Exit:** The text gently contracts toward the center, and the editor frame begins to reassert itself — the chat window coming back into view around the content, as if the AI's response is wrapping up.

**Current Codebase:** Entirely new.

**Design Upgrade Ideas**
<!-- 
YOUR NOTES HERE —
-->



---

### Scene 16: Share

**Entrance:** The editor frame returns to full visibility. The AI's "response" settles into the chat area as a formatted share card. The input field returns at the bottom. It feels like the conversation is complete.

**Background:** Editor neutral (`#1a1a1a`) — back to the chat interface.

**Content:**
- A share card in the chat response area (showing the hook + "Top 3% conversation depth" + "ChatGPT Wrapped 2025")
- Below the chat area: a prominent **Share** button
- Small text: *"Share your Wrapped"*

**Resting State:** The editor has returned. The share card sits in the chat like a beautifully formatted AI response. The share button is the clear CTA.

**Exit:** (This is the last scene — no exit. But if the user swipes forward, it could loop back to Scene 1.)

**Current Codebase:** Evolved from `slide-18-share` (but now it's framed as the AI's final response in the editor).

**Design Upgrade Ideas**
<!-- 
YOUR NOTES HERE —
-->



---

## Build Order

Build the foundation first, then layer in the scenes.

| # | Task | What It Builds | Why This Order |
|---|------|---------------|----------------|
| 1 | **Editor Shell** | The fake chat frame (static, no animation yet) | Everything lives inside this |
| 2 | **Intro Sequence** | Typing animation, send, thinking dots, the eruption | This is the first thing users see — defines the vibe |
| 3 | **Scene 1 (Hook)** | First insight scene with entrance from eruption | Tests the editor → scene transition |
| 4 | **Transition System** | Basic forward/backward transition between scenes | Needed before adding more scenes |
| 5 | **Navigation** | Dots, swipe, arrows, autoplay | Needed to test multiple scenes |
| 6 | **Scene 2 (Year at a Glance)** | First "normal" scene transition | Tests scene→scene flow |
| 7 | **Scenes 3–16** | Remaining scenes, one at a time | Each one adds content; review individually |
| 8 | **Transition Polish** | Custom transitions between specific scenes | The "curve dissolves into heatmap cells" type connections |
| 9 | **Video Mode** | Autoplay timing, pause/resume | Makes the experience feel like a video |
| 10 | **Final Polish** | Timing, easing, overall flow | The experience feels like one continuous piece |

---

## File Structure

```
projects/chatgpt-wrapped/demo/
  index.html              ← Entry point
  css/
    editor.css            ← The fake chat editor shell
    transitions.css       ← Transition animations between scenes
    navigation.css        ← Dots, controls, autoplay indicator
    scenes/
      scene-01-hook.css
      scene-02-year.css
      scene-03-curve.css
      scene-04-heatmap.css
      scene-05-trajectory.css
      scene-06-split.css
      scene-07-life-event.css
      scene-08-growth.css
      scene-09-topics.css
      scene-10-peak.css
      scene-11-depth.css
      scene-12-benchmark.css
      scene-13-fun-facts.css
      scene-14-compliment.css
      scene-15-one-line.css
      scene-16-share.css
  js/
    editor.js             ← Editor shell logic, intro sequence
    transitions.js        ← Scene transition engine
    navigation.js         ← Dots, swipe, arrows, autoplay
    scenes/
      scene-01-hook.js
      ... (one per scene)
      scene-16-share.js
```

Each scene is a separate CSS + JS file. The HTML for all scenes lives in `index.html` but each scene is a `<section>` with its own ID. This keeps things modular — an agent building Scene 7 doesn't need to touch Scene 6's files.

---

## Reference: Existing Files to Draw From

| Existing File | What to Borrow |
|---------------|---------------|
| `css/core/variables.css` | `Outfit` font import, base color variables |
| `css/core/base.css` | Reset styles, `.slide` flexbox centering, `fadeIn` keyframe |
| `css/core/navigation.css` | Dot indicator sizing and positioning (restyle for new design) |
| `css/slides/slide-01-conversations.css` | Count-up number styling, glow animation timing |
| `css/slides/slide-14-heatmap.css` | Heatmap grid layout, cell animation stagger pattern |
| `css/slides/slide-08-evolution.css` | SVG chart structure, area gradient pattern |
| `css/slides/slide-13-fun-facts.css` | Fade/slide-up animation timing |

Borrow **timing curves and structural patterns**. The visual aesthetic is being replaced entirely.
