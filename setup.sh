#!/bin/bash
set -e

echo "Installing backend dependencies..."
cd backend
npm install

echo "Building backend (TypeScript -> dist)..."
npm run build

echo "Installing frontend dependencies..."
cd ../frontend
npm install

echo "Building frontend (Next.js)..."
npm run build

echo "Setup completed successfully."
