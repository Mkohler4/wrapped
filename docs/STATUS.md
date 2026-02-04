# Project Status — Where We Left Off

> Last updated: February 2, 2026

---

## Vision

See the main vision documents:

- **[vision.md](vision.md)** — Voice-first AI companion concept
- **[roadmap.md](../roadmap/roadmap.md)** — Phased implementation plan

**Key shifts:**
- Voice-first with AI talking back
- Universal understanding (not just tasks)
- Time awareness + reminders + warnings
- Task board UI (Jira-style)
- AI pre-emptive assistance
- Meeting mode for call extraction
- Ambient display for TV/projector

---

## Current State

### ✅ Fully Working

| Feature | Status | How to Use |
|---------|--------|------------|
| **ChatGPT Import** | ✅ Complete | 15,052 messages from 961 conversations |
| **Embeddings** | ✅ Complete | 6,559 user messages embedded |
| **Hybrid Search** | ✅ Complete | `npm run search "query"` |
| **Search API** | ✅ Complete | `POST /api/search` on port 3001 |
| **Profile Analysis** | ✅ Complete | `npm run profile:analyze -- --openai` |
| **Profile Page** | ✅ Complete | Full page: `open profile-page.html` |
| **Neural Task Understanding** | ✅ Complete | LLM-based intent classification |
| **Voice Input** | ✅ Complete | `npm run voice` (requires sox) |
| **Dashboard** | ✅ Complete | `http://localhost:3001` |
| **Memory Review** | ✅ Complete | `npm run memory:review` |

### 🚀 How to Start

```bash
# 1. Start the server
npm run server

# 2. Open dashboard in browser
open http://localhost:3001

# 3. Use voice input (separate terminal)
npm run voice
```

### 📁 Key Files

| File | Purpose |
|------|---------|
| `public/index.html` | Dashboard (tasks + profile tabs) |
| `profile-page.html` | Full profile with images |
| `src/server.ts` | Express API server |
| `src/tasks/` | Neural task understanding system |
| `src/scripts/voice.ts` | Mac microphone CLI |

---

## What Was Just Completed

### Neural Task Understanding (Phase 1.5)

A Jarvis-style natural language task system:

1. **Understanding Engine** — GPT-4 analyzes utterances to classify intent
2. **Fuzzy Matching** — Embeddings match vague references to existing tasks
3. **Session Context** — Tracks active tasks, recent speech, focus
4. **Voice Input** — Mac microphone via sox + OpenAI Whisper
5. **Memory Pipeline** — Completed tasks archive to episodic memory
6. **Developer Dashboard** — Terminal-style UI at localhost:3001

### Intents Supported

| You say | System understands |
|---------|-------------------|
| "I need to call mom" | Creates new task |
| "Working on the report" | Updates task to active |
| "Done with the meeting prep" | Completes matched task |
| "Stuck on the API issue" | Marks task as blocked |
| "What am I working on?" | Lists active tasks |
| "Going to grab coffee" | Ignored (not task-related) |

---

## What's Next

### Phase 1: Generalize Understanding
- [ ] Expand intents beyond tasks (reminders, queries, insights, delegation)
- [ ] Entity extraction (time, people, projects)
- [ ] Better context tracking

### Phase 2: Task Board + Time
- [ ] Kanban-style task board UI
- [ ] Time module (deadlines, warnings)
- [ ] Reminders system
- [ ] "Due today" / "Overdue" indicators

### Phase 3: AI Assistance
- [ ] Pre-task prompts ("Here's your notes from last time...")
- [ ] AI can draft emails/content
- [ ] Guided task execution

### Phase 4: Voice Output
- [ ] Text-to-speech responses
- [ ] Ambient display for TV/projector
- [ ] Full voice conversation loop

### Phase 5: Meeting Mode
- [ ] Listen to meetings
- [ ] Extract action items
- [ ] Auto-generate notes

**Full details:** [roadmap.md](../roadmap/roadmap.md)

---

## Known Issues / Notes

1. **Port 3001 in use** — If you see `EADDRINUSE`, kill existing process:
   ```bash
   kill $(lsof -t -i:3001)
   npm run server
   ```

2. **Voice requires sox** — Install with `brew install sox`

3. **Dashboard must be served** — Access via `http://localhost:3001`, not by opening the file directly

4. **Database must be running** — Start with `npm run db:start`

---

## Quick Reference

```bash
# Server & Dashboard
npm run server              # Start API + dashboard
open http://localhost:3001  # Open dashboard

# Voice Input
brew install sox            # First time only
npm run voice               # Interactive mode
npm run voice --continuous  # Keep listening

# Tasks
npm run task "I need to..." # Process text
npm run task:list           # List tasks
npm run task:archive        # Archive completed

# Search
npm run search "query"      # Hybrid search

# Database
npm run db:start            # Start PostgreSQL
npm run db:stop             # Stop
npm run db:logs             # View logs
```

---

## Documentation Index

| Doc | Description |
|-----|-------------|
| [README.md](../README.md) | Main project readme |
| [TASKS.md](../TASKS.md) | Task tracking |
| [v1-checklist.md](../roadmap/v1-checklist.md) | Ship checklist |
| [neural-task-understanding.md](completed/neural-task-understanding.md) | Task system architecture |
| [v1-features.md](v1-features.md) | Feature specification |
| [vision.md](vision.md) | Project vision |

