# ChatGPT Wrapped

> Your year (or all-time) in ChatGPT — Spotify Wrapped style.

![ChatGPT Wrapped Hero](screenshots/hero.png)
<!-- TODO: Add screenshot of the main wrapped experience -->

---

## 🎯 What is This?

ChatGPT Wrapped analyzes your ChatGPT conversation export and creates a beautiful, animated summary of your AI interactions — just like Spotify Wrapped, but for your ChatGPT usage.

**Features include:**
- 📊 Total conversations & messages with trend sparklines
- 🏷️ Top topics you talked about
- 🎭 Your AI-generated personality profile
- ⏰ Peak usage times with 24-hour time wheel
- 🔥 GitHub-style activity heatmap
- 💬 Word frequency bubble visualization
- 🖼️ Image transformation gallery (uploaded → generated pairs)
- 🏆 Achievement badges based on your usage
- 🎯 AI-powered roasts and compliments
- 📈 Evolution comparison (you vs 6 months ago)

---

## 📸 Screenshots

### Upload Screen
![Upload Screen](screenshots/upload.png)
<!-- TODO: Screenshot of the drag-and-drop upload interface -->

### Stats Overview
![Stats](screenshots/stats.png)
<!-- TODO: Screenshot showing conversation/message counts -->

### Activity Heatmap
![Heatmap](screenshots/heatmap.png)
<!-- TODO: Screenshot of the GitHub-style activity grid -->

### Time Wheel
![Time Wheel](screenshots/time-wheel.png)
<!-- TODO: Screenshot of the 24-hour circular clock visualization -->

### Word Bubbles
![Word Bubbles](screenshots/word-bubbles.png)
<!-- TODO: Screenshot of the floating word frequency bubbles -->

### AI Personality Analysis
![Personality](screenshots/personality.png)
<!-- TODO: Screenshot of the AI-generated personality profile -->

### Achievement Badges
![Achievements](screenshots/achievements.png)
<!-- TODO: Screenshot of unlocked achievement badges -->

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ (recommend using [nvm](https://github.com/nvm-sh/nvm))
- **PostgreSQL** 14+ (or use Docker)
- **OpenAI API Key** (for AI-powered insights)

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/personal-operator-assistant.git
cd personal-operator-assistant
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up PostgreSQL

**Option A: Using Docker (Recommended)**
```bash
docker run -d \
  --name postgres-operator \
  -e POSTGRES_USER=operator \
  -e POSTGRES_PASSWORD=operator_dev_password \
  -e POSTGRES_DB=personal_operator \
  -p 5433:5432 \
  postgres:14
```

**Option B: Local PostgreSQL**
```bash
# Create database
createdb personal_operator

# Or connect and create:
psql -c "CREATE DATABASE personal_operator;"
```

### 4. Configure Environment Variables

```bash
# Set your database URL
export DATABASE_URL="postgresql://operator:operator_dev_password@localhost:5433/personal_operator"

# Set your OpenAI API key (for AI insights)
export OPENAI_API_KEY="sk-your-key-here"
```

### 5. Initialize the Database

```bash
npm run db:migrate
# Or manually run the schema:
# psql $DATABASE_URL -f src/db/schema.sql
```

### 6. Get Your ChatGPT Export

1. Go to [chat.openai.com](https://chat.openai.com)
2. Click your profile → **Settings**
3. Go to **Data Controls** → **Export data**
4. Click **Export** and wait for the email
5. Download the ZIP file (it may take a few minutes to arrive)

### 7. Import Your Data

```bash
# Import your ChatGPT export ZIP file
npm run import:chatgpt /path/to/your/chatgpt-export.zip
```

This will:
- Extract and parse all your conversations
- Store them in PostgreSQL
- Generate embeddings for semantic search
- Extract images (uploaded and AI-generated)

### 8. Start the Server

```bash
# Start the backend server
npm run dev
# Or:
npx tsx src/server.ts
```

The server runs on `http://localhost:3001`

### 9. View Your Wrapped

Open in your browser:
```
http://localhost:3001/wrapped
```

Click **"Load My ChatGPT Data"** to see your personalized Wrapped experience!

---

## 📁 Project Structure

```
personal-operator-assistant/
├── projects/chatgpt-wrapped/
│   ├── index.html          # Main frontend (single-file app)
│   ├── README.md           # This file
│   └── TASKS.md            # Development task tracking
├── src/
│   ├── server.ts           # Express API server
│   ├── db/
│   │   └── schema.sql      # PostgreSQL schema
│   └── ingest/chatgpt/
│       ├── parser.ts       # ChatGPT export parser
│       ├── importer.ts     # Data import logic
│       └── types.ts        # TypeScript interfaces
└── data/
    └── chatgpt-gallery/    # Extracted images stored here
```

---

## 🔌 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/wrapped/stats` | Main statistics (messages, topics, streaks, etc.) |
| `GET /api/wrapped/insights` | AI-generated personality insights |
| `GET /api/wrapped/images` | Image gallery with context |
| `GET /api/wrapped/images/pairs` | Input→Output image transformations |
| `GET /api/wrapped/heatmap` | Daily activity data for heatmap |
| `GET /api/wrapped/evolution?periods=N` | Time-split evolution data |

---

## 🎨 Slides Overview

The Wrapped experience consists of 18 animated slides:

1. **Total Conversations** - Your conversation count
2. **Messages** - Total messages with monthly sparkline
3. **Top Topics** - What you talked about most
4. **Longest Conversation** - Your marathon chat session
5. **The Roast** - AI roasts your ChatGPT habits
6. **Streaks** - Your usage streaks and consistency
7. **Peak Hours** - 24-hour time wheel visualization
8. **Evolution** - You vs 6 months ago comparison
9. **Discovered Themes** - AI-detected patterns in your chats
10. **AI Gallery** - Your generated images
11. **Transformations** - Before/after image pairs
12. **Upload Gallery** - Images you uploaded
13. **Fun Facts** - AI-powered insights
14. **Activity Heatmap** - GitHub-style contribution grid
15. **Verdict Cards** - Final roast + compliment
16. **Achievements** - Unlocked badges
17. **Word Bubbles** - Vocabulary visualization
18. **Share** - Download and share your Wrapped

---

## 🛠️ Development

### Running in Development Mode

```bash
# Terminal 1: Start the server with auto-reload
npm run dev

# The frontend is served at /wrapped
```

### Building for Production

```bash
npm run build
npm start
```

### Database Commands

```bash
# Reset database (careful!)
npm run db:reset

# Re-run migrations
npm run db:migrate
```

---

## 🔒 Privacy

- **Your data stays local** — All processing happens on your machine
- **Database is local** — PostgreSQL runs locally or in Docker
- **OpenAI API** — Only used for generating insights (optional)
- **No external tracking** — No analytics or telemetry
- **Open source** — Audit the code yourself

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

MIT License — See [LICENSE](../../LICENSE) for details.

---

## 🙏 Acknowledgments

- Inspired by [Spotify Wrapped](https://www.spotify.com/wrapped/)
- Built with [Express](https://expressjs.com/), [PostgreSQL](https://www.postgresql.org/), and [OpenAI](https://openai.com/)
- Animations powered by CSS keyframes

---

**Made with ❤️ and way too many late-night ChatGPT conversations**
