#!/bin/bash

# Starts the production builds produced by ./setup.sh
# For hot reload during development, run `npm run dev` in each folder instead.

echo "Starting backend server..."
cd backend
npm start &
BACKEND_PID=$!

trap "kill $BACKEND_PID 2>/dev/null" EXIT

echo "Starting frontend server..."
cd ../frontend
npm start

# chmod +x setup.sh web.sh
