#!/bin/bash

sleep 1echo "

# Start backend
cd /Users/mac/Desktop/snapvision/backendecho "
PORT=5001 npm start > /Users/mac/Desktop/snapvision/backend.log 2>&1 &
BACKEND_PID=$!
sleep 4

# Start frontend  
cd /Users/mac/Desktop/snapvision/frontendecho "
node server.js > /Users/mac/Desktop/snapvision/frontend.log 2>&1 &
FRONTEND_PID=$!
sleep 2

echo ""
echo SnapVision is running!" 
echo ""
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:5001"
echo ""
echo "Backend PID:  $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
