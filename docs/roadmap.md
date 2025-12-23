# BI Hub App - Feature Roadmap

This document outlines planned features for prioritization and refinement.

---

## Share & Collaborate Feature

Enable users to share insights and collaborate on analysis with teammates.

### Overview

Allow users to share conversations, individual messages/insights, and saved reports with others in their organization.

### Sharing Models

| Model | Description | Complexity | Use Case |
|-------|-------------|------------|----------|
| Link-Based | Generate shareable URLs for read-only access | Low | Quick sharing, external stakeholders |
| User-Based | Share with specific users/groups with permissions | Medium | Sensitive data, controlled access |
| Workspace/Channel | Collaborative spaces for team analysis | High | Real-time collaboration |

### What Can Be Shared

- [ ] Individual messages/responses (single insight or query result)
- [ ] Entire conversations (full analysis thread)
- [ ] Saved dashboards/reports (future feature dependency)

### Implementation Phases

#### Phase 1: Link-Based Sharing (MVP)

**Goal**: Quick wins with minimal infrastructure changes.

**Features:**
- Generate unique shareable links for conversations
- Read-only snapshot view for recipients
- Copy link to clipboard functionality
- Basic share button in conversation UI

**Database Schema:**
```sql
CREATE TABLE shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_type VARCHAR(50) NOT NULL, -- 'conversation' | 'message'
    resource_id UUID NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    share_token VARCHAR(64) UNIQUE NOT NULL,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**API Endpoints:**
- `POST /api/shares` - Create a share link
- `GET /api/shares/:token` - Retrieve shared resource
- `DELETE /api/shares/:id` - Revoke share link

**UI Components:**
- Share button (conversation header)
- Share modal with link generation
- Shared view page (read-only)

---

#### Phase 2: User-Based Sharing

**Goal**: Add permission controls and user-specific sharing.

**Features:**
- Share with specific users by email/username
- Permission levels: View, Comment, Duplicate
- "Shared with me" section in sidebar
- Email notifications for new shares

**Additional Schema:**
```sql
CREATE TABLE share_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    share_id UUID REFERENCES shares(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    permission VARCHAR(20) DEFAULT 'view', -- 'view' | 'comment' | 'duplicate'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(share_id, user_id)
);
```

**Additional API Endpoints:**
- `POST /api/shares/:id/recipients` - Add recipients
- `DELETE /api/shares/:id/recipients/:userId` - Remove recipient
- `GET /api/shares/shared-with-me` - List shares for current user

**UI Components:**
- User search/autocomplete in share modal
- Permission dropdown per recipient
- Shared with me sidebar section

---

#### Phase 3: Collaborative Workspaces

**Goal**: Enable real-time team collaboration.

**Features:**
- Create shared workspaces/channels
- Multiple users contribute to same conversation
- Real-time updates (WebSocket)
- Workspace membership management

**Additional Schema:**
```sql
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE workspace_members (
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'member', -- 'owner' | 'admin' | 'member'
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (workspace_id, user_id)
);

CREATE TABLE workspace_conversations (
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL,
    added_by VARCHAR(255) NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (workspace_id, conversation_id)
);
```

---

### Security Considerations

| Concern | Mitigation |
|---------|------------|
| Data leakage | Shared views respect Unity Catalog row/column-level security |
| Unauthorized access | Validate user permissions before rendering shared content |
| Link exposure | Support expiring links, allow owners to revoke anytime |
| Audit compliance | Log all share creation, access, and revocation events |

### User Flow

```
┌─────────────────────────────────────┐
│  Share this conversation            │
├─────────────────────────────────────┤
│  🔗 Anyone with link can view       │
│  ┌─────────────────────────┬──────┐ │
│  │ https://bi-hub/s/abc123 │ Copy │ │
│  └─────────────────────────┴──────┘ │
│                                     │
│  👥 Share with specific people      │
│  ┌─────────────────────────────────┐│
│  │ Search users...                 ││
│  └─────────────────────────────────┘│
│  • juan@company.com (Owner)         │
│  • Add people...                    │
│                                     │
│  ⏰ Link expires: Never ▼           │
│                                     │
│  [Cancel]              [Share]      │
└─────────────────────────────────────┘
```

### Open Questions

- [ ] Should shared links require authentication or be truly public?
- [ ] How long should default link expiration be?
- [ ] Should we support sharing outside the organization?
- [ ] Integration with existing notification system?
- [ ] How to handle shared content when source is deleted?

### Dependencies

- Lakebase PostgreSQL for share metadata storage
- User directory/identity service for user-based sharing
- WebSocket infrastructure for real-time collaboration (Phase 3)

### Success Metrics

- Number of shares created per week
- Share link click-through rate
- User adoption of sharing feature
- Time saved through collaboration (survey)

---

## Other Feature Ideas (Unprioritized)

### Data & Analytics
- [ ] Dashboard Builder - Save queries as dashboard widgets
- [ ] Query History Analytics - Track popular tables/columns
- [ ] Data Lineage Visualization - Show table dependencies
- [ ] Scheduled Reports - Recurring queries with delivery

### User Experience
- [ ] Query Templates - Pre-built query starters
- [ ] SQL Preview - Show generated SQL before execution
- [ ] Voice Input - Speech-to-text querying

### Intelligence & Context
- [ ] Semantic Layer Integration - Business glossary connection
- [ ] Smart Suggestions - Context-aware follow-up questions
- [ ] Anomaly Alerts - Surface unusual patterns
- [ ] Data Quality Indicators - Freshness/completeness scores

### Enterprise Features
- [ ] Audit Trail - Detailed query logging
- [ ] Query Cost Estimation - Warn before expensive queries
- [ ] Approval Workflows - Route sensitive requests

### Integrations
- [ ] Export to Notebooks - One-click Databricks notebook export
- [ ] Slack/Teams Bot - Query from messaging platforms
- [ ] Embed Mode - Widget for internal portals
