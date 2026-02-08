#!/usr/bin/env bash
# ============================================
# Personal Operator Assistant — One-Command Startup
# ============================================
# Usage: ./start.sh [options]
#
# Options:
#   --wrapped-only    Skip database, just serve the Wrapped frontend
#   --no-open         Don't auto-open the browser
#   --help            Show this help message
#
# What this does:
#   1. Checks prerequisites (Node.js, Docker, .env)
#   2. Installs npm dependencies if needed
#   3. Starts PostgreSQL via Docker
#   4. Waits for the database to be healthy
#   5. Starts the Express server (with hot reload)
#   6. Opens the browser to the Wrapped page
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Parse arguments
WRAPPED_ONLY=false
NO_OPEN=false
for arg in "$@"; do
  case $arg in
    --wrapped-only) WRAPPED_ONLY=true ;;
    --no-open)      NO_OPEN=true ;;
    --help)
      echo "Usage: ./start.sh [--wrapped-only] [--no-open] [--help]"
      echo ""
      echo "  --wrapped-only  Skip database, just open the standalone Wrapped HTML"
      echo "  --no-open       Don't auto-open the browser"
      echo "  --help          Show this help"
      exit 0
      ;;
  esac
done

# ---- Header ----
echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║   Personal Operator Assistant — Startup      ║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════╝${NC}"
echo ""

# ---- cd to script directory ----
cd "$(dirname "$0")"

# ============================================
# Wrapped-Only Mode (no server, no database)
# ============================================
if [ "$WRAPPED_ONLY" = true ]; then
  echo -e "${BLUE}[1/1]${NC} Opening ChatGPT Wrapped (standalone mode)..."
  
  if [ "$NO_OPEN" = false ]; then
    if command -v open &> /dev/null; then
      open projects/chatgpt-wrapped/index.html
    elif command -v xdg-open &> /dev/null; then
      xdg-open projects/chatgpt-wrapped/index.html
    elif command -v start &> /dev/null; then
      start projects/chatgpt-wrapped/index.html
    else
      echo -e "${YELLOW}Could not auto-open browser. Open this file manually:${NC}"
      echo "  $(pwd)/projects/chatgpt-wrapped/index.html"
    fi
  fi
  
  echo ""
  echo -e "${GREEN}${BOLD}Done!${NC} Wrapped is open in standalone mode."
  echo -e "  Drop your ${BOLD}conversations.json${NC} or ChatGPT export ZIP to get started."
  echo ""
  exit 0
fi

# ============================================
# Full Server Mode
# ============================================

# ---- Step 1: Check prerequisites ----
echo -e "${BLUE}[1/5]${NC} Checking prerequisites..."

# Node.js
if ! command -v node &> /dev/null; then
  echo -e "  ${RED}✗ Node.js not found${NC} — Install from https://nodejs.org (v20+)"
  exit 1
fi
NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo -e "  ${RED}✗ Node.js $(node -v) is too old${NC} — Need v20+, run: nvm install 20"
  exit 1
fi
echo -e "  ${GREEN}✓${NC} Node.js $(node -v)"

# Docker
if ! command -v docker &> /dev/null; then
  echo -e "  ${RED}✗ Docker not found${NC} — Install from https://docker.com"
  exit 1
fi
if ! docker info > /dev/null 2>&1; then
  echo -e "  ${RED}✗ Docker daemon not running${NC} — Start Docker Desktop"
  exit 1
fi
echo -e "  ${GREEN}✓${NC} Docker is running"

# .env file
if [ ! -f .env ]; then
  echo -e "  ${RED}✗ .env file not found${NC}"
  echo ""
  echo "  Create one with:"
  echo "    cp .env.example .env"
  echo "    # Then add your OPENAI_API_KEY"
  exit 1
fi
echo -e "  ${GREEN}✓${NC} .env file found"
echo ""

# ---- Step 2: Install dependencies ----
echo -e "${BLUE}[2/5]${NC} Checking dependencies..."

if [ ! -d node_modules ]; then
  echo -e "  Installing npm packages..."
  npm install --silent
  echo -e "  ${GREEN}✓${NC} Dependencies installed"
else
  echo -e "  ${GREEN}✓${NC} node_modules exists"
fi
echo ""

# ---- Step 3: Start database ----
echo -e "${BLUE}[3/5]${NC} Starting PostgreSQL..."

# Check if container is already running
if docker ps --format '{{.Names}}' | grep -q 'personal-operator-db'; then
  echo -e "  ${GREEN}✓${NC} Database already running"
else
  docker compose up -d 2>&1 | while read -r line; do echo "  $line"; done
  echo -e "  ${GREEN}✓${NC} Database container started"
fi
echo ""

# ---- Step 4: Wait for database to be healthy ----
echo -e "${BLUE}[4/5]${NC} Waiting for database to be ready..."

MAX_RETRIES=30
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if docker exec personal-operator-db pg_isready -U operator -d personal_operator > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Database is ready"
    break
  fi
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "  ${RED}✗ Database failed to start after ${MAX_RETRIES}s${NC}"
    echo "  Check logs: docker compose logs db"
    exit 1
  fi
  printf "  Waiting... (%d/%d)\r" "$RETRY_COUNT" "$MAX_RETRIES"
  sleep 1
done
echo ""

# ---- Step 5: Kill existing server if running ----
echo -e "${BLUE}[5/5]${NC} Starting server..."

EXISTING_PID=$(lsof -ti:${PORT:-3001} 2>/dev/null || true)
if [ -n "$EXISTING_PID" ]; then
  echo -e "  ${YELLOW}Killing existing server on port ${PORT:-3001} (PID: $EXISTING_PID)${NC}"
  kill -9 $EXISTING_PID 2>/dev/null
  sleep 1
  echo -e "  ${GREEN}✓${NC} Previous instance stopped"
fi
echo ""
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  Server starting on http://localhost:3001${NC}"
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${BOLD}Dashboard:${NC}  http://localhost:3001"
echo -e "  ${BOLD}Wrapped:${NC}    http://localhost:3001/wrapped/"
echo ""
echo -e "  ${YELLOW}Press Ctrl+C to stop the server${NC}"
echo ""

# Auto-open browser after a short delay
if [ "$NO_OPEN" = false ]; then
  (
    sleep 3
    if command -v open &> /dev/null; then
      open "http://localhost:3001/wrapped/"
    elif command -v xdg-open &> /dev/null; then
      xdg-open "http://localhost:3001/wrapped/"
    fi
  ) &
fi

# Start with hot reload (this blocks — server runs in foreground)
exec npx tsx watch src/server.ts
