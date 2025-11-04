# End-to-End Deployment Guide

This guide documents the complete process to deploy the BI Hub App from a local workstation to Databricks workspace.

## Prerequisites

- Databricks CLI installed and configured
- Access to a Databricks workspace with appropriate permissions
- A configured Databricks profile (e.g., `field-eng-west`)
- Model serving endpoint available (e.g., `mas-0c4ba3bd-endpoint`)

## Step 0: Create Lakebase Instance

Before configuring and deploying the app, you must first create a Lakebase PostgreSQL instance. This is a one-time setup per workspace.

### Run the Lakebase Setup Notebook

1. Navigate to the `lakebase/notebooks/` directory in your workspace
2. Open and run the `lakebase.ipynb` notebook
3. The notebook will:
   - Install required dependencies (`databricks-sdk`)
   - Initialize a WorkspaceClient
   - Get or create a Lakebase instance (default name: `cx-live-demo-no-delete`)
   - Display instance details including DNS endpoints and credentials

**Important:** Note the instance name you create, as you'll need it for the configuration steps below.

**Alternative:** If you already have a Lakebase instance, you can skip this step and use your existing instance name in the configuration.

## Configuration Setup

Before deploying, you need to replace placeholder values in the configuration files with your actual workspace details.

### Step 1: Configure `databricks.yml` (After Lakebase Instance Creation)

Edit `databricks.yml` and replace the following placeholder values:

#### 1. Workspace URL (line 43)
```yaml
host: <REPLACE_ME_WITH_WORKSPACE_URL>
```

**How to find it:**
- Use your Databricks workspace URL from your browser
- Format: `https://<workspace-name>.cloud.databricks.com`
- Example: `https://e2-demo-field-eng.cloud.databricks.com`

**Update to:**
```yaml
host: https://your-workspace.cloud.databricks.com
```

#### 2. User Name (line 30)
```yaml
default: "<REPLACE_ME_WITH_USER_NAME>"
```

**How to find it:**
- Use your Databricks user email
- This is the email you use to log into Databricks

**Update to:**
```yaml
default: "your.email@company.com"
```

#### 3. Lakebase Instance Name (line 17)
```yaml
default: "<REPLACE_ME_WITH_INSTANCE_NAME>"
```

**How to find it:**
```bash
# List all Lakebase instances in your workspace
databricks database list-database-instances --profile <PROFILE>
```

**Update to:**
```yaml
default: "your-lakebase-instance-name"
```

#### 4. Model Endpoint Name (line 26)
```yaml
default: "<REPLACE_ME_WITH_ENDPOINT_NAME>"
```

**How to find it:**
```bash
# List all serving endpoints in your workspace
databricks serving-endpoints list --profile <PROFILE>
```

Or navigate to: Workspace → Machine Learning → Serving → Model Serving

**Update to:**
```yaml
default: "your-endpoint-name"
```

### Step 2: Configure `src/app/app.yaml` (After Lakebase Instance Creation)

Edit `src/app/app.yaml` and replace the following placeholder values:

#### 1. Database Instance (line 9)
```yaml
value: "<REPLACE_ME_WITH_INSTANCE_NAME>"
```

**Update to:**
```yaml
value: "your-lakebase-instance-name"
```

**Note:** This should match the `lakebase_instance_name` from `databricks.yml`

#### 2. Serving Endpoint (line 12)
```yaml
value: "<REPLACE_ME_WITH_ENDPOINT_NAME>"
```

**Update to:**
```yaml
value: "your-endpoint-name"
```

**Note:** This should match the `model_endpoint_name` from `databricks.yml`

### Configuration Validation Checklist

Before proceeding with deployment, verify:

- [ ] Lakebase instance has been created (Step 0: Run `lakebase/notebooks/lakebase.ipynb`)
- [ ] All `<REPLACE_ME_...>` placeholders have been replaced in both files
- [ ] The workspace URL is correct and accessible
- [ ] Your user email matches your Databricks account
- [ ] The Lakebase instance name matches the one created in Step 0
- [ ] The model serving endpoint exists and is running
- [ ] The same instance and endpoint names are used in both `databricks.yml` and `app.yaml`

### Quick Configuration Example

**databricks.yml:**
```yaml
variables:
  lakebase_instance_name:
    default: "cx-live-demo-no-delete"
  
  model_endpoint_name:
    default: "mas-0c4ba3bd-endpoint"
  
  user_name:
    default: "juan.lamadrid@databricks.com"

targets:
  dev:
    workspace:
      host: https://e2-demo-field-eng.cloud.databricks.com
```

**src/app/app.yaml:**
```yaml
env: 
  - name: DATABASE_INSTANCE
    value: "cx-live-demo-no-delete"
  
  - name: SERVING_ENDPOINT
    value: "mas-0c4ba3bd-endpoint"
```

## Deployment Process

### Step 1: Validate Bundle Configuration

Before deploying, validate that your bundle configuration is correct:

```bash
databricks bundle validate --profile <PROFILE>
```

**Expected output:**
```
Name: bi-hub-app
Target: dev
Workspace:
  Host: https://e2-demo-field-eng.cloud.databricks.com
  User: juan.lamadrid@databricks.com
  Path: /Workspace/Users/juan.lamadrid@databricks.com/.bundle/bi-hub-app/dev

Validation OK!
```

### Step 2: Deploy Bundle Resources

Deploy the bundle to sync your local code and create workspace resources (app, jobs):

```bash
databricks bundle deploy --profile <PROFILE>
```

**What this does:**
- Uploads source code from `./src/app` to workspace at `/Workspace/Users/<user>/.bundle/bi-hub-app/dev/files`
- Creates the app resource (metadata, permissions, resources)
- Creates the `setup_lakebase` job
- **Does NOT** create an active deployment or start the app

**Expected output:**
```
Uploading bundle files to /Workspace/Users/juan.lamadrid@databricks.com/.bundle/bi-hub-app/dev/files...
Deploying resources...
Updating deployment state...
Deployment complete!
```

### Step 3: Setup Database

Run the setup job to create PostgreSQL tables for Chainlit chat history:

```bash
databricks bundle run setup_lakebase --profile <PROFILE>
```

**What this does:**
- Connects to Lakebase PostgreSQL instance
- Creates necessary database tables for Chainlit Data Layer
- Must be run before the app can store chat history

**Expected output:**
```
Run URL: https://.../#job/.../run/...
2025-10-09 18:22:16 "[dev juan_lamadrid] setup-lakebase-dev" RUNNING
2025-10-09 18:23:26 "[dev juan_lamadrid] setup-lakebase-dev" TERMINATED SUCCESS
```

**Note:** This only needs to be run once per environment, unless you need to recreate the database schema.

### Step 4: Start App Compute

Start the app compute (this does NOT deploy code, only starts the compute):

```bash
databricks apps start bi-hub-app --profile <PROFILE>
```

**What this does:**
- Transitions compute from `STOPPED` to `ACTIVE`
- Does NOT deploy application code
- App will be in `UNAVAILABLE` state until code is deployed

**Expected status:**
```json
{
  "compute_status": {
    "state": "ACTIVE"
  },
  "app_status": {
    "state": "UNAVAILABLE",
    "message": "App has not been deployed yet"
  }
}
```

### Step 5: Deploy and Run the App

Deploy the application code and start the app:

```bash
databricks bundle run bi-agent --profile <PROFILE>
```

**What this does:**
- Creates a new deployment from the synced source code
- Downloads and installs Python packages from `requirements.txt`
- Starts the app and makes it accessible
- **This is the key command that actually deploys your code!**

**Expected output:**
```
✓ Getting the status of the app bi-hub-app
✓ App is in UNAVAILABLE state
✓ App compute is in ACTIVE state
✓ Preparing source code for new app deployment.
✓ Downloading source code from /Workspace/...
✓ Installing packages...
✓ App started successfully
You can access the app at https://bi-hub-app-....aws.databricksapps.com
```

### Step 6: Verify Deployment

Check the app status to ensure it's running:

```bash
databricks apps get bi-hub-app --profile <PROFILE>
```

**Expected status:**
```json
{
  "app_status": {
    "state": "RUNNING",
    "message": "App is running"
  },
  "compute_status": {
    "state": "ACTIVE"
  },
  "active_deployment": {
    "status": {
      "state": "SUCCEEDED",
      "message": "App started successfully"
    }
  }
}
```

## Quick Reference: Full Deployment Flow

For a fresh deployment, run these commands in sequence:

```bash
# 0. Create Lakebase instance (one-time per workspace)
#    Run lakebase/notebooks/lakebase.ipynb in your Databricks workspace

# 1. Configure databricks.yml and app.yaml (replace all <REPLACE_ME_...> values first!)

# 2. Validate configuration
databricks bundle validate --profile <PROFILE>

# 3. Deploy bundle resources and sync code
databricks bundle deploy --profile <PROFILE>

# 4. Setup database (one-time per environment)
databricks bundle run setup_lakebase --profile <PROFILE>

# 5. Start app compute
databricks apps start bi-hub-app --profile <PROFILE>

# 6. Deploy and run the app
databricks bundle run bi-agent --profile <PROFILE>

# 7. Verify deployment
databricks apps get bi-hub-app --profile <PROFILE>
```

## Updating the App After Changes

When you make local code changes and want to redeploy:

```bash
# 1. Sync updated code to workspace
databricks bundle deploy --profile <PROFILE>

# 2. Deploy the updated code
databricks bundle run bi-agent --profile <PROFILE>
```

**Note:** You don't need to restart the compute or re-run the database setup for code updates.

## Key Configuration Files

- `databricks.yml` - Bundle configuration with workspace settings, variables, and resource definitions
- `src/app/app.yaml` - App-specific environment variables and runtime config
- `src/app/requirements.txt` - Python dependencies installed during deployment
- `src/app/.chainlit/config.toml` - Chainlit UI configuration

## Important Notes

### Why `databricks bundle deploy` Doesn't Deploy the App

The `databricks bundle deploy` command creates/updates the app **resource** (metadata, permissions, configuration) but does **NOT** create an active deployment. This is because:

- The `databricks_app` Terraform resource only manages app configuration
- Creating a deployment (packaging and running code) is a separate operation
- This separation allows you to update app configuration without redeploying code

### Difference Between `apps start` and `bundle run`

- `databricks apps start <app-name>`: Only starts the compute (STOPPED → ACTIVE), does NOT deploy code
- `databricks bundle run <resource-key>`: Creates a deployment from synced code AND starts the app

### Troubleshooting: Stale Terraform State

If you encounter errors like:
```
Error: failed to read app
App with name bi-hub-app does not exist or is deleted.
```

This indicates a stale Terraform state. The local state references an app that was deleted. To fix:

```bash
# Remove local state
rm -rf .databricks/bundle/dev

# Delete remote state (if needed)
databricks workspace delete /Workspace/Users/<user>/.bundle/bi-hub-app/dev/state --recursive --profile <PROFILE>

# Redeploy fresh
databricks bundle deploy --profile <PROFILE>
```

## App Access

Once deployed, your app will be accessible at:
```
https://bi-hub-app-<workspace-id>.aws.databricksapps.com
```

The exact URL is shown in the `databricks bundle run` output and can be retrieved with `databricks apps get bi-hub-app`.

## Architecture Overview

- **Frontend**: Chainlit chat interface with streaming responses
- **Backend**: MAS (Multi-Agent Supervisor) integration via Databricks Model Serving endpoints
- **Authentication**: Dual-mode (OBO for Databricks Apps, PAT for local dev)
- **Data Layer**: Lakebase PostgreSQL for persistent chat history
- **Security**: Unity Catalog integration for table/row/column-level permissions

## Additional Resources

- [Databricks Apps Documentation](https://docs.databricks.com/en/dev-tools/apps/index.html)
- [Databricks Asset Bundles](https://docs.databricks.com/dev-tools/bundles/index.html)
- [Chainlit Documentation](https://docs.chainlit.io/)
