# Learning "You" — How The System Adapts

## Philosophy

The assistant "becomes you" not by storing everything, but by:

1. **Curating** the facts that matter
2. **Observing** your corrections and preferences
3. **Measuring** improvement over time

---

## The Three Learning Layers

```
┌─────────────────────────────────────────────────────────┐
│                    PROFILE MEMORY                        │
│            Small, curated facts (~100-500)              │
│     Preferences • People • Defaults • Rules             │
├─────────────────────────────────────────────────────────┤
│                   EPISODIC MEMORY                        │
│           Decisions + Reflections (~unlimited)          │
│      What you decided • Why • What you learned          │
├─────────────────────────────────────────────────────────┤
│                     STYLE MODEL                          │
│              How you write (~50 parameters)             │
│   Tone • Length • Format • Phrases • Banned words       │
└─────────────────────────────────────────────────────────┘
```

---

## Layer A: Profile Memory

### What Goes Here

| Category | Examples |
|----------|----------|
| **Communication** | "I prefer short answers", "Use bullet lists", "No fluff" |
| **Technical** | "Use TypeScript", "Prefer functional style", "tabs not spaces" |
| **People** | "Sarah = CEO", "Mike = eng lead, reports to me", "Mom = emergency contact" |
| **Defaults** | Timezone: PST, Work hours: 9-6, Preferred calendar: Google |
| **Rules** | "Never schedule before 10am", "Always CC legal on contracts" |

### Schema

```typescript
interface ProfileMemory {
  id: string;
  category: 'preference' | 'person' | 'default' | 'rule';
  key: string;
  value: string;
  confidence: number;      // 0-1, higher = more certain
  source: 'explicit' | 'inferred' | 'observed';
  created_at: Date;
  last_used: Date;
  use_count: number;
}
```

### How It's Updated

**Explicit Addition:**
```
You: "Remember that I prefer bullet points over paragraphs"
Assistant: "✓ Saved: Format preference → bullet points"
```

**Prompted Addition:**
```
Assistant: "I notice you've edited 3 drafts to use bullet points. 
           Should I remember this preference?"
You: "Yes"
```

**Automatic Inference (requires approval):**
```
Assistant: "Based on your recent emails, it seems like you:
           • Prefer short responses (avg 50 words)
           • Usually respond within 2 hours
           • Sign off with just your first name
           
           Save these observations? [Yes] [No] [Edit]"
```

### Confidence Decay

Preferences that aren't used decay over time:
- Start at 1.0 confidence when saved
- Decay 0.1 per month if not referenced
- Below 0.3 → prompt for reconfirmation
- Below 0.1 → auto-archive (not delete)

---

## Layer B: Episodic Memory

### What Goes Here

Important moments you want to remember:

- **Decisions**: What you decided and why
- **Learnings**: What you figured out from a situation
- **Commitments**: What you promised to do
- **Reflections**: How you felt about something

### Schema

```typescript
interface EpisodicMemory {
  id: string;
  type: 'decision' | 'learning' | 'commitment' | 'reflection';
  summary: string;          // 1-2 sentences
  context: string;          // Optional longer context
  timestamp: Date;
  source_refs: string[];    // Links to original emails/messages
  tags: string[];           // Topics, projects, people
  importance: number;       // 1-5
  revisit_date?: Date;      // Optional reminder to review
}
```

### Examples

**Decision:**
```json
{
  "type": "decision",
  "summary": "Declined Series A offer from Acme Ventures because valuation was too low and timeline too aggressive",
  "context": "They offered $5M at $20M pre. We wanted $30M pre minimum. Also required closing in 2 weeks which felt rushed.",
  "timestamp": "2024-01-15T10:30:00Z",
  "source_refs": ["email_12345", "email_12346"],
  "tags": ["fundraising", "acme-ventures", "series-a"],
  "importance": 5
}
```

**Learning:**
```json
{
  "type": "learning",
  "summary": "Learned that sending pricing without a call first leads to ghosting 80% of the time",
  "context": "Lost 4 deals this month by sending pricing docs before having a discovery call",
  "timestamp": "2024-01-20T14:00:00Z",
  "source_refs": [],
  "tags": ["sales", "pricing", "process"],
  "importance": 4
}
```

### How It's Created

**Explicit:**
```
You: "Save this decision: We're going with Stripe over Braintree because..."
Assistant: "✓ Saved to episodic memory with tags [payments, infrastructure]"
```

**Prompted:**
```
Assistant: "This thread contains what looks like an important decision 
           about your product roadmap. Want me to save a summary?"
You: "Yes, summarize it"
```

**From Digest:**
```
📋 DECISIONS FROM THIS WEEK
The following seem significant. Save any of these?

[ ] Agreed to delay launch by 2 weeks (from #product thread)
[x] Committed to quarterly board updates (from CEO email)
[ ] Decided against the AWS migration (from #engineering)
```

---

## Layer C: Style Model

### The Goal

Make the assistant write **exactly how you would write**.

Not generic "professional" writing. YOUR writing.

### What's Captured

```typescript
interface StyleProfile {
  // Length
  default_length: 'terse' | 'short' | 'medium' | 'long';
  length_by_context: {
    email_reply: 'short',
    email_cold_outreach: 'medium',
    slack_dm: 'terse',
    slack_channel: 'short',
    document: 'long'
  };
  
  // Structure
  format_preference: 'bullets' | 'paragraphs' | 'mixed';
  use_headers: boolean;
  use_numbered_lists: boolean;
  paragraph_length: 'short' | 'medium' | 'long';
  
  // Tone
  formality: 1-5;           // 1=very casual, 5=very formal
  warmth: 1-5;              // 1=cold/direct, 5=warm/friendly
  humor: 1-5;               // 1=none, 5=frequent
  technical_depth: 1-5;     // 1=simple, 5=detailed
  
  // Vocabulary
  banned_words: string[];   // ["synergy", "leverage", "circle back"]
  preferred_words: string[];// ["ship" instead of "deliver"]
  signature: string;        // How you sign off
  greeting: string;         // How you start messages
  
  // Examples
  exemplar_outputs: {
    id: string;
    text: string;
    context: string;
    rating: number;
  }[];
}
```

### How It's Learned

#### 1. Initial Calibration

When you first set up:
```
Assistant: "Let me learn your style. Can you paste 3-5 emails 
           or messages you've written that represent how you 
           typically communicate?"
           
[Analyze → Extract patterns → Generate initial profile]
```

#### 2. Edit-Based Learning

The most powerful signal: **how you edit drafts**.

```
Original draft:  "I wanted to circle back regarding our earlier discussion..."
Your edit:       "Following up on our chat —"

Learning:        - "circle back" → banned_words
                 - "regarding our earlier discussion" → too formal
                 - You prefer dashes over ellipses
                 - You use "chat" not "discussion"
```

**Edit Diff Analysis:**
```typescript
interface EditSignal {
  original: string;
  edited: string;
  diff_type: 'shorten' | 'lengthen' | 'rephrase' | 'restructure' | 'tone_shift';
  patterns_detected: string[];
  timestamp: Date;
}
```

#### 3. Rating-Based Learning

After drafts:
```
"Was this in your voice?"
[1 - Not at all] [2] [3 - Okay] [4] [5 - Exactly right]
```

- 1-2: Flag for major style review
- 3: Minor adjustments needed
- 4-5: Reinforce current patterns

#### 4. Explicit Rules

You can always override:
```
You: "Never use exclamation points in work emails"
You: "Always sign off with just '- Mark'"
You: "When writing to investors, be more formal"
```

### Style Application

When generating content, the style profile is injected:

```
System prompt addition:
---
USER STYLE PROFILE:
- Length: Short (aim for 50 words in email replies)
- Format: Bullet points preferred
- Tone: Direct, casual, minimal warmth
- Banned: "synergy", "leverage", "circle back", "per my last email"
- Signature: "- Mark"
- Examples of good outputs: [3 exemplars]
---
```

---

## Goal/Values Model

Beyond style, the assistant understands what you're optimizing for.

### North Star Profile

```typescript
interface NorthStar {
  long_term_goals: string[];       // What you want in 5+ years
  current_focus: string[];         // What you're optimizing NOW
  anti_goals: string[];            // What you explicitly don't want
  values: string[];                // What matters to you
  constraints: string[];           // Hard limits
}
```

### Example

```yaml
long_term_goals:
  - "Build a company worth $100M+"
  - "Maintain close relationships with family"
  - "Stay healthy enough to be active at 70"

current_focus:
  - "Close Series A by March"
  - "Ship v2 of product"
  - "Hire 3 engineers"

anti_goals:
  - "Don't sacrifice health for work"
  - "Don't become a 'reply to everything' person"
  - "Don't take meetings that could be emails"

values:
  - "Directness over diplomacy"
  - "Speed over perfection"
  - "Family over career when in conflict"

constraints:
  - "No work on Sundays"
  - "No meetings before 10am"
  - "Must exercise 3x/week"
```

### How It's Used

**Priority Filter:**
```
You: "Should I take this meeting?"
Assistant: "Based on your current focus (close Series A) and constraints 
           (no meetings before 10am), this seems low-priority. The person 
           isn't in your investor pipeline and it's at 9am. Suggest decline 
           or reschedule."
```

**Alignment Check:**
```
You: "Draft a response saying I'll take on the board observer role"
Assistant: "Note: This would add ~5 hrs/month of commitments. Your current 
           focus is on closing Series A and hiring. Want me to:
           a) Draft acceptance anyway
           b) Draft a 'not right now' response
           c) Draft a counter-proposal (reduced commitment)"
```

---

## Behavior Patterns

Track what you actually do (not just what you say).

### Tracked Patterns

| Pattern | Example | Used For |
|---------|---------|----------|
| **Response time** | Avg 2hr for email, 10min for Slack | Setting expectations |
| **Procrastination** | Always delays expense reports | Proactive nudges |
| **Auto-yes** | Always says yes to coffee chats | Suggest boundaries |
| **Auto-no** | Never takes sales calls | Auto-decline drafts |
| **Edit patterns** | Removes 30% of words on average | Tighter initial drafts |

### Pattern Schema

```typescript
interface BehaviorPattern {
  id: string;
  pattern_type: 'timing' | 'decision' | 'editing' | 'communication';
  description: string;
  confidence: number;
  evidence_count: number;
  last_observed: Date;
}
```

---

## Feedback Integration

### Feedback Types

| Type | Trigger | Learning |
|------|---------|----------|
| **Explicit rating** | After draft | Style model |
| **Edit diff** | When you modify draft | Style model |
| **Accept/reject** | Suggestion accepted or not | All models |
| **Correction** | "Actually, that's wrong" | Profile memory |
| **Missing info** | "You missed X" | Retrieval tuning |

### Feedback Loop

```
                    ┌─────────────────┐
                    │  User Feedback  │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │  Style   │  │ Profile  │  │Retrieval │
        │  Model   │  │ Memory   │  │  Tuning  │
        └──────────┘  └──────────┘  └──────────┘
              │              │              │
              └──────────────┼──────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Better Output  │
                    └─────────────────┘
```

---

## Metrics & Measurement

### Style Accuracy

| Metric | Target | How Measured |
|--------|--------|--------------|
| Voice rating | Avg 4.0+ | User ratings (1-5) |
| Edit distance | < 20% | Chars changed / total chars |
| First-draft accept | > 60% | Drafts used without edit |

### Learning Velocity

| Metric | Target | How Measured |
|--------|--------|--------------|
| Days to 4.0 rating | < 14 days | Time from start |
| Patterns captured | 50+ in 30 days | Profile memory count |
| Edit distance improvement | -5% per week | Trend over time |

### Dashboard

```
LEARNING PROGRESS — Week 3

Style Match:     ████████░░ 4.2 / 5.0 (↑ 0.3 from last week)
Edit Distance:   23% average (↓ 8% from last week)
First-Draft Accept: 58% (↑ 12% from last week)

Recent Learnings:
• Shortened default email length by 20%
• Added "bandwidth" to banned words
• Learned you prefer "hey" over "hi" in Slack

Profile Memory: 127 items
Episodic Memory: 34 items
Style Examples: 12 exemplars
```
