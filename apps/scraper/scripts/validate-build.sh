#!/bin/bash
set -e

echo "🔍 Validating build..."

# Check if dist directory exists
if [ ! -d "dist" ]; then
  echo "❌ dist directory not found"
  exit 1
fi

# Check if server.js exists
if [ ! -f "dist/server.js" ]; then
  echo "❌ dist/server.js not found"
  exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "❌ node_modules not found"
  exit 1
fi

echo "✅ Build validation passed"

