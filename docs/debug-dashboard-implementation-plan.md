# Debug Dashboard Implementation Plan

> **Status:** Implemented
> **Date:** February 6, 2026
> **Purpose:** Define the approach, required changes, and long-term value of the Debug & Testing Dashboard (Bug 0).

---

## Summary

We will add a **non-intrusive debug overlay panel** that can be toggled with **Ctrl+Alt+D** (and an optional hidden UI trigger), displaying **live, structured diagnostics** for all key data pipelines in ChatGPT Wrapped. The panel will **read existing in-memory globals** (e.g., `stats`, `aiInsights`, `imagePrompts`, `imageStats`, `heatmapData`, `discoveredThemes`) and **auto-refresh after data changes** (e.g., after `populateSlides()` runs). It will provide **immediate, auditable visibility** into every stat and derived output to accelerate debugging and prevent regressions.

---

## Solution Approach

### 1) Lightweight, client-only overlay
- Add a new module `js/debug-panel.js` that:
	- Injects a fixed-position overlay panel into the DOM.
	- Renders multiple diagnostic sections from in-memory data.
	- Provides a “Copy Debug Data” button (clipboard JSON).
	- Supports toggling on/off via keyboard shortcut.
	- Exposes a small API: `window.refreshDebugPanel()`.

### 2) Dedicated styling
- Add `css/core/debug-panel.css` to style the overlay as a right-side slide-in panel.
- Ensure it doesn’t interfere with existing slides or navigation.

### 3) Initialization hook
- Register the keyboard shortcut in `js/core/init.js` (and `js/app.js` if required for non-module usage) to toggle the panel.
- Add a hidden trigger button if needed.

### 4) Auto-refresh strategy
- Provide a global `window.refreshDebugPanel` and call it:
	- Immediately after `populateSlides()`.
	- When new data is loaded (e.g., `processFile` success, `loadMyData()` success).
- This ensures that changes to `stats`, `aiInsights`, `imagePrompts`, etc. are reflected without a page reload.

---

## Files & Changes Required

### New Files
- `projects/chatgpt-wrapped/js/debug-panel.js`
- `projects/chatgpt-wrapped/css/core/debug-panel.css`

### Existing Files
- `projects/chatgpt-wrapped/index.html`
	- Ensure `css/styles.css` is loaded (it now `@import`s `core/debug-panel.css`; no separate `<link>` for `debug-panel.css` is needed).
	- Add `<script>` for `debug-panel.js`
- `projects/chatgpt-wrapped/js/core/init.js`
	- Register keyboard shortcut `Ctrl+Alt+D`.
	- Call `window.toggleDebugPanel()` if available.
- `projects/chatgpt-wrapped/js/app.js`
	- After `populateSlides(stats);` call `window.refreshDebugPanel()` if available.
	- Optional: expose a tiny event hook or dispatch a custom event after data changes.

---

## Diagnostic Sections (Initial Scope)

1. **Raw Stats** (messages, conversations, code blocks, peak hour)
2. **Topic Breakdown** (counts + percent, highlight “general/other”)
3. **Image Detection** (image counts, prompt array length, metadata hints)
4. **Achievement Data Sources** (streaks, active days, first date)
5. **AI Insights Snapshot** (personality, obsession, roasts)
6. **Achievement Results** (current values + threshold)
7. **Export Debug Data** (clipboard JSON)

---

## How This Helps Future Bugs

- **Immediate diagnosis:** Any future data regressions show up instantly without manual log digging.
- **Lower triage time:** Developers can see which pipeline failed (stats, insights, images, etc.).
- **Reproducibility:** Export button captures a full snapshot for bug reports.
- **Safe experimentation:** Changes to classifiers, LLM prompts, or derived metrics can be validated instantly.
- **Foundation for automated checks:** This UI can later be used to drive automated smoke tests.

---

## Out of Scope (for this task)

- Persisting debug state across sessions
- Server-side diagnostics
- Visual charting libraries (will use basic bars and inline text)

---

## Next Steps

1. Create `debug-panel.js` and `debug-panel.css`.
2. Wire to `index.html` and add keyboard shortcut.
3. Add refresh hooks after data load and `populateSlides()`.
4. Verify panel functionality with sample and real exports.

---

## Implementation Notes (Completed)

- Added debug panel assets and wiring:
	- CSS: `css/core/debug-panel.css`
	- JS: `js/debug-panel.js`
	- Includes in `index.html`
- Keyboard toggle changed to **Ctrl+Alt+D** (Ctrl+Shift+D conflicts with browser “Bookmark all tabs”).
- Debug panel reads from `window.*` globals; added `syncDebugGlobals()` in `app.js` to keep them updated after each data load step.
- Added `refreshDebugPanel()` call after `populateSlides()` so the overlay updates automatically.
- Added slide-aware auto-scroll and highlighting:
	- Each section has a `data-section` anchor.
	- `showSlide()` calls `focusDebugSection()` to jump to the relevant area.
	- Active section is highlighted with a subtle accent background.

## Stability Fixes (Related)

While integrating the panel, `app.js` contained duplicate top-level declarations (e.g., `gallerySlideData`, `renderImageGallery`, `renderSparkline`, slide flags). These caused JavaScript parse errors and made the UI unresponsive. Duplicates were removed so the page can initialize and the debug panel can render.

## Current UX Behavior

- Open the panel with **Ctrl+Alt+D**.
- As slides change, the panel auto-scrolls to the matching section.
- The active section is visually highlighted so it’s easy to verify data alignment without manual scrolling.
