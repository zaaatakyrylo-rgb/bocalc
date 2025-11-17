#!/bin/bash

# BOCalc - Local Development Startup Script

echo "🚀 Starting BOCalc local development environment..."
echo ""

# Kill any existing processes
pkill -f "next dev" || true
pkill -f "wrangler dev" || true
sleep 2

# Start Frontend (Next.js) in background
echo "▶️  Starting Frontend (Next.js) on http://localhost:3000"
cd /Users/kirillza/Documents/BOCalc
npm run dev > /tmp/bocalc-frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"

# Start Backend (Cloudflare Workers) in background  
echo "▶️  Starting Backend (Workers) on http://localhost:8787"
cd /Users/kirillza/Documents/BOCalc/workers
npx wrangler dev --local --port 8787 > /tmp/bocalc-workers.log 2>&1 &
WORKERS_PID=$!
echo "   Workers PID: $WORKERS_PID"

echo ""
echo "⏳ Waiting for services to start..."
sleep 10

# Test endpoints
echo ""
echo "🧪 Testing services..."
echo ""

echo "1️⃣  Frontend (Next.js):"
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ru 2>/dev/null || echo "000")
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "   ✅ Frontend is running - http://localhost:3000"
else
    echo "   ❌ Frontend failed to start (HTTP $FRONTEND_STATUS)"
    echo "   Check logs: tail -f /tmp/bocalc-frontend.log"
fi

echo ""
echo "2️⃣  Backend (Workers API):"
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8787/health 2>/dev/null || echo "000")
if [ "$BACKEND_STATUS" = "200" ]; then
    echo "   ✅ Backend is running - http://localhost:8787"
    echo "   Health: $(curl -s http://localhost:8787/health 2>/dev/null)"
else
    echo "   ❌ Backend failed to start (HTTP $BACKEND_STATUS)"
    echo "   Check logs: tail -f /tmp/bocalc-workers.log"
fi

echo ""
echo "═══════════════════════════════════════════════════"
echo "🎉 BOCalc is ready for development!"
echo "═══════════════════════════════════════════════════"
echo ""
echo "📝 Useful commands:"
echo "   • View frontend logs: tail -f /tmp/bocalc-frontend.log"
echo "   • View backend logs:  tail -f /tmp/bocalc-workers.log"
echo "   • Stop all services:  pkill -f 'next dev|wrangler dev'"
echo ""
echo "🌐 Access points:"
echo "   • Frontend (RU): http://localhost:3000/ru"
echo "   • Frontend (EN): http://localhost:3000/en"
echo "   • Frontend (UK): http://localhost:3000/uk"
echo "   • API Health:    http://localhost:8787/health"
echo ""
echo "Press Ctrl+C to stop (processes will continue in background)"
echo "To stop all: pkill -f 'next dev|wrangler dev'"

