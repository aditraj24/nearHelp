#!/bin/bash

echo "Starting backend server..."
cd backend
npm start &

echo "Starting frontend server..."
cd ../frontend
npm start

# chmod +x setup.sh web.sh