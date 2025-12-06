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

# 4. Run both (in separate terminals)
# Terminal 1 - Backend
cd server && uvicorn app:app --reload --port 8010

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

### Build the Frontend

```bash
./build.sh
```

This runs `npm run build` and outputs to `client/build/`.

### Deploy to Databricks Apps

#### Option 1: Using deploy.sh

```bash
./deploy.sh bi-hub-app
```

#### Option 2: Manual Deployment

```bash
# 1. Build frontend
cd client && npm run build && cd ..

# 2. Create app (first time only)
databricks apps create bi-hub-app

# 3. Sync files
databricks sync . /Workspace/Users/$USER/apps/bi-hub-app \
  --exclude node_modules \
  --exclude .git \
  --exclude __pycache__

# 4. Deploy
databricks apps deploy bi-hub-app
```

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
1. Ensure FastAPI is running: `uvicorn app:app --port 8010`
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

### Debug Mode

Enable verbose logging:

```bash
# Backend
LOG_LEVEL=DEBUG uvicorn app:app --reload --port 8010

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
