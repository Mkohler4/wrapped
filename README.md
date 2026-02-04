# Personal Operator

> A voice-first AI companion that understands you, helps you work, and operates alongside you.

## Current Status

| Milestone | Status |
|-----------|--------|
| ChatGPT Import | ✅ 15,052 messages from 961 conversations |
| Embeddings | ✅ 6,559 user messages embedded |
| Hybrid Search | ✅ Keyword + semantic with RRF |
| Search API | ✅ `POST /api/search` on port 3001 |
| Profile Analysis | ✅ Deep profile extraction with LLM |
| Profile Page | ✅ Interactive HTML with images |
| **Neural Task Understanding** | ✅ Jarvis-style natural language |
| **Voice Input** | ✅ Mac microphone CLI |
| **Dashboard** | ✅ Terminal-style dev UI |
| **Memory Review** | ✅ Approve/reject extracted memories |

---

## 🚀 Vision: Voice-First AI Companion

The project is evolving toward an **always-on AI presence**:

| Feature | Description |
|---------|-------------|
| **Voice Loop** | Speak → Understand → AI responds (voice) |
| **Universal Understanding** | Not just tasks: reminders, queries, insights, delegation |
| **Task Board** | Jira-style kanban with deadlines |
| **Time Awareness** | Warnings, reminders, "due in 2 hours" |
| **AI Assistance** | Pre-emptive help, drafts content, guides execution |
| **Meeting Mode** | Listen to calls, extract action items |
| **Ambient Display** | Dashboard on TV/projector |

**→ See [docs/vision.md](docs/vision.md) for full vision**
**→ See [roadmap/roadmap.md](roadmap/roadmap.md) for implementation plan**
**→ See [docs/STATUS.md](docs/STATUS.md) for current state**

---

## 🎁 Sub-Projects

### [ChatGPT Wrapped](projects/chatgpt-wrapped/)

Spotify Wrapped, but for your ChatGPT conversations. Upload your export, get beautiful animated stats.

```bash
cd projects/chatgpt-wrapped

# macOS
open index.html

# Windows
start index.html

# Linux
xdg-open index.html
```

Then drop your `conversations.json` or ChatGPT export ZIP file.

---

## Quick Start

### Prerequisites

- Node.js 20+
- Docker (for PostgreSQL)
- OpenAI API key (for embeddings + voice transcription)
- Anthropic API key (optional, for Claude)

### Setup

```bash
# Install dependencies
npm install

# Start database
npm run db:start
```

#### Create `.env` file

<details>
<summary><b>🍎 macOS / Linux</b></summary>

```bash
cat > .env << EOF
DATABASE_URL=postgresql://operator:operator_dev_password@localhost:5433/personal_operator
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
EOF
```

</details>

<details>
<summary><b>🪟 Windows (PowerShell)</b></summary>

```powershell
@"
DATABASE_URL=postgresql://operator:operator_dev_password@localhost:5433/personal_operator
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
"@ | Out-File -FilePath .env -Encoding utf8
```

Or manually create a `.env` file with these contents:
```
DATABASE_URL=postgresql://operator:operator_dev_password@localhost:5433/personal_operator
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

</details>

#### Run Database Migrations

```bash
docker exec -i personal-operator-db psql -U operator -d personal_operator < schemas/db-schema.sql
docker exec -i personal-operator-db psql -U operator -d personal_operator < migrations/002_task_understanding.sql
```

### Start the Dashboard

```bash
# Start the server
npm run server
```

Then open http://localhost:3001 in your browser.

The dashboard includes:
- **📋 Tasks tab** — Natural language task management
- **👤 Profile tab** — Your extracted profile from ChatGPT data

---

## Voice Input

Voice input requires **sox** for audio recording from your microphone.

### Setup

<details>
<summary><b>🍎 macOS</b></summary>

```bash
brew install sox
```

</details>

<details>
<summary><b>🪟 Windows</b></summary>

1. Download sox from https://sourceforge.net/projects/sox/files/sox/
2. Extract to a folder (e.g., `C:\Program Files\sox`)
3. Add to PATH:
   - Open System Properties → Environment Variables
   - Add `C:\Program Files\sox` to your PATH
4. Restart your terminal

Or use **Chocolatey**:
```powershell
choco install sox
```

Or use **Scoop**:
```powershell
scoop install sox
```

</details>

<details>
<summary><b>🐧 Linux (Ubuntu/Debian)</b></summary>

```bash
sudo apt install sox
```

</details>

### Usage

```bash
# Interactive mode - press Enter to record, or type text directly
npm run voice

# Continuous mode - keeps listening until Ctrl+C
npm run voice:continuous
```

### How It Works

1. **Press Enter** to start recording from your microphone
2. **Speak naturally** — recording auto-stops after 2 seconds of silence
3. **OpenAI Whisper** transcribes your speech
4. **Understanding Engine** classifies your intent and updates tasks

### Example Session

```
╔════════════════════════════════════════╗
║     🤖 Personal Operator - Voice       ║
╚════════════════════════════════════════╝
✓ Sox found
✓ OpenAI API ready

🎤 Voice Task Input
   Press Enter to start recording, or type a command:

> [press Enter]

🎤 Recording... (speak now, stops after 2s silence)
🔄 Transcribing...

📝 You said: "I need to review the quarterly report by Friday"
──────────────────────────────────────────────────────
🆕 Intent: starting (85%)
📋 Task: Review the quarterly report by Friday
   Status: pending

💬 Got it - created task: "Review the quarterly report by Friday"
```

### Voice Commands (Natural Language)

| You say | System understands |
|---------|-------------------|
| "I need to call mom" | Creates new task |
| "Working on the report" | Updates existing task to active |
| "Done with the meeting prep" | Completes matched task |
| "Stuck on the API issue" | Marks task as blocked |
| "What am I working on?" | Lists active tasks |
| "Going to grab coffee" | Ignored (not task-related) |

---

## Import Your ChatGPT History

```bash
# 1. Export from ChatGPT: Settings → Data Controls → Export Data
# 2. Download the ZIP file
# 3. Run import:

npm run import:chatgpt:full ./path/to/export.zip
```

### Generate Embeddings

```bash
# Preview what will be embedded
npm run embeddings:backfill --dry-run

# Generate embeddings (~$0.04 for 6K messages)
npm run embeddings:backfill
```

---

## Search Your Data

```bash
# Hybrid search (keyword + semantic)
npm run search "startup advice"

# Keyword only (no API call)
npm run search "typescript patterns" --keyword-only

# Semantic only
npm run search "how do I feel about remote work" --semantic-only
```

---

## All Commands

```bash
# ═══════════════════════════════════════════════════════════
# DATABASE
# ═══════════════════════════════════════════════════════════
npm run db:start          # Start PostgreSQL container
npm run db:stop           # Stop container
npm run db:logs           # View database logs
npm run db:reset          # Reset database (deletes data!)

# ═══════════════════════════════════════════════════════════
# IMPORT
# ═══════════════════════════════════════════════════════════
npm run import:chatgpt:full <path.zip>   # Import ChatGPT with embeddings
npm run import:chatgpt <path.zip>        # Preview import (dry-run)

# ═══════════════════════════════════════════════════════════
# EMBEDDINGS
# ═══════════════════════════════════════════════════════════
npm run embeddings:backfill              # Generate embeddings for all events
npm run embeddings:backfill --dry-run    # Preview without generating

# ═══════════════════════════════════════════════════════════
# SEARCH
# ═══════════════════════════════════════════════════════════
npm run search "<query>"                 # Hybrid search
npm run search "<query>" --keyword-only  # Keyword search only
npm run search "<query>" --semantic-only # Semantic search only
npm run search "<query>" --limit 5       # Limit results

# ═══════════════════════════════════════════════════════════
# SERVER & DASHBOARD
# ═══════════════════════════════════════════════════════════
npm run server                           # Start API + dashboard on port 3001
npm run server:dev                       # Start with hot reload

# ═══════════════════════════════════════════════════════════
# VOICE INPUT (Mac)
# ═══════════════════════════════════════════════════════════
npm run voice                            # Interactive voice/text input
npm run voice:continuous                 # Continuous listening mode

# ═══════════════════════════════════════════════════════════
# TASK MANAGEMENT
# ═══════════════════════════════════════════════════════════
npm run task "I need to..."              # Process natural language
npm run task:list                        # List active tasks
npm run task:show <id>                   # Show task details
npm run task:correct <utt-id> <task-id>  # Correct a match
npm run task:archive                     # Archive completed to memory

# ═══════════════════════════════════════════════════════════
# MEMORY REVIEW
# ═══════════════════════════════════════════════════════════
npm run memory:list                      # List pending memories
npm run memory:review                    # Interactive review
npm run memory:clear-junk                # Auto-reject false positives
npm run memory:approve <id>              # Approve specific memory
npm run memory:reject <id>               # Reject specific memory

# ═══════════════════════════════════════════════════════════
# PROFILE ANALYSIS
# ═══════════════════════════════════════════════════════════
npm run profile:analyze                  # Analyze with Claude
npm run profile:analyze -- --openai      # Analyze with GPT-4
npm run profile:html <export.zip>        # Generate HTML profile page
```

---

## Project Structure

```
personal-operator-assistant/
├── README.md
├── TASKS.md                     # Task tracking
├── package.json
├── docker-compose.yml           # PostgreSQL + pgvector
├── public/
│   └── index.html               # Dashboard (tasks + profile)
├── profile-page.html            # Full profile with images
├── src/
│   ├── server.ts                # Express API server
│   ├── tasks/                   # Neural task understanding
│   │   ├── index.ts             # Main orchestration
│   │   ├── types.ts             # TypeScript interfaces
│   │   ├── understanding-engine.ts  # LLM analysis
│   │   ├── task-matcher.ts      # Fuzzy embedding matching
│   │   ├── session-context.ts   # Session state
│   │   └── memory-pipeline.ts   # Task → long-term memory
│   ├── ingest/
│   │   └── chatgpt/             # ChatGPT import pipeline
│   ├── lib/
│   │   ├── db.ts                # Database connection
│   │   ├── embeddings.ts        # OpenAI embeddings
│   │   ├── llm.ts               # Multi-model LLM client
│   │   └── search.ts            # Hybrid search service
│   └── scripts/
│       ├── voice.ts             # Mac microphone CLI
│       ├── task.ts              # Task CLI
│       ├── search.ts            # Search CLI
│       └── ...                  # Other scripts
├── schemas/
│   └── db-schema.sql            # PostgreSQL tables + pgvector
├── migrations/
│   ├── 001_add_chatgpt_source.sql
│   └── 002_task_understanding.sql  # Task tables
├── docs/
│   ├── vision.md                # Vision, principles, non-goals
│   ├── v1-features.md           # Feature specification
│   └── completed/               # Architecture docs
│       ├── chatgpt-data-architecture.md
│       ├── embedding-search-architecture.md
│       ├── profile-analysis-architecture.md
│       └── neural-task-understanding.md  # Task system docs
└── roadmap/
    ├── milestones.md            # Week-by-week plan
    └── v1-checklist.md          # Ship checklist
```

---

## Core Principles

1. **You control memory** — Only learns through explicit approvals or observed edits
2. **Retrieval > raw memory** — Feels smart by pulling context, not storing everything
3. **Privacy by design** — Local-first, minimal scopes, encryption
4. **Provenance always** — Shows sources for every claim about your life
5. **Measurable adaptation** — Style match improves by metrics, not vibes

---

## Documentation

| Doc | What's Inside |
|-----|---------------|
| [Vision](docs/vision.md) | Full vision statement, principles, non-goals |
| [V1 Features](docs/v1-features.md) | Complete feature specification |
| [Neural Task Understanding](docs/completed/neural-task-understanding.md) | Jarvis-style task system |
| [Data Architecture](docs/completed/chatgpt-data-architecture.md) | How ChatGPT data is stored |
| [Search Architecture](docs/completed/embedding-search-architecture.md) | How hybrid search works |
| [Profile Architecture](docs/completed/profile-analysis-architecture.md) | How profile analysis works |
| [V1 Checklist](roadmap/v1-checklist.md) | Ship checklist |

---

## License

Private project. Not for distribution.
