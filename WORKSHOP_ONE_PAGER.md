# AI-Powered Business Intelligence Agent Workshop
## Building Enterprise Chat Applications with Databricks

---

## About This Workshop

Learn to build and deploy a production-ready AI-powered Business Intelligence agent using Databricks' comprehensive AI platform. This hands-on workshop demonstrates how to create an intelligent chat interface that provides secure, streaming responses to business analytics queries while maintaining enterprise-grade security and persistent conversation history.

Participants will deploy a complete **BI Hub App** - a sophisticated chatbot that integrates multiple Databricks products to deliver a seamless AI-powered analytics experience. The application showcases modern AI application architecture patterns including multi-agent systems, persistent chat storage, and enterprise authentication.

---

## Key Databricks Products & Technologies

### Core Platform Components
- **🤖 Agent Framework (Multi-Agent Supervisor)** - Orchestrates multiple AI agents and routes queries across Genie Spaces and Knowledge Assistants for consolidated, intelligent responses
- **📱 Databricks Apps** - Serverless application hosting platform with built-in authentication, scaling, and workspace integration  
- **🗄️ Lakebase (Managed PostgreSQL)** - Fully managed database service for persistent chat history and session management with automatic OAuth integration
- **🔐 Unity Catalog** - Enterprise data governance providing table, row, and column-level security enforcement
- **⚡ Model Serving** - High-performance serving infrastructure for real-time AI model inference with automatic scaling

### Supporting Technologies
- **🔑 OAuth & OBO Tokens** - Secure authentication with On-Behalf-Of token delegation for seamless user experience
- **📊 MLflow 3.0** - Comprehensive logging and tracing of multi-agent interactions for observability
- **🎯 Genie Spaces** - Natural language interface for business intelligence queries
- **🧠 Knowledge Assistants** - Domain-specific AI assistants for specialized query handling
- **📋 Asset Bundles** - Infrastructure-as-code deployment and management framework

---

## Workshop Agenda

### 🏗️ **Setup & Architecture** *(20 minutes)*
- Deploy Databricks workspace resources using Asset Bundles
- Configure Lakebase PostgreSQL instance for chat persistence  
- Set up Multi-Agent Supervisor (MAS) endpoint with model serving
- Review security model and authentication flow architecture

### 🔧 **Application Configuration** *(25 minutes)*
- Configure Chainlit chat interface with custom branding
- Implement dual authentication modes (OBO for production, PAT for development)
- Set up database connectivity with automatic OAuth token refresh
- Configure environment variables and workspace integration

### 🤖 **Multi-Agent Integration** *(30 minutes)*
- Connect to Multi-Agent Supervisor for query routing
- Implement streaming response handling with Server-Sent Events
- Configure Genie Spaces and Knowledge Assistant integration
- Set up comprehensive logging and tracing with MLflow

### 🛡️ **Security & Governance** *(20 minutes)*
- Apply Unity Catalog permissions for data access control
- Configure row and column-level security enforcement
- Implement secure token management and credential rotation
- Test enterprise authentication and authorization flows

### 🚀 **Deployment & Testing** *(25 minutes)*
- Deploy application using Databricks Asset Bundles
- Test chat functionality with streaming AI responses
- Validate persistent conversation history and session management
- Perform end-to-end security and performance testing

### 🎯 **Advanced Features & Extension** *(20 minutes)*
- Implement custom table formatting and response rendering
- Configure chat history budgeting for token optimization
- Set up monitoring dashboards and analytics views
- Explore customization options and integration patterns

---

## Workshop Outcomes

By the end of this workshop, participants will have:

✅ **Deployed a Production-Ready AI Agent** - Complete BI Hub application running on Databricks Apps with enterprise security

✅ **Mastered Multi-Agent Architecture** - Understanding of how to orchestrate multiple AI agents for complex query handling

✅ **Implemented Enterprise Security** - Working knowledge of Unity Catalog integration and secure authentication patterns

✅ **Built Persistent Chat System** - Lakebase integration with automatic session management and conversation history

✅ **Gained Deployment Expertise** - Hands-on experience with Databricks Asset Bundles for infrastructure automation

---

## Prerequisites

- **Technical**: Basic familiarity with Python, SQL, and cloud deployment concepts
- **Databricks**: Access to a Databricks workspace with admin privileges  
- **Tools**: Databricks CLI installed and configured locally
- **Knowledge**: Understanding of REST APIs and authentication concepts

---

## Workshop Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Chainlit UI   │◄──►│   BI Hub App    │◄──►│ Multi-Agent     │
│                 │    │                 │    │ Supervisor      │
│ • Chat Interface│    │ • Auth Handler  │    │ (MAS)           │
│ • Streaming     │    │ • Session Mgmt  │    │                 │
│ • History       │    │ • Data Layer    │    │ • Genie Spaces  │
└─────────────────┘    └─────────────────┘    │ • Knowledge AI  │
                                ▲              │ • Query Router  │
                                │              └─────────────────┘
                                ▼                       ▲
                       ┌─────────────────┐              │
                       │   Lakebase      │              ▼
                       │  (PostgreSQL)   │    ┌─────────────────┐
                       │                 │    │ Unity Catalog   │
                       │ • Sessions      │    │                 │
                       │ • Messages      │    │ • Data Security │
                       │ • User Data     │    │ • Permissions   │
                       └─────────────────┘    │ • Governance    │
                                              └─────────────────┘
```

---

*This workshop provides a comprehensive introduction to building enterprise AI applications on the Databricks platform, combining cutting-edge AI capabilities with production-ready security and scalability.*
