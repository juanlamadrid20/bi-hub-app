#!/bin/bash
# Deploy script for BI Hub App
# Builds and deploys to Databricks Apps

set -e

APP_NAME="${1:-bi-hub-app}"

echo "🚀 Deploying BI Hub App..."

# Build frontend
./build.sh

# Check if app exists
if databricks apps get "$APP_NAME" &> /dev/null; then
    echo "📤 Updating existing app: $APP_NAME"
else
    echo "📤 Creating new app: $APP_NAME"
    databricks apps create "$APP_NAME"
fi

# Sync files to Databricks
echo "📂 Syncing files..."
databricks sync . "/Workspace/Users/$USER/apps/$APP_NAME" --exclude node_modules --exclude .git --exclude __pycache__ --exclude "*.pyc"

# Deploy the app
echo "🔧 Deploying app..."
databricks apps deploy "$APP_NAME"

echo "✅ Deployment complete!"
echo "🌐 App URL: https://<workspace>.databricks.com/apps/$APP_NAME"
