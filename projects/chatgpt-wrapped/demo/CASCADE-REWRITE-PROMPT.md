# Cascade Scroll Rewrite — Prompt for Next AI

## Goal

Rewrite Phases 8–10 of the ChatGPT Wrapped demo animation so the message cascade scrolls **buttery smooth from start to finish** — on mobile (390px) and desktop — and the hero stat (20,000) animates on top of the still-moving messages. The current code must be preserved untouched; build new test files.

---

## What This Animation Should Look Like

1. **Fast scroll** — Hundreds of chat-style message bubbles (purple = user, blue = AI) scroll upward rapidly, like flipping through a year of conversations. Accelerates, cruises, then decelerates.
2. **Smooth deceleration** — The scroll slows down gradually (never stops abruptly).
3. **Blur + overlay** — While still gently moving, the messages blur and a gradient fades in.
4. **Hero stat appears** — "20,000" counts up over the blurred, still-moving backdrop. Label + split stats follow.
5. **Messages keep drifting** — The background never fully stops. Gentle movement persists behind the stat the entire time.
6. **Cleanup** — Eventually the messages switch to a CSS-animated absolute backdrop and the next phase begins.

---

## What's Currently Broken (Learnings from Multiple Attempts)

### Problem 1: Laggy fast scroll
The fast burst creates 200 DOM elements over 4.8s via `requestAnimationFrame`. Each bubble is appended individually with `STATE.chatMessages.appendChild(ghost)`. On mobile, this causes incremental layout thrashing. The scroll position is estimated (`bubbleCount * avgBubbleH`) and set via `editorMain.scrollTop` each frame. The estimation is inaccurate (actual bubble heights vary), causing micro-jitter.

### Problem 2: Transition from fast to slow is janky
We tried several approaches for the slow phase after the fast burst:
- **setTimeout + scrollTop jumps**: Steps of ~21px every 350ms = obvious snapping.
- **rAF + scrollTop**: Smooth rAF loop, but `scrollTop` is clamped by browser to max scrollable height. Between bubble additions, content height doesn't change, so scroll is stuck → same stepping.
- **Pre-fill 40-80 bubbles then rAF scroll**: Adding many DOM elements at once causes massive jank on mobile (freezes the main thread for 100ms+), delaying everything after. The 20,000 counter stops animating because rAF callbacks are starved.
- **rAF + translateY (current)**: Fast burst uses scrollTop, then drift uses `translateY(-Npx)` on the chat container. The translateY is GPU-accelerated and smooth, BUT the visual transition between scrollTop-driven and translateY-driven movement has a visible "reset" — the messages jump or temporarily disappear/reappear because the coordinate systems don't align.

### Problem 3: Hero stat is delayed
Phase 9 (blur + gradient) and Phase 10 (stat reveal) have sequential `await wait()` calls that add up. Even after aggressive shortening (680ms for Phase 9, 300ms for Phase 10 reveal), the stat still feels late because:
- The fast burst is 4.8 seconds
- Then blur/gradient/reveal waits add ~1s
- Any jank from DOM operations adds unpredictable delay

### Problem 4: Scroll stops when stat shows
The `editorMain.scrollTop` approach doesn't work once `chat-messages--backdrop` (absolute positioning) is applied. The `translateY` approach works during drift but conflicts with the backdrop mode's own `transform: translateX(-50%)`. We tried delaying the backdrop switch to the very end, but the fundamental issue remains: DOM-based scroll and CSS transform fighting.

---

## Proposed New Architecture: Pre-rendered Scroll Strip

### Core Idea
Instead of creating and appending 200+ individual DOM elements during the animation, **pre-render all bubbles into a single tall div before the animation starts**, then scroll that div using a single GPU-accelerated `translateY` animation. The bubbles are always there — they're just **unmasked** by the viewport as the strip scrolls.

### Implementation Plan

#### 1. Build the strip (off-screen, before animation)
```
┌─────────────────────────┐
│  bubble (user, 65%)     │  ← pre-rendered, opacity: 1
│  bubble (ai, 45%)       │
│  bubble (user, 80%)     │
│  ...                    │
│  ~300 bubbles total     │
│  total height: ~5000px  │
└─────────────────────────┘
```
- A single container div (`cascade-strip`) with all bubbles already inside.
- Bubbles are styled exactly like current ghost bubbles (same colors, sizes, border-radius).
- Some are "featured" with text snippets.
- The strip is `overflow: hidden` inside a viewport-sized mask.

#### 2. Mask + scroll via translateY
```
┌──── viewport mask ────────┐
│  ┌── cascade-strip ─────┐ │
│  │                       │ │  ← translateY(-offset)
│  │  visible bubbles      │ │     moves strip upward
│  │                       │ │
│  └───────────────────────┘ │
└────────────────────────────┘
```
- The mask div has `overflow: hidden` and is the same size as `.editor__main`.
- A single rAF loop animates `translateY` on the strip. 
- **Fast phase**: eased speed (accelerate → cruise → decelerate). 
- **Slow phase**: constant gentle speed that continues indefinitely.
- ONE rAF loop the entire time. No phase transitions. Just speed changes.

#### 3. Blur + stat overlay on top
- The blur is applied to the strip via `filter: blur(3px); opacity: 0.6` — same as current.
- The gradient overlay and stat display sit on top via z-index, same as current.
- The translateY keeps running the whole time.
- `stop()` is called only at the very end when transitioning to the next scene.

### Why This Fixes Everything

| Current Problem | How Strip Fixes It |
|---|---|
| Laggy fast scroll (DOM appends) | Zero DOM mutations during animation. All bubbles pre-rendered. |
| scrollTop clamped by content height | No scrollTop used at all. Pure translateY. |
| Pre-fill jank | No pre-fill needed. Content is already there. |
| Fast→slow transition jump | One continuous rAF loop with speed easing. No handoff. |
| Stat delayed by jank | Zero main thread blocking. rAF callbacks never starved. |
| Scroll stops during stat | translateY is independent of layout. Keeps going through blur/stat. |
| backdrop mode transform conflict | Strip stays in normal flow during scroll. backdrop switch only at cleanup. |

### Bubble Appearance Effect (Unmasking)
To make it look like bubbles are "appearing" as they scroll (not all visible at once):
- Give each bubble `opacity: 0` initially.
- Use an Intersection Observer on the mask container, or simpler: calculate which bubbles are entering the viewport based on the current `translateY` offset, and set their opacity to 1 with a short CSS transition.
- OR: use a CSS gradient mask on the top edge of the strip so bubbles fade in as they enter from the bottom.

The CSS gradient mask approach is simplest and most performant:
```css
.cascade-mask {
  -webkit-mask-image: linear-gradient(
    to bottom,
    black 0%,
    black 85%,
    transparent 100%
  );
  mask-image: linear-gradient(
    to bottom,
    black 0%,
    black 85%,
    transparent 100%
  );
}
```
This makes bubbles at the bottom edge fade in naturally as the strip scrolls up.

---

## Files to Create (Test Harness)

Create these NEW files — do NOT modify existing phase files:

1. **`test-cascade.html`** — Standalone test page that loads the same CSS + config but runs only the cascade → blur → stat sequence. Include buttons to restart, toggle mobile/desktop viewport.

2. **`js/phases/08-cascade-messages-v2.js`** — New implementation of `cascadeMessages` using the strip approach. Same function signature: `async function cascadeMessages()` returning `{ stop() }`.

3. **`css/cascade-v2.css`** — New CSS for the strip approach. Keep the existing ghost-bubble styles but add the strip container, mask, and gradient mask styles.

---

## Existing Code Reference

### Current file structure
```
demo/
├── index.html
├── css/
│   ├── base.css          — Reset, viewport
│   ├── shell.css         — Editor chrome, header, footer, input
│   ├── chat.css          — Chat bubbles, AI response
│   ├── cascade.css       — Ghost bubbles, backdrop, blur, stat-backdrop
│   ├── stats.css         — Hero number, split, glow
│   └── ...
├── js/
│   ├── config.js         — All data constants, MOBILE_MAX_WIDTH = 1180
│   ├── helpers.js        — wait(), cascadeEasing(), isMobileViewport(), etc.
│   ├── state.js          — Shared DOM refs and mutable state
│   ├── editor.js         — Master orchestrator (sequential phase runner)
│   └── phases/
│       ├── 08-cascade-messages.js  — Current (broken) implementation
│       ├── 09-compress-blur.js     — Blur + gradient overlay
│       ├── 10-hero-stat.js         — 20,000 counter + split
│       └── ...
```

### Key shared objects
- `window.__editorConfig` (CFG) — constants including `SAMPLE_MESSAGES_USER`, `SAMPLE_MESSAGES_AI`
- `window.__editorHelpers` (H) — `wait()`, `cascadeEasing()`, `animateCounter()`, `isMobileViewport()`
- `window.__editorState` (STATE) — `STATE.dom.editor`, `STATE.dom.editorMain`, `STATE.chatMessages`

### How it's wired in editor.js
```js
const cascadeCtrl = await P.cascadeMessages();  // Phase 8
await P.compressAndBlur();                       // Phase 9
await P.showHeroStat(cascadeCtrl);               // Phase 10
```

### Container structure
```
.viewport > .editor > .editor__main > .chat-messages > [bubbles]
```
- `.editor__main` has `overflow: hidden`, padding varies by breakpoint (16px mobile, 20px default, 24px desktop).
- `.chat-messages` is `display: flex; flex-direction: column; gap: 16px; width: 100%; max-width: 680px; margin: 0 auto;`

### Ghost bubble styles (reuse these)
- `.ghost-bubble` — `height: 14px; border-radius: 10px; opacity: 0; flex-shrink: 0;`
- `.ghost-bubble--user` — `align-self: flex-end; background: rgba(192, 132, 252, 0.30);`
- `.ghost-bubble--ai` — `align-self: flex-start; background: rgba(96, 165, 250, 0.25);`
- `.ghost-bubble--featured` — taller, has text, different opacity
- Widths: user/ai 30-85%, featured 45-85%
- Heights: regular 12-18px, featured 20-26px

### Stat display
- `.stat-display` — absolute positioned, z-index 2, centered with transform
- `.stat-backdrop` — absolute, inset 0, z-index 1, radial gradient overlay
- Both sit on top of the cascade via z-index layering

---

## Performance Requirements

- **60fps on iPhone SE / 390px viewport** — this is the primary target
- Zero DOM mutations during the scroll animation
- Single rAF loop for the entire cascade duration (fast + slow + during stat)
- GPU-composited transform only (translateY on a single element)
- Blur transition must not cause frame drops

---

## Testing Checklist

- [ ] Fast scroll is smooth (no jitter, no stepping)
- [ ] Deceleration is smooth (no abrupt stop)
- [ ] Transition from fast to slow is seamless (no jump, no pause)
- [ ] Blur fades in while messages are still moving
- [ ] Gradient fades in while messages are still moving
- [ ] 20,000 counter appears quickly after blur starts (< 1s)
- [ ] 20,000 counter animation runs at full 60fps
- [ ] Messages keep drifting behind the stat during the entire stat sequence
- [ ] Works on 390px mobile viewport
- [ ] Works on 1440px desktop viewport
- [ ] No visible layout jump when switching to backdrop mode at cleanup
