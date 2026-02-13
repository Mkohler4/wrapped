# ChatGPT Wrapped V2 — Animation & UX Guide

> **Status:** Draft  
> **Date:** February 11, 2026  
> **Parent:** [design-doc.md](./design-doc.md), [workflow.md](./workflow.md)  
> **Purpose:** Codify the animation vocabulary, camera system, timing patterns, and UX rules for the cinematic sequence.

---

## Design Philosophy

The ChatGPT Wrapped experience should feel like **watching a movie inside a familiar app**. The user recognizes the ChatGPT editor immediately, then watches it come alive. Every animation serves a purpose: reveal data, guide attention, or create emotional resonance.

**Three rules:**
1. **Never animate without purpose** — every motion reveals, connects, or transitions
2. **Respect the editor** — animations operate within the visual language of ChatGPT's interface
3. **Data is the star** — effects serve the numbers, not the other way around

---

## 1. Camera System

The cinematic sequence uses CSS transforms to simulate camera movements within the editor viewport.

### 1.1 Camera States

| State | Transform | Used When |
|-------|-----------|-----------|
| **Default** | `scale(1) translate(0, 0)` | Neutral — full editor visible |
| **Zoom Input** | `scale(1.6) translateY(-12%)` | User is typing — focus on input field |
| **Zoom Response** | `scale(1.25) translateY(8%)` | AI response streaming — gentle push toward chat area |
| **Zoom Graph** | `scale(1.3) translateY(Npx)` | Data visualization — N computed by JS to center the graph |
| **Wide** | `scale(1) translateY(0)` | Showing full editor + sidebar |

### 1.2 Camera Transitions

```css
.editor {
  transform-origin: bottom center;
  transition: transform 0.9s cubic-bezier(0.4, 0, 0.15, 1);
  will-change: transform;
}
```

**Easing curves:**
- **Zoom in:** `cubic-bezier(0.4, 0, 0.2, 1)` — Material Design standard. Quick start, slow settle.
- **Zoom out:** `cubic-bezier(0.0, 0, 0.2, 1)` — Decelerate. Gentle pull-back.
- **Pan:** `cubic-bezier(0.4, 0, 0.2, 1)` — Same as zoom in.
- **Dramatic zoom:** `cubic-bezier(0.16, 1, 0.3, 1)` — Overshoot slightly. Used for stat reveals.

### 1.3 Camera Movement Rules

1. **Never jump** — always transition between states, minimum 600ms
2. **Maximum 1 camera move per beat** — multiple moves feel seasick
3. **Settle time** — hold camera steady for ≥500ms after landing before showing new content
4. **Zoom range** — never below 0.85x or above 3x
5. **Origin shifts** — when zooming to a specific element, set `transform-origin` to that element's center

---

## 2. Typing Animation

### 2.1 Character-by-Character Typing

```javascript
const TYPING_CONFIG = {
  baseDelay: 44,         // ms between characters (CHAR_MS)
  variance: 12,          // ±12ms randomness (jitter range)
  pauseAfterSpace: 85,   // extra delay at word boundaries (SPACE_EXTRA)
  pauseWords: { '2025': 150 }, // specific word pauses
  cursorBlinkRate: 530,  // ms per half-cycle (1.06s full cycle, matches ChatGPT)
};
```

### 2.2 Typing Rules

1. Text cursor blinks at 530ms intervals (matches ChatGPT)
2. During typing, cursor is solid (not blinking)
3. After typing completes, cursor blinks 2-3 times then fades
4. Typing speed should feel human — not too fast (robotic) or too slow (boring)
5. Input field scrolls horizontally if text exceeds width

### 2.3 Streaming Response Animation

AI responses appear word-by-word, simulating ChatGPT's streaming:

```javascript
const STREAMING_CONFIG = {
  wordDelay: 55,         // ms between words (jitter base)
  variance: 20,          // ±20ms randomness
  // Accent spans are inline — no extra delay, just wrapped in <span class="ai-accent">
  // Growth response uses 45ms base with ±15ms jitter (slightly faster)
};
```

**Accent colors in responses:**
- Numbers: `#4A9EFF` (blue) — draws eye to data points
- Topic names: `#51CF66` (green) — categorization
- Time references: `#FFD43B` (yellow) — temporal anchors

---

## 3. Fake Cursor

### 3.1 Appearance

```css
.fake-cursor {
  width: 20px;
  height: 20px;
  /* SVG: macOS-style arrow cursor */
  pointer-events: none;
  position: fixed;
  z-index: 9999;
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
}
```

### 3.2 Movement

```javascript
const CURSOR_CONFIG = {
  moveEasing: 'cubic-bezier(0.4, 0, 0.15, 1)', // actual easing from demo
  moveDuration: 600,     // ms for send button (1100ms for sidebar — longer travel)
  hoverPause: 120,       // ms pause after arriving at target
  clickDuration: 120,    // ms for press animation
  clickScale: 0.8,       // scale down on press (0.85 for sidebar button)
  clickBackground: 'rgba(255, 255, 255, 0.1)', // sidebar button press tint
};
```

### 3.3 Click Feedback

1. Cursor arrives at target element
2. 200ms hover pause
3. Cursor scales to 0.9x (press)
4. Target element shows press state (subtle darken)
5. 150ms hold
6. Cursor scales back to 1x (release)
7. Optional: ripple effect at click point

### 3.4 Cursor Visibility Rules

| Phase | Cursor Visible | Reason |
|-------|---------------|--------|
| Typing | No | Text cursor is active |
| Send click | Yes | Clicking the send button |
| Sidebar click | Yes | Clicking sidebar toggle |
| Profile click | Yes | Clicking profile avatar |
| Images click | Yes | Clicking images button |
| During animations | No | Cursor would distract from visuals |

---

## 4. Message Bubble Animations

### 4.1 User Bubble Entrance

```css
.user-bubble {
  animation: bubbleIn 0.3s cubic-bezier(0.0, 0, 0.2, 1);
}

@keyframes bubbleIn {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
```

### 4.2 Ghost Bubble Cascade (Beat 7)

The cascade creates a waterfall of translucent message bubbles scrolling upward.

```javascript
const CASCADE_CONFIG = {
  totalBubbles: 200,          // total ghost bubbles (mix of user + AI)
  duration: 4800,             // ms total cascade duration
  avgBubbleH: 21,             // ~15px avg height + 6px gap
  featuredChance: 0.15,       // 15% of bubbles show sample text
  userRatio: 0.6,             // 60% chance each bubble is a user bubble
};
```

**Key implementation details (from demo):**
- Uses `requestAnimationFrame` loop with asymmetric easing (28% ramp-in, 60% cruise, 12% ease-out)
- GPU pre-warm: micro-blur (`blur(0.01px)`) forces compositing layer promotion before the real blur
- Scroll is *estimated* from bubble count (`initialContentH + bubbleCount * avgBubbleH`) — **no `scrollHeight` reads** during the loop, avoiding forced synchronous layout
- Footer fades at ~30% progress (opacity only, no layout change)
- Featured bubbles show sample message text at 10px font

**Cascade phases:**
1. **Ramp** (0-28%): Cubic ease-in, covers 0-18% of scroll distance
2. **Cruise** (28-88%): Linear constant speed, covers 18-90% of scroll distance
3. **Decel** (88-100%): Cubic ease-out, covers 90-100% of scroll distance
4. **Compress** (separate phase): `compressAndBlur()` — blur + gradient overlay

### 4.3 Compress + Blur (Beat 8)

After cascade, all bubbles compress into a compressed visual, then the hero stat appears:

```css
.cascade-compress {
  animation: compress 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes compress {
  to {
    transform: scaleY(0.1);
    filter: blur(8px);
    opacity: 0.3;
  }
}
```

---

## 5. Data Visualization Animations

### 5.1 Hero Stat Counter

Large numbers count up from 0:

```javascript
const COUNTER_CONFIG = {
  duration: 1500,            // ms total
  easing: 'easeOutExpo',    // fast start, slow finish
  separator: ',',            // thousand separator
  suffix: '',                // e.g., " messages"
  fontSize: '72px',
  fontWeight: 700,
  color: '#FFFFFF',
};

// Easing function
function easeOutExpo(t) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}
```

### 5.2 Bar Chart Animation (Beat 12)

Topic cards morph into bar chart bars:

**Phase 1: Card dealing** (cards fly into topic groups)
```javascript
const CARD_DEAL_CONFIG = {
  dealDelay: 80,             // ms between cards
  dealDuration: 400,         // ms each card flies
  dealEasing: 'cubic-bezier(0.2, 0, 0, 1)',
  stackOffset: 3,            // px offset per stacked card
  maxVisibleInStack: 5,      // cards visible per stack
};
```

**Phase 2: Collapse to bars**
```javascript
const BAR_MORPH_CONFIG = {
  morphDuration: 800,        // ms to morph from cards to bars
  morphEasing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  barGap: 8,                 // px between bars
  barRadius: 4,              // px corner radius
  labelDelay: 200,           // ms after bar settles to show label
  countDelay: 400,           // ms after bar settles to show count
};
```

### 5.3 Line Graph Animation (Beat 14)

The growth line draws from left to right:

```javascript
const LINE_GRAPH_CONFIG = {
  drawDuration: 2000,        // ms to draw full line
  drawEasing: 'linear',     // constant draw speed
  strokeWidth: 3,
  strokeColor: '#4A9EFF',
  dotRadius: 4,
  dotColor: '#FFFFFF',
  dotDelay: 100,             // ms delay before dot appears at each point
  areaFill: true,            // fill area under curve
  areaOpacity: 0.15,
  gridLines: true,           // horizontal grid lines
  gridOpacity: 0.1,
  axisLabels: true,          // month labels on X axis
};
```

**SVG path drawing technique:**
```css
.growth-line {
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  animation: drawLine 2s linear forwards;
}

@keyframes drawLine {
  to { stroke-dashoffset: 0; }
}
```

### 5.4 Heatmap Animation (Beat 15)

Calendar heatmap cells fill in with staggered timing:

```javascript
const HEATMAP_CONFIG = {
  cellSize: 12,              // px
  cellGap: 3,                // px
  fillStagger: 5,            // ms between cells
  fillDirection: 'left-to-right', // chronological
  fillDuration: 200,         // ms per cell fade-in
  intensityColors: [
    'transparent',           // 0: no activity
    '#0e4429',              // 1: low
    '#006d32',              // 2: medium  
    '#26a641',              // 3: high
    '#39d353',              // 4: max
  ],
  monthLabels: true,
  dayLabels: true,           // Mon, Wed, Fri
};
```

### 5.5 Word Cloud Animation (Beats 17-19)

**Phase 1: Words lift off from messages**
```javascript
const WORD_LIFT_CONFIG = {
  liftStagger: 30,           // ms between words
  liftDuration: 600,         // ms each word floats up
  liftEasing: 'cubic-bezier(0, 0.5, 0.5, 1)',
  initialOpacity: 0.6,       // words start semi-transparent
  targetOpacity: 1.0,        // words become fully opaque
};
```

**Phase 2: Words form cloud**
```javascript
const WORD_CLOUD_CONFIG = {
  formDuration: 1200,        // ms to arrange into cloud
  formEasing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  layout: 'force-directed',  // d3-force or custom physics
  centerX: 0.5,              // viewport fraction
  centerY: 0.4,
  minFontSize: 12,
  maxFontSize: 48,
  fontFamily: 'inherit',     // match ChatGPT's font
  colors: ['#4A9EFF', '#51CF66', '#FFD43B', '#FF6B6B', '#CC5DE8'],
};
```

**Phase 3: Words drop off**
```javascript
const WORD_DROP_CONFIG = {
  dropStagger: 50,           // ms between words (reverse order: smallest first)
  dropDuration: 800,         // ms per word
  dropEasing: 'cubic-bezier(0.5, 0, 1, 0.5)', // accelerate downward
  gravity: true,             // words accelerate as they fall
};
```

---

## 6. Sidebar Animations

### 6.1 Sidebar Open

```css
.sidebar {
  transform: translateX(-100%);
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar.open {
  transform: translateX(0);
}
```

### 6.2 Conversation List Population

After sidebar opens, conversations cascade in from top:

```javascript
const SIDEBAR_POPULATE_CONFIG = {
  stagger: 40,               // ms between items
  itemDuration: 300,         // ms per item entrance
  itemEasing: 'cubic-bezier(0, 0, 0.2, 1)',
  maxItems: 20,
  itemHeight: 44,            // px
};
```

### 6.3 Topic Color-Coding

Sidebar items flash their topic color in sequence:

```javascript
const COLOR_CODE_CONFIG = {
  flashDuration: 400,        // ms per item
  stagger: 60,               // ms between items
  finalOpacity: 0.3,         // color stays as subtle background
};
```

---

## 7. Profile Panel Animation

### 7.1 Panel Slide-In

```css
.profile-panel {
  position: fixed;
  right: 0;
  top: 0;
  width: 380px;
  height: 100%;
  background: #2A2A2A;
  transform: translateX(100%);
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 100;
}

.profile-panel.open {
  transform: translateX(0);
}
```

### 7.2 Scanning Effect

Before content reveals, a scanning line sweeps top-to-bottom:

```css
.scan-line {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, #4A9EFF, transparent);
  animation: scan 1.2s ease-in-out;
}

@keyframes scan {
  from { top: 0; opacity: 1; }
  to { top: 100%; opacity: 0; }
}
```

### 7.3 Content Reveal

After scan, content fades in section-by-section:

```javascript
const PROFILE_REVEAL_CONFIG = {
  sections: ['personality', 'chatStyle', 'topTraits', 'funFacts'],
  sectionDelay: 300,         // ms between sections
  sectionDuration: 400,      // ms per section fade-in
  sectionEasing: 'cubic-bezier(0, 0, 0.2, 1)',
};
```

---

## 8. Trophy Room Animations

### 8.1 Badge Unlock

Each trophy slides up and glows:

```css
.trophy-badge {
  animation: unlockBadge 0.6s cubic-bezier(0, 0, 0.2, 1);
}

@keyframes unlockBadge {
  0% {
    opacity: 0;
    transform: translateY(20px) scale(0.8);
    filter: brightness(0.5);
  }
  60% {
    opacity: 1;
    transform: translateY(-5px) scale(1.05);
    filter: brightness(1.5);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: brightness(1);
  }
}
```

### 8.2 Unlock Stagger

```javascript
const TROPHY_CONFIG = {
  stagger: 300,              // ms between badge unlocks
  glowColor: '#FFD43B',     // gold glow
  glowDuration: 800,        // ms glow holds
  maxBadges: 8,              // max visible
};
```

---

## 9. Transition Catalog

Standard transitions between beats:

| Transition | Duration | Easing | Used Between |
|-----------|----------|--------|-------------|
| **Fade** | 400ms | `ease-in-out` | Beat endings → new content |
| **Slide Up** | 500ms | `cubic-bezier(0.4, 0, 0.2, 1)` | Scrolling through chat |
| **Zoom In** | 800ms | `cubic-bezier(0.4, 0, 0.2, 1)` | Focus on element |
| **Zoom Out** | 800ms | `cubic-bezier(0.0, 0, 0.2, 1)` | Pull back to full view |
| **Morph** | 600ms | `cubic-bezier(0.4, 0, 0.2, 1)` | Shape change (bubbles → bar) |
| **Collapse** | 500ms | `cubic-bezier(0.4, 0, 0.2, 1)` | Content compresses |
| **Expand** | 500ms | `cubic-bezier(0.0, 0, 0.2, 1)` | Content expands |

---

## 10. Performance Guidelines

### 10.1 GPU Optimization

```css
/* Applied to elements that will animate */
.will-animate {
  will-change: transform, opacity;
  transform: translateZ(0);  /* force GPU layer */
}
```

### 10.2 Animation Budget

- **Maximum simultaneous animations:** 8 elements
- **Maximum DOM nodes during cascade:** 60 (recycle old bubbles)
- **Target frame rate:** 60fps (drop to 30fps on mobile if needed)
- **Maximum paint area per frame:** 40% of viewport

### 10.3 Mobile Optimizations

| Feature | Desktop | Mobile |
|---------|---------|--------|
| Ghost cascade bubbles | 50 | 25 |
| Word cloud words | 30 | 15 |
| Sidebar conversations | 20 | 10 |
| Heatmap cell size | 12px | 8px |
| Bar chart bars | 10 | 6 |
| Trophy badges | 8 | 5 |
| Shadow effects | Full | Reduced |
| Blur effects | Full | `filter: none` (too slow) |

### 10.4 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

When reduced motion is preferred:
- Skip camera movements — cut instead of zoom
- Instant number reveals instead of counter animation
- Fade instead of cascade
- Static word cloud instead of animated formation
- Still show all data, just without motion

---

## 11. Color System

### 11.1 Base Palette (Dark Theme)

| Role | Color | Usage |
|------|-------|-------|
| Background | `#212121` | Editor background |
| Surface | `#2A2A2A` | Sidebar, panels |
| Surface Light | `#333333` | Hover states |
| Text Primary | `#ECECEC` | Main text |
| Text Secondary | `#9A9A9A` | Muted text |
| User Bubble | `#2F2F2F` | User message background |
| AI Text | `#ECECEC` | AI response text |
| Accent Blue | `#4A9EFF` | Numbers, links, primary accent |
| Accent Green | `#51CF66` | Topics, positive change |
| Accent Yellow | `#FFD43B` | Time references, warnings |
| Accent Red | `#FF6B6B` | Negative change, errors |
| Accent Purple | `#CC5DE8` | Highlights, special |

### 11.2 Topic Colors

See [data-requirements.md](./data-requirements.md) Beat 12 for the 10-topic color palette.

### 11.3 Heatmap Colors

GitHub-style green gradient: transparent → `#0e4429` → `#006d32` → `#26a641` → `#39d353`

---

## 12. Typography

| Element | Font | Size | Weight | Line Height |
|---------|------|------|--------|------------|
| Hero stat | System | 72px | 700 | 1.0 |
| Stat label | System | 18px | 400 | 1.3 |
| AI response | System | 16px | 400 | 1.6 |
| User message | System | 16px | 400 | 1.5 |
| Sidebar item | System | 14px | 400 | 1.4 |
| Bar chart label | System | 13px | 500 | 1.0 |
| Graph axis label | System | 12px | 400 | 1.0 |
| Profile heading | System | 14px | 600 | 1.3 |
| Profile body | System | 14px | 400 | 1.5 |
| Trophy name | System | 14px | 600 | 1.3 |
| Year in one line | System | 20px | 500 | 1.5 |

**Font stack:** `'Outfit', -apple-system, BlinkMacSystemFont, sans-serif` (custom — loaded from Google Fonts)

---

## 13. Timing Quick Reference

| Beat | Duration | Key Animation |
|------|----------|---------------|
| 1: Idle | 1.5s | Welcome screen fade |
| 2: Type | 2.5s | Character typing |
| 3: Send | 2s | Click + thinking dots |
| 4: Hook | 3s | Word-by-word streaming |
| 5: Image | 2s | Image generation effect |
| 6: Zoom | 3s | Camera zoom + hold |
| 7: Cascade | 3.5s | Ghost bubble waterfall |
| 8: Compress | 2s | Blur + counter |
| 9: Morph | 2s | Number morph |
| 10: Click sidebar | 1s | Cursor movement |
| 11: Sidebar | 2s | List population |
| 12: Topics | 5s | Card deal + bar morph |
| 13: Type growth | 2s | Character typing |
| 14: Graph | 4s | Line draw + zoom |
| 15: Heatmap | 3s | Cell fill + fact |
| 16: Scroll | 1.5s | Camera scroll |
| 17: Words lift | 2s | Word extraction |
| 18: Cloud | 3s | Cloud formation |
| 19: Drop | 1.5s | Words falling |
| 20: Click profile | 1s | Cursor movement |
| 21: Profile | 4s | Scan + reveal |
| 22: Images | 3s | Fan out + count |
| 23: Trophy | 4s | Badge unlocks |
| 24: Share | 3s | Card + button |
| **Total** | **~62s** | |
