-- Data Quality Monitoring Queries for BI Hub App
-- Comprehensive data quality checks and validation queries

-- ==============================================
-- CHAINLIT DATA QUALITY CHECKS
-- ==============================================

-- Check for data consistency and integrity issues
WITH quality_metrics AS (
    -- Users table checks
    SELECT 
        'users' as table_name,
        'missing_identifiers' as check_type,
        COUNT(*) as issue_count,
        'Users without valid identifiers' as description
    FROM users 
    WHERE "identifier" IS NULL OR "identifier" = '' OR LENGTH("identifier") < 3
    
    UNION ALL
    
    SELECT 
        'users' as table_name,
        'invalid_metadata' as check_type,
        COUNT(*) as issue_count,
        'Users with invalid JSON metadata' as description
    FROM users 
    WHERE "metadata" IS NULL OR "metadata" = '{}'::jsonb
    
    UNION ALL
    
    SELECT 
        'users' as table_name,
        'duplicate_identifiers' as check_type,
        COUNT(*) - COUNT(DISTINCT "identifier") as issue_count,
        'Duplicate user identifiers' as description
    FROM users
    
    UNION ALL
    
    -- Threads table checks
    SELECT 
        'threads' as table_name,
        'orphaned_threads' as check_type,
        COUNT(*) as issue_count,
        'Threads without valid users' as description
    FROM threads t
    LEFT JOIN users u ON t."userId" = u."id"
    WHERE t."userId" IS NOT NULL AND u."id" IS NULL
    
    UNION ALL
    
    SELECT 
        'threads' as table_name,
        'missing_timestamps' as check_type,
        COUNT(*) as issue_count,
        'Threads without creation timestamps' as description
    FROM threads
    WHERE "createdAt" IS NULL OR "createdAt" = ''
    
    UNION ALL
    
    -- Steps table checks
    SELECT 
        'steps' as table_name,
        'orphaned_steps' as check_type,
        COUNT(*) as issue_count,
        'Steps without valid threads' as description
    FROM steps s
    LEFT JOIN threads t ON s."threadId" = t."id"
    WHERE t."id" IS NULL
    
    UNION ALL
    
    SELECT 
        'steps' as table_name,
        'invalid_step_types' as check_type,
        COUNT(*) as issue_count,
        'Steps with invalid or missing types' as description
    FROM steps
    WHERE "type" IS NULL OR "type" = '' 
        OR "type" NOT IN ('user_message', 'assistant_message', 'system_message', 'tool_call', 'tool_result')
    
    UNION ALL
    
    SELECT 
        'steps' as table_name,
        'missing_content' as check_type,
        COUNT(*) as issue_count,
        'Steps without input or output content' as description
    FROM steps
    WHERE ("input" IS NULL OR "input" = '') AND ("output" IS NULL OR "output" = '')
    
    UNION ALL
    
    SELECT 
        'steps' as table_name,
        'timing_inconsistencies' as check_type,
        COUNT(*) as issue_count,
        'Steps with invalid timing (end before start)' as description
    FROM steps
    WHERE "start" IS NOT NULL AND "end" IS NOT NULL 
        AND "end"::timestamp < "start"::timestamp
    
    UNION ALL
    
    -- Feedbacks table checks
    SELECT 
        'feedbacks' as table_name,
        'invalid_feedback_values' as check_type,
        COUNT(*) as issue_count,
        'Feedbacks with invalid rating values' as description
    FROM feedbacks
    WHERE "value" NOT BETWEEN 1 AND 5
    
    UNION ALL
    
    SELECT 
        'feedbacks' as table_name,
        'orphaned_feedbacks' as check_type,
        COUNT(*) as issue_count,
        'Feedbacks without valid threads' as description
    FROM feedbacks f
    LEFT JOIN threads t ON f."threadId" = t."id"
    WHERE t."id" IS NULL
    
    UNION ALL
    
    -- Elements table checks
    SELECT 
        'elements' as table_name,
        'orphaned_elements' as check_type,
        COUNT(*) as issue_count,
        'Elements without valid threads' as description
    FROM elements e
    LEFT JOIN threads t ON e."threadId" = t."id"
    WHERE e."threadId" IS NOT NULL AND t."id" IS NULL
)
SELECT 
    table_name,
    check_type,
    issue_count,
    description,
    CASE 
        WHEN issue_count = 0 THEN 'PASS'
        WHEN issue_count <= 10 THEN 'WARNING'
        ELSE 'FAIL'
    END as status,
    CURRENT_TIMESTAMP as check_timestamp
FROM quality_metrics
ORDER BY table_name, issue_count DESC;

-- ==============================================
-- DATA FRESHNESS MONITORING
-- ==============================================

-- Check data freshness and recent activity
SELECT 
    'users' as table_name,
    COUNT(*) as total_records,
    MAX("createdAt") as latest_record,
    MIN("createdAt") as earliest_record,
    COUNT(CASE WHEN "createdAt" >= CURRENT_DATE - INTERVAL '1 day' THEN 1 END) as records_last_24h,
    COUNT(CASE WHEN "createdAt" >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as records_last_7d,
    CASE 
        WHEN MAX("createdAt") >= CURRENT_DATE - INTERVAL '1 day' THEN 'FRESH'
        WHEN MAX("createdAt") >= CURRENT_DATE - INTERVAL '7 days' THEN 'RECENT'
        WHEN MAX("createdAt") >= CURRENT_DATE - INTERVAL '30 days' THEN 'STALE'
        ELSE 'VERY_STALE'
    END as freshness_status
FROM users
UNION ALL
SELECT 
    'threads' as table_name,
    COUNT(*) as total_records,
    MAX("createdAt") as latest_record,
    MIN("createdAt") as earliest_record,
    COUNT(CASE WHEN "createdAt" >= CURRENT_DATE - INTERVAL '1 day' THEN 1 END) as records_last_24h,
    COUNT(CASE WHEN "createdAt" >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as records_last_7d,
    CASE 
        WHEN MAX("createdAt") >= CURRENT_DATE - INTERVAL '1 day' THEN 'FRESH'
        WHEN MAX("createdAt") >= CURRENT_DATE - INTERVAL '7 days' THEN 'RECENT'
        WHEN MAX("createdAt") >= CURRENT_DATE - INTERVAL '30 days' THEN 'STALE'
        ELSE 'VERY_STALE'
    END as freshness_status
FROM threads
UNION ALL
SELECT 
    'steps' as table_name,
    COUNT(*) as total_records,
    MAX("createdAt") as latest_record,
    MIN("createdAt") as earliest_record,
    COUNT(CASE WHEN "createdAt" >= CURRENT_DATE - INTERVAL '1 day' THEN 1 END) as records_last_24h,
    COUNT(CASE WHEN "createdAt" >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as records_last_7d,
    CASE 
        WHEN MAX("createdAt") >= CURRENT_DATE - INTERVAL '1 day' THEN 'FRESH'
        WHEN MAX("createdAt") >= CURRENT_DATE - INTERVAL '7 days' THEN 'RECENT'
        WHEN MAX("createdAt") >= CURRENT_DATE - INTERVAL '30 days' THEN 'STALE'
        ELSE 'VERY_STALE'
    END as freshness_status
FROM steps;

-- ==============================================
-- STATISTICAL OUTLIER DETECTION
-- ==============================================

-- Detect statistical outliers in conversation patterns
WITH conversation_stats AS (
    SELECT 
        threads."id" as thread_id,
        COUNT(steps."id") as step_count,
        EXTRACT(EPOCH FROM (MAX(steps."createdAt")::timestamp - MIN(steps."createdAt")::timestamp)) / 60 as duration_minutes,
        AVG(LENGTH(steps."input")) as avg_input_length,
        AVG(LENGTH(steps."output")) as avg_output_length
    FROM threads
    LEFT JOIN steps ON threads."id" = steps."threadId"
    WHERE CAST(threads."createdAt" AS TIMESTAMP) >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY threads."id"
),
stats_summary AS (
    SELECT 
        AVG(step_count) as avg_steps,
        STDDEV(step_count) as stddev_steps,
        AVG(duration_minutes) as avg_duration,
        STDDEV(duration_minutes) as stddev_duration,
        AVG(avg_input_length) as avg_input_len,
        STDDEV(avg_input_length) as stddev_input_len,
        AVG(avg_output_length) as avg_output_len,
        STDDEV(avg_output_length) as stddev_output_len
    FROM conversation_stats
    WHERE step_count > 0
)
SELECT 
    cs.thread_id,
    cs.step_count,
    cs.duration_minutes,
    cs.avg_input_length,
    cs.avg_output_length,
    CASE 
        WHEN ABS(cs.step_count - ss.avg_steps) > 3 * ss.stddev_steps THEN 'OUTLIER_STEPS'
        WHEN ABS(cs.duration_minutes - ss.avg_duration) > 3 * ss.stddev_duration THEN 'OUTLIER_DURATION'
        WHEN ABS(cs.avg_input_length - ss.avg_input_len) > 3 * ss.stddev_input_len THEN 'OUTLIER_INPUT_LENGTH'
        WHEN ABS(cs.avg_output_length - ss.avg_output_len) > 3 * ss.stddev_output_len THEN 'OUTLIER_OUTPUT_LENGTH'
        ELSE 'NORMAL'
    END as outlier_type
FROM conversation_stats cs
CROSS JOIN stats_summary ss
WHERE cs.step_count > 0
    AND (
        ABS(cs.step_count - ss.avg_steps) > 3 * ss.stddev_steps
        OR ABS(cs.duration_minutes - ss.avg_duration) > 3 * ss.stddev_duration
        OR ABS(cs.avg_input_length - ss.avg_input_len) > 3 * ss.stddev_input_len
        OR ABS(cs.avg_output_length - ss.avg_output_len) > 3 * ss.stddev_output_len
    )
ORDER BY cs.step_count DESC, cs.duration_minutes DESC;

-- ==============================================
-- COMPREHENSIVE DATA QUALITY REPORT
-- ==============================================

-- Generate overall data quality score
WITH quality_scores AS (
    SELECT 
        'Data Completeness' as category,
        ROUND(
            100.0 * (
                (SELECT COUNT(*) FROM users WHERE "identifier" IS NOT NULL AND "identifier" != '') +
                (SELECT COUNT(*) FROM threads WHERE "createdAt" IS NOT NULL) +
                (SELECT COUNT(*) FROM steps WHERE "input" IS NOT NULL OR "output" IS NOT NULL)
            ) / (
                (SELECT COUNT(*) FROM users) +
                (SELECT COUNT(*) FROM threads) +
                (SELECT COUNT(*) FROM steps)
            ), 2
        ) as score
    
    UNION ALL
    
    SELECT 
        'Data Consistency' as category,
        ROUND(
            100.0 * (1.0 - (
                (SELECT COUNT(*) FROM steps s LEFT JOIN threads t ON s."threadId" = t."id" WHERE t."id" IS NULL) +
                (SELECT COUNT(*) FROM threads th LEFT JOIN users u ON th."userId" = u."id" WHERE th."userId" IS NOT NULL AND u."id" IS NULL) +
                (SELECT COUNT(*) FROM feedbacks f LEFT JOIN threads t ON f."threadId" = t."id" WHERE t."id" IS NULL)
            )::float / (
                (SELECT COUNT(*) FROM steps) +
                (SELECT COUNT(*) FROM threads) +
                (SELECT COUNT(*) FROM feedbacks)
            )), 2
        ) as score
    
    UNION ALL
    
    SELECT 
        'Data Validity' as category,
        ROUND(
            100.0 * (
                (SELECT COUNT(*) FROM steps WHERE "type" IN ('user_message', 'assistant_message', 'system_message', 'tool_call', 'tool_result')) +
                (SELECT COUNT(*) FROM feedbacks WHERE "value" BETWEEN 1 AND 5)
            )::float / (
                (SELECT COUNT(*) FROM steps) +
                (SELECT COUNT(*) FROM feedbacks)
            ), 2
        ) as score
)
SELECT 
    category,
    score,
    CASE 
        WHEN score >= 95 THEN 'EXCELLENT'
        WHEN score >= 90 THEN 'GOOD'
        WHEN score >= 80 THEN 'FAIR'
        ELSE 'POOR'
    END as rating,
    CURRENT_TIMESTAMP as report_timestamp
FROM quality_scores
UNION ALL
SELECT 
    'Overall Quality Score' as category,
    ROUND(AVG(score), 2) as score,
    CASE 
        WHEN AVG(score) >= 95 THEN 'EXCELLENT'
        WHEN AVG(score) >= 90 THEN 'GOOD'
        WHEN AVG(score) >= 80 THEN 'FAIR'
        ELSE 'POOR'
    END as rating,
    CURRENT_TIMESTAMP as report_timestamp
FROM quality_scores;
