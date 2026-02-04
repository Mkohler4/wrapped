# Roadmap — Voice-First AI Companion

> From task tracking to always-on AI presence

---

## Phase Overview

| Phase | Focus | Timeline |
|-------|-------|----------|
| **Phase 1** | Generalize Understanding | 1-2 weeks |
| **Phase 2** | Task Board + Time | 1-2 weeks |
| **Phase 3** | AI Assistance | 2-3 weeks |
| **Phase 4** | Voice Output + Display | 1-2 weeks |
| **Phase 5** | Meeting Mode | 2-3 weeks |

---

## Phase 1: Generalize Understanding

**Goal:** Expand from "task-only" to universal intent understanding.

### 1.1 Intent System Refactor
- [ ] Rename `tasks/` → `understanding/`
- [ ] New intent categories:
  - `task.create` — "I need to finish the report"
  - `task.update` — "The report is halfway done"
  - `task.query` — "What's the status of the report?"
  - `reminder.create` — "Remind me to call mom at 5"
  - `reminder.snooze` — "Remind me later"
  - `memory.query` — "What did I decide about pricing?"
  - `insight.request` — "How long did this take last time?"
  - `delegate.request` — "Can you draft this email?"
  - `calendar.info` — "I have a meeting at 2pm"
  - `ambient.ignore` — Not actionable speech

### 1.2 Entity Extraction
- [ ] Extract entities from speech:
  - **Time** — "at 5pm", "by Friday", "in 2 hours"
  - **People** — "with Sarah", "to my boss"
  - **Projects** — "the Q4 report", "the API"
  - **Priority** — "urgent", "when I get a chance"

### 1.3 Context Enhancement
- [ ] Track current focus (what you're working on)
- [ ] Track time of day context
- [ ] Track recent intent history

---

## Phase 2: Task Board + Time

**Goal:** Visual task management with time awareness.

### 2.1 Time Module
- [ ] `reminders` table with due_at timestamp
- [ ] Time parsing ("at 5pm", "in 2 hours", "by Friday")
- [ ] Current time awareness in understanding engine
- [ ] Time-relative queries ("what's due today?")

### 2.2 Warning System
- [ ] Background job checks upcoming deadlines
- [ ] Warning levels: upcoming (2h), soon (30m), overdue
- [ ] Push to display / voice alert

### 2.3 Task Board UI
- [ ] Kanban columns: Backlog, Active, Blocked, Done
- [ ] Drag-and-drop (optional)
- [ ] Due date indicators
- [ ] Progress bars
- [ ] Priority colors
- [ ] Real-time updates via WebSocket/polling

### 2.4 Reminders
- [ ] `reminders` table (separate from tasks)
- [ ] One-time vs recurring
- [ ] Snooze functionality
- [ ] Completion tracking

---

## Phase 3: AI Assistance

**Goal:** AI proactively helps you complete work.

### 3.1 Pre-Task Prompts
- [ ] When starting a task, AI offers:
  - Relevant past work
  - Suggested approach
  - Templates/examples
- [ ] "Want me to pull up your notes from the planning meeting?"

### 3.2 Task Completion
- [ ] AI can draft content:
  - Emails
  - Messages
  - Outlines
  - Code snippets
- [ ] "Can you draft the intro paragraph?"

### 3.3 Guided Execution
- [ ] Break complex tasks into subtasks
- [ ] Suggest next step
- [ ] Answer questions during execution
- [ ] Track progress through subtasks

### 3.4 Smart Suggestions
- [ ] "You usually do X on Mondays"
- [ ] "Last time this took 3 hours"
- [ ] "You have a meeting in 30 minutes, want to pause?"

---

## Phase 4: Voice Output + Display

**Goal:** AI talks back, persistent visual display.

### 4.1 Text-to-Speech
- [ ] OpenAI TTS or ElevenLabs integration
- [ ] Natural response phrasing
- [ ] Know when to speak vs stay quiet
- [ ] Configurable voice/speed

### 4.2 Conversation Flow
- [ ] Back-and-forth dialogue
- [ ] Clarifying questions
- [ ] Confirmations ("Got it, I've created...")
- [ ] Error handling ("I didn't catch that")

### 4.3 Ambient Display
- [ ] Full-screen dashboard for TV/projector
- [ ] Current focus prominent
- [ ] Upcoming deadlines
- [ ] Today's schedule
- [ ] Recent activity feed
- [ ] Clock/date

### 4.4 Display Modes
- [ ] Ambient (large, glanceable)
- [ ] Compact (small screen)
- [ ] Focus (single task)
- [ ] Voice-only (no visual)

---

## Phase 5: Meeting Mode

**Goal:** Listen to meetings, extract actionable information.

### 5.1 Meeting Capture
- [ ] Enable/disable meeting mode
- [ ] Continuous transcription during call
- [ ] Speaker identification (if possible)
- [ ] Meeting metadata (title, attendees, time)

### 5.2 Extraction
- [ ] Action items ("I'll send that over")
- [ ] Decisions ("Let's go with option B")
- [ ] Deadlines mentioned
- [ ] People/topics referenced
- [ ] Questions to follow up

### 5.3 Post-Meeting
- [ ] Auto-generate meeting notes
- [ ] Create tasks from action items
- [ ] Schedule follow-ups
- [ ] Update existing related tasks

### 5.4 Integration
- [ ] Google Meet / Zoom audio capture
- [ ] Calendar integration for meeting context
- [ ] Attendee lookup from contacts

---

## Technical Debt to Address

- [ ] Better error handling throughout
- [ ] Logging and observability
- [ ] Test coverage
- [ ] Database migrations system
- [ ] Environment configuration cleanup
- [ ] TypeScript strict mode

---

## Infrastructure Needs

### For Voice Output
- OpenAI TTS API or ElevenLabs
- Audio playback system

### For Display Mode
- WebSocket for real-time updates
- Responsive CSS for TV resolution
- Auto-refresh / keep-alive

### For Meeting Mode
- System audio capture
- Long-running transcription
- Speaker diarization (nice to have)

### For Time Module
- Background scheduler (node-cron or similar)
- Timezone handling
- Notification system

---

## Success Criteria

1. **Voice loop works** — Speak → Understand → Respond (voice)
2. **Task board is useful** — Actually use it daily
3. **Time awareness works** — Get reminded of deadlines
4. **AI helps** — At least once per day, AI does useful pre-emptive work
5. **Meeting mode captures** — Action items from 1 real meeting

---

## Out of Scope (For Now)

- Mobile app
- Multi-user / team features
- Public deployment
- Email/Slack write access
- Full calendar management (just read)
- Complex recurring task patterns

