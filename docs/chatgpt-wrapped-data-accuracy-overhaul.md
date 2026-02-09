# ChatGPT Wrapped: Data Accuracy Overhaul

> **Status:** Active — 9/10 items complete (Task 0, Bug 1, Bug 2, Bug 3, Bug 4, Bug 5, Bug 6, Bug 8, Bug 9)  
> **Date:** February 6, 2026 (last updated Feb 9, 2026)  
> **Priority:** Critical  
> **Purpose:** Documents every data accuracy bug in ChatGPT Wrapped, traces root causes to exact lines of code, specifies fixes, and defines a testing strategy to ensure data is correct before and after changes.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Task 0: Debug & Testing Dashboard](#3-task-0-debug--testing-dashboard)
4. [Bug 1: Topic Classification — "general" Catch-All](#4-bug-1-topic-classification--general-catch-all)
5. [Bug 2: Images Never Load](#5-bug-2-images-never-load)
6. [Bug 3: Achievements Completely Broken](#6-bug-3-achievements-completely-broken)
7. [Bug 4: AI Identity Is a Hardcoded Lookup Table](#7-bug-4-ai-identity-is-a-hardcoded-lookup-table)
8. [Bug 5: Cosmic Revelations Are Slide Repeats](#8-bug-5-cosmic-revelations-are-slide-repeats)
9. [Bug 6: Obsession Slide Shows "general"](#9-bug-6-obsession-slide-shows-general)
10. [Bug 7: Server-Side LLM Prompts Need Refinement](#10-bug-7-server-side-llm-prompts-need-refinement)
11. [Bug 8: No Hardcoded Insights Allowed](#11-bug-8-no-hardcoded-insights-allowed)
12. [Bug 9: Themes Slide Counts Are Wildly Inflated](#12-bug-9-themes-slide-counts-are-wildly-inflated)
13. [Data Flow Diagrams](#13-data-flow-diagrams)
14. [Execution Order & Dependencies](#14-execution-order--dependencies)
15. [Testing Checklist](#15-testing-checklist)

---

## 1. Executive Summary

The ChatGPT Wrapped feature has **nine interconnected data accuracy bugs** that cause the majority of slides to display incorrect, generic, or missing data. The bugs fall into three categories:

| Category | Bugs | Impact | Status |
|----------|------|--------|--------|
| **Broken Data Extraction** | Topic classification, image detection, theme counts | 83% of conversations miscategorized; 100% of images missing; theme message counts wildly inflated | ✅ All fixed (Bug 1, Bug 2, Bug 9) |
| **Broken Data Wiring** | Achievements data flow | Streaks, active days, OG status, artist badge all fail | ✅ Fixed |
| **No Real Analysis** | AI identity, cosmic revelations, obsession, non-LLM insights | Hardcoded lookup tables instead of actual data analysis | ✅ All fixed (Bug 4, Bug 5, Bug 6, Bug 8 done) |

**The single most damaging root cause** is the topic classifier. It only recognizes 4 narrow regex patterns, dumping everything else into "general." Since the AI identity, obsession slide, personality title, spirit animal, roasts, and compliments ALL derive from the top topic, when the top topic is "general", every downstream feature produces generic garbage.

### Affected Slides

| Slide | What's Wrong | Root Cause |
|-------|-------------|------------|
| Slide 4: AI Identity | ~~"The Seeker" / "Wise and observant"~~ Fixed | ~~Hardcoded lookup from topic → personality~~ Now behavioral analysis (Bug 4 ✅) |
| Slide 5: Obsession | ~~"#1 Obsession: general"~~ Fixed | ~~Topic classifier too narrow~~ Now shows meaningful topic with display names, expanded icons, defense-in-depth safeguard (Bug 1 + Bug 6 ✅) |
| Slide 10: Gallery | "No images" despite having many | Image detection broken + imagePrompts never populated (Bug 2) |
| Slide 13: Fun Facts | ~~Repeats of other slides~~ Fixed | ~~No unique fact generation logic~~ Now generates unique facts via `generateClientFunFacts()` + unique fallback (Bug 5 ✅) |
| Slide 15: Verdict | Generic roast/compliment | Derived from "general" topic (Bug 1 cascade) |
| Slide 9: Themes | Message counts wildly inflated (e.g., 23K in a single theme when total is 23K) | Three compounding bugs in `generateDiscoveredThemes()`: counts all mapping nodes per matching convo, allows multi-theme counting, and uses overly broad regex (Bug 9) |
| Slide 16: Achievements | Most badges locked/wrong | Streak, active days, OG, artist data never wired in (Bug 3) |

---

## 2. Architecture Overview

There are **two data paths** for ChatGPT Wrapped. Understanding which path you're on is critical because the bugs differ:

### Path A: Client-Side File Upload (processFile)

```
User uploads ZIP/JSON
    ↓
processFile() — js/app.js:130
    ↓
analyzeConversations() — js/app.js:230
    → Returns: stats (totalConversations, totalMessages, topics, peakHour, images counter)
    ↓
generateEnhancedAnalysis() — js/app.js:3309
    → Returns: stats.enhanced (nightOwlScore, marathonConvos, weekendRatio, topicsOld/Recent)
    → MISSING: longestStreak, totalActiveDays (computed elsewhere)
    ↓
generateDiscoveredThemes() — js/app.js:3471
    → Returns: discoveredThemes array
    ↓
extractTopWords() — js/app.js:3441
    → Returns: stats.topWords array
    ↓
generateHeatmapData() — js/app.js:3511
    → Returns: heatmapData (with stats.activeDays, stats.longestStreak)
    → BUG: These stats are stored in heatmapData.stats, NOT in stats.enhanced
    ↓
generateDataInsights() — js/app.js:3623
    → Returns: aiInsights (personality, spiritAnimal, roast, compliment, etc.)
    → BUG: Just a lookup table from topic category, not real analysis
    ↓
populateSlides() — js/app.js:601
```

**Key bugs in Path A:**
- `imagePrompts` array is NEVER populated (stays empty `[]`)
- `imageStats` is NEVER updated (stays `{ generated: 0, uploaded: 0, total: 0 }`)
- `stats.streaks` is NEVER set
- `stats.firstDate` is NEVER set
- `heatmapData.stats.longestStreak` and `heatmapData.stats.activeDays` are computed but never wired to `stats.enhanced` or `stats.streaks`

### Path B: Server API (loadMyData)

```
User clicks "Load My Data"
    ↓
loadMyData() — js/app.js:3028
    ↓
fetch('/api/wrapped/stats')   → stats (includes streaks, firstDate from DB)
fetch('/api/wrapped/insights') → aiInsights (LLM-generated), discoveredThemes
fetch('/api/wrapped/images')   → imagePrompts, imageStats (from gallery-manifest.json)
fetch('/api/wrapped/heatmap')  → heatmapData
    ↓
populateSlides() — js/app.js:601
```

**Key bugs in Path B:**
- Topic classification still happens on server with similar narrow regex
- LLM prompts may produce generic output if not constrained
- Image loading works IF gallery-manifest.json exists (server-side parser is correct)
- Streaks/activeDays work IF DB has correct data

### Which Path Has Which Bugs

| Bug | Path A (File Upload) | Path B (Server API) |
|-----|---------------------|-------------------|
| Topic classification | Broken (narrow regex) | Partially broken (same regex in stats endpoint) |
| Images | Completely broken | Works if manifest exists |
| Achievements | Completely broken | Partially works (depends on DB data) |
| AI Identity | Hardcoded lookup | Uses LLM (better, but generic prompts) |
| Cosmic Revelations | ~~Repackaged stats~~ Fixed (unique funFacts + unique fallback) | Uses LLM funFacts (better if prompt is good) |
| Obsession | ~~Shows "general"~~ Fixed — display names + safeguard | Shows LLM-derived topic (better) + defense-in-depth safeguard |

**Conclusion:** Path A (file upload) is far more broken than Path B. Most fixes needed are in the client-side JavaScript.

---

## 3. Task 0: Debug & Testing Dashboard

> **Status:** ✅ Complete (Feb 6, 2026)

### Why This Is First

You cannot fix what you cannot see. Every other fix requires the ability to:
1. Upload a file (or load sample data)
2. Immediately inspect every extracted value
3. Verify the fix worked
4. Repeat

### Specification

**Activation:** Keyboard shortcut `Ctrl+Alt+D` (or a hidden button in the UI)

**Implementation Update:** The actual shortcut is now **Ctrl+Alt+D** (Ctrl+Shift+D conflicts with the browser “Bookmark all tabs”). The panel also auto-scrolls and highlights the relevant section as slides change.

**Location:** An overlay panel that slides in from the right side of the screen, does not interfere with the wrapped slides underneath.

**Sections to Display:**

#### Section 1: Raw Stats
```
Total Conversations: 1,427
Total Messages: 12,843
User Messages: 6,421
Code Blocks: 234
Images Detected: 47
Peak Hour: 2pm
```

#### Section 2: Topic Classification Breakdown
```
coding:    312  (21.9%)
writing:   189  (13.2%)
learning:  267  (18.7%)
planning:   98   (6.9%)
creative:   45   (3.2%)
general:  516  (36.2%)  ← THIS IS THE PROBLEM
```
Show a bar chart. Highlight "general" in red if it's the #1 topic.

#### Section 3: Image Detection
```
imagePrompts array length: 0  ← SHOULD NOT BE 0
imageStats: { generated: 0, uploaded: 0, total: 0 }

Image detection log:
  - content_type === 'image_asset_pointer': 0 found
  - content_type === 'multimodal_text' with image parts: 47 found
  - DALL-E tool calls: 12 found
  - Total images that should be in gallery: 59
```

#### Section 4: Achievement Data Sources
```
stats.enhanced.longestStreak: undefined  ← BUG
stats.streaks?.longestStreak: undefined  ← BUG
heatmapData.stats.longestStreak: 14     ← DATA EXISTS HERE

stats.enhanced.totalActiveDays: undefined ← BUG
stats.streaks?.totalActiveDays: undefined ← BUG
heatmapData.stats.activeDays: 287       ← DATA EXISTS HERE

stats.firstDate: undefined               ← BUG
Earliest conversation create_time: 2023-03-15  ← SHOULD BE THIS

imageStats.generated: 0                  ← BUG (images not extracted)
```

#### Section 5: AI Insights
```
personality.title: "The Seeker"  ← GENERIC FALLBACK
personality.subtitle: "Multi-disciplinary explorer"
spiritAnimal: { animal: "owl", reason: "Wise and observant" }  ← GENERIC
topObsession.topic: "general"   ← USELESS
topObsession.roast: "..."
oneLineRoast: "..."
compliment: "..."
```

#### Section 6: Achievement Results
For each achievement, show:
```
[✓] messages:       currentValue=12843  threshold=10000  tier=legendary
[✓] conversations:  currentValue=1427   threshold=1000   tier=legendary
[✗] streak:         currentValue=0      threshold=3      tier=LOCKED ← BUG (should be 14)
[✓] nightowl:       currentValue=32     threshold=30     tier=gold
[✗] topics:         currentValue=5      threshold=5      tier=LOCKED ← only 5 because most are "general"
[✗] artist:         currentValue=0      threshold=1      tier=LOCKED ← BUG (should be 47)
[✗] dedication:     currentValue=0      threshold=7      tier=LOCKED ← BUG (should be 287)
[✗] og:             currentValue=9999   threshold=2024   tier=LOCKED ← BUG (should be 2023)
```

#### Section 7: Export Button
A "Copy Debug Data" button that copies all the above as JSON to the clipboard for sharing/filing bugs.

### Current Snapshot (Feb 7, 2026 — updated)

Captured from debug panel after loading real data:

- **Topics:** ✅ Fixed
  - `coding`: 399, `writing`: 168, `web-dev`, `product`, `learning`, etc. now properly classified
  - `general` reduced from #3 (164 convos) to a small minority with the expanded ~50-category classifier
  - **Observation:** Topic classification overhaul resolved the catch-all problem. Was: `general` still ranks #3 → Topic classifier still too narrow.
- **Images:** ✅ Fixed
  - `imagePrompts.length`: 247 (was 0)
  - `imageStats`: `{ generated: 247, total: 247 }` (uploaded images intentionally excluded)
  - 246/247 images resolve to real thumbnails from ZIP subfolders
  - **Observation:** Full image pipeline working — extraction, ZIP resolution (including `sediment://` + `file-service://`), and gallery rendering.
- **Heatmap / Achievements:** ✅ Fixed
  - `heatmapStats.activeDays`: 596, `heatmapStats.longestStreak`: 21 (from latest debug data)
  - `stats.enhanced.longestStreak` and `stats.enhanced.totalActiveDays` now wired from `heatmapData.stats`
  - `stats.firstDate` now computed from earliest `create_time` across all conversations
  - **Observation:** Streak, dedication, OG, and artist achievements now unlock correctly.
- **AI Insights:** ✅ Bug 4 fixed (Bug 8 partially addressed)
  - Personality now data-driven via `generatePersonality()` behavioral engine (5 dimensions, 20+ combinations).
  - Spirit animal reason references real numbers (marathon count, night-owl %, active days).
  - All secondary fields (`hiddenTheme`, `questionStyle`, `obsessionDetail`, `trendInsight`) now data-driven.
  - `funFacts` array generated for client-side Cosmic Revelations (unique insights, not stat repeats).
  - Roast/compliment pools expanded from 5 to 35+ topic categories.
  - **Observation:** No more static/hardcoded insight strings. All insights reference actual user data.

### Implementation Notes

- Create new file: `js/debug-panel.js`
- Create new file: `css/core/debug-panel.css`
- Add `<script>` and `<link>` tags to `index.html`
- Register keyboard listener in `js/core/init.js`
- The panel reads from the same global variables (`stats`, `aiInsights`, `imagePrompts`, `imageStats`, `heatmapData`, `discoveredThemes`)
- Panel auto-refreshes when data changes (listen for slide population)

### What Was Implemented

- **`js/debug-panel.js`** and **`css/core/debug-panel.css`** created.
- Activated via **Ctrl+Alt+D** keyboard shortcut (registered in `js/core/init.js`).
- Overlay panel slides in from the right, does not interfere with slides.
- Displays all sections specified above: raw stats, topic breakdown, image detection, achievement data sources, AI insights, achievement results, and an export/copy button.
- Auto-highlights the relevant debug section as slides change.

---

## 4. Bug 1: Topic Classification — "general" Catch-All

> **Status:** ✅ Complete (Feb 7, 2026)

### Symptom

Your #1 Obsession shows as "general" with 1,184 conversations (83% of all chats). This cascades into generic AI identity, generic roasts, generic personality.

**Current Snapshot:** `general` remains a top-3 category (164 conversations), confirming the classifier is still too narrow.

### Root Cause

**File:** `js/app.js`, lines 271–279 (also duplicated in `js/core/analysis.js`, lines ~35-43)

```javascript
// Topic classification (simple)
const title = (convo.title || '').toLowerCase();
let topic = 'general';
if (title.match(/code|function|api|bug|error|typescript|javascript|python|react/i)) topic = 'coding';
else if (title.match(/write|email|blog|article|copy/i)) topic = 'writing';
else if (title.match(/learn|explain|how|what|why/i)) topic = 'learning';
else if (title.match(/plan|strategy|roadmap|todo/i)) topic = 'planning';
```

**Problems:**
1. Only 4 categories + "general" fallback
2. Only matches on conversation **title**, not message content
3. Regex patterns are too narrow (e.g., "coding" doesn't match "docker", "kubernetes", "sql", "git", "deploy", etc.)
4. "general" is the default, so anything that doesn't match gets dumped there
5. ChatGPT often generates titles like "Help with project" or "Quick question" which match nothing

There's a slightly better version in `generateEnhancedAnalysis()` (line 3361-3366) that adds "creative" but still has the same fundamental problem.

### The Cascade Effect

Since `topTopic` is derived from `stats.topics[0]`, and that's "general", ALL of these downstream values become generic:

| Downstream | Code Location | What Happens |
|-----------|--------------|-------------|
| `aiInsights.topObsession.topic` | app.js:3733 | Set to "general" |
| `aiInsights.personality` | app.js:3744 | Falls through to `{ title: 'The Seeker' }` |
| `aiInsights.spiritAnimal` | app.js:3745 | Falls through to `{ animal: 'owl', reason: 'Wise and observant' }` |
| `aiInsights.obsessionDetail` | app.js:3750 | Falls through to generic text |
| Roasts/compliments | app.js:3660-3698 | Use generic fallback pool entries |

### Fix Specification

#### Step 1: Expand topic categories dramatically

Replace the 4-category regex with **50 categories**:

```javascript
const topicPatterns = [
  // 50 category definitions (see app.js for full list)
  { topic: 'coding', pattern: /.../ },
  { topic: 'web-dev', pattern: /.../ },
  { topic: 'mobile-dev', pattern: /.../ },
  { topic: 'data-analytics', pattern: /.../ },
  { topic: 'ai-ml', pattern: /.../ },
  { topic: 'devops', pattern: /.../ },
  { topic: 'cloud', pattern: /.../ },
  { topic: 'security', pattern: /.../ },
  { topic: 'database', pattern: /.../ },
  { topic: 'testing-qa', pattern: /.../ },
  { topic: 'performance', pattern: /.../ },
  { topic: 'architecture', pattern: /.../ },
  { topic: 'ux-ui', pattern: /.../ },
  { topic: 'product', pattern: /.../ },
  { topic: 'business', pattern: /.../ },
  { topic: 'marketing', pattern: /.../ },
  { topic: 'sales', pattern: /.../ },
  { topic: 'customer-support', pattern: /.../ },
  { topic: 'finance', pattern: /.../ },
  { topic: 'crypto', pattern: /.../ },
  { topic: 'legal', pattern: /.../ },
  { topic: 'hr-people', pattern: /.../ },
  { topic: 'education', pattern: /.../ },
  { topic: 'math', pattern: /.../ },
  { topic: 'science', pattern: /.../ },
  { topic: 'physics', pattern: /.../ },
  { topic: 'chemistry', pattern: /.../ },
  { topic: 'biology', pattern: /.../ },
  { topic: 'astronomy', pattern: /.../ },
  { topic: 'history', pattern: /.../ },
  { topic: 'philosophy', pattern: /.../ },
  { topic: 'politics', pattern: /.../ },
  { topic: 'economics', pattern: /.../ },
  { topic: 'language-learning', pattern: /.../ },
  { topic: 'writing', pattern: /.../ },
  { topic: 'creative', pattern: /.../ },
  { topic: 'design', pattern: /.../ },
  { topic: 'music-audio', pattern: /.../ },
  { topic: 'video-media', pattern: /.../ },
  { topic: 'photography', pattern: /.../ },
  { topic: 'gaming', pattern: /.../ },
  { topic: 'hardware', pattern: /.../ },
  { topic: 'iot', pattern: /.../ },
  { topic: 'robotics', pattern: /.../ },
  { topic: 'travel', pattern: /.../ },
  { topic: 'food-cooking', pattern: /.../ },
  { topic: 'health-fitness', pattern: /.../ },
  { topic: 'mental-health', pattern: /.../ },
  { topic: 'relationships', pattern: /.../ },
  { topic: 'productivity', pattern: /.../ },
];
```

#### Step 2: Analyze message content, not just titles

Currently only the title is checked. Most ChatGPT conversation titles are auto-generated and vague ("Help with this", "Quick question"). The actual message content is far more informative.

```javascript
function classifyConversation(convo) {
  const title = (convo.title || '').toLowerCase();
  const messages = convo.mapping ? Object.values(convo.mapping) : [];
  
  // Collect first 3 user messages for content analysis
  const userMessages = messages
    .filter(m => m.message?.author?.role === 'user')
    .slice(0, 3)
    .map(m => (m.message.content?.parts?.join(' ') || '').toLowerCase())
    .join(' ');
  
  // Combine title + message content for classification
  const fullText = `${title} ${userMessages}`;
  
  // Score each topic
  const scores = {};
  for (const { topic, pattern } of topicPatterns) {
    const matches = fullText.match(pattern);
    scores[topic] = matches ? matches.length : 0;
  }
  
  // Return the highest-scoring topic, or 'other' if nothing matched
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return sorted[0][1] > 0 ? sorted[0][0] : 'other';
}
```

#### Step 3: Keep "general" as fallback (required)

- Do **not** replace `general` with `other`.
- Fallback remains `general` when no category matches.
- Goal: With 50 categories + content analysis, `general` should trend downward and no longer dominate.

#### Step 4: Update both classification locations

The same regex appears in TWO places:
1. `analyzeConversations()` — line 271
2. `generateEnhancedAnalysis()` — line 3361

Both are now replaced with the new `classifyConversation()` function that evaluates **title + first 3 user messages** and returns `other` when no pattern matches.

### How to Test

1. Open debug panel after file upload
2. Check "Topic Classification Breakdown" section
3. "general"/"other" should be <10% of conversations
4. Top topic should be a meaningful category
5. Spot-check 10 conversations manually: does the classification match?

### What Was Implemented

- **`js/core/analysis.js`**: Replaced the 4-category regex with a `classifyConversation()` function containing **~50 topic categories** via `topicPatterns` array. Each pattern has extensive regex coverage (e.g., `coding` now matches docker, kubernetes, sql, git, deploy, webpack, etc.).
- **Content analysis**: The classifier now examines both the conversation **title** and the **first 3 user messages**, combining them into `fullText` for pattern scoring. The highest-scoring topic wins.
- **Fallback to "general"**: Only triggers when no pattern matches at all, which is now rare given the breadth of patterns.
- Both classification call sites (`analyzeConversations()` and `generateEnhancedAnalysis()`) now use the shared `classifyConversation()` function.
- **Result**: With real data, `general` dropped from 83% (#1) to a small minority. Meaningful categories like `coding`, `web-dev`, `writing`, `product`, etc. now dominate.

---

## 5. Bug 2: Images Never Load

> **Status:** ✅ Complete (Feb 7, 2026)

### Symptom

The gallery slide shows "No images to display" even when the user has uploaded many images and generated DALL-E images in their ChatGPT history.

**Current Snapshot:** `stats.images = 0`, `imagePrompts.length = 0`, `imageStats.total = 0`.

### Root Cause — Two Separate Bugs

#### Bug 2A: Image Detection Is Too Narrow

**File:** `js/app.js`, line 261

```javascript
// Check for images
if (msg.content?.content_type === 'image_asset_pointer') images++;
```

This is the ONLY image detection. But in real ChatGPT exports, images appear in **multiple content structures:**

| Structure | What It Is | How It Appears in Export |
|-----------|-----------|------------------------|
| `content_type: 'image_asset_pointer'` | Rarely at the top level | Almost never the direct `content_type` on the message |
| `content_type: 'multimodal_text'` with `parts[]` containing `{ content_type: 'image_asset_pointer', asset_pointer: 'file-service://...' }` | DALL-E generated image output | This is the standard format for AI-generated images |
| `content_type: 'multimodal_text'` with `parts[]` containing objects with `asset_pointer` | User-uploaded image | Standard format for user uploads |
| `metadata.dalle.prompt` | DALL-E tool call metadata | Present on assistant messages that triggered image generation |
| Attachment references in `metadata.attachments` | User file uploads | References to uploaded files |

The server-side parser (`src/ingest/chatgpt/parser.ts`, lines 327-329) correctly handles this:

```typescript
if (content?.content_type === 'multimodal_text' && content.parts) {
  for (const part of content.parts) {
    if (typeof part === 'object' && part.content_type === 'image_asset_pointer') {
```

But the client-side parser does NOT.

#### Bug 2B: imagePrompts Array Is Never Populated

Even if image detection worked, the `processFile()` function (line 130-186) only:
1. Calls `analyzeConversations()` which increments an `images` counter
2. Stores the count in `stats.images`

It **never** creates image objects in the `imagePrompts` array. The gallery slide (`slide-10-gallery.js`, line 49) checks:

```javascript
if (!imagePrompts || imagePrompts.length === 0) {
  // Show no data message, hide everything else
  ...
}
```

Since `imagePrompts` is initialized as `[]` (line 11) and never filled during client-side processing, the gallery always shows "no images."

The server path (Path B) works because it fetches from `/api/wrapped/images` which reads from `gallery-manifest.json`.

### Fix Specification

#### Step 1: Fix image detection in analyzeConversations()

Replace the single-line check at line 261 with comprehensive detection:

```javascript
// Check for images — multiple content structures
let isImage = false;

// 1. Direct image_asset_pointer (rare but possible)
if (msg.content?.content_type === 'image_asset_pointer') {
  isImage = true;
}

// 2. Multimodal text with image parts (standard DALL-E output + uploads)
if (msg.content?.content_type === 'multimodal_text' && msg.content.parts) {
  for (const part of msg.content.parts) {
    if (typeof part === 'object' && part.content_type === 'image_asset_pointer') {
      isImage = true;
      break;
    }
  }
}

// 3. DALL-E metadata on assistant messages
if (msg.metadata?.dalle?.prompt) {
  isImage = true;
}

// 4. User attachments
if (msg.metadata?.attachments?.length > 0) {
  const hasImageAttachment = msg.metadata.attachments.some(att =>
    att.mime_type?.startsWith('image/') || 
    att.name?.match(/\.(png|jpg|jpeg|gif|webp)$/i)
  );
  if (hasImageAttachment) isImage = true;
}

if (isImage) images++;
```

#### Step 2: Extract image objects into imagePrompts during processFile()

After `analyzeConversations()`, add a new function call in `processFile()`:

```javascript
// Extract images for gallery (after analyzeConversations)
const { prompts, stats: imgStats } = extractImagePrompts(data);
imagePrompts = prompts;
imageStats = imgStats;
```

New function `extractImagePrompts(conversations)`:

```javascript
function extractImagePrompts(conversations) {
  const prompts = [];
  let generated = 0;
  let uploaded = 0;
  let idCounter = 0;

  for (const convo of conversations) {
    const messages = convo.mapping ? Object.values(convo.mapping) : [];
    
    for (const node of messages) {
      if (!node.message) continue;
      const msg = node.message;
      
      // DALL-E generated images
      if (msg.content?.content_type === 'multimodal_text' && msg.content.parts) {
        for (const part of msg.content.parts) {
          if (typeof part === 'object' && part.content_type === 'image_asset_pointer') {
            generated++;
            
            // Walk up tree to find the user prompt
            const userPrompt = findParentUserMessage(convo.mapping, node);
            
            prompts.push({
              id: `img-${idCounter++}`,
              source: 'generated',
              prompt: userPrompt || msg.metadata?.dalle?.prompt || 'AI Generated Image',
              conversationTitle: convo.title || 'Untitled',
              imagePath: null,      // No actual file in client-side mode
              hasRealImage: false,   // Can't display actual image from JSON
              imageType: 'Generated',
              gradientColors: generateGradientFromIndex(idCounter),
              index: idCounter,
            });
          }
        }
      }
      
      // DALL-E via metadata
      if (msg.metadata?.dalle?.prompt && msg.author?.role === 'assistant') {
        // Avoid double-counting if already caught above
        const alreadyCounted = prompts.some(p => 
          p.conversationTitle === (convo.title || 'Untitled') && 
          p.prompt === msg.metadata.dalle.prompt
        );
        if (!alreadyCounted) {
          generated++;
          prompts.push({
            id: `img-${idCounter++}`,
            source: 'generated',
            prompt: msg.metadata.dalle.prompt,
            conversationTitle: convo.title || 'Untitled',
            imagePath: null,
            hasRealImage: false,
            imageType: 'Generated',
            gradientColors: generateGradientFromIndex(idCounter),
            index: idCounter,
          });
        }
      }
      
      // User-uploaded images
      if (msg.metadata?.attachments?.length > 0 && msg.author?.role === 'user') {
        for (const att of msg.metadata.attachments) {
          if (att.mime_type?.startsWith('image/') || att.name?.match(/\.(png|jpg|jpeg|gif|webp)$/i)) {
            uploaded++;
            const userText = msg.content?.parts?.filter(p => typeof p === 'string').join(' ') || '';
            
            prompts.push({
              id: `img-${idCounter++}`,
              source: 'uploaded',
              prompt: userText || att.name || 'Uploaded image',
              conversationTitle: convo.title || 'Untitled',
              imagePath: null,
              hasRealImage: false,
              imageType: 'Uploaded',
              gradientColors: generateGradientFromIndex(idCounter),
              index: idCounter,
            });
          }
        }
      }
    }
  }
  
  return {
    prompts,
    stats: { generated, uploaded, total: generated + uploaded }
  };
}
```

**Note:** In client-side mode, we cannot display the actual image files (they're binary data in the ZIP, not accessible from the JSON). The gallery will show placeholder cards with prompt text and gradient backgrounds. This is already handled by the gallery's placeholder rendering logic.

### How to Test

1. Upload a ChatGPT export that you KNOW contains DALL-E images
2. Open debug panel → check "Image Detection" section
3. Verify `imagePrompts.length > 0`
4. Verify `imageStats.generated` matches expected count
5. Navigate to gallery slide → verify cards appear with real image thumbnails
6. Check a few cards: does the prompt text match the actual image context?

### What Was Implemented

The fix addressed **three layers** of breakage: extraction, resolution, and the new export format.

#### 1. Image Extraction (`js/core/image-extraction.js` — new file)

- Created `extractImagePrompts(conversations, zipImageMap)` function called from `processFile()`.
- Extracts images from three content structures: `multimodal_text` with `image_asset_pointer` parts, direct `image_asset_pointer` content, and DALL-E metadata fallback.
- **Deduplication**: Uses both an `asset_pointer` seen-set and a `processedNodeIds` set to prevent the metadata catch-all from creating placeholder duplicates of images already found via the content paths.
- **Prompt extraction**: Checks multiple locations in priority order — `part.metadata.dalle.prompt` (old format), `msg.metadata.dalle.prompt` (old format), `msg.metadata.image_gen_title` (new format), then falls back to walking the conversation tree to find the parent user message.
- **Uploaded images excluded**: Only `tool` and `assistant` role images are extracted. User-uploaded images are intentionally filtered out — the gallery now focuses exclusively on AI-generated images.

#### 2. ZIP Image Resolution (`js/core/file-handling.js`)

- **Subdirectory scanning**: The ZIP extraction now walks **all subdirectories**, not just root-level files. This was critical because ChatGPT exports store generated images in `dalle-generations/` and `user-{id}/` subfolders.
- **ID prefix mapping**: Each extracted image filename is parsed to strip the UUID suffix (e.g., `file_000000006a2c71f5...-a168b0c6-1aba-4b93-...png` → `file_000000006a2c71f5...`). The ID prefix is mapped as a key in `zipImageMap`.
- **Protocol-prefixed keys**: Both `file-service://{id}` and `sediment://{id}` keys are registered in the map for direct asset_pointer lookups.

#### 3. New ChatGPT Export Format Support (`js/core/image-extraction.js`)

Investigation of a real export revealed the format has changed significantly:

| Aspect | Old Format | New Format |
|--------|-----------|------------|
| Asset pointer protocol | `file-service://file-XXXXX` | `sediment://file_XXXXX` |
| Image message role | `assistant` | `tool` |
| DALL-E prompt location | `msg.metadata.dalle.prompt` | `part.metadata.dalle.prompt` (often empty) + `msg.metadata.image_gen_title` |
| Image file location in export | Root level | `dalle-generations/` and `user-{userId}/` subfolders |
| Filename → pointer mapping | `file-XXXXX` prefix matches | `file_XXXXX` hex prefix matches (strip UUID suffix) |

- `resolveImageFromZip()` now strips both `sediment://` and `file-service://` protocol prefixes.
- **Result**: 246 out of 247 generated images now resolve to real thumbnails (1 image is simply missing from the export).

#### 4. Gallery UI Simplification

- Removed the **filter tab bar** (All / Generated / Uploaded) from `slides/slide-10-gallery.html` and its inline fallback in `index.html`.
- Removed the **uploaded stat card** and divider from the stats row — the hero number now reads "images generated" instead of "images created".
- Simplified `slide-10-gallery.js`: removed `setGalleryFilter()`, `filterImages()`, and all uploaded-related rendering logic.
- Updated `evidence-modal.js` to remove uploaded image handling in `showImagePrompt()`.

---

## 6. Bug 3: Achievements Completely Broken

> **Status:** ✅ Complete (Feb 8, 2026)

### Symptom

Multiple achievements that should be unlocked show as locked:
- Streak achievements (you've used ChatGPT 3+ days in a row) → locked
- OG Status (you've been on ChatGPT since 2023) → locked  
- Artist (you've created images) → locked
- Dedication (7+ active days) → locked

**Current Snapshot:** Heatmap reports `activeDays = 329` and `longestStreak = 43`, but those values are not wired into `stats.enhanced` / `stats.streaks` on the client path. Achievements will still show 0 for streak/dedication until wired.

### Root Cause — Three Disconnected Data Pipes

The achievement system in `slide-16-achievements.js` reads from specific data paths. During client-side processing, these paths are NEVER populated.

#### Bug 3A: Streak and Active Days Data Lost

**Where it's computed:** `generateHeatmapData()` in `js/app.js:3584-3605`

```javascript
let longestStreak = 0;
let currentStreak = 0;
let activeDays = 0;

for (const day of days) {
  if (day.count > 0) {
    activeDays++;
    currentStreak++;
    longestStreak = Math.max(longestStreak, currentStreak);
  } else {
    currentStreak = 0;
  }
}

return {
  stats: {
    activeDays,         // ← Computed correctly HERE
    longestStreak,      // ← Computed correctly HERE
    ...
  },
  ...
};
```

**Where achievements look for it:** `slide-16-achievements.js:17-19`

```javascript
const longestStreak = stats.enhanced?.longestStreak || stats.streaks?.longestStreak || 0;
const totalActiveDays = stats.enhanced?.totalActiveDays || stats.streaks?.totalActiveDays || 0;
```

**The disconnect:** The data exists in `heatmapData.stats.longestStreak` and `heatmapData.stats.activeDays`, but achievements look for it in `stats.enhanced.longestStreak` and `stats.streaks.totalActiveDays`. These are NEVER set in the client-side path.

In `processFile()` (line 157):
```javascript
stats.enhanced = generateEnhancedAnalysis(data);
```

But `generateEnhancedAnalysis()` does NOT compute or return `longestStreak` or `totalActiveDays`. It returns things like `nightOwlScore`, `marathonConvos`, `weekendRatio`, etc.

#### Bug 3B: First Date Never Set

**Where achievements need it:** `slide-16-achievements.js:24-38`

```javascript
let firstMessageYear = 9999;  // ← Default: impossibly far in the future
const dateFields = [stats.firstDate, stats.firstMessage, stats.firstConversationDate];
for (const dateField of dateFields) {
  if (dateField) {
    try {
      const date = new Date(dateField);
      if (!isNaN(date.getTime())) {
        firstMessageYear = date.getFullYear();
        break;
      }
    } catch (e) { }
  }
}
```

**The disconnect:** In `processFile()`, none of these fields are ever set:
- `stats.firstDate` — only set in `loadMyData()` from `dbStats.firstConversationDate`
- `stats.firstMessage` — never set anywhere
- `stats.firstConversationDate` — never set in client path

So `firstMessageYear` stays 9999, meaning:
- OG "Used since 2022" (threshold 2022): 9999 <= 2022 → false
- OG "Used since 2023" (threshold 2023): 9999 <= 2023 → false
- OG "Joined in 2024" (threshold 2024): 9999 <= 2024 → false
- **All OG tiers locked!**

#### Bug 3C: Image Stats Never Populated

**Where achievements need it:** `slide-16-achievements.js:21`

```javascript
const imagesGenerated = imageStats?.generated || 0;
```

**The disconnect:** `imageStats` is initialized as `{ generated: 0, uploaded: 0, total: 0 }` (line 12) and never updated during client-side processing. So the Artist achievement always shows 0 images.

### Fix Specification

#### Fix 3A: Wire heatmap stats into stats object

In `processFile()`, after `generateHeatmapData()` is called (line 168), add:

```javascript
// Wire heatmap streak data into stats for achievements
if (heatmapData && heatmapData.stats) {
  stats.enhanced.longestStreak = heatmapData.stats.longestStreak;
  stats.enhanced.totalActiveDays = heatmapData.stats.activeDays;
  
  // Also set streaks object for compatibility
  stats.streaks = {
    longestStreak: heatmapData.stats.longestStreak,
    totalActiveDays: heatmapData.stats.activeDays,
  };
}
```

#### Fix 3B: Compute firstDate from conversations

In `analyzeConversations()`, add tracking for earliest conversation:

```javascript
let earliestTimestamp = Infinity;

for (const convo of conversations) {
  // ... existing loop ...
  
  if (convo.create_time && convo.create_time < earliestTimestamp) {
    earliestTimestamp = convo.create_time;
  }
}

// In the return statement, add:
return {
  // ... existing fields ...
  firstDate: earliestTimestamp < Infinity ? new Date(earliestTimestamp * 1000).toISOString() : null,
};
```

#### Fix 3C: Wire image stats

After the `extractImagePrompts()` call (from Bug 2 fix), `imageStats` will already be populated. No additional fix needed beyond Bug 2.

### How to Test

1. Upload a file with data going back to 2023
2. Open debug panel → "Achievement Data Sources" section
3. Verify:
   - `stats.enhanced.longestStreak` matches `heatmapData.stats.longestStreak`
   - `stats.enhanced.totalActiveDays` matches `heatmapData.stats.activeDays`
   - `stats.firstDate` is a valid date (e.g., "2023-03-15")
   - `imageStats.generated > 0` (if you have DALL-E images)
4. Navigate to achievements slide
5. Verify streak, dedication, OG, and artist badges are now correct

### What Was Implemented

Three fixes addressed the three disconnected data pipes:

#### 1. Fix 3B: `firstDate` computed from conversations (`js/core/analysis.js`)

- `analyzeConversations()` now tracks `earliestTimestamp` across all conversations by checking `convo.create_time`.
- Returns `firstDate` as an ISO string (e.g., `"2023-03-15T..."`) in the result object.
- **Result**: `firstMessageYear` in achievements will now be correct (e.g., 2023) instead of `9999`, unlocking OG tiers.

#### 2. Fix 3A: Heatmap stats wired into `stats` (`js/core/file-handling.js`)

- After `generateHeatmapData()` completes, `heatmapData.stats.longestStreak` and `heatmapData.stats.activeDays` are now wired into:
  - `stats.enhanced.longestStreak` / `stats.enhanced.totalActiveDays`
  - `stats.streaks.longestStreak` / `stats.streaks.totalActiveDays`
- Both paths that achievements check (`stats.enhanced?.longestStreak || stats.streaks?.longestStreak`) will now resolve correctly.
- **Result**: Streak and dedication achievements unlock based on real heatmap data.

#### 3. Fix 3C: Image stats (already fixed by Bug 2)

- `imageStats.generated = 247` was already populated by the Bug 2 fix (`extractImagePrompts()`).
- **Result**: Artist achievement unlocks correctly.

#### 4. Bonus: Sample data de-hardcoded (`js/core/sample-data.js`)

- Replaced hardcoded `stats.enhanced`, `stats.topWords`, and `aiInsights` with calls to the real analysis functions (`generateEnhancedAnalysis()`, `extractTopWords()`, `generateDataInsights()`).
- Removed `generateSampleInsights()` and `generateMonthlyTrend()` — sample data now uses the same pipeline as file uploads.
- Added the same heatmap→stats wiring so sample data achievements work identically to real data.

---

## 7. Bug 4: AI Identity Is a Hardcoded Lookup Table

> **Status:** ✅ Complete (Feb 8, 2026)

### Symptom

The AI Identity slide shows:
- **Title:** "The Seeker"
- **Spirit Animal:** Owl — "Wise and observant"
- These are generic, meaningless labels with no actual analysis behind them

**Current Snapshot:** AI insights still show generic sample copy (e.g., “Curious, detail-oriented, and always iterating.”) → confirms client-side insights are not data-driven.

### Root Cause

**File:** `js/app.js`, lines 3720-3745

The `generateDataInsights()` function uses a static lookup table:

```javascript
const personalities = {
  coding: { title: 'The Architect', subtitle: 'Building logic, one function at a time' },
  writing: { title: 'The Wordsmith', subtitle: 'Crafting the perfect phrase' },
  learning: { title: 'The Scholar', subtitle: 'Perpetually curious and questioning' },
  planning: { title: 'The Strategist', subtitle: 'Always thinking three steps ahead' },
  creative: { title: 'The Creator', subtitle: 'Bringing ideas to life' }
};

const spiritAnimals = {
  coding: { animal: 'owl', reason: 'Night owl who debugs at 3 AM' },
  writing: { animal: 'peacock', reason: 'Expressing yourself with flair' },
  learning: { animal: 'dolphin', reason: 'Curious and intelligent explorer' },
  planning: { animal: 'beaver', reason: 'Building structures with intent' },
  creative: { animal: 'phoenix', reason: 'Creating and iterating endlessly' }
};
```

When `topTopic` is "general" (which it is for 83% of users due to Bug 1), the code falls through to:

```javascript
personality: personalities[topTopic] || { title: 'The Seeker', subtitle: 'Multi-disciplinary explorer' },
spiritAnimal: spiritAnimals[topTopic] || { animal: 'owl', reason: 'Wise and observant' },
```

There is ZERO analysis of:
- Time patterns (are you a night owl, early bird, lunch-break warrior?)
- Conversation depth (quick Q&A vs deep research dives?)
- Topic diversity (specialist vs generalist?)
- Communication style (terse vs verbose? questions vs statements?)
- Engagement patterns (consistent daily use vs binge sessions?)

### Fix Specification

Replace the static lookup with a behavioral analysis engine that looks at actual metrics:

```javascript
function generatePersonality(stats, conversations) {
  const enhanced = stats.enhanced || {};
  const nightOwl = enhanced.nightOwlScore || 0;
  const marathon = enhanced.marathonConvos || 0;
  const quick = enhanced.quickConvos || 0;
  const totalConvos = stats.totalConversations || 1;
  const topicCount = stats.topics?.length || 0;
  const weekendRatio = enhanced.weekendRatio || 0;
  const avgMsgsPerConv = Math.round((stats.totalMessages || 0) / totalConvos);
  
  // Calculate behavioral dimensions (0-100 each)
  const depthScore = Math.min(100, (marathon / totalConvos) * 500);
  const breadthScore = Math.min(100, topicCount * 8);
  const intensityScore = Math.min(100, avgMsgsPerConv * 5);
  const nocturnalScore = nightOwl;
  const consistencyScore = enhanced.totalActiveDays 
    ? Math.min(100, (enhanced.totalActiveDays / 365) * 100)
    : 50;
  
  // Determine primary personality trait from behavioral dimensions
  const traits = [
    { trait: 'depth', score: depthScore },
    { trait: 'breadth', score: breadthScore },
    { trait: 'intensity', score: intensityScore },
    { trait: 'nocturnal', score: nocturnalScore },
    { trait: 'consistency', score: consistencyScore },
  ].sort((a, b) => b.score - a.score);
  
  const primary = traits[0].trait;
  const secondary = traits[1].trait;
  
  // Personality matrix based on primary+secondary traits
  const personalityMatrix = {
    'depth+nocturnal':    { title: 'The Midnight Philosopher', animal: 'owl', reason: `${marathon} deep dives, ${nightOwl}% after midnight` },
    'depth+intensity':    { title: 'The Deep Diver', animal: 'whale', reason: `${avgMsgsPerConv} msgs/conversation avg — you go DEEP` },
    'depth+breadth':      { title: 'The Renaissance Mind', animal: 'octopus', reason: `Deep dives across ${topicCount} topics — tentacles everywhere` },
    'depth+consistency':  { title: 'The Devoted Scholar', animal: 'elephant', reason: `Consistent deep exploration — never forgets a thread` },
    'breadth+nocturnal':  { title: 'The Night Explorer', animal: 'bat', reason: `${topicCount} topics explored, mostly after dark` },
    'breadth+intensity':  { title: 'The Polymath', animal: 'crow', reason: `Intensely curious across ${topicCount} different domains` },
    'breadth+depth':      { title: 'The Renaissance Mind', animal: 'octopus', reason: `Master of many — ${topicCount} topics with real depth` },
    'breadth+consistency':{ title: 'The Steady Explorer', animal: 'turtle', reason: `Slow and steady across ${topicCount} topics` },
    'intensity+nocturnal':{ title: 'The Night Warrior', animal: 'wolf', reason: `${avgMsgsPerConv} msg avg, ${nightOwl}% after 10pm — relentless` },
    'intensity+depth':    { title: 'The Obsessive Builder', animal: 'beaver', reason: `${avgMsgsPerConv} msg avg in marathon sessions` },
    'intensity+breadth':  { title: 'The Speed Learner', animal: 'falcon', reason: `High intensity across ${topicCount} topics` },
    'intensity+consistency': { title: 'The Machine', animal: 'ant', reason: `Consistent intensity — ${avgMsgsPerConv} msgs/conv every day` },
    'nocturnal+depth':    { title: 'The Midnight Philosopher', animal: 'owl', reason: `${nightOwl}% night sessions, mostly deep dives` },
    'nocturnal+breadth':  { title: 'The Insomniac Explorer', animal: 'raccoon', reason: `Late-night curiosity across ${topicCount} topics` },
    'nocturnal+intensity':{ title: 'The Dark Mode Power User', animal: 'panther', reason: `Peak intensity after dark` },
    'nocturnal+consistency': { title: 'The Night Shift Regular', animal: 'bat', reason: `Reliably nocturnal — ${nightOwl}% after 10pm` },
    'consistency+depth':  { title: 'The Disciplined Thinker', animal: 'elephant', reason: `Shows up every day for serious thinking` },
    'consistency+breadth':{ title: 'The Everyday Learner', animal: 'dolphin', reason: `Daily exploration across many domains` },
    'consistency+intensity': { title: 'The Workhorse', animal: 'horse', reason: `High output, every single day` },
    'consistency+nocturnal': { title: 'The Night Shift Regular', animal: 'cat', reason: `Consistently up late, always productive` },
  };
  
  const key = `${primary}+${secondary}`;
  const match = personalityMatrix[key] || {
    title: 'The Explorer',
    animal: 'fox',
    reason: `A unique blend of ${primary} and ${secondary}`
  };
  
  return {
    personality: { title: match.title, subtitle: `Your unique AI fingerprint` },
    spiritAnimal: { animal: match.animal, reason: match.reason },
  };
}
```

### Why This Is Better

- **Data-driven:** Based on actual behavioral metrics, not topic category
- **Specific:** References real numbers (your marathon count, night owl %, topic count)
- **Diverse:** 20+ possible combinations instead of 5 static entries
- **Resilient:** Works regardless of topic classification quality
- **Personalized:** Two users with different patterns get different results

### How to Test

1. Upload your data
2. Check debug panel → "AI Insights" section
3. Verify personality title is NOT "The Seeker" and reason references actual numbers
4. Try with different data sets — verify personality changes based on behavior
5. Check the AI Identity slide renders correctly

### What Was Implemented

The fix replaced the static topic→personality lookup table with a multi-dimensional behavioral analysis engine.

#### 1. New `generatePersonality()` function (`js/core/analysis.js`)

- Calculates **five behavioral dimensions** (0–100 each) from real stats:
  - **Depth** — ratio of marathon sessions (50+ messages) to total conversations
  - **Breadth** — number of distinct topic categories explored
  - **Intensity** — average messages per conversation
  - **Nocturnal** — night-owl score (% of messages after 10 PM)
  - **Consistency** — active days / 365 (or streak-based fallback)
- Determines **primary** and **secondary** traits by sorting dimensions by score.
- Maps the primary+secondary combination to a **20-entry personality matrix**, where each entry has a unique title, subtitle, spirit animal, and data-driven reason referencing real numbers.
- **Result**: Two users with different behavioral patterns get different personality types. The personality is based on *how* you use ChatGPT (depth, timing, consistency), not *what* you talk about.

#### 2. Rewritten `generateDataInsights()` (`js/core/analysis.js`)

- **Personality & spirit animal**: Now calls `generatePersonality()` instead of the 5-entry `personalities[topTopic]` and `spiritAnimals[topTopic]` lookup tables. The fallback "The Seeker" / "Wise and observant" is eliminated.
- **"general"/"other" safeguard** (Bug 6 partial fix): If the #1 topic is "general" or "other", automatically falls back to the #2 topic for obsession/roast data.
- **Topic roasts expanded**: From 5 categories to **35+ topic-specific roasts** covering all major classifier categories (coding, web-dev, ai-ml, devops, cloud, finance, crypto, gaming, philosophy, etc.). Unknown topics get a data-driven fallback referencing the topic name and count.
- **Topic compliments expanded**: From 5 to **20+ topic-specific compliments**.
- **`obsessionDetail`**: Now data-driven — references actual conversation count, percentage, and intensity label.
- **`hiddenTheme`**: Now data-driven — picks from 4 patterns based on marathon/quick ratio, topic diversity, night-owl score, or total conversations.
- **`questionStyle`**: Now data-driven — describes the user's conversation style based on average messages per conversation (deep-diver, thorough, efficient, rapid-fire).
- **`trendInsight`**: Now data-driven — references trend direction percentage and active days.
- **`achievements`**: Now dynamically generated from real data (power user, marathon runner, night owl, topic explorer, streak champion) instead of static strings.
- **`funFacts`**: New field — generates unique client-side fun facts for the Cosmic Revelations slide (Bug 5 partial fix). See below.

#### 3. New `generateClientFunFacts()` (`js/core/analysis.js`)

- Generates **up to 6 unique fun facts** that do NOT duplicate content from other slides.
- Facts computed from a single pass over all conversations:
  - **Question vs statement ratio** — "X% of your messages are questions — you're a question machine"
  - **Average message length** — "Average message: N characters — you're a [essay writer / concise communicator]"
  - **One-shot conversation ratio** — "X% of conversations were one-and-done"
  - **Longest conversation title** — "Your longest title was N characters: ..."
  - **Conversation title question style** — "X% of your conversation titles are questions"
  - **Code block density** — "N code blocks shared — X% of messages include code"
  - **Weekend vs weekday personality** — weekend usage ratio insight
  - **Marathon-to-quick ratio** — "For every marathon, you fire off N quick chats"
- **Impact on Cosmic Revelations slide**: `slide-13-fun-facts.js` already prefers `aiInsights.funFacts` over computed stats. By populating `funFacts`, the slide now shows unique insights on the client path instead of repackaged stats from other slides.

#### 4. Updated `slide-04-identity.js`

- Added missing animal emojis to the `animalEmojis` map: elephant (🐘), horse (🐴), panther (🐆), falcon (🦅). These are required by the new personality matrix.

#### 5. Summary of improvements

| Aspect | Before | After |
|--------|--------|-------|
| Personality | 5 static entries by topic, fallback "The Seeker" | 20+ behavioral combinations from 5 dimensions |
| Spirit Animal | 5 static entries, fallback "owl — Wise and observant" | Data-driven reason with real numbers (streaks, %, counts) |
| Roasts | 5 topic-specific + 5 behavioral | 35+ topic-specific + 9 behavioral |
| Compliments | 5 topic-specific + 4 behavioral | 20+ topic-specific + 7 behavioral |
| Hidden theme | Static string | 4 data-driven patterns |
| Question style | Static string | 4 levels based on avg msgs/conv |
| Trend insight | Static string | 3 patterns based on trend direction |
| Fun facts | Not generated (cosmic revelations fell back to stat repeats) | 8 unique fact types, max 6 shown |
| Achievements | Static `['Conversation Explorer', 'Curious Mind', 'AI Companion User']` | Dynamic from real data |

---

## 8. Bug 5: Cosmic Revelations Are Slide Repeats

> **Status:** ✅ Complete (Feb 9, 2026)

### Symptom

The "Cosmic Revelations" slide shows facts like:
- "14 day streak — your longest run" (also on heatmap slide)
- "Peak productivity at 2pm on Wednesdays" (also on time slide)
- "287 active days with ChatGPT" (also on heatmap slide)
- "32% of your chats happen after 10pm" (also on identity slide)

These are NOT revelations — they're repackaged stats from other slides.

### Root Cause

**File:** `js/slides/slide-13-fun-facts.js`, lines 27-60

The `populateCosmicRevelations()` function builds facts from the same stats used by other slides:

```javascript
const computedFacts = [
  stats.streaks?.longestStreak > 0 ? {
    icon: '🔥',
    text: `<span class="fact-number">${stats.streaks.longestStreak}</span> day streak — your longest run`,
  } : null,
  stats.peakHour !== undefined ? {
    icon: '⏰',
    text: `Peak productivity at <span class="fact-number">${formatHour(stats.peakHour)}</span> on ${stats.peakDay}s`,
  } : null,
  // ... more of the same stats ...
```

When AI insights ARE available (server path), it uses `aiInsights.funFacts` which are generated by the LLM and are better. But on the client path, it falls back to these repackaged stats.

### Fix Specification

Replace the computed facts with genuinely unique/surprising insights that are NOT shown on other slides:

```javascript
function generateUniqueRevelations(stats, conversations, heatmapData) {
  const facts = [];
  const enhanced = stats.enhanced || {};
  const topWords = stats.topWords || [];
  
  // 1. Conversation Title Analysis
  const titles = conversations.map(c => c.title || '').filter(Boolean);
  const avgTitleLength = titles.reduce((sum, t) => sum + t.length, 0) / (titles.length || 1);
  const longestTitle = titles.reduce((a, b) => a.length > b.length ? a : b, '');
  if (longestTitle.length > 50) {
    facts.push({
      icon: '📏',
      text: `Your longest conversation title was ${longestTitle.length} characters: "${longestTitle.slice(0, 40)}..."`,
    });
  }
  
  // 2. Question vs Statement ratio
  const userMessages = [];
  for (const conv of conversations) {
    const msgs = conv.mapping ? Object.values(conv.mapping) : [];
    for (const node of msgs) {
      if (node.message?.author?.role === 'user') {
        const text = node.message.content?.parts?.join(' ') || '';
        if (text.length > 5) userMessages.push(text);
      }
    }
  }
  const questionCount = userMessages.filter(m => m.includes('?')).length;
  const questionRatio = Math.round((questionCount / (userMessages.length || 1)) * 100);
  if (questionRatio > 0) {
    facts.push({
      icon: '❓',
      text: `<span class="fact-number">${questionRatio}%</span> of your messages are questions — you're a ${questionRatio > 60 ? 'question machine' : questionRatio > 30 ? 'curious thinker' : 'statement maker'}`,
    });
  }
  
  // 3. Average message length personality
  const avgLength = userMessages.reduce((sum, m) => sum + m.length, 0) / (userMessages.length || 1);
  const lengthPersonality = avgLength > 500 ? 'essay writer' : avgLength > 200 ? 'detailed explainer' : avgLength > 50 ? 'concise communicator' : 'rapid-fire typist';
  facts.push({
    icon: '✍️',
    text: `Average message: <span class="fact-number">${Math.round(avgLength)}</span> characters — you're a ${lengthPersonality}`,
  });
  
  // 4. Most active hour gap
  const hourCounts = stats.hourCounts || [];
  if (hourCounts.length === 24) {
    const deadHours = hourCounts.reduce((acc, count, hour) => {
      if (count === 0) acc.push(hour);
      return acc;
    }, []);
    if (deadHours.length > 0 && deadHours.length < 12) {
      const startDead = deadHours[0];
      const endDead = deadHours[deadHours.length - 1];
      facts.push({
        icon: '😴',
        text: `You're completely silent between <span class="fact-number">${formatHour(startDead)}</span> and <span class="fact-number">${formatHour(endDead)}</span> — that's your recharge zone`,
      });
    }
  }
  
  // 5. Vocabulary signature
  if (topWords.length >= 3) {
    const signature = topWords.slice(0, 3).map(w => `"${w.word}"`).join(', ');
    facts.push({
      icon: '🗣️',
      text: `Your vocabulary fingerprint: ${signature} — these words define your ChatGPT DNA`,
    });
  }
  
  // 6. Conversation length distribution insight
  const convLengths = conversations.map(c => {
    const msgs = c.mapping ? Object.values(c.mapping) : [];
    return msgs.filter(m => m.message?.author?.role === 'user').length;
  });
  const oneShots = convLengths.filter(l => l === 1).length;
  const oneShotRatio = Math.round((oneShots / (conversations.length || 1)) * 100);
  if (oneShotRatio > 20) {
    facts.push({
      icon: '⚡',
      text: `<span class="fact-number">${oneShotRatio}%</span> of your conversations were one-and-done — you know exactly what you need`,
    });
  }
  
  // 7. Weekend vs weekday personality
  if (enhanced.weekendRatio > 60) {
    facts.push({
      icon: '🏖️',
      text: `<span class="fact-number">${enhanced.weekendRatio}%</span> weekend usage — ChatGPT is your weekend hobby partner`,
    });
  } else if (enhanced.weekendRatio < 20) {
    facts.push({
      icon: '💼',
      text: `Only <span class="fact-number">${enhanced.weekendRatio}%</span> weekend usage — you clock out from AI on weekends like a pro`,
    });
  }
  
  // 8. Topic switching frequency
  let topicSwitches = 0;
  let prevTopic = null;
  const sortedConvos = [...conversations].sort((a, b) => (a.create_time || 0) - (b.create_time || 0));
  for (const conv of sortedConvos) {
    const topic = classifyConversation(conv); // Uses the improved classifier
    if (prevTopic && topic !== prevTopic) topicSwitches++;
    prevTopic = topic;
  }
  const switchRate = Math.round((topicSwitches / (conversations.length || 1)) * 100);
  if (switchRate > 70) {
    facts.push({
      icon: '🦘',
      text: `You switch topics <span class="fact-number">${switchRate}%</span> of the time — your brain never stays on one track`,
    });
  }
  
  return facts.slice(0, 6); // Maximum 6 revelations
}
```

### How to Test

1. Upload data and navigate to Cosmic Revelations slide
2. Verify NONE of the facts duplicate content from other slides
3. Verify each fact reveals something genuinely interesting/surprising
4. Verify the numbers in the facts are accurate (cross-check with debug panel)

### What Was Implemented

The fix addressed two layers: the **primary path** (unique AI-generated fun facts, already shipped as part of Bug 4) and the **fallback path** (previously showing repackaged stats).

#### 1. Primary path: `generateClientFunFacts()` (`js/core/analysis.js` — shipped with Bug 4)

- Generates **up to 6 unique fun facts** from a single pass over all conversations.
- Facts include: question vs statement ratio, average message length personality, one-shot conversation ratio, longest conversation title, conversation title question style, code block density, weekend vs weekday personality, marathon-to-quick ratio.
- Results are stored in `aiInsights.funFacts` by `generateDataInsights()`.
- `populateCosmicRevelations()` prefers these facts when available.

#### 2. Fallback path rewritten: `slide-13-fun-facts.js`

- **Removed all repackaged stats** from the `computedFacts` fallback. Previously the fallback included streak length, peak hour, active days, night owl %, marathon count, most productive day, and total conversations — all of which are shown on other slides (heatmap, time, identity, conversations).
- **Replaced with 8 unique fallback fact types** that do NOT duplicate other slides:

| # | Fact | What It Shows | NOT Shown On |
|---|------|--------------|-------------|
| 1 | Average conversation depth | Messages per conversation + personality label | Unique to this slide |
| 2 | Code block density | % of messages with code (ratio, not raw count) | Messages slide shows total, not % |
| 3 | Marathon-to-quick ratio | Quick chats per deep dive | Unique to this slide |
| 4 | Weekend personality | Weekend usage characterization | Unique to this slide |
| 5 | Topic diversity | Number of distinct topic areas explored | Topics slide shows top 5, not count |
| 6 | Trend direction | 6-month usage surge or dip % | Unique to this slide |
| 7 | Longest conversation | Title + message count of deepest chat | Unique to this slide |
| 8 | ChatGPT age | Months since first conversation | Unique to this slide |

- Each fallback fact uses an **IIFE pattern** for conditional computation (avoids polluting scope) and returns `null` when the data isn't interesting enough to show.
- Facts are filtered with `.filter(Boolean)` and capped at 6.

#### 3. Summary of fact sources by path

| Scenario | Fact Source | Quality |
|----------|------------|---------|
| Client-side file upload | `aiInsights.funFacts` from `generateClientFunFacts()` | Unique behavioral insights computed from conversations |
| Server API (with LLM funFacts) | `aiInsights.funFacts` from LLM | High quality if LLM prompt is good |
| Server API (no funFacts field) | `uniqueFallbackFacts` computed in slide JS | Unique stats-derived insights (no repeats) |
| No data available | "No revelations yet" empty state | Graceful degradation |

### Files Modified

| File | Change |
|------|--------|
| `js/slides/slide-13-fun-facts.js` | Replaced `computedFacts` (repackaged stats from other slides) with `uniqueFallbackFacts` (8 unique behavioral insights) |

---

## 9. Bug 6: Obsession Slide Shows "general"

> **Status:** ✅ Complete (Feb 9, 2026)

### Symptom

The #1 Obsession slide shows "general" as your top topic, which is meaningless.

### Root Cause

This is a direct cascade of Bug 1 (topic classification). The obsession slide reads from:

```javascript
// slide-05-obsession.js:51-54
const obsession = aiInsights.topObsession;
const topTopic = stats.topics?.[0];
const topicName = obsession.topic || topTopic?.[0] || 'unknown';
const topicCount = topTopic?.[1] || 0;
```

And `aiInsights.topObsession.topic` is set in `generateDataInsights()`:

```javascript
// app.js:3625
const topTopic = stats.topics && stats.topics.length > 0 ? stats.topics[0][0] : 'technology';
// ...
topObsession: {
  topic: topTopic,     // ← This is "general"
  count: topicCount,
  roast: roastText
}
```

### Fix Specification

This bug is **automatically fixed** by Bug 1's fix (topic classification). Once the classifier produces meaningful categories, the obsession slide will display correctly.

**Additional improvement:** Add a safeguard that prevents "other"/"miscellaneous" from ever being the #1 obsession:

```javascript
// In generateDataInsights(), after getting topics:
let topTopic = stats.topics?.[0]?.[0] || 'technology';

// Never use 'other' as the obsession — fall back to #2
if (topTopic === 'other' && stats.topics.length > 1) {
  topTopic = stats.topics[1][0];
}
```

**Also improve the roast pool** in `generateDataInsights()` (lines 3638-3671) to include roasts for ALL 15+ new topic categories, not just the original 5:

```javascript
const topicRoasts = {
  coding: `You ask ChatGPT to debug your code more than you run your tests.`,
  'ai & ml': `You're training AI to replace... yourself? Bold strategy.`,
  writing: `You've rewritten the same sentence with ChatGPT's help at least 47 times.`,
  creative: `You have amazing ideas, but finishing them? That's the optional DLC.`,
  business: `Your business plan exists in 47 ChatGPT conversations and zero Google Docs.`,
  'data & analytics': `You've analyzed everything except why you're still analyzing at 2 AM.`,
  learning: `Your learning backlog is impressive. Your implementation backlog is larger.`,
  career: `LinkedIn + ChatGPT = your entire career strategy. No judgment.`,
  productivity: `The irony of spending hours optimizing productivity with ChatGPT...`,
  finance: `You've asked ChatGPT for financial advice more times than your actual advisor.`,
  health: `ChatGPT is not a doctor, but you've treated it like one ${topicCount} times.`,
  personal: `ChatGPT knows more about your personal life than most of your friends.`,
  planning: `You plan in ChatGPT. You execute... with reminders from ChatGPT.`,
  communication: `You rehearse conversations with an AI before having them with humans.`,
  education: `You've turned ChatGPT into your personal tutor. Your teachers should be jealous.`,
};
```

### How to Test

1. Upload data
2. Debug panel → verify top topic is NOT "general" or "other"
3. Navigate to obsession slide
4. Verify topic name is meaningful (e.g., "Coding", "AI & Machine Learning", "Business")
5. Verify roast text is specific to that topic
6. Verify the conversation count and percentage look reasonable
7. Verify the icon matches the topic category (not the generic 🎯 target)

### What Was Implemented

The fix addressed **four issues** in the obsession slide beyond what Bug 1's topic classifier already resolved.

#### 1. Fixed topic count mismatch (`js/slides/slide-05-obsession.js`)

- **Bug:** The slide read `topicCount` from `stats.topics?.[0]?.[1]` (the raw #1 topic, which could still be "general") while displaying the obsession topic from `aiInsights.topObsession.topic` (which may have fallen back to the #2 topic via the safeguard in `generateDataInsights()`). This meant the count and percentage didn't match the displayed topic.
- **Fix:** Now reads `topicCount` from `obsession.count` first (which matches the safeguarded topic), with a fallback to `stats.topics` lookup if needed.

#### 2. Defense-in-depth safeguard against "general"/"other" (`js/slides/slide-05-obsession.js`)

- Added a safeguard directly in the slide that iterates through `stats.topics` to find the first non-"general"/non-"other" topic if `aiInsights.topObsession.topic` is "general" or "other". This covers the server path (Path B) where the `generateDataInsights()` safeguard may not apply.

#### 3. Human-readable topic display names (`js/slides/slide-05-obsession.js`)

- Added `topicDisplayNames` map covering all ~50 classifier categories, mapping raw keys (e.g., `web-dev`, `ai-ml`, `data-analytics`) to human-readable names (e.g., "Web Development", "AI & Machine Learning", "Data & Analytics").
- Added `formatTopicName()` utility function that looks up the display name or falls back to title-casing the hyphenated key.
- Exposed both on `window` for reuse by other slides.
- The obsession slide now displays "Coding" instead of "coding", "AI & Machine Learning" instead of "ai-ml", etc.

#### 4. Expanded topic icons to cover all ~50 categories (`js/slides/slide-05-obsession.js`)

- Replaced the previous 20-entry partial icon map with a comprehensive map covering all ~50 topic categories with distinct, meaningful icons (e.g., 🌐 Web Development, 📱 Mobile Development, 🤖 AI & ML, ☁️ Cloud, 🔒 Security, 🗄️ Databases, 🧪 Testing, 🔭 Astronomy, 🧬 Biology, etc.).
- Icon lookup changed from substring matching to exact key match, which is more reliable.

#### 5. Propagated formatting to other slides

The `formatTopicName()` and `topicIcons` utilities were also applied to other slides that display raw topic names:

- **`js/slides/slide-03-topics.js`**: Hero topic name, grid card names, and diversity insight now use `formatTopicName()` and the shared icon map instead of a limited 11-entry `emojis` object.
- **`js/slides/slide-08-evolution.js`**: Old/recent topic labels in both `populateEvolutionSlide()` and `updateEvolutionUI()` now use `formatTopicName()`.
- **`js/app.js`**: Inline old/recent topic rendering in `populateSlides()` now uses `formatTopicName()`.

### Files Modified

| File | Change |
|------|--------|
| `js/slides/slide-05-obsession.js` | Added `topicDisplayNames` (50 entries), `formatTopicName()`, expanded `topicIcons` (50 entries); fixed count mismatch to use `obsession.count`; added defense-in-depth safeguard against "general"/"other"; context text now uses display names |
| `js/slides/slide-03-topics.js` | Replaced limited `emojis` map with shared `topicIcons`; topic names now formatted via `formatTopicName()` |
| `js/slides/slide-08-evolution.js` | Old/recent topic labels now formatted via `formatTopicName()` in both `populateEvolutionSlide()` and `updateEvolutionUI()` |
| `js/app.js` | Inline old/recent topic rendering in `populateSlides()` now uses `formatTopicName()` |

---

## 10. Bug 7: Server-Side LLM Prompts Need Refinement

### Scope Split (Not One Task)

Bug 7 is **not a single task**. It splits cleanly into two parallel workstreams that do not conflict with ongoing bug fixes:

1. **Workflow A — AI Re‑Design (Prompt + Output Design)**
2. **Workflow B — AI Analysis Update (Data/Signals + Pipeline)**

Each workflow has its own tasks, acceptance criteria, and safety rails so we can iterate **without destroying what we have**.

---

### Workflow A — AI Re‑Design (Prompt + Output Design)

**Goal:** Redesign the LLM prompt and output schema to produce **specific, data‑anchored insights** with guardrails against vague copy.

**Non‑destructive rule:** All prompt changes must be **versioned** and gated behind a **feature flag** (e.g., `WRAPPED_LLM_PROMPT_VERSION=2`).

#### Tasks (A)
1. **Define output schema v2**
  - Require each field to include at least one concrete data anchor (number, topic label, or top word).
  - Add `citations[]` per insight (e.g., `[{ type: "stat", value: 47, source: "nightOwlScore" }]`).
2. **Write prompt v2 with explicit constraints**
  - Ban generic adjectives and archetype titles.
  - Force numeric or topic‑based grounding for each insight.
3. **Add prompt versioning + toggle**
  - Keep prompt v1 intact; add v2 alongside it.
  - Select via env var or query param (`?prompt=v2`).
4. **Create golden sample tests**
  - 3 curated JSON fixtures with expected qualitative outputs (not exact strings).
  - Validate that outputs contain anchors and are non‑generic.

**Acceptance Criteria (A)**
- 100% of fields include at least one anchor from the stats.
- No banned generic phrases appear.
- Output stays within existing UI limits (no layout break).

---

### Workflow B — AI Analysis Update (Data/Signals + Pipeline)

**Goal:** Improve the **inputs** to the LLM so it can generate deeper insights without increasing cost or latency too much.

**Non‑destructive rule:** Only add **new optional signals**; do not remove existing fields.

#### Tasks (B)
1. **Expand semantic theme probes**
  - Add 7–12 new probes (DevOps, Data Science, UX, Finance, Content, Language Learning, Gaming, etc.).
2. **Add top‑N topic keywords**
  - Provide top 10–20 distinct keywords per major topic for richer grounding.
3. **Add behavior deltas**
  - Examples: weekday vs weekend ratio, late‑night vs daytime ratio, longest streak length, top 3 hours.
4. **Add small “highlight set”**
  - 5–10 hand‑picked “notable” events (largest message day, most code blocks day, etc.).
5. **Tune thresholds for probe matching**
  - Lower similarity threshold *or* make it adaptive to total message count.

**Acceptance Criteria (B)**
- LLM outputs reference at least one new signal in 3+ fields.
- No measurable latency regression > 20%.
- Token usage increase < 25% (budget guard).

---

### Safe Iteration Workflow (Both A + B)

1. **Version everything** (prompt + schema + analysis bundle).
2. **Feature flag the new path** to keep current output intact.
3. **Side‑by‑side compare**: persist v1 vs v2 outputs for the same dataset.
4. **Promote only when quality improves** (using checklist below).

**Quality Checklist**
- Each insight references at least one concrete stat or topic.
- No generic personality adjectives.
- Fun facts are non‑obvious (not message count, peak hour, or total conversations).
- Roast/compliment are specific and use numbers.

---

### Symptom

When using the server path (Path B), the LLM-generated insights are better than client-side but still sometimes produce generic/vague output.

### Root Cause

**File:** `src/server.ts` (around line ~1267-1335)

The Wrapped Insights prompt asks the LLM to generate personality titles, fun facts, roasts, etc. But:

1. **No constraints against vagueness:** The prompt doesn't say "DO NOT use generic descriptions like 'curious' or 'wise'"
2. **Insufficient data context:** The prompt gets behavioral stats but could get more specific examples
3. **Semantic theme probes are limited:** Only 8 theme categories, could be expanded to 15+
4. **No negative constraints:** Should explicitly say what NOT to produce

### Fix Specification

#### Improve the main prompt (in server.ts)

Add explicit constraints:

```
CRITICAL RULES:
1. NEVER use generic descriptions like "curious", "wise", "observant", "thoughtful", or "intelligent"
2. EVERY insight MUST reference a specific number from the stats or a specific topic/word from the messages
3. The personality title MUST be unique and unexpected — NOT "The Seeker", "The Explorer", or any single-word archetype
4. Fun facts MUST be surprising — NOT restatements of obvious stats like message counts or peak hours
5. Roasts MUST reference specific behaviors with specific numbers
6. The spirit animal MUST be justified with specific behavioral data, not personality traits

BAD examples (do NOT produce these):
- "You're a curious and thoughtful person" (generic)
- "Your personality is The Explorer" (boring)
- "Fun fact: You sent a lot of messages!" (restatement)
- "Your spirit animal is an owl because you're wise" (generic)

GOOD examples:
- "The 3AM Architecture Critic — because 47% of your system design questions happen after midnight"
- "Your spirit animal is a raccoon: 89 late-night coding sessions and an obsession with digging through APIs"
- "Fun fact: You've rewritten your README 23 times across 6 different projects. Perfectionist much?"
```

#### Expand semantic theme probes

Add more probes to the `themeProbes` array in `server.ts`:

```javascript
// NEW probes to add:
{ name: 'DevOps & Infrastructure', probe: 'docker, kubernetes, CI/CD, deployment, server, AWS, cloud, pipeline...' },
{ name: 'Data Science & Analytics', probe: 'data analysis, pandas, visualization, statistics, machine learning, model training...' },
{ name: 'UI/UX Design', probe: 'user interface, user experience, design system, figma, wireframe, prototype...' },
{ name: 'Finance & Investing', probe: 'stocks, investing, cryptocurrency, financial planning, budget, portfolio...' },
{ name: 'Content Creation', probe: 'YouTube, podcast, social media, content strategy, audience, engagement...' },
{ name: 'Language Learning', probe: 'translate, language, vocabulary, grammar, Spanish, Japanese, fluency...' },
{ name: 'Gaming', probe: 'game development, Unity, Unreal, game design, gameplay, player, quest...' },
```

#### Lower similarity threshold for better coverage

Currently set at `> 0.40` (line ~1213 in server.ts). Consider lowering to `> 0.35` for more inclusive matching, or dynamically adjusting based on total message count.

### How to Test

1. Run the server with the updated prompt
2. `curl "http://localhost:3333/api/wrapped/insights?regenerate=true" | jq .`
3. Check each field:
   - `personality.title`: Is it unique and specific? Does it reference data?
   - `funFacts`: Are they surprising? Do they reference specific numbers/topics?
   - `spiritAnimal.reason`: Does it reference behavioral data?
   - `oneLineRoast`: Does it reference specific numbers?
4. Regenerate 3-5 times and verify variety and quality

---

## 11. Bug 8: No Hardcoded Insights Allowed

> **Status:** ✅ Complete (Feb 9, 2026)

### Symptom

Client-side insights still show generic or template-style copy (e.g., “Curious, detail-oriented, and always iterating.”), even with real data loaded.

### Root Cause

- **File:** `projects/chatgpt-wrapped/js/app.js` → `generateDataInsights()` uses static lookup tables and canned strings.
- **File:** `projects/chatgpt-wrapped/js/app.js` → `loadSampleData()` returns template-style sample insights.
- The client path (file upload) does not route insights through the LLM pipeline.

### Fix Specification

**Non‑Negotiable Requirement:** No hardcoded insights. All insights must be unique and ideally LLM‑driven.

1. **Primary (Preferred):** Route insights generation to the server LLM (e.g., `/api/wrapped/insights`) for file‑upload flows, with explicit user consent if privacy is a concern.
2. **Fallback (Allowed):** Replace static lookup tables with **data‑driven heuristics** that use real metrics (night‑owl score, topic diversity, average message length, streaks, etc.).
3. **Disallowed:** Any static or template phrases that do not reference actual user data.
4. **UI Behavior:** If insights are unavailable, show a clear “Insights unavailable” state instead of placeholders.

### How to Test

1. Load a dataset with distinct usage patterns.
2. Verify each insight references real numbers or specific topics.
3. Load a different dataset and confirm insights change meaningfully.
4. Confirm no template-only or generic text appears.

### What Was Implemented

A comprehensive audit found **9 locations** across 7 files with hardcoded insight strings. All were replaced with data-driven text or neutral structural labels.

#### 1. `js/app.js` — Hidden theme and question style fallbacks

- **hiddenTheme fallback**: Was `'Your conversations reveal unique patterns...'`. Now computes from `enhanced.marathonConvos`, `s.topics.length`, or `nightScore` — e.g., `"12 marathon sessions reveal a preference for depth over quick answers"`. Empty string if no meaningful data.
- **questionStyle fallback**: Was `'You ask thoughtful, detailed questions.'`. Now computes from average messages per conversation — e.g., `"Thorough but focused — 14 messages per conversation."`. Empty string if no data.

#### 2. `js/slides/slide-08-evolution.js` — Trend subtitles (3 locations)

Replaced in `populateEvolutionSlide()`, `updateEvolutionUI()`, and `updateEvolutionHeadline()`. Removed strings like `"AI power user incoming!"`, `"Consistent AI companion vibes"`, `"Trying to break free? Good luck with that."`, and `"you're evolving to become more selective with your inquiries—like a fine wine connoisseur..."`. All subtitles now reference actual trend percentage, date ranges, and/or message totals.

#### 3. `js/slides/slide-03-topics.js` — Diversity meter insight

Replaced `"You're deeply focused on what matters!"`, `"Balanced explorer with clear interests"`, `"Curious mind across many domains"`, `"True polymath — you explore everything!"` with text referencing the actual top topic name, % share, and topic count — e.g., `"38% in coding, plus 4 other interests"`.

#### 4. `js/slides/slide-05-obsession.js` — Context text and bar labels

- **Context fallback**: Was `'A clear pattern in your conversations.'`. Now: `"42 conversations about coding — 15% of your total."`
- **Bar labels**: Were `'Deeply focused'`, `'Highly focused'`, etc. Now include actual percentage: `"15% — notable interest"`, `"28% — strong focus"`.

#### 5. `js/core/analysis.js` — Empty compliment pool fallback

Was `'You're using AI thoughtfully, and that alone puts you ahead.'`. Now: `"1,427 conversations and 12,843 messages — you're building a real AI workflow."` (references actual counts).

#### 6. `slides/slide-09-themes.html` + `js/slides/slide-09-themes.js` — Themes insight footer

Static HTML was `'Your conversations reveal semantic patterns invisible to keyword search'`. Now a neutral label `'Themes discovered by analyzing individual user messages'`, dynamically replaced by JS: `"6 themes discovered across 3,796 user messages"`.

#### 7. `index.html` — Inline fallback personality text

Was `'The Technical Thinker'` / `'Methodical, curious, always digging deeper into problems others overlook.'`. Now `'Loading...'` / empty (replaced by JS once data loads).

#### 8. `sample-data.js` — Already clean (no changes needed)

`loadSampleData()` already uses the real analysis pipeline — no hardcoded insight strings.

### Files Modified

| File | Change |
|------|--------|
| `js/app.js` | Replaced hiddenTheme and questionStyle fallbacks with data-driven computations |
| `js/slides/slide-08-evolution.js` | Replaced 3 sets of hardcoded trend subtitles with data-referencing text |
| `js/slides/slide-03-topics.js` | Replaced generic diversity insights with topic name + percentage references |
| `js/slides/slide-05-obsession.js` | Replaced generic context fallback and bar labels with data-driven text |
| `js/core/analysis.js` | Replaced empty compliment pool fallback with data-referencing text |
| `slides/slide-09-themes.html` | Changed static insight to neutral label; added id for JS population |
| `js/slides/slide-09-themes.js` | Populates themes insight footer dynamically with theme count + message total |
| `index.html` | Replaced hardcoded personality defaults with loading placeholder |

---

## 12. Bug 9: Themes Slide Counts Are Wildly Inflated

> **Status:** ✅ Complete (Feb 8, 2026)  
> **Reported:** February 8, 2026  
> **Priority:** High  
> **Affected Slide:** Slide 9 — Discovered Themes

### Symptom

The Discovered Themes slide (Slide 9) shows message counts that are impossibly large. For a user with ~23,000 total messages, the slide reports:

- **Learning & Education:** ~23,000 messages
- **AI Image Generation:** ~19,000 messages

These numbers exceed or nearly equal the **total** message count. A single theme cannot account for nearly all messages, and the sum across themes far exceeds the total. The numbers are meaningless.

### Root Cause — Three Compounding Bugs

**File:** `js/core/analysis.js`, lines 353–389 (`generateDiscoveredThemes()`)

```javascript
function generateDiscoveredThemes(stats, conversations) {
  const themePatterns = {
    'Learning & Education': /learn|tutorial|explain|how|understand|teach|course|study|guide/i,
    'Creative Writing': /write|article|blog|story|narrative|script|poem|fiction|novel/i,
    'Technical Architecture': /architecture|design|system|pattern|structure|framework|implementation/i,
    'Business & Entrepreneurship': /business|startup|entrepreneurship|company|team|management|leadership|strategy/i,
    'AI Image Generation': /image|visual|generate|dall|midjourney|artwork|design|creative/i,
    'Career & Growth': /career|job|interview|resume|opportunity|growth|skill|development|promotion/i,
    'Productivity & Organization': /productivity|organize|organize|todo|task|schedule|plan|time management/i,
    'Personal Life': /personal|relationship|family|health|hobby|lifestyle|hobby|interest/i
  };

  const themeCounts = {};

  for (const conv of conversations) {
    const title = conv.title || '';
    const messages = conv.mapping ? Object.values(conv.mapping) : [];
    let messageText = title;

    for (const node of messages) {
      if (node.message?.content?.parts) {
        messageText += ' ' + node.message.content.parts.join(' ');
      }
    }

    for (const [themeName, pattern] of Object.entries(themePatterns)) {
      if (pattern.test(messageText)) {
        themeCounts[themeName] = (themeCounts[themeName] || 0) + messages.length;  // ← BUG
      }
    }
  }

  return Object.entries(themeCounts)
    .map(([name, messageCount]) => ({ name, messageCount }))
    .sort((a, b) => b.messageCount - a.messageCount)
    .slice(0, 6);
}
```

#### Bug 9A: Counts ALL mapping nodes, not matching messages (line 380)

When a conversation matches a theme regex, the code adds `messages.length` — the count of **every node in the conversation's mapping object** — to that theme. This includes system messages, assistant responses, tool outputs, and even empty nodes. The correct behavior would be to count only the individual messages that actually match the theme, or to count 1 per matching conversation.

**Example:** A conversation with 80 mapping nodes where one assistant message says "how about this design" will add 80 to *both* "Learning & Education" (matches `how`) and "AI Image Generation" (matches `design`).

#### Bug 9B: A conversation can count toward MULTIPLE themes (lines 378–382)

There is no exclusivity. The inner loop checks every theme pattern against the same concatenated text. If a conversation matches 4 themes, all of its nodes are added to all 4 themes. This means:

- A single conversation with 80 nodes matching 4 themes contributes **320** to the grand total (80 × 4)
- The sum of all theme counts can be **several times larger** than the actual total message count

#### Bug 9C: Overly broad regex patterns (lines 355–362)

Several patterns match extremely common words that appear in almost any conversation:

| Theme | Problematic Terms | Why It's Too Broad |
|-------|-------------------|-------------------|
| Learning & Education | `how` | Appears in almost every conversation ("how do I...", "show me how", "how about...") |
| AI Image Generation | `design`, `creative`, `generate` | Common in coding/product conversations ("generate a function", "design pattern", "creative approach") |
| Technical Architecture | `design`, `system`, `pattern`, `structure`, `implementation` | Extremely common programming terms |
| Career & Growth | `growth`, `development`, `skill` | Common in non-career contexts ("skill issue", "development server", "growth rate") |
| Productivity & Organization | `plan`, `task` | Common words ("plan" appears in planning conversations already classified elsewhere) |

The word `how` alone causes "Learning & Education" to match **nearly every conversation**, which is why it shows ~23,000 messages (nearly the total).

### The Cascade Effect

The inflated counts propagate to the UI:

1. **Hero theme** (`themeHeroCount`): Shows an impossibly large number (e.g., "23,000 messages analyzed")
2. **Other theme cards** (`theme-cluster-count`): All show massive, meaningless numbers
3. **Bar chart proportions**: Bars are relative to the hero count, so if the hero is inflated, other themes look proportionally reasonable — masking the fact that ALL counts are wrong
4. **User perception**: Makes the entire themes slide look untrustworthy. A user who knows they have 23,000 total messages will immediately recognize that 23,000 in a single theme is impossible.

### Comparison: Server Path (Path B) Does It Better

The server-side theme discovery (`src/server.ts`, lines 1196–1237) uses **embedding similarity** instead of regex:

```sql
SELECT COUNT(*) as cnt FROM events
WHERE source = 'chatgpt' AND metadata->>'role' = 'user' AND embedding IS NOT NULL
AND 1 - (embedding <=> $1::vector) > 0.40
```

- Counts individual messages that are semantically similar (>0.40 cosine similarity)
- Only counts `role = 'user'` messages (not system/assistant/tool)
- Uses semantic probes, not keyword regex

**However**, the server path still allows a single message to count toward multiple themes if it's semantically similar to multiple probes. This is a softer version of Bug 9B but less severe because embedding similarity is more precise than regex.

### Fix Specification

#### Approach: Count per-message, single-theme assignment

Replace the current function with one that:
1. Iterates over individual **user messages** (not entire conversation mappings)
2. Assigns each message to **at most one** theme (the best match)
3. Uses **more specific** regex patterns (no single common words like `how`)
4. Labels the count as "conversations" or "user messages" — not just "messages" (which is ambiguous)

#### Step 1: Fix the regex patterns

Remove overly broad single words. Each pattern should require multi-word context or use word boundaries more carefully:

```javascript
const themePatterns = {
  'Learning & Education': /learn(?:ing)?|tutorial|explain(?:ed)?|understand|teach|course|study|guide|how (?:does|do|to|can|is|are|would|should|could)/i,
  'Creative Writing': /writ(?:e|ing)|article|blog|story|narrative|script|poem|fiction|novel|essay|copywriting/i,
  'Technical Architecture': /architect(?:ure)?|system design|design pattern|microservice|scalab|infra(?:structure)?|monolith/i,
  'Business & Entrepreneurship': /business|startup|entrepreneur|monetiz|revenue|profit|investor|pitch|saas|b2b|b2c/i,
  'AI Image Generation': /dall[\-\s]?e|midjourney|stable diffusion|generate (?:an? )?image|image generat|ai art|text.to.image/i,
  'Career & Growth': /career|job (?:interview|search|application)|resume|cv |hiring|promoted|salary|linkedin/i,
  'Productivity & Organization': /productiv|organiz|todo|time manag|schedule|pomodoro|notion|obsidian|workflow/i,
  'Personal Life': /relationship|dating|family|personal|self[- ]?care|mental health|therapy|life advice/i,
};
```

Key changes:
- "Learning & Education": `how` replaced with `how does|how do|how to|how can|how is|how are|how would|how should|how could` — requires a following word
- "AI Image Generation": removed `design`, `creative`, `image`, `visual`, `generate` as standalone terms; now requires DALL-E, Midjourney, or the phrase "generate image" / "image generat(ion)"
- "Technical Architecture": removed `design`, `system`, `pattern`, `structure`, `implementation`; now requires compound terms like "system design", "design pattern"
- "Career & Growth": removed `growth`, `development`, `skill`; now requires career-specific compounds
- "Productivity & Organization": removed `plan`, `task`; now requires productivity-specific terms

#### Step 2: Count individual user messages, not conversation node totals

```javascript
function generateDiscoveredThemes(stats, conversations) {
  // (updated themePatterns from Step 1)

  // Per-message counting: each user message assigned to at most one theme
  const themeCounts = {};
  const themeSamples = {};

  for (const conv of conversations) {
    const messages = conv.mapping ? Object.values(conv.mapping) : [];

    for (const node of messages) {
      if (!node.message) continue;
      // Only count user messages
      if (node.message.author?.role !== 'user') continue;

      const text = (node.message.content?.parts || [])
        .filter(p => typeof p === 'string')
        .join(' ');
      if (!text || text.length < 10) continue;

      // Score each theme and pick the best match (single assignment)
      let bestTheme = null;
      let bestScore = 0;

      for (const [themeName, pattern] of Object.entries(themePatterns)) {
        const matches = text.match(new RegExp(pattern.source, 'gi'));
        const score = matches ? matches.length : 0;
        if (score > bestScore) {
          bestScore = score;
          bestTheme = themeName;
        }
      }

      if (bestTheme) {
        themeCounts[bestTheme] = (themeCounts[bestTheme] || 0) + 1;
        // Store a sample message for evidence
        if (!themeSamples[bestTheme]) themeSamples[bestTheme] = [];
        if (themeSamples[bestTheme].length < 3) {
          themeSamples[bestTheme].push(text.slice(0, 150));
        }
      }
    }
  }

  return Object.entries(themeCounts)
    .map(([name, messageCount]) => ({ name, messageCount }))
    .sort((a, b) => b.messageCount - a.messageCount)
    .slice(0, 6);
}
```

Key changes:
- **Only user messages** (`role === 'user'`) are counted
- **Per-message scoring**: Each message is scored against all themes; only the **highest-scoring** theme gets +1
- **Single assignment**: A message contributes to at most one theme (no double counting)
- **+1 per message** instead of +`messages.length` per conversation

#### Step 3: Update the slide label

The hero stat label in `slide-09-themes.html` currently says "messages analyzed". After this fix, the count represents actual user messages classified into each theme. The label should be updated to "user messages" for clarity:

```html
<span class="theme-hero-label">user messages</span>
```

### Expected Results After Fix

For a user with ~23,000 total messages (~11,500 user messages):

| Theme | Before (Broken) | After (Fixed) | Why |
|-------|-----------------|---------------|-----|
| Learning & Education | ~23,000 | ~800–2,000 | Only counts messages with actual learning phrases, not every message containing "how" |
| AI Image Generation | ~19,000 | ~200–500 | Only counts messages referencing DALL-E/image generation, not "design" or "creative" |
| Technical Architecture | ~15,000 | ~300–800 | Only counts messages about actual architecture, not every mention of "system" or "design" |
| Sum of all themes | ~100,000+ (>4x total) | ~3,000–5,000 (<50% of user messages) | Single assignment + stricter patterns = realistic numbers |

### How to Test

1. Upload a ChatGPT export with known content
2. Open debug panel → check raw stats for total messages
3. Navigate to Themes slide (Slide 9)
4. Verify:
   - **No single theme count exceeds total user messages** (approximately half of total messages)
   - **Sum of all theme counts does not exceed total user messages**
   - The hero theme count looks reasonable (should be a fraction of total, not nearly equal)
   - Theme names match actual conversation content (spot-check 5–10 conversations)
5. Compare with server path (Path B): numbers should be in the same ballpark
6. Check the bar chart proportions look visually reasonable

### What Was Implemented

#### 1. Rewrote `generateDiscoveredThemes()` (`js/core/analysis.js`)

**Three core fixes:**

- **Per-message counting:** Each individual **user message** (`role === 'user'`) is now scored and counted. Previously, all mapping nodes (system, assistant, tool) in an entire conversation were counted whenever the conversation matched.
- **Single-theme assignment:** Each message is assigned to at most **one** theme (the highest-scoring match). Previously, a conversation could contribute its full node count to every theme it matched.
- **Tightened regex patterns:** Removed overly broad single words (`how`, `design`, `system`, `creative`, `plan`, `task`, `growth`, `development`). All patterns now require multi-word context or domain-specific terms:
  - "Learning & Education": `how` → `how does|how do|how to|how can|...` (requires a following word)
  - "AI Image Generation": removed `image`, `visual`, `design`, `creative`, `generate`; now requires `dall-e`, `midjourney`, `stable diffusion`, `generate image`, `image generation`, etc.
  - "Technical Architecture": removed `design`, `system`, `pattern`, `structure`, `implementation`; now requires `system design`, `design pattern`, `microservice`, `architect(ure)`, etc.

**Four new themes added** to improve coverage:
- **Coding & Development** — matches programming terms (`code`, `debug`, `api`, `react`, `python`, `docker`, etc.)
- **Data & Analytics** — matches `data analysis`, `machine learning`, `pandas`, `sql query`, etc.
- **Marketing & Content** — matches `marketing strategy`, `seo`, `social media`, `brand`, etc.
- **Finance & Investing** — matches `investing`, `stock market`, `crypto`, `budget`, etc.

#### 2. Updated labels

- `slides/slide-09-themes.html`: Hero stat label changed from "messages analyzed" → "user messages"
- `index.html`: Inline fallback label also updated
- `js/slides/slide-09-themes.js`: Cluster card label changed from "messages" → "user messages"

#### 3. Updated supporting maps

- `js/core/state.js`: Added icons for new themes (💻 Coding, 📊 Data, 📣 Marketing, 💰 Finance)
- `js/slides/slide-09-themes.js`: Added `themeKeyMap` entries for new themes

#### 4. Verification

With sample data (847 conversations, ~4,659 user messages):

| Theme | Before (Broken) | After (Fixed) |
|-------|-----------------|---------------|
| Coding & Development | N/A (didn't exist) | 1,763 (37.8%) |
| Creative Writing | ~15,000+ | 1,156 (24.8%) |
| Learning & Education | ~23,000 (matched `how`) | 670 (14.4%) |
| Technical Architecture | ~18,000 (matched `design`, `system`) | 207 (4.4%) |
| **Sum** | **~100,000+ (>20x total)** | **3,796 (81.5% of user msgs)** |

### Files Modified

| File | Change |
|------|--------|
| `js/core/analysis.js` | Rewrote `generateDiscoveredThemes()` — tightened regex, per-user-message counting, single-theme assignment, 4 new themes |
| `slides/slide-09-themes.html` | Updated "messages analyzed" label to "user messages" |
| `index.html` | Updated inline fallback label to "user messages" |
| `js/slides/slide-09-themes.js` | Updated cluster card label, added `themeKeyMap` entries for new themes |
| `js/core/state.js` | Added icons for 4 new themes (Coding, Data, Marketing, Finance) |

---

## 13. Data Flow Diagrams

### Current Data Flow (Broken)

```
processFile()
  │
  ├─ analyzeConversations()
  │    → stats.topics = [['general', 1184], ['learning', 150], ...]
  │    → stats.images = 47 (counter only, no objects)
  │    → stats.firstDate = undefined ← BUG
  │
  ├─ generateEnhancedAnalysis()
  │    → stats.enhanced.nightOwlScore = 32
  │    → stats.enhanced.marathonConvos = 7
  │    → stats.enhanced.longestStreak = undefined ← BUG (not computed here)
  │    → stats.enhanced.totalActiveDays = undefined ← BUG (not computed here)
  │
  ├─ generateHeatmapData()
  │    → heatmapData.stats.longestStreak = 14 ← DATA EXISTS BUT DISCONNECTED
  │    → heatmapData.stats.activeDays = 287   ← DATA EXISTS BUT DISCONNECTED
  │
  ├─ generateDataInsights()
  │    → aiInsights.topObsession.topic = 'general' ← BUG (from bad classifier)
  │    → aiInsights.personality = { title: 'The Seeker' } ← BUG (hardcoded)
  │    → aiInsights.spiritAnimal = { animal: 'owl' } ← BUG (hardcoded)
  │
  ├─ imagePrompts = [] ← NEVER POPULATED
  ├─ imageStats = { generated: 0, uploaded: 0, total: 0 } ← NEVER UPDATED
  │
  └─ populateSlides()
       ├─ Slide 4 (Identity): "The Seeker" / "Wise and observant" ← GARBAGE
       ├─ Slide 5 (Obsession): "general" at 83% ← GARBAGE
       ├─ Slide 10 (Gallery): "No images" ← BROKEN
       ├─ Slide 13 (Revelations): Repackaged stats ← BORING
       ├─ Slide 15 (Verdict): Generic roast ← GARBAGE
       └─ Slide 16 (Achievements):
            streak = 0 (should be 14) ← BROKEN
            activeDays = 0 (should be 287) ← BROKEN
            firstYear = 9999 (should be 2023) ← BROKEN
            images = 0 (should be 47) ← BROKEN
```

### Fixed Data Flow (Target)

```
processFile()
  │
  ├─ analyzeConversations() [IMPROVED]
  │    → classifyConversation() per conversation (15+ categories, content analysis)
  │    → stats.topics = [['coding', 412], ['ai & ml', 298], ['business', 187], ...]
  │    → stats.images = 59 (comprehensive detection)
  │    → stats.firstDate = '2023-03-15T...' ← FIXED
  │
  ├─ extractImagePrompts() [NEW]
  │    → imagePrompts = [{ id, source, prompt, ... }, ...] (59 items)
  │    → imageStats = { generated: 12, uploaded: 47, total: 59 }
  │
  ├─ generateEnhancedAnalysis()
  │    → stats.enhanced.nightOwlScore = 32
  │    → stats.enhanced.marathonConvos = 7
  │
  ├─ generateHeatmapData()
  │    → heatmapData.stats.longestStreak = 14
  │    → heatmapData.stats.activeDays = 287
  │
  ├─ WIRE HEATMAP → STATS [NEW]
  │    → stats.enhanced.longestStreak = 14 ← FIXED
  │    → stats.enhanced.totalActiveDays = 287 ← FIXED
  │    → stats.streaks = { longestStreak: 14, totalActiveDays: 287 } ← FIXED
  │
  ├─ generateDataInsights() [IMPLEMENTED — Bug 4]
  │    → generatePersonality() uses 5 behavioral dimensions (depth/breadth/intensity/nocturnal/consistency)
  │    → "general"/"other" safeguard: auto-falls to #2 topic
  │    → aiInsights.topObsession.topic = 'coding' ← MEANINGFUL
  │    → aiInsights.personality = { title: 'The Midnight Philosopher' } ← DATA-DRIVEN
  │    → aiInsights.spiritAnimal = { animal: 'owl', reason: '7 deep dives, 32% after midnight' } ← SPECIFIC
  │    → aiInsights.funFacts = [...] ← NEW: unique insights for cosmic revelations
  │
  ├─ generateUniqueRevelations() [NEW]
  │    → Novel facts not shown on other slides
  │
  └─ populateSlides()
       ├─ Slide 4 (Identity): "The Midnight Philosopher" / specific reason ← ACCURATE
       ├─ Slide 5 (Obsession): "coding" at 29% ← MEANINGFUL
       ├─ Slide 10 (Gallery): 59 images displayed ← WORKING
       ├─ Slide 13 (Revelations): Unique insights ← INTERESTING
       ├─ Slide 15 (Verdict): Topic-specific roast ← PERSONALIZED
       └─ Slide 16 (Achievements):
            streak = 14 ← CORRECT
            activeDays = 287 ← CORRECT
            firstYear = 2023 ← CORRECT
            images = 12 ← CORRECT
```

---

## 14. Execution Order & Dependencies

```
Task 0: Debug Dashboard          ← DO THIS FIRST (enables testing all others)
    │
    ├─ Task 1: Topic Classification  ← Most impactful fix (cascades everywhere)
    │       │
    │       ├─ Task 6: Obsession Slide  ← Auto-fixed by Task 1
    │       │
    │       └─ Task 5: AI Identity      ← Depends on better topics, but also needs
    │                                      its own behavioral analysis engine
    │
    ├─ Task 3: Achievements Wiring   ← Independent, can parallel with Task 1
    │
    ├─ Task 2: Image Detection       ← Independent, can parallel with Task 1
    │       │
    │       └─ (Fixes Artist achievement in Task 3)
    │
    ├─ Task 4: Cosmic Revelations    ← Depends on Task 1 (needs classifyConversation)
    │
    ├─ Task 7: LLM Prompt Refinement ← Independent, server-side only
    │
    └─ Task 9: Themes Slide Counts  ← Independent, client-side only
```

### Recommended Execution Order

| Order | Task | Est. Complexity | Depends On |
|-------|------|----------------|------------|
| 1 | Debug Dashboard | Medium | Nothing |
| 2 | Topic Classification | High | Nothing (but test with dashboard) |
| 3 | Achievements Wiring | Low | Nothing (3 small wiring fixes) |
| 4 | Image Detection | Medium | Nothing |
| 5 | AI Identity | Medium | Task 2 (better topics improve results) |
| 6 | Cosmic Revelations | Medium | Task 2 (uses classifyConversation) |
| 7 | Obsession Improvements | Low | Task 2 (auto-fixed, just add roasts) |
| 8 | LLM Prompt Refinement | Medium | Nothing (server-side) |
| 9 | Themes Slide Counts | Medium | Nothing (rewrite `generateDiscoveredThemes()`) |

---

## 15. Testing Checklist

### Per-Upload Validation (use Debug Dashboard)

After every file upload, verify:

- [ ] **Topics:** "general"/"other" is < 10% of conversations
- [ ] **Topics:** Top topic is a meaningful category
- [ ] **Images:** `imagePrompts.length` matches expected image count
- [ ] **Images:** `imageStats.generated` and `imageStats.uploaded` are both > 0
- [ ] **Streaks:** `stats.enhanced.longestStreak` > 0 (matches heatmap)
- [ ] **Active Days:** `stats.enhanced.totalActiveDays` > 0 (matches heatmap)
- [ ] **First Date:** `stats.firstDate` is a valid date, matches earliest conversation
- [ ] **OG Year:** First message year is correct (e.g., 2023)
- [ ] **Personality:** Title is NOT "The Seeker" and references behavioral data
- [ ] **Spirit Animal:** Reason references specific numbers
- [ ] **Achievements:** At least 4-5 achievements unlocked for active users
- [ ] **Revelations:** No fact duplicates content from another slide
- [ ] **Themes:** No single theme count exceeds total user messages (Bug 9)
- [ ] **Themes:** Sum of all theme counts does not exceed total user messages (Bug 9)
- [ ] **Themes:** Hero theme count is a reasonable fraction of total, not nearly equal (Bug 9)

### Slide-by-Slide Validation

| Slide | Check |
|-------|-------|
| 1. Conversations | Total count matches raw data |
| 2. Messages | Total, user, code blocks counts accurate |
| 3. Topics | Top 5 topics are meaningful categories |
| 4. Identity | Personality title is unique and data-driven |
| 5. Obsession | Topic is NOT "general", roast is specific |
| 7. Time | Peak hour and time personality match data |
| 8. Evolution | Old vs recent topics show actual change |
| 9. Themes | Themes are meaningful; counts are realistic (no theme exceeds total user messages); see Bug 9 |
| 10. Gallery | Images appear (at least as placeholder cards) |
| 13. Revelations | Facts are unique, not repeats of other slides |
| 14. Heatmap | Streak and active days match debug panel |
| 15. Verdict | Roast and compliment are specific |
| 16. Achievements | Streak, OG, Artist, Dedication badges correct |

### Regression Test (After Each Fix)

After applying each fix, re-run the full upload and verify NO other slides broke:

```
1. Upload test file
2. Open debug panel (Ctrl+Shift+D)
3. Run through all 15 slides
4. Check each slide renders without errors
5. Check browser console for JavaScript errors
6. Verify debug panel data matches slide display
```

---

## Files Modified (Summary)

| File | Changes |
|------|---------|
| `js/core/analysis.js` | Fix `classifyConversation()` (Bug 1), add `generatePersonality()` behavioral engine (Bug 4), rewrite `generateDataInsights()` with data-driven fields + expanded roasts/compliments + funFacts generation, add `generateClientFunFacts()` and `generateAchievementLabels()` helpers, replace empty compliment pool fallback with data-driven text (Bug 8) |
| `js/core/file-handling.js` | Wire heatmap→stats (Bug 3A), add `extractImagePrompts()` call (Bug 2) |
| `js/core/image-extraction.js` | NEW: Image extraction from exports (Bug 2) |
| `js/app.js` | Replace hiddenTheme and questionStyle fallbacks with data-driven computations (Bug 8); format old/recent topic labels in `populateSlides()` via `formatTopicName()` (Bug 6) |
| `js/slides/slide-03-topics.js` | Replace generic diversity insights with data-driven text referencing topic name + percentage (Bug 8); use shared `topicIcons` and `formatTopicName()` for all topic displays (Bug 6) |
| `js/slides/slide-04-identity.js` | Add missing animal emojis (elephant, horse, panther, falcon) for personality matrix |
| `js/slides/slide-05-obsession.js` | Add safeguard against "other" as #1, expand roast pool; replace generic context fallback and bar labels with data-driven text (Bug 8); add `topicDisplayNames` (50 entries), `formatTopicName()`, expanded `topicIcons` (50 entries); fix count mismatch to use `obsession.count`; defense-in-depth safeguard (Bug 6) |
| `js/slides/slide-08-evolution.js` | Replace 3 sets of hardcoded trend subtitles with data-referencing text (Bug 8); format old/recent topic labels via `formatTopicName()` (Bug 6) |
| `js/slides/slide-09-themes.js` | Populate themes insight footer dynamically with theme count + message total (Bug 8) |
| `js/slides/slide-13-fun-facts.js` | Replaced repackaged-stats fallback (`computedFacts`) with 8 unique behavioral `uniqueFallbackFacts` (Bug 5 ✅) |
| `slides/slide-09-themes.html` | Change static insight to neutral label, add id for JS population (Bug 8) |
| `js/debug-panel.js` | NEW: Debug dashboard panel |
| `css/core/debug-panel.css` | NEW: Debug dashboard styles |
| `index.html` | Add debug panel script/style includes; replace hardcoded personality defaults with loading placeholder (Bug 8) |
| `js/core/init.js` | Add keyboard shortcut listener |
| `src/server.ts` | Improve LLM prompt constraints, expand theme probes |

---

*This document should be updated as fixes are implemented. Mark each task as complete and note any unexpected findings during implementation.*
