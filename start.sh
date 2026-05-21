#!/bin/bash

echo "🚀 Starting SnapVision servers..."

# Start backend
echo "📡 Starting backend on port 5001..."
cd /Users/mac/Desktop/snapvision/backend
PORT=5001 npm start > backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"
sleep 5

# Start frontend  
echo "🌐 Starting frontend on port 3000..."
cd /Users/mac/Desktop/snapvision/frontend
node server.js > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"
sleep 3

echo ""
echo "✅ SnapVision servers started!"
echo ""
echo "🌐 Frontend: http://localhost:3000"
echo "📡 Backend:  http://localhost:5001"
echo ""
