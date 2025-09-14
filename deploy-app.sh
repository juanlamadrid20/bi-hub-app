#!/bin/bash

# Deploy script for bi-hub-app
# This script updates the SERVING_ENDPOINT value in app.yaml with the model_endpoint_name from databricks.yml
# and then deploys the app using databricks CLI
#
# Usage: ./deploy-app.sh [OPTIONS]
#   --dry-run                    Only update app.yaml, don't deploy
#   --user-email EMAIL          User email for workspace path (default: extracted from databricks.yml)
#   --workspace-path PATH       Custom workspace path (default: /Workspace/Users/{user_email}/{app_name})
#   --help                      Show this help message

set -e  # Exit on any error

# Default values
DRY_RUN=false
USER_EMAIL=""
WORKSPACE_PATH=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            echo "Running in dry-run mode - will not deploy"
            shift
            ;;
        --user-email)
            USER_EMAIL="$2"
            shift 2
            ;;
        --workspace-path)
            WORKSPACE_PATH="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --dry-run                    Only update app.yaml, don't deploy"
            echo "  --user-email EMAIL          User email for workspace path"
            echo "  --workspace-path PATH       Custom workspace path"
            echo "  --help                      Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                                    # Deploy with default settings"
            echo "  $0 --dry-run                         # Test configuration update only"
            echo "  $0 --user-email user@company.com     # Deploy for specific user"
            echo "  $0 --workspace-path /custom/path     # Deploy to custom path"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required files exist
if [[ ! -f "databricks.yml" ]]; then
    print_error "databricks.yml not found in current directory"
    exit 1
fi

if [[ ! -f "src/app/app.yaml" ]]; then
    print_error "src/app/app.yaml not found"
    exit 1
fi

# Extract model_endpoint_name from databricks.yml
print_info "Extracting model_endpoint_name from databricks.yml..."

# Use yq if available, otherwise use grep/sed
if command -v yq &> /dev/null; then
    MODEL_ENDPOINT=$(yq eval '.variables.model_endpoint_name.default' databricks.yml)
else
    # Fallback to grep/sed if yq is not available
    MODEL_ENDPOINT=$(grep -A 2 "model_endpoint_name:" databricks.yml | grep "default:" | sed 's/.*default: *"\([^"]*\)".*/\1/')
fi

if [[ -z "$MODEL_ENDPOINT" ]]; then
    print_error "Could not extract model_endpoint_name from databricks.yml"
    exit 1
fi

print_info "Found model endpoint: $MODEL_ENDPOINT"

# Create backup of app.yaml
print_info "Creating backup of app.yaml..."
cp src/app/app.yaml src/app/app.yaml.backup

# Update SERVING_ENDPOINT in app.yaml
print_info "Updating SERVING_ENDPOINT in app.yaml..."

# Use sed to replace the SERVING_ENDPOINT value
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS sed syntax
    sed -i '' "/- name: SERVING_ENDPOINT/,/value:/ s/\(value: \).*/\1\"$MODEL_ENDPOINT\"/" src/app/app.yaml
else
    # Linux sed syntax
    sed -i "/- name: SERVING_ENDPOINT/,/value:/ s/\(value: \).*/\1\"$MODEL_ENDPOINT\"/" src/app/app.yaml
fi

# Verify the update was successful
if grep -q "value: \"$MODEL_ENDPOINT\"" src/app/app.yaml; then
    print_info "Successfully updated SERVING_ENDPOINT to: $MODEL_ENDPOINT"
else
    print_error "Failed to update SERVING_ENDPOINT in app.yaml"
    # Restore backup
    mv src/app/app.yaml.backup src/app/app.yaml
    exit 1
fi

# Extract app_name from databricks.yml for the deployment command
print_info "Extracting app_name from databricks.yml..."

if command -v yq &> /dev/null; then
    APP_NAME=$(yq eval '.variables.app_name.default' databricks.yml)
else
    APP_NAME=$(grep -A 2 "app_name:" databricks.yml | grep "default:" | sed 's/.*default: *"\([^"]*\)".*/\1/')
fi

if [[ -z "$APP_NAME" ]]; then
    print_warning "Could not extract app_name from databricks.yml, using default: bi-agent-jl"
    APP_NAME="bi-agent-jl"
fi

print_info "Using app name: $APP_NAME"

# Extract user_name from databricks.yml if not provided via command line
if [[ -z "$USER_EMAIL" ]]; then
    print_info "Extracting user_name from databricks.yml..."
    
    if command -v yq &> /dev/null; then
        USER_EMAIL=$(yq eval '.variables.user_name.default' databricks.yml)
    else
        USER_EMAIL=$(grep -A 2 "user_name:" databricks.yml | grep "default:" | sed 's/.*default: *"\([^"]*\)".*/\1/')
    fi
    
    if [[ -z "$USER_EMAIL" ]]; then
        print_error "Could not extract user_name from databricks.yml and no --user-email provided"
        print_error "Please provide --user-email or ensure user_name is set in databricks.yml"
        exit 1
    fi
fi

print_info "Using user email: $USER_EMAIL"

# Construct workspace path if not provided
if [[ -z "$WORKSPACE_PATH" ]]; then
    WORKSPACE_PATH="/Workspace/Users/$USER_EMAIL/$APP_NAME"
    print_info "Using default workspace path: $WORKSPACE_PATH"
else
    print_info "Using custom workspace path: $WORKSPACE_PATH"
fi

# Deploy the app (unless in dry-run mode)
if [[ "$DRY_RUN" == "true" ]]; then
    print_info "Dry-run mode: Skipping deployment"
    print_info "App configuration updated successfully!"
    print_info "SERVING_ENDPOINT set to: $MODEL_ENDPOINT"
    print_info "To deploy, run: databricks apps deploy $APP_NAME --source-code-path $WORKSPACE_PATH"
    
    # Clean up backup file
    rm -f src/app/app.yaml.backup
else
    print_info "Deploying app using databricks CLI..."
    DEPLOY_CMD="databricks apps deploy $APP_NAME --source-code-path $WORKSPACE_PATH"

    print_info "Running: $DEPLOY_CMD"
    if $DEPLOY_CMD; then
        print_info "App deployment completed successfully!"
    else
        print_error "App deployment failed!"
        # Restore backup
        print_info "Restoring original app.yaml..."
        mv src/app/app.yaml.backup src/app/app.yaml
        exit 1
    fi

    # Clean up backup file
    print_info "Cleaning up backup file..."
    rm -f src/app/app.yaml.backup

    print_info "Deployment process completed successfully!"
    print_info "App '$APP_NAME' has been deployed with serving endpoint: $MODEL_ENDPOINT"
fi
