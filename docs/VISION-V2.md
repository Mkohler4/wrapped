# Personal Operator — V2 Vision

> An always-on AI companion that understands you, helps you work, and operates alongside you.

---

## The Shift

**V1 was:** Search your data, extract a profile, track tasks via voice.

**V2 is:** A persistent AI presence that listens, understands context, manages your work, and proactively helps.

---

## Core Concept: The Always-On Companion

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PERSONAL OPERATOR                                │
│                                                                         │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐              │
│   │   LISTEN    │ ──▶ │ UNDERSTAND  │ ──▶ │    ACT      │              │
│   │             │     │             │     │             │              │
│   │ • Voice     │     │ • Intent    │     │ • Create    │              │
│   │ • Meetings  │     │ • Context   │     │ • Remind    │              │
│   │ • Ambient   │     │ • Time      │     │ • Assist    │              │
│   │ • Text      │     │ • History   │     │ • Display   │              │
│   └─────────────┘     └─────────────┘     └─────────────┘              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Voice-First Interface

### Input: You Talk
- **Active mode:** Press to talk, get response
- **Ambient mode:** Always listening, extracts relevant info
- **Meeting mode:** Listens to calls/meetings, extracts action items

### Output: It Talks Back
- Text-to-speech responses
- Natural conversation flow
- Knows when to stay quiet vs. interject

### Display Mode
- Dashboard on TV/projector
- Shows current tasks, upcoming deadlines, insights
- Updates in real-time as you speak
- Minimal, glanceable UI

---

## 2. Universal Understanding Engine

Not just tasks — understands **intent categories**:

| Intent | Example | Action |
|--------|---------|--------|
| **Task** | "I need to finish the report" | Create task |
| **Reminder** | "Remind me to call mom at 5" | Schedule reminder |
| **Query** | "What did I decide about pricing?" | Search memory |
| **Update** | "The report is halfway done" | Update task status |
| **Insight** | "How long did the last deploy take?" | Query history |
| **Delegate** | "Can you draft the email intro?" | AI completes work |
| **Meeting note** | "Action item: follow up with Sarah" | Extract from meeting |
| **Calendar** | "I have a meeting at 2pm" | Track schedule |

### Context Awareness
- Knows what you're working on
- Tracks time of day, day of week
- Remembers recent conversations
- Understands relationships between tasks

---

## 3. Task Board (Jira-Style)

### Visual Board
```
┌──────────────────────────────────────────────────────────────────┐
│  BACKLOG        │  IN PROGRESS    │  BLOCKED       │  DONE      │
├──────────────────────────────────────────────────────────────────┤
│ ┌────────────┐  │ ┌────────────┐  │ ┌────────────┐ │            │
│ │ Call mom   │  │ │ Q4 Report  │  │ │ API Bug    │ │ ✓ Deploy  │
│ │ 📅 Today   │  │ │ ⏰ 2h left │  │ │ 🚫 Blocked │ │ ✓ Meeting │
│ └────────────┘  │ │ 📊 50%     │  │ └────────────┘ │            │
│                 │ └────────────┘  │                │            │
└──────────────────────────────────────────────────────────────────┘
```

### Task Properties
- **Title** — What needs to be done
- **Status** — backlog, active, blocked, done
- **Due date/time** — When it's due
- **Priority** — Urgency level
- **Estimate** — How long it should take
- **Progress** — Percentage complete
- **Tags** — Categories, projects
- **Blockers** — What's preventing progress
- **Notes** — Running updates

---

## 4. Time Awareness Module

### Deadline Tracking
- Tasks have optional due dates/times
- System knows current time
- Calculates time remaining

### Warning System
```
⏰ UPCOMING (next 2 hours)
   • Q4 Report — due in 1h 30m

⚠️ OVERDUE
   • Call mom — 30 minutes late

📅 TODAY
   • Team standup @ 2pm
   • Submit PR before EOD
```

### Proactive Alerts
- "You have a meeting in 15 minutes"
- "The report is due in 2 hours, it's marked 50% complete"
- "You've been working on this for 3 hours, want to take a break?"

---

## 5. AI Assistance

### Pre-emptive Help
Before you start a task, the AI can:
- Show relevant past work ("Last time you wrote a report, you structured it like...")
- Suggest an approach ("Based on the meeting notes, here are the key points to cover...")
- Draft initial content ("Here's a starting point for the email...")

### Task Completion
The AI can complete certain tasks:
- Draft emails/messages
- Summarize documents
- Generate code snippets
- Create outlines
- Research topics

### Guided Execution
For complex tasks:
1. Break down into subtasks
2. Suggest next step
3. Provide templates/examples
4. Answer questions during execution

---

## 6. Meeting Mode

### How It Works
1. Enable meeting mode before a call
2. System listens to conversation
3. Extracts structured information

### What It Captures
- **Action items** — "I'll send that over tomorrow"
- **Decisions** — "Let's go with option B"
- **Deadlines** — "We need this by Friday"
- **People mentioned** — Context about who said what
- **Key topics** — Summary of discussion

### Post-Meeting
- Auto-generate meeting notes
- Create tasks from action items
- Schedule follow-ups
- Update relevant existing tasks

---

## 7. Memory & Insights

### Short-Term (Session)
- What you've said recently
- Current task focus
- Today's completed work

### Medium-Term (Days/Weeks)
- Task history
- Patterns (you usually do X on Mondays)
- Recurring blockers

### Long-Term (Profile)
- Preferences
- Work style
- Relationships
- Career context

### Insight Queries
- "How long do I usually spend on reports?"
- "What blocked me last time I did this?"
- "When was the last time I talked to Sarah?"

---

## 8. Display Modes

### Ambient Dashboard (TV/Projector)
```
┌─────────────────────────────────────────────────────────────────┐
│  9:47 AM                              Monday, Feb 3             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🎯 FOCUS: Q4 Report                     ⏰ Due in 3h           │
│  ████████████░░░░░░░░ 60%                                       │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  📋 UP NEXT                              📅 TODAY               │
│  • Review PR #423                        • 2:00 PM Standup      │
│  • Call mom                              • 4:00 PM 1:1 with Tom │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  💬 "Report is 60% done, focusing on the metrics section"       │
│                                         — 5 min ago             │
└─────────────────────────────────────────────────────────────────┘
```

### Compact Mode (Small Screen)
```
┌─────────────────────┐
│ Q4 Report    ⏰ 3h  │
│ ████████░░░░ 60%    │
│                     │
│ Next: Review PR     │
│ 2pm: Standup        │
└─────────────────────┘
```

### Voice-Only Mode (No Screen)
- All interaction via voice
- Periodic audio summaries
- Alerts spoken aloud

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         INTERFACES                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │  Voice  │  │   Web   │  │   TV    │  │ Meeting │            │
│  │  CLI    │  │Dashboard│  │ Display │  │  Mode   │            │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘            │
└───────┼────────────┼────────────┼────────────┼──────────────────┘
        │            │            │            │
        └────────────┴────────────┴────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────────┐
│                    UNDERSTANDING ENGINE                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Intent    │  │   Context   │  │    Time     │             │
│  │ Classifier  │  │   Manager   │  │   Module    │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────────┐
│                      DATA LAYER                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │  Tasks  │  │Reminders│  │ Memory  │  │ Calendar│            │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘            │
└─────────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────────┐
│                    AI SERVICES                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Search    │  │  Generation │  │   Speech    │             │
│  │ (Retrieval) │  │   (LLM)     │  │  (STT/TTS)  │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

---

## What We Have vs. What We Need

### ✅ Already Built
- [x] ChatGPT data import + embeddings
- [x] Hybrid search (semantic + keyword)
- [x] Profile analysis
- [x] Basic task understanding (intents)
- [x] Voice input via Mac mic
- [x] Memory queue + review
- [x] Developer dashboard

### 🔨 Needs Work
- [ ] **Generalized intent system** — Beyond just tasks
- [ ] **Time module** — Deadlines, reminders, warnings
- [ ] **Task board UI** — Kanban-style visual board
- [ ] **Text-to-speech** — AI talks back
- [ ] **Meeting mode** — Extract info from calls
- [ ] **AI assistance** — Pre-emptive help, task completion
- [ ] **Display mode** — TV/projector dashboard
- [ ] **Calendar integration** — Know your schedule

---

## Next Steps (Prioritized)

### Phase 1: Generalize Understanding
1. Expand intent system (tasks → reminders, queries, updates, etc.)
2. Add time module (deadlines, warnings)
3. Improve task board UI

### Phase 2: AI Assistance
4. Pre-emptive prompts before tasks
5. AI can draft/complete certain tasks
6. Guided execution for complex tasks

### Phase 3: Voice Output
7. Text-to-speech responses
8. Natural conversation flow
9. Ambient display mode

### Phase 4: Meeting Mode
10. Listen to meetings
11. Extract action items
12. Auto-generate notes

---

## Non-Goals (For Now)

- Mobile app (focus on desktop/display first)
- Multi-user support
- Public API
- Email/Slack write access (read-only first)
- Full calendar management (just awareness)

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Daily active use | Using it every work day |
| Task tracking accuracy | 90%+ correct intent classification |
| Time to value | Under 3 seconds from speech to action |
| AI assistance usage | AI helps with 50%+ of tasks |
| Meeting coverage | 80%+ action items captured |

---

## The Dream

You're working at your desk. The display on your wall shows your current focus, upcoming deadlines, and today's schedule.

You say: "I need to finish the quarterly report by 3pm."

The system:
1. Creates a task with a 3pm deadline
2. Shows it on the board
3. Says: "Got it. You have 4 hours. Last quarter's report took you about 3 hours. Want me to pull up your notes from the planning meeting?"

You say: "Yeah, and remind me to send it to Sarah when I'm done."

The system:
1. Retrieves relevant meeting notes
2. Displays them on screen
3. Creates a linked reminder
4. Says: "Notes are up. I'll remind you to send to Sarah when you mark it complete."

Later, in a meeting, someone says: "Mark, can you follow up with the vendor about pricing?"

The system (in meeting mode):
1. Captures the action item
2. Creates a task assigned to you
3. After the meeting, shows: "New task from meeting: Follow up with vendor about pricing"

**That's the vision.**

