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

## Authentication System Deep Dive

This section provides a comprehensive technical guide to how authentication works end-to-end in the BI Hub App.

### Authentication Modes Overview

The app implements a **dual-mode authentication system**:

| Mode | Context | Token Source | Use Case |
|------|---------|--------------|----------|
| **OBO (On-Behalf-Of)** | Databricks Apps | `x-forwarded-access-token` header | Production |
| **PAT (Personal Access Token)** | Local development | `DATABRICKS_TOKEN` env var | Development |

**Important**: Exactly ONE mode must be enabled at a time.

### End-to-End Authentication Flow

#### OBO Flow (Production - Databricks Apps)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ User Browser                                                             │
│   │                                                                      │
│   ├─► GET https://bi-hub-app.databricksapps.com/                        │
│   │                                                                      │
│   ▼                                                                      │
│ Databricks Apps Proxy                                                    │
│   │ Authenticates user via workspace SSO                                │
│   │ Injects headers:                                                    │
│   │   • x-forwarded-email: user@company.com                             │
│   │   • x-forwarded-preferred-username: John Doe                        │
│   │   • x-forwarded-access-token: eyJ0eXAi... (OBO token)               │
│   │                                                                      │
│   ▼                                                                      │
│ FastAPI Backend (server/auth/dependencies.py)                           │
│   │ get_identity(request) extracts headers                              │
│   │ Creates Identity with OboTokenSource                                │
│   │                                                                      │
│   ▼                                                                      │
│ MAS Client (server/services/mas_client.py)                              │
│   │ bearer = identity.token_source.bearer_token()                       │
│   │ POST /serving-endpoints/{endpoint}/invocations                      │
│   │   Authorization: Bearer {OBO_TOKEN}                                 │
│   │                                                                      │
│   ▼                                                                      │
│ Databricks Model Serving                                                 │
│   └─► Validates OBO token, returns streaming response                   │
└─────────────────────────────────────────────────────────────────────────┘
```

#### PAT Flow (Local Development)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Developer Browser                                                        │
│   │                                                                      │
│   ├─► GET http://localhost:5173/                                        │
│   │                                                                      │
│   ▼                                                                      │
│ Vite Dev Server (proxies /api/* to backend)                             │
│   │                                                                      │
│   ▼                                                                      │
│ FastAPI Backend (server/auth/dependencies.py)                           │
│   │ get_identity(request) checks ENABLE_PASSWORD_AUTH=true              │
│   │ Creates Identity with PatTokenSource(DATABRICKS_TOKEN)              │
│   │                                                                      │
│   ▼                                                                      │
│ MAS Client (server/services/mas_client.py)                              │
│   │ bearer = identity.token_source.bearer_token()                       │
│   │ POST /serving-endpoints/{endpoint}/invocations                      │
│   │   Authorization: Bearer {PAT}                                       │
│   │                                                                      │
│   ▼                                                                      │
│ Databricks Model Serving                                                 │
│   └─► Validates PAT, returns streaming response                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Authentication Files

| File | Purpose |
|------|---------|
| `server/auth/identity.py` | Identity model + OboTokenSource/PatTokenSource classes |
| `server/auth/dependencies.py` | FastAPI `get_identity()` dependency |
| `server/routes/auth.py` | `/api/auth/me` and `/api/auth/status` endpoints |
| `server/config.py` | Settings with auth mode flags |
| `client/src/hooks/useAuth.ts` | React hook for auth state |
| `client/src/services/authApi.ts` | Frontend API calls |
| `client/src/components/UserMenu.tsx` | User menu with logout |

### Identity Resolution Code Path

```python
# server/auth/dependencies.py
async def get_identity(request: Request) -> Identity:
    if settings.enable_header_auth:
        # OBO Mode - Extract from forwarded headers
        email = headers.get("x-forwarded-email")
        display_name = headers.get("x-forwarded-preferred-username")
        token = headers.get("x-forwarded-access-token")

        return Identity(
            email=email,
            display_name=display_name,
            auth_type="obo",
            token_source=OboTokenSource(lambda: headers),
        )

    elif settings.enable_password_auth:
        # PAT Mode - Use configured token
        return Identity(
            email="local@dev",
            display_name="Local Developer",
            auth_type="pat",
            token_source=PatTokenSource(settings.pat),
        )
```

### Token Sources

**OboTokenSource** - Retrieves token from request headers on each call:
```python
class OboTokenSource:
    def bearer_token(self) -> str:
        headers = self._headers_getter()
        return headers.get("x-forwarded-access-token", "")
```

**PatTokenSource** - Returns configured PAT:
```python
class PatTokenSource:
    def bearer_token(self) -> str:
        return self._pat or ""
```

### Protected vs Public Endpoints

```python
# Protected - requires authentication
GET  /api/auth/me                      # Depends(get_identity)
POST /api/chat/message/stream          # Depends(get_identity)
GET  /api/chat/conversations           # Depends(get_identity)
POST /api/prompts                      # Depends(get_identity)

# Public - no authentication required
GET  /api/auth/status                  # Gracefully handles unauthenticated
GET  /api/chat/starters                # No auth needed
GET  /health                           # Health check
```

### Database Credentials (Lakebase)

Database authentication is handled separately via the Databricks SDK:

```python
# server/services/database.py
class LakebaseCredentialProvider:
    def get_credential(self) -> Credential:
        w = WorkspaceClient()  # Uses app's auth (OBO or PAT)
        cred = w.database.generate_database_credential(
            request_id=str(uuid.uuid4()),
            instance_names=[settings.pg_database_instance]
        )
        return Credential(token=cred.token, expiration_time=cred.expiration_time)
```

**Key points:**
- Uses the app's own authentication (not user's token)
- Credentials are cached with 1-minute refresh threshold
- Injected into SQLAlchemy connections via `do_connect` event

### Frontend Authentication

The React frontend uses the `useAuth` hook:

```typescript
// client/src/hooks/useAuth.ts
interface UseAuthReturn {
  user: AuthUser | null;          // { email, display_name, auth_type }
  isAuthenticated: boolean;
  isLoading: boolean;
  logoutUrl: string | null;       // https://{host}/logout for OBO
  logout: () => void;
  refresh: () => Promise<void>;
}
```

### Logout Behavior

| Mode | Logout URL | Behavior |
|------|------------|----------|
| OBO | `https://{DATABRICKS_HOST}/logout` | Redirects to workspace logout |
| PAT | `null` | No logout (local dev) |

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
