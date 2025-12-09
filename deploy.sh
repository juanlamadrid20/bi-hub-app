#!/bin/bash
# Deploy script for BI Hub App
# Builds and deploys to Databricks Apps

set -e

APP_NAME="${1:-bi-hub-app}"
PROFILE="${DATABRICKS_CONFIG_PROFILE:-field-eng-west}"

echo "🚀 Deploying BI Hub App..."

# Build frontend
./build.sh

# Sync files to Databricks using bundle deploy
echo "📂 Syncing files via bundle deploy..."
databricks bundle deploy --profile "$PROFILE"

# Deploy the app
echo "🔧 Deploying app..."
databricks apps deploy "$APP_NAME" --profile "$PROFILE"

echo "✅ Deployment complete!"
