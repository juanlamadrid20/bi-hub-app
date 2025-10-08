-- System Health and Performance Queries for BI Hub App
-- Monitor system performance, database health, and operational metrics

-- ==============================================
-- DATABASE HEALTH CHECKS
-- ==============================================

-- Table Size and Row Count Monitoring
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as data_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size,
    (SELECT reltuples::bigint FROM pg_class WHERE relname = tablename) as estimated_row_count
FROM pg_tables 
WHERE schemaname = 'public'
    AND tablename IN ('users', 'threads', 'steps', 'elements', 'feedbacks')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Connection and Performance Stats
SELECT 
    'Active Connections' as metric,
    COUNT(*) as value
FROM pg_stat_activity
WHERE state = 'active'
UNION ALL
SELECT 
    'Total Connections' as metric,
    COUNT(*) as value
FROM pg_stat_activity
UNION ALL
SELECT 
    'Database Size' as metric,
    pg_size_pretty(pg_database_size(current_database()))::text as value;

-- Index Usage Analysis
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read as index_reads,
    idx_tup_fetch as index_fetches,
    CASE 
        WHEN idx_tup_read > 0 
        THEN ROUND(100.0 * idx_tup_fetch / idx_tup_read, 2)
        ELSE 0 
    END as index_hit_rate_percent
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
    AND tablename IN ('users', 'threads', 'steps', 'elements', 'feedbacks')
ORDER BY index_reads DESC;

-- ==============================================
-- SYSTEM PERFORMANCE MONITORING
-- ==============================================

-- Query Performance (requires pg_stat_statements extension)
-- Uncomment if pg_stat_statements is available
/*
SELECT 
    SUBSTRING(query, 1, 100) as query_preview,
    calls,
    total_time,
    mean_time,
    max_time,
    stddev_time,
    ROUND((total_time / sum(total_time) OVER()) * 100, 2) as percent_total_time
FROM pg_stat_statements
WHERE query ILIKE '%users%' OR query ILIKE '%threads%' OR query ILIKE '%steps%'
ORDER BY total_time DESC
LIMIT 20;
*/

-- Lock Monitoring
SELECT 
    pg_stat_activity.pid,
    pg_stat_activity.usename,
    pg_locks.mode,
    pg_locks.locktype,
    pg_locks.relation::regclass as relation,
    pg_stat_activity.query,
    pg_stat_activity.state,
    now() - pg_stat_activity.query_start as query_duration
FROM pg_locks
JOIN pg_stat_activity ON pg_locks.pid = pg_stat_activity.pid
WHERE pg_locks.granted = false
ORDER BY query_duration DESC;

-- ==============================================
-- APPLICATION HEALTH METRICS
-- ==============================================

-- Data Freshness Check
SELECT 
    'users' as table_name,
    COUNT(*) as total_records,
    MAX("createdAt") as latest_record,
    MIN("createdAt") as earliest_record,
    COUNT(CASE WHEN CAST("createdAt" AS TIMESTAMP) >= CURRENT_DATE - INTERVAL '1 day' THEN 1 END) as records_last_24h
FROM users
UNION ALL
SELECT 
    'threads' as table_name,
    COUNT(*) as total_records,
    MAX("createdAt") as latest_record,
    MIN("createdAt") as earliest_record,
    COUNT(CASE WHEN CAST("createdAt" AS TIMESTAMP) >= CURRENT_DATE - INTERVAL '1 day' THEN 1 END) as records_last_24h
FROM threads
UNION ALL
SELECT 
    'steps' as table_name,
    COUNT(*) as total_records,
    MAX("createdAt") as latest_record,
    MIN("createdAt") as earliest_record,
    COUNT(CASE WHEN CAST("createdAt" AS TIMESTAMP) >= CURRENT_DATE - INTERVAL '1 day' THEN 1 END) as records_last_24h
FROM steps;

-- Data Quality Checks
SELECT 
    'Orphaned Steps (no thread)' as check_name,
    COUNT(*) as issue_count
FROM steps s
LEFT JOIN threads t ON s."threadId" = t."id"
WHERE t."id" IS NULL
UNION ALL
SELECT 
    'Orphaned Threads (no user)' as check_name,
    COUNT(*) as issue_count
FROM threads th
LEFT JOIN users u ON th."userId" = u."id"
WHERE u."id" IS NULL AND th."userId" IS NOT NULL
UNION ALL
SELECT 
    'Steps without timestamps' as check_name,
    COUNT(*) as issue_count
FROM steps
WHERE "createdAt" IS NULL
UNION ALL
SELECT 
    'Users without identifiers' as check_name,
    COUNT(*) as issue_count
FROM users
WHERE "identifier" IS NULL OR "identifier" = '';

-- ==============================================
-- CAPACITY PLANNING
-- ==============================================

-- Growth Rate Analysis (30-day trend)
WITH daily_counts AS (
    SELECT 
        DATE(CAST(threads."createdAt" AS TIMESTAMP)) as date,
        COUNT(*) as new_threads,
        COUNT(DISTINCT threads."userId") as active_users
    FROM threads
    WHERE CAST(threads."createdAt" AS TIMESTAMP) >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY DATE(CAST(threads."createdAt" AS TIMESTAMP))
),
growth_metrics AS (
    SELECT 
        date,
        new_threads,
        active_users,
        LAG(new_threads, 7) OVER (ORDER BY date) as threads_7_days_ago,
        LAG(active_users, 7) OVER (ORDER BY date) as users_7_days_ago
    FROM daily_counts
)
SELECT 
    date,
    new_threads,
    active_users,
    CASE 
        WHEN threads_7_days_ago > 0 
        THEN ROUND(100.0 * (new_threads - threads_7_days_ago) / threads_7_days_ago, 2)
        ELSE NULL 
    END as thread_growth_rate_7d_percent,
    CASE 
        WHEN users_7_days_ago > 0 
        THEN ROUND(100.0 * (active_users - users_7_days_ago) / users_7_days_ago, 2)
        ELSE NULL 
    END as user_growth_rate_7d_percent
FROM growth_metrics
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC;
