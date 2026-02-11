# Task 4A: Design System

> **Phase:** 4 — Presentation  
> **Task ID:** 4A  
> **Estimated Effort:** 1 day  
> **Status:** Not Started

---

## Context Summary

You are working on **ChatGPT Wrapped** — a "Spotify Wrapped"-style experience that analyzes a user's ChatGPT data export and presents personalized insights as a swipeable, poster-style 16-slide deck. The slides should look like something you'd hang on a wall — bold, saturated, mobile-first, shareable. Think Spotify Wrapped meets Instagram Stories.

This task builds the **Design System** — the shared visual foundation that all 16 slides inherit from. This includes color palettes, typography scales, animation primitives, layout systems, and the share card template. This task has **no data dependency** — it can start as early as Phase 1 since it only needs to know the slide inventory (which is already defined).

---

## Goal

Create the design system foundation: color palettes, typography, animation primitives, layout system, and share card template. Every slide in the Wrapped experience inherits from these primitives.

---

## Interface Contracts

This task does not consume or produce the standard data interfaces. It produces CSS/style primitives that the Slide Implementation task (4B) consumes.

### Design System Output (What Task 4B Consumes)

```typescript
// Color palette for each slide
interface SlidePalette {
  background: string;           // e.g., "#1a0533" (deep purple)
  textPrimary: string;          // Headline color (usually white)
  textSecondary: string;        // Subline color (usually white/70%)
  accent: string;               // Accent color for numbers, highlights
}

// Typography scale
interface TypographyScale {
  heroNumber: string;           // 120pt+ for single numbers
  headline: string;             // Primary insight text
  subline: string;              // Supporting evidence text
  caption: string;              // Small labels, dates
}

// Animation config
interface AnimationConfig {
  countUp: { duration: number; easing: string };
  drawCurve: { duration: number; easing: string };
  fillGrid: { duration: number; stagger: number; easing: string };
  fadeIn: { duration: number; easing: string };
}
```

---

## Detailed Requirements

### 1. Color Palette System

Create 8 bold, saturated slide palettes. Adjacent slides in the deck must use different palettes to create a gallery feel when swiping.

**Palette requirements:**
- Dark mode default: saturated background with white/light text.
- High contrast: passes WCAG AA for large text at minimum.
- Looks good in screenshots (OLED-friendly, no pure blacks).
- Each palette has: `background`, `textPrimary`, `textSecondary`, `accent`.

**Suggested palettes (adjust as needed for visual harmony):**

| # | Name | Background | Text | Accent | Best For |
|---|------|-----------|------|--------|---------|
| 1 | Deep Purple | `#1a0533` | `#ffffff` | `#c084fc` | Hook, Trajectory |
| 2 | Electric Blue | `#0c1445` | `#ffffff` | `#60a5fa` | Year at a Glance, Benchmarks |
| 3 | Warm Amber | `#3d1c00` | `#ffffff` | `#fbbf24` | Growth, Compliment |
| 4 | Ocean Teal | `#042f2e` | `#ffffff` | `#2dd4bf` | Correlations, Behavioral Split |
| 5 | Hot Pink | `#4a0028` | `#ffffff` | `#f472b6` | Life Event, Fun Facts |
| 6 | Forest Green | `#052e16` | `#ffffff` | `#4ade80` | Heatmap, Active Days |
| 7 | Slate Blue | `#1e1b4b` | `#ffffff` | `#818cf8` | Top Topics, Depth |
| 8 | Sunset Orange | `#431407` | `#ffffff` | `#fb923c` | Peak Moment, Share |

**Assignment rule:** Each slide gets a palette index. Adjacent slides must not share the same palette. Implement a `getPalette(slideIndex: number): SlidePalette` function.

### 2. Typography System

All text is bold sans-serif. Dramatic size contrast between headline and subline.

| Role | Size (mobile) | Weight | Line Height |
|------|-------------|--------|-------------|
| **Hero number** | 96–120px | 800 (Extra Bold) | 1.0 |
| **Headline** | 28–36px | 700 (Bold) | 1.2 |
| **Subline** | 16–20px | 400 (Regular) | 1.4 |
| **Caption** | 12–14px | 400 | 1.4 |

**Font:** Use a bold sans-serif system font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`. No custom font loading required (keeps it fast).

**Key rule:** The type IS the design. No icons, no illustrations. Size contrast between headline and subline should be dramatic (at least 2x).

### 3. Animation Primitives

All animations are under 1 second. Purposeful reveals, not loading screens.

| Animation | Duration | Easing | Description |
|-----------|----------|--------|-------------|
| **Count Up** | 800ms | `ease-out` | Numbers animate from 0 to final value |
| **Draw Curve** | 1000ms | `ease-in-out` | SVG path draws from left to right (usage curve) |
| **Fill Grid** | 800ms | `ease-out` | Heatmap cells fill in with staggered delay (20ms per cell) |
| **Fade In** | 400ms | `ease-out` | Text elements fade in (headline first, then subline 200ms later) |
| **Slide Enter** | 300ms | `ease-out` | Slide enters from right on swipe |

Implement these as reusable CSS animations/transitions or as small utility functions for the slide components.

### 4. Layout System

Mobile-first, portrait orientation. The canonical experience is a phone held vertically.

**Slide layout:**
```
┌─────────────────────────┐
│                         │
│      (top padding)      │
│                         │
│    ┌─────────────────┐  │
│    │   HEADLINE       │  │  ← Centered, dominant
│    │   (massive)      │  │
│    └─────────────────┘  │
│                         │
│    ┌─────────────────┐  │
│    │   Subline        │  │  ← Centered, smaller
│    │   (evidence)     │  │
│    └─────────────────┘  │
│                         │
│      (bottom padding)   │
│                         │
└─────────────────────────┘
```

**Rules:**
- Content area: max-width 340px, centered horizontally and vertically.
- Padding: 24px horizontal, 48px vertical (minimum).
- Two text layers max per slide. No third element.
- Visualization slides (curve, heatmap) give the visual 80%+ of the space, with a small caption.

**Breakpoints:**
- Mobile portrait (< 430px): Canonical experience.
- Mobile landscape / tablet: Scale up proportionally.
- Desktop: Center the slide in a phone-sized frame (max 430px wide).

### 5. Share Card Template

The share card is formatted for Instagram Stories: 1080 × 1920 pixels.

**Content:** The share card includes:
- The hook statement (headline)
- The top benchmark stat (subline)
- "ChatGPT Wrapped" branding (small, bottom)
- One of the bold color palettes as background

**Implementation:** This can be a separate component or a canvas/SVG renderer. The key constraint is the 1080 × 1920 output format.

### 6. Placeholder Slide Style

When data is insufficient for a slide, show a styled placeholder — not a blank screen, not an error.

**Placeholder design:**
- Same palette as the slide would normally use.
- Centered text: "Not enough data for this insight" (or similar).
- Smaller subline: "Keep using ChatGPT and check back next year."
- Same typography and layout system — just different content.

---

## File Ownership

| File | Action |
|------|--------|
| `src/styles/wrapped-design-system.css` (or `.ts` / `.module.css`) | **CREATE** — Color palettes, typography scale, layout system, animation keyframes. |
| `src/lib/design-system.ts` | **CREATE** — `getPalette()`, animation config constants, layout constants, share card dimensions. |

**Do NOT** edit any existing component files. The design system is a standalone foundation. Task 4B (Slide Implementation) will import from these files.

---

## Edge Cases & Constraints

| Scenario | Expected Behavior |
|----------|-------------------|
| **User is on a very small screen (320px)** | Typography scales down proportionally. Hero numbers cap at 80px. |
| **User is on desktop** | Slide is centered in a phone-frame container, max 430px wide. |
| **Dark mode OS setting** | The slides are always dark mode (saturated backgrounds). No light mode variant needed. |
| **Adjacent slides get assigned same palette** | The `getPalette()` function must guarantee adjacent slides differ. Use modular assignment with an offset. |
| **Accessibility: screen readers** | All text content should be in semantic HTML elements. Colors pass WCAG AA for large text. |
| **Share card on different platforms** | 1080×1920 is standard for Instagram Stories and works well on most platforms. |

---

## Acceptance Criteria

- [ ] 8 distinct color palettes defined with background, text, and accent colors
- [ ] All palettes pass WCAG AA contrast for large text
- [ ] Adjacent slides always use different palettes
- [ ] Typography scale defined: hero (96-120px), headline (28-36px), subline (16-20px), caption (12-14px)
- [ ] Animation primitives defined: count-up, draw-curve, fill-grid, fade-in, slide-enter
- [ ] All animations under 1 second
- [ ] Layout system: mobile-first portrait, max 340px content width, centered
- [ ] Desktop view: phone-frame centered layout (max 430px)
- [ ] Share card template: 1080×1920, includes hook + stat + branding
- [ ] Placeholder slide style matches the design system
- [ ] `getPalette(slideIndex)` function returns the correct palette with no adjacent duplicates
- [ ] No imports from data/detector/narrative files — this is purely visual

---

## Dependencies

| Direction | Task | Relationship |
|-----------|------|-------------|
| **Depends on** | None — can start immediately | Only needs the slide inventory (known from the product outline) |
| **Unblocks** | Task 4B (Slide Implementation) | All slides inherit from this design system |
| **Can start during** | Phases 1–3 | No data dependency at all |
