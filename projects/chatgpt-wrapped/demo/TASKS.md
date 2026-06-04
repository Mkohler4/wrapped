# Editor.js Animation Refactor — Task Plan

## Overview

`demo/js/editor.js` is a **4,983-line monolith** containing **29 animation phases**, all config data, all helper utilities, and the master orchestrator inside a single IIFE. This task plan breaks the file apart into focused, testable modules — one animation phase (or logical group) at a time.

Each task is designed so you can **test the full sequence after every extraction** before moving on.

---

## Target File Structure

```
demo/js/
├── editor.js                  ← Slim orchestrator (imports + run())
├── config.js                  ← Constants, data, AI_RESPONSE_PARTS, etc.
├── helpers.js                 ← wait(), jitter(), animateCount(), formatNumber(), animateCounter(), easing fns
├── phases/
│   ├── 01-type-prompt.js          ← Phase 1
│   ├── 02-move-cursor-to-send.js  ← Phase 2
│   ├── 03-click-send.js           ← Phase 3
│   ├── 04-send-message.js         ← Phase 4
│   ├── 05-thinking-dots.js        ← Phase 5
│   ├── 06-stream-ai-response.js   ← Phase 6
│   ├── 07-highlight-response.js   ← Phase 7
│   ├── 07n-dot-draws-graph.js     ← Phase 7-NEW (dot draws activity graph)
│   ├── 08-cascade-messages.js     ← Phase 8
│   ├── 09-compress-blur.js        ← Phase 9
│   ├── 10-hero-stat.js            ← Phase 10
│   ├── 10b-morph-conversations.js ← Phase 10b
│   ├── 11-transition-sidebar.js   ← Phase 11+12
│   ├── 13-open-sidebar.js         ← Phase 13
│   ├── 14-group-conversations.js  ← Phase 14
│   ├── 15-collapse-bar-chart.js   ← Phase 15
│   ├── 16-cursor-to-input.js      ← Phase 16a + 16b (cursor + type + send)
│   ├── 17-growth-insight.js       ← Phase 17 (AI message + graph)
│   ├── 18-unwrite-restream.js     ← Phase 18a + 18b
│   ├── 19-graph-transitions.js    ← Phase 19 orchestrator + 19a (morph line→line) + 19b (morph line→bar)
│   ├── 20-deconstruct-bar.js      ← Phase 20 (bar chart → rolling square)
│   ├── 21-heatmap.js              ← Phase 21
│   ├── 22-active-days.js          ← Phase 22
│   ├── 23-longest-streak.js       ← Phase 23
│   ├── 24-busiest-day.js          ← Phase 24
│   ├── 25-launch-cell.js          ← Phase 25
│   ├── 26-word-bubbles.js         ← Phase 26
│   ├── 27-cursor-to-image.js      ← Phase 27
│   ├── 28-drag-image.js           ← Phase 28
│   └── 29-award-room.js           ← Phase 29
```

---

## Ground Rules

1. **One task at a time.** Extract → test → confirm → next.
2. **No behavior changes.** Every extraction must be purely structural. The animation must look identical before and after.
3. **Use ES modules** (`export` / `import`) or expose via a shared namespace on `window.__editor` — whatever the current loading strategy supports (currently script tags, not bundled).
4. **Shared state** (DOM refs, `chatMessages`, `hasZoomed`, etc.) will live in a shared context object passed between phases or in `config.js`.
5. **Test after every task** by running the full sequence in the browser and confirming the animation still works end-to-end.

---

## Tasks

### Task 0 — Prep: Shared infrastructure files
**Lines affected:** 1–68 (config + DOM refs + helpers)
**What to do:**
- [x] Create `demo/js/config.js` — move all constants: `PROMPT`, `CHAR_MS`, `SPACE_EXTRA`, `PAUSE_WORDS`, `AI_RESPONSE_PARTS`, `USAGE_HOURS`, `GROWTH_DATA`, `GROWTH_PHASE_2`, word frequency data (`WORD_FREQ_DATA` near line 743)
- [x] Create `demo/js/helpers.js` — move utility functions: `wait()`, `jitter()`, `animateCount()`, `formatNumber()`, `animateCounter()`, `fmtHour()`, `msgCountForHour()`, `cascadeEasing()`, `buildCatmullRomPath()`, `easeOutCubic()`, `rollSquareToCenter()`
- [x] Create a shared state/context object for DOM references (`editor`, `editorMain`, `inputWrap`, `inputText`, `cursor`, `placeholder`, `sendBtn`, `fakeCursor`) and mutable state (`hasZoomed`, `chatMessages`)
- [x] Update `demo/index.html` to load `config.js` and `helpers.js` before `editor.js`
- [x] **TEST:** Full animation runs unchanged

---

### Task 1 — Phase 1: Type into input (`typePrompt`)
**Lines:** 73–98
**Function:** `typePrompt()`
**File:** `demo/js/phases/01-type-prompt.js`
- [x] Extract `typePrompt()` into its own file
- [x] Import config (`PROMPT`, `CHAR_MS`, `SPACE_EXTRA`, `PAUSE_WORDS`) and helpers (`wait`, `jitter`) and shared DOM refs
- [x] **TEST:** Cursor blinks, text types character-by-character, editor zooms on first char

---

### Task 2 — Phase 2: Fake cursor moves to send (`moveCursorToSend`)
**Lines:** 103–120
**Function:** `moveCursorToSend()`
**File:** `demo/js/phases/02-move-cursor-to-send.js`
- [x] Extract `moveCursorToSend()`
- [x] **TEST:** Fake mouse cursor glides from text end to send button

---

### Task 3 — Phase 3: Click send button (`clickSend`)
**Lines:** 125–138
**Function:** `clickSend()`
**File:** `demo/js/phases/03-click-send.js`
- [x] Extract `clickSend()`
- [x] **TEST:** Button press/release animation + ripple, fake cursor disappears

---

### Task 4 — Phase 4: Zoom out + user message bubble (`sendMessage`)
**Lines:** 143–180
**Function:** `sendMessage()`
**File:** `demo/js/phases/04-send-message.js`
- [x] Extract `sendMessage()`
- [x] Note: this creates the `chatMessages` container — must update shared state
- [x] **TEST:** Editor zooms out, welcome fades, user chat bubble appears on right

---

### Task 5 — Phase 5: Thinking dots (`showThinkingDots`)
**Lines:** 185–203
**Function:** `showThinkingDots()`
**File:** `demo/js/phases/05-thinking-dots.js`
- [x] Extract `showThinkingDots()`
- [x] **TEST:** Three dots animate on the left side, intensify, then get removed

---

### Task 6 — Phase 6: AI response streams (`streamAIResponse`)
**Lines:** 208–259
**Function:** `streamAIResponse(thinkingDots)`
**File:** `demo/js/phases/06-stream-ai-response.js`
- [x] Extract `streamAIResponse()`
- [x] **TEST:** Thinking dots removed, AI text streams in word-by-word with accent spans

---

### Task 7 — Phase 7: Highlight response (`highlightResponse`)
**Lines:** 264–274
**Function:** `highlightResponse(response)`
**File:** `demo/js/phases/07-highlight-response.js`
- [x] Extract `highlightResponse()`
- [x] **TEST:** AI response gets wrapped, brief hold

---

### Task 8 — Phase 7-NEW: Dot draws activity line graph (`dotDrawsGraph`)
**Lines:** 305–706
**Function:** `dotDrawsGraph(response)` + helper functions (`fmtHour`, `msgCountForHour`)
**File:** `demo/js/phases/07n-dot-draws-graph.js`
- [x] Extract `dotDrawsGraph()` — this is the **largest single phase** (~400 lines)
- [x] Move `fmtHour()` and `msgCountForHour()` here (or to helpers if reused)
- [x] **TEST:** Accent dot flies out, graph draws itself with animated line, labels fade in, zoom occurs, then zooms back out

---

### Task 9 — Phase 8: Ghost bubble cascade (`cascadeMessages`)
**Lines:** 708–900
**Function:** `cascadeMessages()` + `cascadeEasing()`
**File:** `demo/js/phases/08-cascade-messages.js`
- [x] Extract `cascadeMessages()` and its local `createBubble()` + tick logic
- [x] Move `cascadeEasing()` to helpers or keep local
- [x] **TEST:** Colorful ghost chat bubbles cascade upward rapidly

---

### Task 10 — Phase 9: Compress and blur (`compressAndBlur`)
**Lines:** 905–923
**Function:** `compressAndBlur()`
**File:** `demo/js/phases/09-compress-blur.js`
- [x] Extract `compressAndBlur()`
- [x] **TEST:** Messages blur and compress with gradient overlay

---

### Task 11 — Phase 10: Hero stat 20,000 messages (`showHeroStat`)
**Lines:** 928–1052
**Function:** `showHeroStat()`, `formatNumber()`, `animateCounter()`
**File:** `demo/js/phases/10-hero-stat.js`
- [x] Extract `showHeroStat()`
- [x] `formatNumber()` and `animateCounter()` should already be in helpers (Task 0)
- [x] **TEST:** Big "20,000" number counts up, You/ChatGPT split animates in

---

### Task 12 — Phase 10b: Morph to conversations (`morphToConversations`)
**Lines:** 1059–1116
**Function:** `morphToConversations()`
**File:** `demo/js/phases/10b-morph-conversations.js`
- [x] Extract `morphToConversations()`
- [x] **TEST:** 20,000 counts down to 847, label cross-fades to "conversations"

---

### Task 13 — Phase 11+12: Transition to sidebar (`transitionToSidebar`)
**Lines:** 1124–1224
**Function:** `transitionToSidebar()`
**File:** `demo/js/phases/11-transition-sidebar.js`
- [x] Extract `transitionToSidebar()`
- [x] **TEST:** Content scrolls up, cursor appears, clicks sidebar button

---

### Task 14 — Phase 13: Open sidebar (`openSidebar`)
**Lines:** 1227–1322
**Function:** `openSidebar()`
**File:** `demo/js/phases/13-open-sidebar.js`
- [x] Extract `openSidebar()`
- [x] **TEST:** Sidebar slides in from left with conversation list items

---

### Task 15 — Phase 14: Group conversations into topics (`groupConversations`)
**Lines:** 1329–1811
**Function:** `groupConversations(sidebarItems)` — **~480 lines, second largest phase**
**File:** `demo/js/phases/14-group-conversations.js`
- [x] Extract `groupConversations()`
- [x] **TEST:** Items color-highlight, clone out, sidebar closes, bars form, labels appear, morphs to specific topics

---

### Task 16 — Phase 15: Collapse bar chart (`collapseBarChart`)
**Lines:** 1891–1915
**Function:** `collapseBarChart(chartData)`
**File:** `demo/js/phases/15-collapse-bar-chart.js`
- [x] Extract `collapseBarChart()`
- [x] **TEST:** Bar chart elements fade/collapse out

---

### Task 17 — Phase 16: Cursor to input + type + send (`cursorToInput`, `typeNewPrompt`, `sendNewMessage`)
**Lines:** 1920–2035
**Functions:** `cursorToInput()`, `typeNewPrompt(text)`, `sendNewMessage()`
**File:** `demo/js/phases/16-cursor-to-input.js`
- [x] Extract all three functions (they work as a group for the "ask another question" flow)
- [x] **TEST:** Cursor travels to input, new prompt types, message sends

---

### Task 18 — Phase 17: Growth insight (`showGrowthInsight`)
**Lines:** 2046–2428
**Function:** `showGrowthInsight(data)` — **~380 lines**
**File:** `demo/js/phases/17-growth-insight.js`
- [x] Extract `showGrowthInsight()`
- [x] **TEST:** Thinking dots, AI message streams, graph container builds SVG, line animates, labels fade in, camera zooms into graph

---

### Task 19 — Phase 18: Unwrite + restream (`unwriteText`, `restreamText`)
**Lines:** 2434–2513
**Functions:** `unwriteText()`, `restreamText()`
**File:** `demo/js/phases/18-unwrite-restream.js`
- [x] Extract both functions
- [x] **TEST:** Old AI text erases word-by-word, new text streams in

---

### Task 20 — Phase 19: Graph transitions (`morphLineToLine`, `morphLineToBar`, `transitionToNextChart`)
**Lines:** 2520–2895
**Functions:** `buildCatmullRomPath()`, `easeOutCubic()`, `morphLineToLine()`, `morphLineToBar()`, `transitionToNextChart()`
**File:** `demo/js/phases/19-graph-transitions.js`
- [x] Extract the orchestrator + both morph variants
- [x] Move `buildCatmullRomPath()` and `easeOutCubic()` to helpers (or keep local)
- [x] **TEST:** Line graph morphs to new line or bar graph, text unwrite/restream overlaps correctly

---

### Task 21 — Phase 20: Deconstruct bar chart → rolling square (`deconstructBarChart`)
**Lines:** 2899–3157
**Functions:** `rollSquareToCenter()`, `deconstructBarChart()`
**File:** `demo/js/phases/20-deconstruct-bar.js`
- [x] Extract both functions
- [x] **TEST:** Bar chart bars collapse into a single square that rolls to center

---

### Task 22 — Phase 21: Heatmap (`buildHeatmap`)
**Lines:** 3159–3489
**Functions:** `generateActivityData()`, `buildHeatmap()`
**File:** `demo/js/phases/21-heatmap.js`
- [x] Extract both functions
- [x] **TEST:** Square expands into heatmap grid, cells rain down with color

---

### Task 23 — Phase 22: Active days wave reveal (`revealActiveDays`)
**Lines:** 3491–3579
**Function:** `revealActiveDays()`
**File:** `demo/js/phases/22-active-days.js`
- [x] Extract `revealActiveDays()`
- [x] **TEST:** Active day cells wave-pulse, stat counter reveals

---

### Task 24 — Phase 23: Longest streak ribbon (`revealLongestStreak`)
**Lines:** 3582–3714
**Function:** `revealLongestStreak()`
**File:** `demo/js/phases/23-longest-streak.js`
- [x] Extract `revealLongestStreak()`
- [x] **TEST:** Streak cells highlight in sequence forming a ribbon, stat appears

---

### Task 25 — Phase 24: Busiest day spotlight (`revealBusiestDay`)
**Lines:** 3718–3871
**Function:** `revealBusiestDay()`
**File:** `demo/js/phases/24-busiest-day.js`
- [x] Extract `revealBusiestDay()`
- [x] **TEST:** Single busiest cell spotlights/pulses, stat appears

---

### Task 26 — Phase 25: Launch busiest cell (`launchBusiestCell`)
**Lines:** 3873–4011
**Function:** `launchBusiestCell()`
**File:** `demo/js/phases/25-launch-cell.js`
- [x] Extract `launchBusiestCell()`
- [x] **TEST:** Busiest cell launches/flies upward off the heatmap

---

### Task 27 — Phase 26: Word bubble morph (`morphCellToWordBubble`)
**Lines:** 4013–4483
**Function:** `morphCellToWordBubble()` — **~450 lines, third largest phase**
**File:** `demo/js/phases/26-word-bubbles.js`
- [x] Extract `morphCellToWordBubble()` + its inner helpers (`findPosition`, `spawnBubble`, `applyDrift`)
- [x] **TEST:** Flying cell morphs into a circle, word bubbles spawn and drift

---

### Task 28 — Phase 27: Cursor moves to image button (`moveCursorToImageBtn`)
**Lines:** 4488–4510
**Function:** `moveCursorToImageBtn()`
**File:** `demo/js/phases/27-cursor-to-image.js`
- [x] Extract `moveCursorToImageBtn()`
- [x] **TEST:** Fake cursor reappears and glides to image/attachment button

---

### Task 29 — Phase 28: Drag image to center (`dragImageToCenter`)
**Lines:** 4515–4691
**Function:** `dragImageToCenter()`
**File:** `demo/js/phases/28-drag-image.js`
- [x] Extract `dragImageToCenter()`
- [x] **TEST:** Icon gets grabbed, dragged to center drop zone, hand-off animation

---

### Task 30 — Phase 29: Award room (`showAwardRoom`)
**Lines:** 4694–4876
**Function:** `showAwardRoom()`
**File:** `demo/js/phases/29-award-room.js`
- [x] Extract `showAwardRoom()`
- [x] **TEST:** Header/footer fade, final summary award screen reveals

---

### Task 31 — Final: Slim down `editor.js` to orchestrator only
**What to do:**
- [x] `editor.js` should only contain: imports of all phase files, the `run()` function (~80 lines), the `window.__editor` exports, and the auto-run logic
- [x] Verify all `<script>` tags in `index.html` are in correct load order
- [x] Remove any dead/commented-out code (old Phase 7a–7g references, etc.)
- [x] **TEST:** Full animation runs start-to-finish identically to original
- [x] **TEST:** All existing test harness HTML files (`test-award-room.html`, `test-heatmap.html`, `test-drag-entrance.html`, `test-image-unfold.html`) still work

---

## Phase Size Summary (for prioritization)

| Phase | Function | Lines | Priority Notes |
|-------|----------|-------|----------------|
| 7-NEW | `dotDrawsGraph` | ~400 | Largest — extract early for biggest win |
| 14 | `groupConversations` | ~480 | Second largest |
| 26 | `morphCellToWordBubble` | ~450 | Third largest |
| 17 | `showGrowthInsight` | ~380 | Fourth largest |
| 19 | Graph transitions | ~375 | Multiple functions |
| 20 | `deconstructBarChart` | ~260 | Medium |
| 21 | `buildHeatmap` | ~330 | Medium |
| 8 | `cascadeMessages` | ~190 | Medium |
| 28 | `dragImageToCenter` | ~175 | Medium |
| 29 | `showAwardRoom` | ~180 | Medium |
| Others | Various | 10–100 | Small extractions |

---

## Notes

- The file currently uses an **IIFE pattern** `(() => { ... })()` with no module system. We will likely need to switch to either ES modules with a bundler, or a `window.__editorPhases` namespace that each script file registers into.
- CSS files are already well-split (`chat.css`, `heatmap.css`, `dot-draw.css`, etc.) — no CSS refactoring needed.
- `demo/js/image-phases-backup.js` contains old extracted phases (7a–7g) that are commented out in the master sequence — can be deleted in Task 31 cleanup.
- The `window.__editor` export object at the bottom exposes functions for test harnesses — keep this working throughout.
