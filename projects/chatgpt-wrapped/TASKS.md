# ChatGPT Wrapped — Active Tasks

> ⚠️ **CRITICAL:** Do NOT break existing functionality. Test after every change.

---

# 🗂️ PROJECT 1: Code Organization

> **Goal:** Break down `app.js` (4,254 lines) and `styles.css` (7,143 lines) into modular, per-slide files.

## Target Structure

```
js/
├── core/
│   ├── state.js, init.js, file-handling.js
│   ├── analysis.js, navigation.js, utils.js
├── slides/
│   ├── slide-01-conversations.js ... slide-18-share.js
└── app.js (entry point)

css/
├── core/
│   ├── variables.css, base.css, upload.css
│   ├── processing.css, navigation.css, modals.css
├── slides/
│   ├── slide-01-conversations.css ... slide-18-share.css
└── styles.css (entry point with @imports)
```

## Tasks

### R1: Directory Structure ✅
- [x] Create `js/core/` and `js/slides/` directories
- [x] Create `css/core/` and `css/slides/` directories

### R2: Extract Core JS (6 files) ✅
- [x] `state.js` — global state variables
- [x] `init.js` — DOMContentLoaded, keyboard nav, modals
- [x] `file-handling.js` — processFile, showError, loadJSZip
- [x] `analysis.js` — analyzeConversations()
- [x] `navigation.js` — showSlide, nextSlide, prevSlide, showScreen
- [x] `utils.js` — shared utilities

### R3: Extract Slide JS (15 files)
- [x] slide-01-conversations.js
- [x] slide-02-messages.js
- [x] slide-03-topics.js
- [x] slide-04-identity.js
- [x] slide-05-obsession.js
- [x] slide-07-time-personality.js
- [x] slide-08-evolution.js
- [x] slide-09-themes.js
- [x] slide-10-gallery.js
- [x] slide-13-fun-facts.js
- [x] slide-14-heatmap.js
- [x] slide-15-verdict.js
- [x] slide-16-achievements.js
- [x] slide-17-word-bubbles.js
- [x] slide-18-share.js

### R4: Extract Core CSS (6 files) ✅
- [x] `variables.css` — :root vars, fonts
- [x] `base.css` — reset styles
- [x] `upload.css` — upload screen
- [x] `processing.css` — processing screen
- [x] `navigation.css` — nav buttons, dots
- [x] `modals.css` — evidence modal

### R5: Extract Slide CSS (15 files) ✅
- [x] slide-01-conversations.css
- [x] slide-02-messages.css
- [x] slide-03-topics.css
- [x] slide-04-identity.css
- [x] slide-05-obsession.css
- [x] slide-07-time-personality.css
- [x] slide-08-evolution.css
- [x] slide-09-themes.css
- [x] slide-10-gallery.css
- [x] slide-13-fun-facts.css
- [x] slide-14-heatmap.css
- [x] slide-15-verdict.css
- [x] slide-16-achievements.css
- [x] slide-17-word-bubbles.css
- [x] slide-18-share.css

### R6: Entry Points & Integration
- [x] Create `js/app.js` entry point (imports all modules)
- [x] Create `css/styles.css` with @import statements
- [x] Update `index.html` to reference new structure

### R7: Testing
- [ ] All 15 slides render correctly
- [ ] All animations work
- [ ] Navigation (keyboard + buttons) works
- [ ] Evidence bubbles and modals work
- [ ] Image gallery filtering works
- [ ] No console errors

---

# 🎬 PROJECT 2: Video Export (Canvas + WebCodecs API)

> **Goal:** Generate a cinematic, sharable video (like Spotify Wrapped) — NOT a screen recording of slides.

## Vision

**What this IS:**
- A custom-rendered, 30-60 second cinematic video
- Spotify Wrapped / Apple product video style
- Portrait (9:16) for Instagram/TikTok Stories
- Kinetic typography, animated counters, particle effects
- Smooth scene transitions, visual rhythm

**What this is NOT:**
- A screen recording of existing slides
- A slideshow with static images
- A simple DOM capture

## Technical Approach: Option A (Canvas + WebCodecs API)

```
User's Stats → Custom Canvas Animations → MediaRecorder API → WebM/MP4
```

**Why this approach:**
- Full creative control over every frame
- Native browser APIs (no heavy dependencies)
- Client-side only (no server needed)
- Real-time preview before export

## File Structure

```
js/video/
├── video-generator.js      // Main orchestrator
├── renderer.js             // Canvas rendering + recording
├── design-system.js        // Visual design constants & utilities ✅ (NEW)
├── scenes/
│   ├── scene-base.js       // Base scene class
│   ├── scene-intro.js      // "Your ChatGPT Wrapped" title
│   ├── scene-conversations.js // Conversations count
│   ├── scene-messages.js   // Messages count
│   ├── scene-topics.js     // Top topics reveal
│   ├── scene-personality.js // Identity + time personality
│   ├── scene-journey.js    // Evolution + peak month
│   ├── scene-achievements.js // Badges fly in
│   └── scene-outro.js      // "That's a wrap!"
├── animations/
│   ├── tween.js            // Easing & tweening utilities
│   ├── counter.js          // Animated number counting
│   ├── text-reveal.js      // Text reveal animations
│   ├── particles.js        // Particle/confetti effects
│   └── transitions.js      // Scene transitions (fade, slide, zoom)
└── ui/
    └── video-modal.js      // Generation UI/modal ✅

css/video/
└── video-ui.css            // Recording UI styles
```

## Content Timeline (30s default)

| Time | Scene | Content | Animation |
|------|-------|---------|-----------|
| 0-3s | Intro | "Your ChatGPT Wrapped" | Zoom in with glow |
| 3-7s | Stats | "847 conversations" | Number counts up + particles |
| 7-11s | Stats | "9,665 messages" | Slides in from right |
| 11-15s | Topics | Top 3 topics with icons | Staggered reveal |
| 15-19s | Personality | "Night Owl" + archetype | Clock animation + text |
| 19-23s | Journey | Peak month + trend line | Graph draws in |
| 23-27s | Achievements | 3 badges | Fly in with bounce |
| 27-30s | Outro | "That's a wrap!" | Fade + CTA |

## Data Sources

```javascript
// All available from global state after analysis:
stats.basic.totalConversations   // 847
stats.basic.totalMessages        // 9665
stats.basic.dateRange            // "Mar 2023 - Jan 2026"
stats.basic.avgPerDay            // 2.3
stats.enhanced.topTopics         // [{topic: "coding", count: 234}, ...]
stats.enhanced.personality       // "Night Owl"
stats.enhanced.peakMonth         // {month: "Nov 2024", count: 1172}
stats.enhanced.achievements      // [{name: "Early Adopter", ...}, ...]
identityData.archetype           // "The Code Maestro"
identityData.traits              // ["Night Owl", "Deep Diver"]
timePersonalityData.type         // "Night Owl"
timePersonalityData.peakHour     // 22
```

---

## Tasks

### V1: Core Infrastructure ✅
- [x] Create `js/video/` and `css/video/` directories
- [x] Create `renderer.js` — Canvas setup, frame loop, MediaRecorder integration
- [x] Create `video-generator.js` — Orchestrates scenes, timing, export
- [x] Create `tween.js` — Easing functions (easeOutCubic, easeInOutQuad, etc.)

### V2: Base Scene System ✅
- [x] Create `scene-base.js` — Abstract scene class with lifecycle:
  - `enter()` — Setup, called once when scene starts
  - `update(deltaTime)` — Animation logic per frame
  - `render(ctx)` — Draw to canvas
  - `exit()` — Cleanup, transition out
- [x] Implement scene sequencing in video-generator.js
- [x] Add scene transition system (fade, crossfade, slide)

### V3: Animation Utilities ✅
- [x] Create `counter.js` — Animated number counting (0 → target over duration)
- [x] Create `text-reveal.js` — Character-by-character and word-by-word reveals
- [x] Create `particles.js` — Sparkle/confetti effects on number completion
- [x] Create `transitions.js` — Scene-level transitions (done in V2)

### V4: Scene Implementation (7 scenes) ✅
- [x] `scene-intro.js` — "Your ChatGPT Wrapped" title with zoom + glow
- [x] `scene-conversations.js` + `scene-messages.js` — Stats with particles
- [x] `scene-topics.js` — Top 3 topics with icons, staggered reveal
- [x] `scene-personality.js` — Identity archetype + time personality
- [x] `scene-journey.js` — Peak month with mini trend graph
- [x] `scene-achievements.js` — 3 achievement badges fly in
- [x] `scene-outro.js` — "That's a wrap!" with celebration

### V5: Visual Design System ✅
- [x] Define video color palette (dark bg, #10a37f accent, gradients)
- [x] Create gradient backgrounds (animated subtle movement)
- [x] Implement consistent typography (bold numbers, clean text)
- [x] Add glow effects for emphasis
- [x] Particle system polish (size, velocity, fade)

**Files Created:**
- `js/video/design-system.js` — Centralized design constants (colors, gradients, typography, particles)

**Enhancements:**
- `scene-base.js` — Added animated gradient support, pulsing glow effects, breathing animations
- `particles.js` — Polished burst, sparkle, confetti with design system integration

### V6: Recording System ✅
- [x] Implement `MediaRecorder` integration with canvas stream
- [x] Add frame rate control (30fps default, supports 15/24/30/60)
- [x] Implement WebM encoding (VP9 codec with VP8/MP4 fallbacks)
- [x] Add progress tracking (% complete + time remaining estimate)
- [x] Handle recording errors gracefully with detailed messages

**Enhancements to `renderer.js`:**
- Fixed timestep frame loop for consistent animations
- Quality presets: low (2.5Mbps), medium (5Mbps), high (8Mbps), ultra (12Mbps)
- Recording state machine: idle → recording → stopping → complete/error
- `getRecordingSupport()` — Detailed browser/codec support info
- `getRecordingStats()` — Live stats (frames rendered, dropped, size)
- Dropped frame detection and recovery
- Browser detection for Safari/iOS warnings

### V7: User Interface ✅
- [x] Add "🎬 Create Video" button to slide-18-share.html
- [x] Create video generation modal:
  - Format selector (9:16 Portrait, 1:1 Square)
  - Duration selector (30s, 45s, 60s)
  - Preview canvas (live preview before recording)
  - "Generate" button
  - Progress bar during recording
  - Download button when complete
- [x] Create `video-ui.css` with modal styling (already existed)

**Files Created/Updated:**
- `js/video/ui/video-modal.js` — Modal controller class with full UI logic
- `slides/slide-18-share.html` — Added "Create Video" button
- `index.html` — Added video modal HTML and script reference

**Features:**
- `VideoModal` class with state machine (idle → previewing → recording → complete)
- Browser support detection with Safari/iOS warnings
- Format & duration selectors with live preview updates
- Progress bar with time remaining estimate
- Recording indicator with pulse animation
- Scene indicator showing current scene name
- Download section with file size display
- Keyboard support (Escape to close)
- Click outside to close

### V8: Preview Mode ✅
- [x] Implement real-time preview in modal (plays scenes without recording)
- [x] Add play/pause/restart controls for preview
- [x] Show timeline scrubber for scene navigation

**Enhancements to `video-modal.js`:**
- State machine extended: `idle` → `previewing` → `paused` → `recording` → `complete`
- `pausePreview()` / `resumePreview()` / `restartPreview()` methods
- Timeline scrubber with drag support (mouse + touch)
- Scene markers on timeline (clickable to jump)
- Time display (mm:ss format)
- Keyboard shortcuts: Space (play/pause), R (restart), Escape (close)
- Auto-loop preview when complete

**New CSS in `video-ui.css`:**
- `.video-preview-controls` — Control bar container
- `.video-control-btn` — Play/pause/restart buttons
- `.video-timeline-scrubber` — Draggable timeline
- `.video-scene-markers` — Scene position indicators
- `.video-time-display` — Current time / total time

### V9: Export & Download
- [ ] Generate WebM blob from MediaRecorder
- [ ] Create download with filename: `chatgpt-wrapped-{timestamp}.webm`
- [ ] Show file size after generation
- [ ] Add "Copy to clipboard" for supported browsers

### V10: Browser Compatibility
- [ ] Detect MediaRecorder support
- [ ] Show fallback message for unsupported browsers (Safari, iOS)
- [ ] Test on Chrome (primary), Firefox, Edge
- [ ] Add feature detection warnings in UI

### V11: Polish & Performance
- [ ] Optimize canvas rendering (minimize redraws)
- [ ] Add loading states for scene assets
- [ ] Smooth out any janky animations
- [ ] Test with various data sizes (small/large conversation counts)
- [ ] Memory management (cleanup after generation)

### V12: Integration Testing
- [ ] Full flow: Generate video from fresh data upload
- [ ] Verify all stats display correctly in video
- [ ] Test all 3 duration options
- [ ] Test both format options (9:16, 1:1)
- [ ] Verify download works across browsers

---

## Animation Principles

| Principle | Implementation |
|-----------|----------------|
| **Easing** | `cubic-bezier(0.4, 0, 0.2, 1)` for all motion |
| **Number counting** | 1.5-2s duration, ease-out |
| **Text reveals** | 0.5-1s, staggered by character or word |
| **Scene transitions** | 0.3-0.5s crossfade |
| **Stagger delay** | 100-150ms between sequential elements |
| **Particles** | Spawn on number completion, 1s lifetime |

## Canvas Specs

| Property | Value |
|----------|-------|
| **Portrait (9:16)** | 1080 × 1920 px |
| **Square (1:1)** | 1080 × 1080 px |
| **Frame rate** | 30 fps |
| **Background** | Linear gradient (#0d0d0d → #1a1a2e) |
| **Accent color** | #10a37f (ChatGPT green) |
| **Font** | System sans-serif (or Inter if loaded) |

---

## Browser Support

| Browser | MediaRecorder | WebM | Status |
|---------|---------------|------|--------|
| Chrome 49+ | ✅ | ✅ | **Primary target** |
| Firefox 29+ | ✅ | ✅ | Supported |
| Edge 79+ | ✅ | ✅ | Supported |
| Safari 14.1+ | ⚠️ | ❌ (MP4 only) | Limited |
| iOS Safari | ❌ | ❌ | Not supported |

**Fallback:** Show message "Video export requires Chrome, Firefox, or Edge"

---

## Dependencies

| Package | Purpose | Size | Required |
|---------|---------|------|----------|
| None | Canvas API is built-in | 0KB | ✅ |
| None | MediaRecorder is built-in | 0KB | ✅ |
| (Optional) GSAP | Advanced animations | ~60KB | ❌ |
| (Optional) FFmpeg.wasm | MP4 conversion | ~25MB | ❌ |

**Goal:** Zero external dependencies for core functionality
