#!/bin/bash
# Build script for BI Hub App
# Builds the React frontend for production
# Auto-increments minor version on each build

set -e

echo "🔨 Building BI Hub App..."

# Navigate to client directory
cd "$(dirname "$0")/client"

# Increment minor version (1.0.0 → 1.1.0 → 1.2.0)
echo "📦 Incrementing version..."
npm version minor --no-git-tag-version

# Get new version and sync to backend
VERSION=$(node -p "require('./package.json').version")
echo "📝 Version: $VERSION"

# Update pyproject.toml with new version
sed -i '' "s/^version = \".*\"/version = \"$VERSION\"/" ../pyproject.toml

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the React app
echo "🏗️  Building React app..."
npm run build

echo "✅ Build complete! Version: $VERSION"
