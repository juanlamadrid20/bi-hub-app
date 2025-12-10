# BI Hub App - Development Guide

This guide covers local development, testing, and deployment of the BI Hub application.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Deployment to Databricks](#deployment-to-databricks)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)
- [API Reference](#api-reference)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        BI Hub App                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐         ┌──────────────────┐              │
│  │   React Client   │  HTTP   │  FastAPI Server  │              │
│  │   (Vite + TS)    │────────▶│   (Python)       │              │
│  │   Port: 5173     │◀────────│   Port: 8010     │              │
│  └──────────────────┘   SSE   └────────┬─────────┘              │
│                                        │                         │
└────────────────────────────────────────┼─────────────────────────┘
                                         │
                                         │ HTTPS (PAT or OBO)
                                         ▼
                    ┌────────────────────────────────────┐
                    │         Databricks Cloud           │
                    │  ┌──────────────┐ ┌─────────────┐  │
                    │  │ MAS Endpoint │ │  Lakebase   │  │
                    │  │ (AI Agent)   │ │ (Postgres)  │  │
                    │  └──────────────┘ └─────────────┘  │
                    └────────────────────────────────────┘
```

### Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | React 19 + TypeScript + Vite + TailwindCSS | Chat UI with SSE streaming |
| Backend | FastAPI + Uvicorn | API server, SSE streaming, auth |
| AI Agent | Databricks Model Serving (MAS) | Multi-agent system for analytics |
| Database | Lakebase (PostgreSQL) | Chat history, user data (optional) |

---

## Prerequisites

### Required

- **Node.js** 18+ (`node --version`)
- **Python** 3.10+ (`python --version`)
- **Databricks CLI** configured (`databricks auth describe`)
- **Databricks PAT** (Personal Access Token)

### Optional

- **Lakebase instance** for database features
- **Docker** for containerized development

---

## Local Development

### Quick Start

```bash
# 1. Clone and navigate to project
cd /Users/juan.lamadrid/dev/databricks-projects/apps/bi-hub-app

# 2. Set up backend
cd server
cp env.template .env
# Edit .env with your values (see Environment Variables section)
pip install -r requirements.txt

# 3. Set up frontend
cd ../client
npm install

# 4. Run both (in separate terminals, from project root)
# Terminal 1 - Backend (MUST run from project root, not server/)
uvicorn server.app:app --reload --port 8010

# Terminal 2 - Frontend
cd client && npm run dev
```

### Access the App

Open **http://localhost:5173** in your browser.

The Vite dev server automatically proxies `/api/*` requests to the FastAPI backend on port 8010.

### Development Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    Local Development                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Browser (localhost:5173)                                    │
│      │                                                       │
│      │ GET /api/chat/starters                                │
│      │ POST /api/chat/message/stream                         │
│      ▼                                                       │
│  Vite Dev Server (localhost:5173)                            │
│      │                                                       │
│      │ proxy /api/* → localhost:8010                         │
│      ▼                                                       │
│  FastAPI Server (localhost:8010)                             │
│      │                                                       │
│      │ Authorization: Bearer $DATABRICKS_TOKEN               │
│      ▼                                                       │
│  Databricks MAS Endpoint (cloud)                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Hot Reload

- **Frontend**: Vite automatically reloads on file changes
- **Backend**: Uvicorn `--reload` flag watches for Python file changes

### Running Tests

```bash
# Backend tests (when available)
cd server
pytest

# Frontend tests (when available)
cd client
npm test
```

---

## Deployment to Databricks

### Prerequisites

1. Set your Databricks profile (if you have multiple):
```bash
export DATABRICKS_CONFIG_PROFILE=your-profile-name
```

2. Verify authentication:
```bash
databricks auth profiles
databricks current-user me
```

### Build the Frontend

```bash
./build.sh
```

This runs `npm run build` and outputs to `client/build/`.

### Deploy to Databricks Apps

**Important:** The Databricks Apps deployment process requires uploading the built frontend separately.

#### Step 1: Build the Frontend

```bash
./build.sh
```

#### Step 2: Upload Frontend Build to Workspace

```bash
export DATABRICKS_CONFIG_PROFILE=your-profile-name

# Upload the built frontend to workspace
databricks workspace import-dir client/build \
  "/Workspace/Users/$(databricks current-user me --output json | jq -r .userName)/apps/bi-hub-app/files/client/build" \
  --overwrite
```

#### Step 3: Deploy the App

```bash
export DATABRICKS_CONFIG_PROFILE=your-profile-name

# Get your username
USER_EMAIL=$(databricks current-user me --output json | jq -r .userName)

# Deploy the app with the correct source path
databricks apps deploy bi-hub-app \
  --source-code-path "/Workspace/Users/$USER_EMAIL/apps/bi-hub-app/files"
```

#### Quick Deploy Script

You can also use this one-liner after building:

```bash
export DATABRICKS_CONFIG_PROFILE=your-profile-name && \
./build.sh && \
USER_EMAIL=$(databricks current-user me --output json | jq -r .userName) && \
databricks workspace import-dir client/build \
  "/Workspace/Users/$USER_EMAIL/apps/bi-hub-app/files/client/build" --overwrite && \
databricks apps deploy bi-hub-app \
  --source-code-path "/Workspace/Users/$USER_EMAIL/apps/bi-hub-app/files"
```

#### First Time App Creation

If the app doesn't exist yet:

```bash
export DATABRICKS_CONFIG_PROFILE=your-profile-name
databricks apps create bi-hub-app
```

Then follow the deployment steps above.

### Production Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 Databricks Apps (Production)                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  User Browser                                                │
│      │                                                       │
│      │ HTTPS (OAuth via Databricks)                          │
│      ▼                                                       │
│  Databricks Apps Proxy                                       │
│      │                                                       │
│      │ x-forwarded-access-token (OBO token)                  │
│      ▼                                                       │
│  Gunicorn + Uvicorn Workers                                  │
│      │                                                       │
│      ├── GET /* → Static files (client/build)                │
│      │                                                       │
│      └── /api/* → FastAPI routes                             │
│              │                                               │
│              │ OBO token from headers                        │
│              ▼                                               │
│          MAS Endpoint (same workspace)                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### app.yaml Configuration

```yaml
command: ['gunicorn', 'server.app:app', '-w', '2', '-k', 'uvicorn.workers.UvicornWorker', '--bind', '0.0.0.0:8000']

env:
  - name: DATABASE_INSTANCE
    value: "cx-live-demo-no-delete"
  - name: SERVING_ENDPOINT
    value: "mas-d8f57d8b-endpoint"
  - name: ENABLE_HEADER_AUTH
    value: "true"
  - name: ENABLE_PASSWORD_AUTH
    value: "false"
```

---

## Environment Variables

### Authentication Modes

| Variable | Local Dev | Production | Description |
|----------|-----------|------------|-------------|
| `ENABLE_HEADER_AUTH` | `false` | `true` | Use OBO token from headers |
| `ENABLE_PASSWORD_AUTH` | `true` | `false` | Use PAT token |
| `DATABRICKS_TOKEN` | Required | N/A | Your PAT (local only) |

### Databricks Connection

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABRICKS_HOST` | Yes (local) | Workspace URL, e.g., `https://xxx.cloud.databricks.com` |
| `SERVING_ENDPOINT` | Yes | MAS endpoint name, e.g., `mas-d8f57d8b-endpoint` |

### Lakebase (Optional)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_INSTANCE` | No | Lakebase instance name |
| `PGHOST` | No | PostgreSQL host |
| `PGPORT` | No | PostgreSQL port (default: 5432) |
| `PGUSER` | No | PostgreSQL username |
| `PGDATABASE` | No | PostgreSQL database name |
| `PGSSLMODE` | No | SSL mode (default: require) |

### Example .env for Local Development

```bash
# Authentication
ENABLE_HEADER_AUTH=false
ENABLE_PASSWORD_AUTH=true
DATABRICKS_TOKEN=dapi1234567890abcdef...

# Databricks
DATABRICKS_HOST=https://your-workspace.cloud.databricks.com
SERVING_ENDPOINT=mas-d8f57d8b-endpoint

# Lakebase (optional)
DATABASE_INSTANCE=cx-live-demo-no-delete
```

---

## Troubleshooting

### Common Issues

#### "Frontend not built" error in deployed app

**Symptom**: When accessing the app URL, you see:
```json
{"message":"BI Hub API","docs":"/api/docs","note":"Frontend not built. Run 'npm run build' in client/"}
```

**Cause**: The `client/build/` directory was not uploaded to the Databricks workspace before deployment.

**Fix**:
```bash
export DATABRICKS_CONFIG_PROFILE=your-profile-name

# 1. Build frontend locally
./build.sh

# 2. Upload the build to workspace
USER_EMAIL=$(databricks current-user me --output json | jq -r .userName)
databricks workspace import-dir client/build \
  "/Workspace/Users/$USER_EMAIL/apps/bi-hub-app/files/client/build" --overwrite

# 3. Redeploy the app
databricks apps deploy bi-hub-app \
  --source-code-path "/Workspace/Users/$USER_EMAIL/apps/bi-hub-app/files"
```

#### Multiple profiles matched error

**Symptom**:
```
Error: resolve: multiple profiles matched: DEFAULT, field-eng-west
```

**Cause**: Multiple Databricks profiles configured for the same workspace.

**Fix**: Set the `DATABRICKS_CONFIG_PROFILE` environment variable:
```bash
export DATABRICKS_CONFIG_PROFILE=your-profile-name
databricks apps deploy bi-hub-app
```

#### "Missing bearer token" error

**Cause**: No PAT configured for local development.

**Fix**:
```bash
# Ensure .env has:
DATABRICKS_TOKEN=dapi...your-token...
ENABLE_PASSWORD_AUTH=true
```

#### "Connection refused" on API calls

**Cause**: Backend not running or wrong port.

**Fix**:
1. Ensure FastAPI is running from project root: `uvicorn server.app:app --port 8010`
2. Check `vite.config.ts` proxy target matches backend port

#### CORS errors in browser

**Cause**: Frontend calling backend directly without proxy.

**Fix**: Ensure you're accessing via `localhost:5173` (Vite), not `localhost:8010` directly.

#### "MAS HTTP 401" error

**Cause**: Invalid or expired PAT token.

**Fix**:
1. Generate new PAT in Databricks UI
2. Ensure PAT has access to the serving endpoint
3. Update `.env` with new token

#### "Frontend build not found"

**Cause**: Static files not built or wrong path.

**Fix**:
```bash
cd client && npm run build
```

#### App Crashes on Deployment ("app crashed unexpectedly")

**Symptom**: After running `databricks bundle run`, the app fails with:
```
✓ Error: app crashed unexpectedly. Please check /logz for more details
Error: failed to reach SUCCEEDED, got FAILED: Error: app crashed unexpectedly. Please check /logz for more details
```

**Common Causes & Fixes**:

##### 1. Missing Port Binding

Databricks Apps require the app to bind to port 8000. Ensure `app.yaml` includes the `--bind` flag:

```yaml
command:
  - "gunicorn"
  - "server.app:app"
  - "-w"
  - "2"
  - "--worker-class"
  - "uvicorn.workers.UvicornWorker"
  - "--pythonpath"
  - "."
  - "--bind"
  - "0.0.0.0:8000"
```

##### 2. Files Not Synced by Bundle Deploy

Sometimes `databricks bundle deploy` doesn't sync all files (e.g., `server/config.py` may be missing).

**Diagnose** - Check which files were actually deployed:
```bash
# List deployed server files
databricks workspace list \
  "/Workspace/Users/<your-email>/apps/bi-hub-app/files/server" \
  --profile <PROFILE>
```

If `config.py` or other critical files are missing, the app will crash on import.

**Fix** - Manually upload missing files:
```bash
databricks workspace import \
  /Workspace/Users/<your-email>/apps/bi-hub-app/files/server/config.py \
  --file ./server/config.py \
  --format AUTO \
  --profile <PROFILE>
```

**Permanent Fix** - Clear bundle cache and redeploy:
```bash
# Clear the bundle cache
rm -rf .databricks/.bundle

# Redeploy
databricks bundle deploy --profile <PROFILE>

# Run the app
databricks bundle run --profile <PROFILE> bi-agent
```

##### 3. Import Errors

If a Python module fails to import, the app crashes immediately with no useful error message.

**Diagnose** - Test imports locally:
```bash
python -c "from server.app import app; print('Import successful')"
```

##### Useful Debugging Commands

```bash
# Check app status and error details
databricks apps get bi-hub-app --profile <PROFILE>

# Get deployment details (use deployment ID from above)
databricks apps get-deployment bi-hub-app <deployment-id> --profile <PROFILE>

# List all files in deployed server directory
databricks workspace list \
  "/Workspace/Users/<email>/apps/bi-hub-app/files/server" \
  --profile <PROFILE>

# Verify specific subdirectories
databricks workspace list \
  "/Workspace/Users/<email>/apps/bi-hub-app/files/server/routes" \
  --profile <PROFILE>
```

### Debug Mode

Enable verbose logging:

```bash
# Backend
# Run from project root
LOG_LEVEL=DEBUG uvicorn server.app:app --reload --port 8010

# Check SSE events in browser DevTools → Network → EventStream
```

### Useful Commands

```bash
# Check if MAS endpoint is accessible
curl -H "Authorization: Bearer $DATABRICKS_TOKEN" \
  https://your-workspace.cloud.databricks.com/serving-endpoints/mas-d8f57d8b-endpoint

# Test API locally
curl http://localhost:8010/api/chat/starters

# Check Databricks CLI auth
databricks auth describe

# List serving endpoints
databricks serving-endpoints list
```

---

## API Reference

### Endpoints

#### GET /api/chat/starters

Returns suggested conversation starters.

**Response:**
```json
{
  "starters": [
    {
      "label": "Customer Behavior: VIP Analysis",
      "message": "How many VIP customers do we have..."
    }
  ],
  "total": 10
}
```

#### POST /api/chat/message/stream

Stream chat response via Server-Sent Events.

**Request:**
```json
{
  "message": "What is our inventory health?",
  "history": [
    {"role": "user", "content": "previous message"},
    {"role": "assistant", "content": "previous response"}
  ]
}
```

**SSE Events:**
```
data: {"type": "text", "content": "Based on..."}
data: {"type": "tool_start", "tool": {"id": "123", "name": "query_inventory"}}
data: {"type": "tool_result", "tool_call_id": "123", "result": {...}}
data: {"type": "done"}
```

#### POST /api/chat/message

Non-streaming chat response.

**Request:** Same as streaming endpoint.

**Response:**
```json
{
  "content": "Based on the analysis...",
  "tool_calls": [...]
}
```

#### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "bi-hub-api"
}
```

---

## Project Structure

```
bi-hub-app/
├── app.yaml                    # Databricks Apps config
├── build.sh                    # Frontend build script
├── deploy.sh                   # Deployment script
├── docs/
│   └── dev-guide.md           # This file
├── client/                     # React frontend
│   ├── src/
│   │   ├── components/chat/   # Chat UI components
│   │   ├── hooks/             # React hooks
│   │   ├── services/          # API client
│   │   ├── types/             # TypeScript types
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── build/                 # Production build
│   ├── package.json
│   └── vite.config.ts
├── server/                     # FastAPI backend
│   ├── app.py                 # Main application
│   ├── config.py              # Settings
│   ├── auth/                  # Authentication
│   ├── routes/                # API routes
│   ├── schemas/               # Pydantic models
│   ├── services/              # MAS client
│   ├── env.template           # Environment template
│   └── requirements.txt
└── src/app/                   # Legacy Chainlit app (deprecated)
```

---

## Additional Resources

- [Databricks Apps Documentation](https://docs.databricks.com/en/dev-tools/databricks-apps/index.html)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
