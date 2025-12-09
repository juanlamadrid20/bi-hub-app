# BI Hub App - React + FastAPI Architecture

This document describes the React + FastAPI architecture for the BI Hub chat application.

## Project Structure

```
bi-hub-app/
├── app.yaml                    # Databricks Apps configuration
├── build.sh                    # Frontend build script
├── deploy.sh                   # Deployment script
├── client/                     # React frontend
│   ├── src/
│   │   ├── components/chat/    # Chat UI components
│   │   ├── hooks/              # React hooks (useChat)
│   │   ├── services/           # API client (chatApi.ts)
│   │   ├── types/              # TypeScript types
│   │   ├── App.tsx             # Main app component
│   │   └── main.tsx            # Entry point
│   ├── build/                  # Production build output
│   ├── package.json
│   └── vite.config.ts
└── server/                     # FastAPI backend
    ├── app.py                  # Main FastAPI app
    ├── config.py               # Settings
    ├── auth/                   # Authentication
    │   ├── identity.py         # Identity models
    │   └── dependencies.py     # FastAPI dependencies
    ├── routes/
    │   └── chat.py             # Chat API endpoints
    ├── schemas/
    │   └── chat.py             # Pydantic models
    ├── services/
    │   ├── mas_client.py       # MAS HTTP client
    │   └── mas_normalizer.py   # Event normalizer
    └── requirements.txt
```

## Development

### Prerequisites

- Node.js 18+
- Python 3.10+
- Databricks CLI configured

### Local Development

1. **Start the backend:**
   ```bash
   cd server
   pip install -r requirements.txt
   DATABRICKS_TOKEN=<your-pat> uvicorn app:app --reload --port 8000
   ```

2. **Start the frontend:**
   ```bash
   cd client
   npm install
   npm run dev
   ```

3. **Access the app:**
   Open http://localhost:5173 in your browser

The Vite dev server proxies `/api` requests to the FastAPI backend.

## API Endpoints

### Chat

- `GET /api/chat/starters` - Get starter message suggestions
- `POST /api/chat/message/stream` - Stream chat response via SSE
- `POST /api/chat/message` - Non-streaming chat response

### SSE Events

The streaming endpoint emits Server-Sent Events:

```
data: {"type": "text", "content": "Hello..."}
data: {"type": "tool_start", "tool": {"id": "...", "name": "query_data"}}
data: {"type": "tool_result", "tool_call_id": "...", "result": {...}}
data: {"type": "done"}
```

## Deployment

### Build

```bash
./build.sh
```

### Deploy to Databricks Apps

```bash
./deploy.sh bi-hub-app
```

## Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   React Client   │────▶│  FastAPI Server  │────▶│   MAS Endpoint   │
│   (Vite/TS)      │◀────│   (SSE Stream)   │◀────│   (AI Agent)     │
└──────────────────┘     └──────────────────┘     └──────────────────┘
         │                        │
         │                        │
         ▼                        ▼
   /api/chat/*              OBO/PAT Auth
```

### Key Components

1. **React Frontend**
   - Modern React 19 with TypeScript
   - TailwindCSS for styling
   - SSE streaming for real-time responses
   - useChat hook for state management

2. **FastAPI Backend**
   - Async SSE streaming
   - Pydantic validation
   - CORS support for development
   - Static file serving for production

3. **MAS Client**
   - Supports OBO (On-Behalf-Of) auth for Databricks Apps
   - Supports PAT auth for local development
   - Normalizes MAS events to standard format

## Authentication

### Production (Databricks Apps)

Uses header-based authentication with `x-forwarded-access-token` from the Databricks Apps proxy.

### Development

Uses Personal Access Token (PAT) via `DATABRICKS_TOKEN` environment variable.
