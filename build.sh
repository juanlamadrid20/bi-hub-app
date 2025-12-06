#!/bin/bash
# Build script for BI Hub App
# Builds the React frontend for production

set -e

echo "🔨 Building BI Hub App..."

# Navigate to client directory
cd "$(dirname "$0")/client"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the React app
echo "🏗️  Building React app..."
npm run build

echo "✅ Build complete! Output in client/build/"
