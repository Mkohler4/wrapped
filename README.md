# Personal Operator

> A voice-first AI companion that understands you, helps you work, and operates alongside you.

## Current Status

| Milestone | Status |
|-----------|--------|
| ChatGPT Import | 15,052 messages from 961 conversations |
| Embeddings | 6,559 user messages embedded |
| Hybrid Search | Keyword + semantic with RRF |
| Search API | `POST /api/search` on port 3001 |
| Profile Analysis | Deep profile extraction with LLM |
| Profile Page | Interactive HTML with images |
| Neural Task Understanding | Jarvis-style natural language |
| Voice Input | Mac microphone CLI |
| Dashboard | Terminal-style dev UI |
| Memory Review | Approve/reject extracted memories |
| **ChatGPT Wrapped** | Spotify Wrapped for your ChatGPT history |

---

## Quick Start

### One Command

```bash
./start.sh
```

That's it. This will:
1. Check prerequisites (Node.js 20+, Docker)
2. Install npm packages if needed
3. Start PostgreSQL via Docker
4. Wait for the database to be healthy
5. Start the Express server with hot reload
6. Open http://localhost:3001/wrapped/ in your browser

### Other Start Options

```bash
./start.sh --wrapped-only   # Just open the Wrapped HTML (no server, no database)
./start.sh --no-open        # Start everything but don't open browser
npm start                   # Same as ./start.sh
npm run start:wrapped       # Same as ./start.sh --wrapped-only
```

### Manual Setup (First Time)

If you prefer to run things step by step:

```bash
# 1. Install dependencies
npm install

# 2. Start database
npm run db:start

# 3. Create .env file (add your own API keys)
cat > .env << 'EOF'
DATABASE_URL=postgresql://operator:operator_dev_password@localhost:5433/personal_operator
OPENAI_API_KEY=sk-your-key-here
ANTHROPIC_API_KEY=sk-ant-your-key-here
EOF

# 4. Run database migrations
docker exec -i personal-operator-db psql -U operator -d personal_operator < schemas/db-schema.sql
docker exec -i personal-operator-db psql -U operator -d personal_operator < migrations/002_task_understanding.sql

# 5. Import your ChatGPT data
npm run import:chatgpt:full ./path/to/chatgpt-export.zip

# 6. Start the server
npm run dev
```

Then open http://localhost:3001 in your browser.

### Prerequisites

- **Node.js 20+** -- `node -v` to check ([install](https://nodejs.org))
- **Docker** -- `docker info` to check ([install](https://docker.com))
- **OpenAI API key** -- for embeddings, voice transcription, and AI insights
- **Anthropic API key** -- optional, for Claude-based analysis

---

## Sub-Projects

### [ChatGPT Wrapped](projects/chatgpt-wrapped/)

Spotify Wrapped, but for your ChatGPT conversations. Upload your export or load from the database to get beautiful animated stats, AI personality analysis, achievement badges, and more.

```bash
# Full experience (with AI insights, images, embeddings)
./start.sh
# Then click "Load My Data" at http://localhost:3001/wrapped/

# Quick standalone (just drop a file, no server needed)
./start.sh --wrapped-only
```

See the [ChatGPT Wrapped README](projects/chatgpt-wrapped/README.md) for details.

---

## Vision: Voice-First AI Companion

The project is evolving toward an **always-on AI presence**:

| Feature | Description |
|---------|-------------|
| Voice Loop | Speak -> Understand -> AI responds (voice) |
| Universal Understanding | Not just tasks: reminders, queries, insights, delegation |
| Task Board | Jira-style kanban with deadlines |
| Time Awareness | Warnings, reminders, "due in 2 hours" |
| AI Assistance | Pre-emptive help, drafts content, guides execution |
| Meeting Mode | Listen to calls, extract action items |
| Ambient Display | Dashboard on TV/projector |

See [docs/vision.md](docs/vision.md) for full vision, [roadmap/roadmap.md](roadmap/roadmap.md) for implementation plan, and [docs/STATUS.md](docs/STATUS.md) for current state.

---

## Import Your ChatGPT History

```bash
# 1. Export from ChatGPT: Settings -> Data Controls -> Export Data
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

## All Commands

```bash
# ═══════════════════════════════════════════════
# STARTUP
# ═══════════════════════════════════════════════
./start.sh                    # One-command startup (DB + server + browser)
./start.sh --wrapped-only     # Just open the Wrapped HTML
./start.sh --no-open          # Start without opening browser
npm start                     # Same as ./start.sh
npm run start:wrapped         # Same as ./start.sh --wrapped-only

# ═══════════════════════════════════════════════
# DATABASE
# ═══════════════════════════════════════════════
npm run db:start              # Start PostgreSQL container
npm run db:stop               # Stop container
npm run db:logs               # View database logs
npm run db:reset              # Reset database (deletes data!)

# ═══════════════════════════════════════════════
# SERVER
# ═══════════════════════════════════════════════
npm run server                # Start API + dashboard on port 3001
npm run server:dev            # Start with hot reload (alias: npm run dev)

# ═══════════════════════════════════════════════
# IMPORT
# ═══════════════════════════════════════════════
npm run import:chatgpt:full <path.zip>   # Import ChatGPT with embeddings
npm run import:chatgpt <path.zip>        # Preview import (dry-run)

# ═══════════════════════════════════════════════
# EMBEDDINGS
# ═══════════════════════════════════════════════
npm run embeddings:backfill              # Generate embeddings for all events
npm run embeddings:backfill --dry-run    # Preview without generating

# ═══════════════════════════════════════════════
# SEARCH
# ═══════════════════════════════════════════════
npm run search "<query>"                 # Hybrid search
npm run search "<query>" --keyword-only  # Keyword search only
npm run search "<query>" --semantic-only # Semantic search only

# ═══════════════════════════════════════════════
# VOICE INPUT (Mac)
# ═══════════════════════════════════════════════
npm run voice                  # Interactive voice/text input
npm run voice:continuous       # Continuous listening mode

# ═══════════════════════════════════════════════
# TASK MANAGEMENT
# ═══════════════════════════════════════════════
npm run task "I need to..."    # Process natural language
npm run task:list              # List active tasks
npm run task:show <id>         # Show task details
npm run task:archive           # Archive completed to memory

# ═══════════════════════════════════════════════
# MEMORY REVIEW
# ═══════════════════════════════════════════════
npm run memory:list            # List pending memories
npm run memory:review          # Interactive review
npm run memory:clear-junk      # Auto-reject false positives

# ═══════════════════════════════════════════════
# PROFILE ANALYSIS
# ═══════════════════════════════════════════════
npm run profile:analyze        # Analyze with Claude
npm run profile:html <zip>     # Generate HTML profile page

# ═══════════════════════════════════════════════
# WRAPPED
# ═══════════════════════════════════════════════
npm run wrapped:stats          # Print wrapped stats to terminal
npm run wrapped:stats:json     # Output as JSON
```

---

## Project Structure

```
personal-operator-assistant/
├── start.sh                    # One-command startup script
├── package.json
├── docker-compose.yml          # PostgreSQL + pgvector
├── .env                        # API keys (not committed)
│
├── projects/
│   └── chatgpt-wrapped/        # Spotify Wrapped for ChatGPT
│       ├── index.html          # Frontend (single-page app)
│       ├── js/                 # App logic, slides, video generation
│       ├── css/                # Styles (core + per-slide)
│       ├── slides/             # HTML templates
│       └── images/             # Gallery images + manifests
│
├── public/
│   └── index.html              # Dashboard (tasks + profile)
│
├── src/
│   ├── server.ts               # Express API server (port 3001)
│   ├── tasks/                  # Neural task understanding
│   ├── ingest/chatgpt/         # ChatGPT import pipeline (parser, importer, types)
│   ├── lib/                    # DB, embeddings, LLM, search
│   └── scripts/                # CLI tools (voice, task, search, import, profile)
│
├── schemas/
│   └── db-schema.sql           # PostgreSQL tables + pgvector
├── migrations/                 # SQL migrations
│
├── docs/
│   ├── chatgpt-wrapped-data-accuracy-overhaul.md  # Wrapped bugs & fix plan
│   ├── completed/              # Architecture docs
│   ├── vision.md               # Project vision
│   └── STATUS.md               # Current state
│
└── roadmap/                    # Implementation plans
```

---

## Core Principles

1. **You control memory** -- Only learns through explicit approvals or observed edits
2. **Retrieval > raw memory** -- Feels smart by pulling context, not storing everything
3. **Privacy by design** -- Local-first, minimal scopes, encryption
4. **Provenance always** -- Shows sources for every claim about your life
5. **Measurable adaptation** -- Style match improves by metrics, not vibes

---

## Documentation

| Doc | What's Inside |
|-----|---------------|
| [Vision](docs/vision.md) | Full vision statement, principles, non-goals |
| [ChatGPT Wrapped Overhaul](docs/chatgpt-wrapped-data-accuracy-overhaul.md) | Data accuracy bugs & fix plan |
| [Insight Prompts](docs/completed/chatgpt-insight-prompts.md) | All LLM prompts used for insight extraction |
| [Data Architecture](docs/completed/chatgpt-data-architecture.md) | How ChatGPT data is stored |
| [Search Architecture](docs/completed/embedding-search-architecture.md) | How hybrid search works |
| [Profile Architecture](docs/completed/profile-analysis-architecture.md) | How profile analysis works |
| [Task Understanding](docs/completed/neural-task-understanding.md) | Jarvis-style task system |

---

## License

Private project. Not for distribution.
