#!/bin/bash

# databricks-app-status
# Check comprehensive status and health of a Databricks app

# Parse arguments
APP_NAME=""
PROFILE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --profile)
            PROFILE="$2"
            shift 2
            ;;
        -*)
            echo "Unknown option $1"
            exit 1
            ;;
        *)
            if [[ -z "$APP_NAME" ]]; then
                APP_NAME="$1"
            fi
            shift
            ;;
    esac
done

# Auto-detect app name from databricks.yml if not provided
if [[ -z "$APP_NAME" && -f "databricks.yml" ]]; then
    # First try to get the app name variable value
    APP_NAME=$(grep "app_name:" databricks.yml -A 3 | grep "default:" | sed 's/.*default:\s*//' | sed 's/"//g' | xargs)

    # If that fails, try to extract from bundle name
    if [[ -z "$APP_NAME" ]]; then
        APP_NAME=$(grep "name:" databricks.yml | head -1 | sed 's/.*name:\s*//' | xargs)
    fi

    if [[ -n "$APP_NAME" ]]; then
        echo "📱 Auto-detected app name: $APP_NAME"
    fi
fi

# Auto-detect profile from git branch or default to current auth
if [[ -z "$PROFILE" ]]; then
    # Try to find profile from current auth
    if command -v databricks >/dev/null 2>&1; then
        CURRENT_AUTH=$(databricks auth describe 2>/dev/null | grep "profile:" | sed 's/.*profile: //' | xargs)
        if [[ -n "$CURRENT_AUTH" ]]; then
            PROFILE="$CURRENT_AUTH"
            echo "🔧 Using current profile: $PROFILE"
        fi
    fi
fi

# Validate required parameters
if [[ -z "$APP_NAME" ]]; then
    echo "❌ Error: App name not provided and could not be auto-detected from databricks.yml"
    echo ""
    echo "Usage: /databricks-app-status [app-name] [--profile profile-name]"
    echo ""
    echo "Examples:"
    echo "  /databricks-app-status"
    echo "  /databricks-app-status bi-hub-app"
    echo "  /databricks-app-status my-app --profile production"
    exit 1
fi

# Set profile flag if provided
PROFILE_FLAG=""
if [[ -n "$PROFILE" ]]; then
    PROFILE_FLAG="--profile $PROFILE"
fi

echo "🚀 Checking status for Databricks app: $APP_NAME"
if [[ -n "$PROFILE" ]]; then
    echo "🔐 Using profile: $PROFILE"
fi
echo ""

# Check if app exists and get basic info
echo "📋 App Information:"
echo "===================="
if ! APP_INFO=$(databricks apps get "$APP_NAME" $PROFILE_FLAG 2>/dev/null); then
    echo "❌ App '$APP_NAME' not found or access denied"
    echo ""
    echo "📱 Available apps:"
    databricks apps list $PROFILE_FLAG 2>/dev/null | head -10 || echo "Could not list apps"
    exit 1
fi

# Parse and display app info
echo "$APP_INFO" | jq -r '
"📱 Name: " + .name +
"\n🆔 App ID: " + .id +
"\n📅 Created: " + .create_time +
"\n👤 Creator: " + .creator +
"\n🌐 URL: " + .url +
"\n💻 Compute Status: " + .compute_status.state +
"\n🚀 App Status: " + .app_status.state'

echo ""

# Get deployment details
echo "🚀 Deployment Information:"
echo "=========================="
DEPLOYMENT_INFO=$(echo "$APP_INFO" | jq -r '.active_deployment // empty')
if [[ -n "$DEPLOYMENT_INFO" && "$DEPLOYMENT_INFO" != "null" ]]; then
    echo "$DEPLOYMENT_INFO" | jq -r '
"🆔 Deployment ID: " + (.deployment_id // "N/A") +
"\n📅 Created: " + (.create_time // "N/A") +
"\n📁 Source Path: " + (.source_code_path // "N/A") +
"\n🎯 Mode: " + (.mode // "N/A") +
"\n📊 Status: " + (.status.state // "N/A") +
"\n💬 Message: " + (.status.message // "N/A")'
else
    echo "⚠️  No active deployment found"
fi

echo ""

# Show app resources
echo "🔗 App Resources:"
echo "================="
echo "$APP_INFO" | jq -r '.resources[]? |
if has("serving_endpoint") then
    "🤖 Serving Endpoint: " + .serving_endpoint.name + " (" + .serving_endpoint.permission + ")"
elif has("database") then
    "🗄️ Database: " + .database.instance_name + "/" + .database.database_name + " (" + .database.permission + ")"
else
    "🔧 Resource: " + .name
end'

echo ""

# Health check summary
echo "🏥 Health Summary:"
echo "=================="

COMPUTE_STATUS=$(echo "$APP_INFO" | jq -r '.compute_status.state')
APP_STATUS=$(echo "$APP_INFO" | jq -r '.app_status.state')
DEPLOYMENT_STATE=$(echo "$APP_INFO" | jq -r '.active_deployment.status.state // "UNKNOWN"')

case "$COMPUTE_STATUS" in
    "ACTIVE")
        echo "✅ Compute: Healthy ($COMPUTE_STATUS)"
        ;;
    "STARTING"|"PENDING")
        echo "🟡 Compute: Starting ($COMPUTE_STATUS)"
        ;;
    "STOPPED"|"TERMINATED")
        echo "🔴 Compute: Stopped ($COMPUTE_STATUS)"
        ;;
    *)
        echo "⚠️  Compute: Unknown status ($COMPUTE_STATUS)"
        ;;
esac

case "$APP_STATUS" in
    "RUNNING")
        echo "✅ App: Healthy ($APP_STATUS)"
        ;;
    "STARTING")
        echo "🟡 App: Starting ($APP_STATUS)"
        ;;
    "STOPPED"|"FAILED")
        echo "🔴 App: Stopped/Failed ($APP_STATUS)"
        ;;
    *)
        echo "⚠️  App: Unknown status ($APP_STATUS)"
        ;;
esac

case "$DEPLOYMENT_STATE" in
    "SUCCEEDED")
        echo "✅ Deployment: Healthy ($DEPLOYMENT_STATE)"
        ;;
    "IN_PROGRESS")
        echo "🟡 Deployment: In Progress ($DEPLOYMENT_STATE)"
        ;;
    "FAILED")
        echo "🔴 Deployment: Failed ($DEPLOYMENT_STATE)"
        ;;
    *)
        echo "⚠️  Deployment: Unknown status ($DEPLOYMENT_STATE)"
        ;;
esac

# Overall health and recommendations
echo ""
if [[ "$COMPUTE_STATUS" == "ACTIVE" && "$APP_STATUS" == "RUNNING" && "$DEPLOYMENT_STATE" == "SUCCEEDED" ]]; then
    echo "🎉 Overall Status: HEALTHY - App is running and accessible"
    APP_URL=$(echo "$APP_INFO" | jq -r '.url')
    echo "🌐 Access your app at: $APP_URL"
elif [[ "$COMPUTE_STATUS" == "STARTING" || "$APP_STATUS" == "STARTING" ]]; then
    echo "⏳ Overall Status: STARTING - App is starting up"
    echo "💡 Wait a few minutes for startup to complete"
elif [[ "$COMPUTE_STATUS" == "STOPPED" ]]; then
    echo "⚠️  Overall Status: STOPPED - App compute is not running"
    echo "💡 Try: databricks apps start $APP_NAME $PROFILE_FLAG"
elif [[ "$DEPLOYMENT_STATE" == "FAILED" ]]; then
    echo "❌ Overall Status: DEPLOYMENT FAILED"
    echo "💡 Check deployment logs and redeploy"
else
    echo "⚠️  Overall Status: NEEDS ATTENTION"
    echo "💡 Check individual components above for issues"
fi