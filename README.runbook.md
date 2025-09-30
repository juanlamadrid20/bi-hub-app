# Databricks App Deployment Runbook

This runbook provides step-by-step instructions for deploying the bi-hub-app to Databricks, including commands, validation steps, and troubleshooting guidance.

## Prerequisites

- Databricks CLI installed and configured
- Valid Databricks workspace access with app deployment permissions
- Local development environment with the app code

## Deployment Overview

The deployment process consists of these key phases:
1. Code synchronization to workspace
2. Bundle deployment (creates app infrastructure and jobs)
3. Database setup via job execution
4. App compute startup
5. App deployment with source code

## Step-by-Step Deployment Guide

### 1. Verify Authentication

**Command:**
```bash
databricks auth describe
```

**Expected Output:**
- Shows authenticated user and workspace
- Confirms profile configuration (e.g., `field-eng-west`)

**Validation:**
- Ensure you have the correct workspace host
- Verify your user has app deployment permissions

### 2. Synchronize Code to Workspace

**Command:**
```bash
databricks sync --profile <PROFILE> . /Workspace/Users/<your-email>/apps/bi-hub-app
```

**Example:**
```bash
databricks sync --profile field-eng-west . /Workspace/Users/juan.lamadrid@databricks.com/apps/bi-hub-app
```

**Expected Output:**
```
Initial Sync Complete
```

**Validation:**
- Verify all files are uploaded
- Check that source code structure is preserved

### 3. Deploy Bundle (Create App Infrastructure)

**Command:**
```bash
databricks bundle deploy --profile <PROFILE>
```

**Expected Output:**
```
Uploading bundle files to /Workspace/Users/<user>/.bundle/bi-hub-app/dev/files...
Deploying resources...
Updating deployment state...
Deployment complete!
```

**Key Considerations:**
- This creates the app registration and setup job
- If you encounter state conflicts, clear local and remote state:
  ```bash
  # Remove local state
  rm -rf ./.databricks ./src/app/.databricks

  # Remove remote state
  databricks workspace delete /Workspace/Users/<user>/.bundle --recursive --profile <PROFILE>
  ```

**Common Issues:**
- **"App with name bi-hub-app does not exist or is deleted"**: Clear all state files and redeploy
- **Bundle validation errors**: Check `databricks.yml` syntax and variable definitions

### 4. Run Database Setup Job

**Command:**
```bash
databricks bundle run setup_lakebase --profile <PROFILE>
```

**Expected Output:**
```
Run URL: https://<workspace-url>/#job/<job-id>/run/<run-id>
<timestamp> "[dev <user>] setup-lakebase-dev" RUNNING
<timestamp> "[dev <user>] setup-lakebase-dev" TERMINATED SUCCESS
```

**Validation:**
- Verify job completes with `TERMINATED SUCCESS`
- Check job logs if it fails
- This creates PostgreSQL tables for Chainlit persistence

### 5. Start App Compute

**Command:**
```bash
databricks apps start bi-hub-app --profile <PROFILE>
```

**Expected Behavior:**
- Command may timeout (2+ minutes) while compute starts
- This is normal - compute takes time to provision

**Validation:**
- Don't rely on command completion
- Compute startup happens in background
- Proceed to next step after timeout

### 6. Deploy App Code

**Important:** Re-sync code before deployment to ensure all files are present:

**Commands:**
```bash
# Re-sync all code
databricks sync --profile <PROFILE> . /Workspace/Users/<your-email>/apps/bi-hub-app

# Deploy app with source code path
databricks apps deploy bi-hub-app --source-code-path /Workspace/Users/<your-email>/apps/bi-hub-app/src/app --profile <PROFILE>
```

**Expected Output:**
```json
{
  "create_time":"2025-09-27T15:34:51Z",
  "creator":"<your-email>",
  "deployment_artifacts": {
    "source_code_path":"/Workspace/Users/<internal-path>"
  },
  "deployment_id":"<deployment-id>",
  "mode":"SNAPSHOT",
  "source_code_path":"/Workspace/Users/<your-email>/apps/bi-hub-app/src/app",
  "status": {
    "message":"App started successfully",
    "state":"SUCCEEDED"
  },
  "update_time":"2025-09-27T15:35:40Z"
}
```

**Validation:**
- Status should be `"state":"SUCCEEDED"`
- Message should be `"App started successfully"`

## Verification Steps

### 1. Check App Status
```bash
databricks apps list --profile <PROFILE> | grep bi-hub-app
```

### 2. Verify Code Synchronization
```bash
databricks workspace list /Workspace/Users/<your-email>/apps/bi-hub-app/src/app --profile <PROFILE>
```

**Expected Files:**
- `app.py` (main application)
- `requirements.txt` (dependencies)
- `app.yaml` (app configuration)
- Various directories: `auth/`, `data/`, `services/`, etc.

### 3. Access Deployed App
- App URL format: `https://bi-hub-app-<workspace-id>.aws.databricksapps.com`
- Check app is responsive and functional

## Troubleshooting Guide

### Issue: Code Not Synced Properly
**Symptoms:** Missing files in workspace, deployment fails with missing dependencies

**Solution:**
```bash
# Re-sync code completely
databricks sync --profile <PROFILE> . /Workspace/Users/<your-email>/apps/bi-hub-app
```

### Issue: Bundle State Conflicts
**Symptoms:** "App does not exist or is deleted" during deployment

**Solution:**
```bash
# Clear all state files
rm -rf ./.databricks ./src/app/.databricks
databricks workspace delete /Workspace/Users/<user>/.bundle --recursive --profile <PROFILE>

# Redeploy bundle
databricks bundle deploy --profile <PROFILE>
```

### Issue: Chainlit Not Found
**Symptoms:** "chainlit: executable file not found in $PATH"

**Solution:**
- Ensure all code is synced before deployment
- Verify `requirements.txt` contains chainlit dependency
- Re-sync and redeploy

### Issue: Database Connection Failures
**Symptoms:** App starts but database operations fail

**Solution:**
- Verify setup_lakebase job completed successfully
- Check database instance configuration in `databricks.yml`
- Verify service principal permissions

## Key Configuration Files

### databricks.yml
- Bundle configuration with workspace settings
- Variables for environment-specific deployment
- Resource definitions (apps, jobs, permissions)

### src/app/app.yaml
- App-specific environment variables
- Runtime configuration
- Database and endpoint references

### src/app/requirements.txt
- Python dependencies including chainlit
- Must be present for successful deployment

## Security Considerations

- Use appropriate profiles for different environments
- Verify service principal permissions for database access
- Ensure endpoint permissions are correctly configured
- Never commit secrets to repository

## Environment Variables

Key variables referenced in deployment:
- `DATABRICKS_TOKEN` - For local development authentication
- `DATABASE_INSTANCE` - Lakebase instance name
- `SERVING_ENDPOINT` - MAS model serving endpoint name

## Best Practices

1. **Always sync code before deployment** - Ensures all files are present
2. **Clear state on conflicts** - Resolves bundle deployment issues
3. **Monitor job execution** - Verify setup_lakebase completes successfully
4. **Use consistent profiles** - Maintain environment separation
5. **Validate at each step** - Catch issues early in deployment process

## Quick Reference Commands

```bash
# Full deployment sequence
databricks sync --profile <PROFILE> . /Workspace/Users/<user>/apps/bi-hub-app
databricks bundle deploy --profile <PROFILE>
databricks bundle run setup_lakebase --profile <PROFILE>
databricks apps start bi-hub-app --profile <PROFILE>
databricks sync --profile <PROFILE> . /Workspace/Users/<user>/apps/bi-hub-app
databricks apps deploy bi-hub-app --source-code-path /Workspace/Users/<user>/apps/bi-hub-app/src/app --profile <PROFILE>
```

## Success Criteria

Deployment is successful when:
- ✅ Bundle deploys without errors
- ✅ setup_lakebase job completes with SUCCESS
- ✅ App deployment returns `"state":"SUCCEEDED"`
- ✅ App is accessible via generated URL
- ✅ App functionality works as expected

---

*This runbook was created based on successful deployment of bi-hub-app on 2025-09-27*