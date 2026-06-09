#!/usr/bin/env bash
# ==============================================================
# APEX Clinical AI Platform — Dev Launcher
# ==============================================================
# Usage: bash start-dev.sh
# Starts all backend services + frontend dev server

set -e
PROJ_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJ_DIR"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║     APEX Clinical AI Platform — Dev Launcher         ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── Kill any leftover processes ──────────────────────────────
echo "🧹 Cleaning up old processes…"
pkill -f "python app.py" 2>/dev/null || true
pkill -f "uvicorn app.main:app" 2>/dev/null || true
pkill -f "node server.js" 2>/dev/null || true
sleep 1

# ── APEX Auth Service (Node :3001) ───────────────────────────
echo "🔑 Starting APEX Auth service (Auth)…"
cd "$PROJ_DIR/services/auth"
node server.js > /tmp/apex-auth.log 2>&1 &
AUTH_PID=$!
echo "   PID: $AUTH_PID | Log: /tmp/apex-auth.log"

# ── AXIA Backend (Flask :5001) ───────────────────────────────
echo "🧠 Starting AXIA backend (Brain CT)…"
cd "$PROJ_DIR/services/axia"
PORT=5001 python app.py > /tmp/apex-axia.log 2>&1 &
AXIA_PID=$!
echo "   PID: $AXIA_PID | Log: /tmp/apex-axia.log"

# ── SmartLiva Backend (FastAPI :8000) ────────────────────────
echo "🩺 Starting SmartLiva backend (Liver US)…"
cd "$PROJ_DIR/services/smartliva"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 > /tmp/apex-smartliva.log 2>&1 &
SL_PID=$!
echo "   PID: $SL_PID | Log: /tmp/apex-smartliva.log"

# ── PICHA Backend Mock (Flask :8005) ────────────────────────
echo "🔬 Starting PICHA backend mock (Pathology)…"
cd "$PROJ_DIR/services/picha"
PORT=8005 python mock_app.py > /tmp/apex-picha.log 2>&1 &
PICHA_PID=$!
echo "   PID: $PICHA_PID | Log: /tmp/apex-picha.log"

# ── Wait for backends ────────────────────────────────────────
echo ""
echo "⏳ Waiting for backends to start…"
sleep 3

# Health checks
AUTH_OK=$(curl -s http://localhost:3001/api/health 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print('✅' if d.get('status')=='ok' else '❌')" 2>/dev/null || echo "❌")
AXIA_OK=$(curl -s http://localhost:5001/api/health 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print('✅' if d.get('status')=='ok' else '❌')" 2>/dev/null || echo "❌")
SL_OK=$(curl -s http://localhost:8000/health 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print('✅' if d.get('status')=='ok' else '❌')" 2>/dev/null || echo "❌")
PICHA_OK=$(curl -s http://localhost:8005/health 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print('✅' if d.get('status')=='ok' else '❌')" 2>/dev/null || echo "❌")

echo ""
echo "Service Status:"
echo "  Auth      (http://localhost:3001) $AUTH_OK"
echo "  AXIA      (http://localhost:5001) $AXIA_OK"
echo "  SmartLiva (http://localhost:8000) $SL_OK"
echo "  PICHA     (http://localhost:8005) $PICHA_OK (Mock Mode)"
echo ""

# ── Frontend ─────────────────────────────────────────────────
echo "⚡ Starting Frontend (Vite :5173)…"
cd "$PROJ_DIR/frontend"
npm run dev &
FE_PID=$!

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  🚀 APEX Platform Ready!                             ║"
echo "║                                                      ║"
echo "║  Frontend:   http://localhost:5173                   ║"
echo "║  Auth API:   http://localhost:3001/api/health        ║"
echo "║  AXIA API:   http://localhost:5001/api/health        ║"
echo "║  SmartLiva:  http://localhost:8000/health            ║"
echo "║                                                      ║"
echo "║  Press CTRL+C to stop all services                   ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# Trap CTRL+C — clean shutdown
cleanup() {
  echo ""
  echo "🛑 Stopping all services…"
  kill $AXIA_PID $SL_PID $PICHA_PID $AUTH_PID $FE_PID 2>/dev/null || true
  echo "✅ Done."
}
trap cleanup INT TERM

wait $FE_PID
