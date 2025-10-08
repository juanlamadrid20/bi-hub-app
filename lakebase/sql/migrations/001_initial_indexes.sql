-- Migration 001: Initial Performance Indexes for BI Hub App
-- Creates essential indexes for optimal query performance

-- ==============================================
-- MIGRATION METADATA
-- ==============================================
-- Migration: 001_initial_indexes
-- Description: Add performance indexes for Chainlit tables
-- Created: 2024-01-01
-- Author: BI Hub Team

-- ==============================================
-- USERS TABLE INDEXES
-- ==============================================

-- Primary index on identifier for user lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_identifier 
ON users("identifier");

-- Index on createdAt for temporal queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at 
ON users("createdAt");

-- GIN index on metadata for JSON queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_metadata_gin 
ON users USING GIN("metadata");

-- ==============================================
-- THREADS TABLE INDEXES
-- ==============================================

-- Index on userId for user-thread relationships
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_threads_user_id 
ON threads("userId");

-- Index on userIdentifier for direct user lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_threads_user_identifier 
ON threads("userIdentifier");

-- Index on createdAt for temporal queries and sorting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_threads_created_at 
ON threads("createdAt");

-- Composite index for user activity queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_threads_user_created 
ON threads("userId", "createdAt");

-- GIN index on tags for array searches
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_threads_tags_gin 
ON threads USING GIN("tags");

-- GIN index on metadata for JSON queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_threads_metadata_gin 
ON threads USING GIN("metadata");

-- ==============================================
-- STEPS TABLE INDEXES
-- ==============================================

-- Index on threadId for conversation queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_steps_thread_id 
ON steps("threadId");

-- Index on parentId for hierarchical step queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_steps_parent_id 
ON steps("parentId");

-- Index on createdAt for temporal queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_steps_created_at 
ON steps("createdAt");

-- Index on type for filtering by step type
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_steps_type 
ON steps("type");

-- Index on isError for error analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_steps_is_error 
ON steps("isError");

-- Composite index for thread-temporal queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_steps_thread_created 
ON steps("threadId", "createdAt");

-- Composite index for type-temporal queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_steps_type_created 
ON steps("type", "createdAt");

-- Composite index for error analysis with time
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_steps_error_created 
ON steps("isError", "createdAt");

-- Index on start/end times for performance analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_steps_start_time 
ON steps("start") WHERE "start" IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_steps_end_time 
ON steps("end") WHERE "end" IS NOT NULL;

-- GIN index on tags for array searches
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_steps_tags_gin 
ON steps USING GIN("tags");

-- GIN index on metadata for JSON queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_steps_metadata_gin 
ON steps USING GIN("metadata");

-- ==============================================
-- ELEMENTS TABLE INDEXES
-- ==============================================

-- Index on threadId for thread-element relationships
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_elements_thread_id 
ON elements("threadId");

-- Index on forId for element relationships
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_elements_for_id 
ON elements("forId");

-- Index on type for filtering by element type
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_elements_type 
ON elements("type");

-- Index on chainlitKey for element lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_elements_chainlit_key 
ON elements("chainlitKey");

-- GIN index on props for JSON queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_elements_props_gin 
ON elements USING GIN("props");

-- ==============================================
-- FEEDBACKS TABLE INDEXES
-- ==============================================

-- Index on threadId for thread-feedback relationships
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feedbacks_thread_id 
ON feedbacks("threadId");

-- Index on forId for feedback target relationships
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feedbacks_for_id 
ON feedbacks("forId");

-- Index on value for feedback analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feedbacks_value 
ON feedbacks("value");

-- Composite index for thread-value queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feedbacks_thread_value 
ON feedbacks("threadId", "value");

-- ==============================================
-- PERFORMANCE MONITORING INDEXES
-- ==============================================

-- Indexes specifically for analytics and monitoring queries

-- Multi-table join optimization for user analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_threads_analytics 
ON threads("userId", "createdAt", "id") 
WHERE "userId" IS NOT NULL;

-- Response time analysis optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_steps_response_time 
ON steps("type", "start", "end", "createdAt") 
WHERE "type" = 'assistant_message' AND "start" IS NOT NULL AND "end" IS NOT NULL;

-- Error analysis optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_steps_error_analysis 
ON steps("threadId", "isError", "createdAt", "type") 
WHERE "isError" = true;

-- User engagement analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_engagement 
ON threads("userId", "createdAt") 
INCLUDE ("id", "name");

-- ==============================================
-- TEXT SEARCH INDEXES (Optional)
-- ==============================================

-- Full-text search on step input/output (uncomment if needed)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_steps_input_fts 
-- ON steps USING GIN(to_tsvector('english', "input")) 
-- WHERE "input" IS NOT NULL;

-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_steps_output_fts 
-- ON steps USING GIN(to_tsvector('english', "output")) 
-- WHERE "output" IS NOT NULL;

-- ==============================================
-- MIGRATION VERIFICATION
-- ==============================================

-- Verify all indexes were created successfully
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND tablename IN ('users', 'threads', 'steps', 'elements', 'feedbacks')
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
