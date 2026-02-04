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

### Option A: Standalone Mode (No Backend Required)

The easiest way to use ChatGPT Wrapped — just open the HTML file in your browser!

#### 1. Get Your ChatGPT Export

1. Go to [chat.openai.com](https://chat.openai.com)
2. Click your profile → **Settings**
3. Go to **Data Controls** → **Export data**
4. Click **Export** and wait for the email
5. Download the ZIP file (it may take a few minutes to arrive)

#### 2. Open the App

<details>
<summary><b>🍎 macOS</b></summary>

```bash
cd projects/chatgpt-wrapped
open index.html
```

Or double-click `index.html` in Finder.

</details>

<details>
<summary><b>🪟 Windows</b></summary>

```cmd
cd projects\chatgpt-wrapped
start index.html
```

Or double-click `index.html` in File Explorer.

</details>

<details>
<summary><b>🐧 Linux</b></summary>

```bash
cd projects/chatgpt-wrapped
xdg-open index.html
```

Or open `index.html` from your file manager.

</details>

#### 3. Upload Your Data

- Drag and drop your ChatGPT export ZIP file onto the upload area
- Or drop just the `conversations.json` file from the export

That's it! Your Wrapped experience will generate instantly in-browser.

---

### Option B: Full Backend Mode (Advanced Features)

For AI-powered insights and persistent storage, use the full backend.

#### Prerequisites

- **Node.js** 18+ (recommend using [nvm](https://github.com/nvm-sh/nvm) on Mac/Linux or [nvm-windows](https://github.com/coreybutler/nvm-windows) on Windows)
- **Docker** (for PostgreSQL)
- **OpenAI API Key** (for AI-powered insights)

#### 1. Clone and Install

```bash
git clone https://github.com/yourusername/personal-operator-assistant.git
cd personal-operator-assistant
npm install
```

#### 2. Set Up PostgreSQL with Docker

```bash
npm run db:start
```

#### 3. Configure Environment Variables

<details>
<summary><b>🍎 macOS / Linux</b></summary>

```bash
cat > .env << EOF
DATABASE_URL=postgresql://operator:operator_dev_password@localhost:5433/personal_operator
OPENAI_API_KEY=sk-your-key-here
EOF
```

Or use export:
```bash
export DATABASE_URL="postgresql://operator:operator_dev_password@localhost:5433/personal_operator"
export OPENAI_API_KEY="sk-your-key-here"
```

</details>

<details>
<summary><b>🪟 Windows (PowerShell)</b></summary>

```powershell
@"
DATABASE_URL=postgresql://operator:operator_dev_password@localhost:5433/personal_operator
OPENAI_API_KEY=sk-your-key-here
"@ | Out-File -FilePath .env -Encoding utf8
```

Or set environment variables:
```powershell
$env:DATABASE_URL = "postgresql://operator:operator_dev_password@localhost:5433/personal_operator"
$env:OPENAI_API_KEY = "sk-your-key-here"
```

</details>

#### 4. Initialize Database & Import Data

```bash
# Run migrations
npm run db:migrate

# Import your ChatGPT export
npm run import:chatgpt /path/to/your/chatgpt-export.zip
```

> **Windows note:** Use backslashes for paths: `npm run import:chatgpt C:\Users\you\Downloads\chatgpt-export.zip`

#### 5. Start the Server

```bash
npm run dev
```

Open http://localhost:3001/wrapped in your browser and click **"Load My ChatGPT Data"**!

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
# Start the server with auto-reload
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

## 💻 Platform Notes

| Feature | macOS | Windows | Linux |
|---------|-------|---------|-------|
| Standalone HTML | ✅ | ✅ | ✅ |
| Backend Server | ✅ | ✅ | ✅ |
| Docker | ✅ | ✅ (Docker Desktop) | ✅ |
| AI Insights | ✅ | ✅ | ✅ |

### Windows-Specific Tips

- Use **PowerShell** or **Git Bash** for the best experience
- File paths use backslashes: `C:\Users\you\Downloads\file.zip`
- If using Command Prompt, some npm scripts may need `npx` prefix
- Docker Desktop for Windows requires WSL2 or Hyper-V enabled

### macOS-Specific Tips

- If using Apple Silicon (M1/M2/M3), Docker runs natively
- Homebrew is recommended for installing dependencies: `brew install node`

### Linux-Specific Tips

- Most distributions have Node.js in package managers, but [nvm](https://github.com/nvm-sh/nvm) is recommended for version management
- Docker can be installed via your distribution's package manager or [Docker's official instructions](https://docs.docker.com/engine/install/)

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
