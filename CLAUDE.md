# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This is a Databricks App that provides an AI-powered Business Intelligence Agent built with Chainlit. The app integrates with Multi-Agent Supervisor (MAS) endpoints for reasoning and uses Lakebase (PostgreSQL) for persistent chat history.

**Key Components:**
- **Chainlit Frontend**: Chat interface with streaming responses and persistent history
- **MAS Integration**: Routes queries through Databricks Model Serving endpoints
- **Authentication**: Dual-mode auth system (OBO for Databricks Apps, PAT for local dev)
- **Data Layer**: Lakebase PostgreSQL integration with Chainlit Data Layer
- **Security**: Unity Catalog integration for table/row/column-level permissions

## Development Commands

**Local Development:**
```bash
cd src/app
pip install -r requirements.txt
# Set environment variables (see config.py for required vars)
chainlit run app.py -w
```

**Databricks Deployment:**
```bash
databricks bundle validate --profile <PROFILE>
databricks bundle deploy --profile <PROFILE>
databricks bundle run --profile <PROFILE>
# Note: Run the setup_lakebase job first, then the app
```

**Enable Debug Mode:**
```bash
export CHAINLIT_DEBUG=true
```

## Key Configuration Files

- `databricks.yml` - Bundle configuration with workspace settings, variables, and resource definitions
- `src/app/app.yaml` - App-specific environment variables and runtime config
- `src/app/.chainlit/config.toml` - Chainlit UI configuration and branding
- `src/app/config.py` - Application settings using Pydantic with environment variable mapping

## Core Modules

**Authentication (`src/app/auth/`):**
- `identity.py` - Databricks identity management with OBO token support
- `header.py` - Header-based authentication for Databricks Apps
- `password_auth.py` - Password authentication for local development
- `ensure_identity.py` - Authentication middleware

**Data Layer (`src/app/data/`):**
- `lakebase.py` - Lakebase PostgreSQL connection management
- `credentials.py` - Database credential generation and caching
- `layer.py` - Chainlit Data Layer integration

**Services (`src/app/services/`):**
- `mas_client.py` - MAS endpoint communication with streaming support
- `mas_normalizer.py` - Response normalization and parsing
- `renderer.py` - Message rendering and formatting
- `table_parser.py` - Automatic table detection and formatting

## Authentication Modes

| Context | MAS Auth | Transport | Lakebase Auth |
|---------|----------|-----------|---------------|
| Databricks App | OBO | SSE to `/invocations` | Service Principal |
| Local Development | PAT | OpenAI Client | Service Principal |

**Environment Variables:**
- `ENABLE_HEADER_AUTH=true` for Databricks Apps (OBO)
- `ENABLE_PASSWORD_AUTH=true` for local development (PAT required)
- `DATABRICKS_TOKEN` - Personal Access Token (local dev only)
- `DATABASE_INSTANCE` - Lakebase instance name
- `SERVING_ENDPOINT` - MAS model serving endpoint name

## Database Setup

The `setup_lakebase` job creates the necessary PostgreSQL tables for Chainlit persistence. Run this job before deploying the app:

```bash
databricks jobs run-now --job-name setup-lakebase-dev
```

## Common Issues

- **401/403 to MAS**: Check OBO token scope/expiry or endpoint ACLs
- **Database auth failures**: Service principal permissions or expired credentials
- **No streaming responses**: Ensure OBO uses SSE headers and correct payload format
- **Local dev 403s**: Set `DATABRICKS_TOKEN` environment variable

## File Structure Notes

- `public/` - Static assets (logo, CSS, theme)
- `scripts/` - Database setup scripts and notebooks
- Chat history budget management prevents token overflow by keeping system message + last N turns
- Automatic table formatting when pipe-table format is detected in responses