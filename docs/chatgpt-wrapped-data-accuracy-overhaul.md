# ChatGPT Wrapped: Data Accuracy Overhaul

> **Status:** Active  
> **Date:** February 6, 2026  
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
11. [Data Flow Diagrams](#11-data-flow-diagrams)
12. [Execution Order & Dependencies](#12-execution-order--dependencies)
13. [Testing Checklist](#13-testing-checklist)

---

## 1. Executive Summary

The ChatGPT Wrapped feature has **seven interconnected data accuracy bugs** that cause the majority of slides to display incorrect, generic, or missing data. The bugs fall into three categories:

| Category | Bugs | Impact |
|----------|------|--------|
| **Broken Data Extraction** | Topic classification, image detection | 83% of conversations miscategorized; 100% of images missing |
| **Broken Data Wiring** | Achievements data flow | Streaks, active days, OG status, artist badge all fail |
| **No Real Analysis** | AI identity, cosmic revelations, obsession | Hardcoded lookup tables instead of actual data analysis |

**The single most damaging root cause** is the topic classifier. It only recognizes 4 narrow regex patterns, dumping everything else into "general." Since the AI identity, obsession slide, personality title, spirit animal, roasts, and compliments ALL derive from the top topic, when the top topic is "general", every downstream feature produces generic garbage.

### Affected Slides

| Slide | What's Wrong | Root Cause |
|-------|-------------|------------|
| Slide 4: AI Identity | "The Seeker" / "Wise and observant" | Hardcoded lookup from topic → personality (Bug 4) |
| Slide 5: Obsession | "#1 Obsession: general" | Topic classifier too narrow (Bug 1) |
| Slide 10: Gallery | "No images" despite having many | Image detection broken + imagePrompts never populated (Bug 2) |
| Slide 13: Fun Facts | Repeats of other slides | No unique fact generation logic (Bug 5) |
| Slide 15: Verdict | Generic roast/compliment | Derived from "general" topic (Bug 1 cascade) |
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
| Cosmic Revelations | Repackaged stats | Uses LLM funFacts (better if prompt is good) |
| Obsession | Shows "general" | Shows LLM-derived topic (better) |

**Conclusion:** Path A (file upload) is far more broken than Path B. Most fixes needed are in the client-side JavaScript.

---

## 3. Task 0: Debug & Testing Dashboard

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

### Current Snapshot (Feb 6, 2026)

Captured from debug panel after loading real data:

- **Topics:**
  - `coding`: 399
  - `writing`: 168
  - `general`: 164
  - `learning`: 61
  - `planning`: 55
  - **Observation:** `general` still ranks #3 → Topic classifier still too narrow.
- **Images:**
  - `stats.images`: 0
  - `imagePrompts.length`: 0
  - `imageStats`: `{ generated: 0, uploaded: 0, total: 0 }`
  - **Observation:** Image detection + prompt extraction still not happening.
- **Heatmap:**
  - `heatmapStats.activeDays`: 329
  - `heatmapStats.longestStreak`: 43
  - **Observation:** These values exist but are not surfaced in `stats.enhanced`/`stats.streaks` on the client path.
- **AI Insights:**
  - Still using generic sample-style strings (e.g., “Curious, detail-oriented, and always iterating.”)
  - **Observation:** Client-side insights are still static/hardcoded.

### Implementation Notes

- Create new file: `js/debug-panel.js`
- Create new file: `css/core/debug-panel.css`
- Add `<script>` and `<link>` tags to `index.html`
- Register keyboard listener in `js/core/init.js`
- The panel reads from the same global variables (`stats`, `aiInsights`, `imagePrompts`, `imageStats`, `heatmapData`, `discoveredThemes`)
- Panel auto-refreshes when data changes (listen for slide population)

---

## 4. Bug 1: Topic Classification — "general" Catch-All

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

Replace the 4-category regex with 15+ categories:

```javascript
const topicPatterns = [
  { topic: 'coding',       pattern: /code|function|api|bug|error|debug|typescript|javascript|python|react|vue|angular|node|express|sql|database|mongodb|postgres|git|github|docker|kubernetes|deploy|devops|server|backend|frontend|css|html|webpack|npm|package|library|framework|component|hook|state|redux|graphql|rest|endpoint|cors|auth|jwt|token|oauth|regex|algorithm|data.?structure|array|object|class|interface|module|import|async|await|promise|fetch|request|response|json|yaml|config|env|variable|loop|condition|syntax|compile|runtime|exception|stack|trace|log|console|terminal|command|shell|bash|script|lambda|aws|azure|gcp|cloud|ci.?cd|pipeline|test|jest|mocha|cypress|lint|format|prettier|eslint|type|generic|enum|union|tuple/i },
  { topic: 'ai & ml',      pattern: /\bai\b|artificial.?intelligence|machine.?learning|deep.?learning|neural|gpt|chatgpt|llm|language.?model|openai|claude|anthropic|gemini|prompt|token|embedding|vector|rag|fine.?tune|train|model|transformer|diffusion|stable.?diffusion|dall.?e|midjourney|comfy.?ui|lora|checkpoint|inference|classification|regression|nlp|computer.?vision|reinforcement|agent|langchain|hugging.?face/i },
  { topic: 'writing',      pattern: /write|rewrite|edit|proofread|email|blog|article|copy|newsletter|headline|subject.?line|tone|grammar|spelling|paragraph|essay|report|document|summary|summarize|rephrase|paraphrase|draft|outline|resume|cover.?letter|linkedin|bio|caption|tagline|slogan|speech|presentation|pitch|proposal|script|screenplay|dialogue|storytelling|content|copywriting|seo.?content|description|review/i },
  { topic: 'creative',     pattern: /creative|design|logo|brand|color|palette|layout|mockup|wireframe|figma|sketch|illustration|icon|graphic|visual|aesthetic|style|theme|art|drawing|painting|animation|video|music|song|lyrics|poem|poetry|fiction|novel|character|world.?build|game.?design|narrative|plot|story|fantasy|sci.?fi/i },
  { topic: 'business',     pattern: /business|startup|company|entrepreneur|founder|ceo|cto|revenue|profit|pricing|market|customer|client|sales|marketing|growth|strategy|acquisition|retention|churn|metric|kpi|roi|budget|funding|investor|pitch.?deck|valuation|equity|partnership|negotiat|contract|legal|compliance/i },
  { topic: 'data & analytics', pattern: /data|analytics|dashboard|chart|graph|visualization|excel|spreadsheet|csv|sql|query|report|metric|statistics|probability|distribution|correlation|regression|forecast|predict|trend|insight|bi\b|tableau|power.?bi|looker|pandas|numpy|matplotlib|jupyter|notebook/i },
  { topic: 'learning',     pattern: /learn|study|course|tutorial|explain|teach|understand|concept|theory|principle|definition|example|practice|exercise|quiz|exam|certification|skill|knowledge|education|school|university|degree|research|paper|academic/i },
  { topic: 'career',       pattern: /career|job|interview|resume|portfolio|linkedin|networking|salary|promotion|raise|manager|leadership|team|hire|recruit|onboard|performance|feedback|mentor|coach|skill.?gap|transition|freelance|consulting|remote.?work/i },
  { topic: 'productivity',  pattern: /productiv|organize|schedule|calendar|todo|task|project.?manage|notion|obsidian|trello|jira|asana|workflow|automat|template|system|routine|habit|goal|priorit|deadline|efficient|time.?manage|focus|pomodoro/i },
  { topic: 'finance',      pattern: /financ|money|invest|stock|crypto|bitcoin|ethereum|portfolio|tax|budget|saving|retirement|mortgage|loan|credit|bank|trading|dividend|compound|interest|wealth|passive.?income|real.?estate|401k|ira/i },
  { topic: 'health',       pattern: /health|fitness|workout|exercise|gym|diet|nutrition|meal|calorie|protein|weight|sleep|meditat|mental.?health|therapy|anxiety|stress|wellness|supplement|vitamin|doctor|medical|symptom|diagnos/i },
  { topic: 'personal',     pattern: /relationship|dating|family|parent|child|friend|emotion|feeling|advice|decision|life|personal|hobby|travel|vacation|trip|cook|recipe|home|apartment|move|pet|dog|cat|garden/i },
  { topic: 'planning',     pattern: /plan|strategy|roadmap|milestone|timeline|estimate|scope|requirement|specification|architecture|blueprint|phase|sprint|backlog|epic|story|stakeholder/i },
  { topic: 'communication', pattern: /communicat|present|public.?speak|meeting|agenda|standup|retro|feedback|conflict|difficult.?conversation|negotiate|persuad|influence|collaborate/i },
  { topic: 'education',    pattern: /math|physics|chemistry|biology|history|geography|philosophy|psychology|sociology|economics|political|science|engineering|medicine|law|literature/i },
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

#### Step 3: Remove "general" entirely

- Replace every instance of `let topic = 'general'` with `let topic = 'other'`
- In the display layer, rename "other" to something like "Miscellaneous" or "General Chat"
- Add logic: if "other" is the #1 obsession, use the #2 topic instead
- Better yet: with 15+ categories and content analysis, "other" should never be #1

#### Step 4: Update both classification locations

The same regex appears in TWO places:
1. `analyzeConversations()` — line 271
2. `generateEnhancedAnalysis()` — line 3361

Both need to be replaced with the new `classifyConversation()` function.

### How to Test

1. Open debug panel after file upload
2. Check "Topic Classification Breakdown" section
3. "general"/"other" should be <10% of conversations
4. Top topic should be a meaningful category
5. Spot-check 10 conversations manually: does the classification match?

---

## 5. Bug 2: Images Never Load

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

1. Upload a ChatGPT export that you KNOW contains DALL-E images and uploaded images
2. Open debug panel → check "Image Detection" section
3. Verify `imagePrompts.length > 0`
4. Verify `imageStats.generated` and `imageStats.uploaded` match expected counts
5. Navigate to gallery slide → verify cards appear
6. Check a few cards: does the prompt text match the actual image context?

---

## 6. Bug 3: Achievements Completely Broken

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

---

## 7. Bug 4: AI Identity Is a Hardcoded Lookup Table

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

---

## 8. Bug 5: Cosmic Revelations Are Slide Repeats

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

---

## 9. Bug 6: Obsession Slide Shows "general"

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
4. Verify topic name is meaningful (e.g., "coding", "ai & ml", "business")
5. Verify roast text is specific to that topic
6. Verify the conversation count and percentage look reasonable

---

## 10. Bug 7: Server-Side LLM Prompts Need Refinement

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

## 11. Data Flow Diagrams

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
  ├─ generateDataInsights() [IMPROVED]
  │    → generatePersonality() uses behavioral metrics, not topic lookup
  │    → aiInsights.topObsession.topic = 'coding' ← MEANINGFUL
  │    → aiInsights.personality = { title: 'The Midnight Philosopher' } ← DATA-DRIVEN
  │    → aiInsights.spiritAnimal = { animal: 'owl', reason: '7 deep dives, 32% after midnight' } ← SPECIFIC
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

## 12. Execution Order & Dependencies

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
    └─ Task 7: LLM Prompt Refinement ← Independent, server-side only
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

---

## 13. Testing Checklist

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
| 9. Themes | Themes are meaningful, not all generic |
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
| `js/app.js` | Fix `analyzeConversations()` classifier, add `extractImagePrompts()`, wire heatmap→stats, rewrite `generateDataInsights()`, add `generatePersonality()`, add `generateUniqueRevelations()` |
| `js/slides/slide-05-obsession.js` | Add safeguard against "other" as #1, expand roast pool |
| `js/slides/slide-13-fun-facts.js` | Replace computed facts with unique revelations |
| `js/debug-panel.js` | NEW: Debug dashboard panel |
| `css/core/debug-panel.css` | NEW: Debug dashboard styles |
| `index.html` | Add debug panel script/style includes |
| `js/core/init.js` | Add keyboard shortcut listener |
| `src/server.ts` | Improve LLM prompt constraints, expand theme probes |

---

*This document should be updated as fixes are implemented. Mark each task as complete and note any unexpected findings during implementation.*
