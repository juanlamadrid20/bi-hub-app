-- Maintenance Procedures for BI Hub App
-- Database maintenance, cleanup, and optimization procedures

-- ==============================================
-- DATA CLEANUP PROCEDURES
-- ==============================================

-- Clean up old conversation data (older than specified retention period)
-- Usage: SELECT cleanup_old_conversations('90 days');
CREATE OR REPLACE FUNCTION cleanup_old_conversations(retention_period INTERVAL DEFAULT '180 days')
RETURNS TABLE(
    deleted_feedbacks INTEGER,
    deleted_elements INTEGER,
    deleted_steps INTEGER,
    deleted_threads INTEGER,
    cleanup_timestamp TIMESTAMP
) AS $$
DECLARE
    cutoff_date TIMESTAMP;
    feedbacks_deleted INTEGER;
    elements_deleted INTEGER;
    steps_deleted INTEGER;
    threads_deleted INTEGER;
BEGIN
    cutoff_date := CURRENT_TIMESTAMP - retention_period;
    
    -- Delete in correct order to respect foreign key constraints
    
    -- Delete feedbacks
    DELETE FROM feedbacks 
    WHERE "threadId" IN (
        SELECT "id" FROM threads WHERE CAST("createdAt" AS TIMESTAMP) < cutoff_date
    );
    GET DIAGNOSTICS feedbacks_deleted = ROW_COUNT;
    
    -- Delete elements
    DELETE FROM elements 
    WHERE "threadId" IN (
        SELECT "id" FROM threads WHERE CAST("createdAt" AS TIMESTAMP) < cutoff_date
    );
    GET DIAGNOSTICS elements_deleted = ROW_COUNT;
    
    -- Delete steps
    DELETE FROM steps 
    WHERE "threadId" IN (
        SELECT "id" FROM threads WHERE CAST("createdAt" AS TIMESTAMP) < cutoff_date
    );
    GET DIAGNOSTICS steps_deleted = ROW_COUNT;
    
    -- Delete threads
    DELETE FROM threads WHERE CAST("createdAt" AS TIMESTAMP) < cutoff_date;
    GET DIAGNOSTICS threads_deleted = ROW_COUNT;
    
    RETURN QUERY SELECT 
        feedbacks_deleted,
        elements_deleted,
        steps_deleted,
        threads_deleted,
        CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Clean up orphaned records
CREATE OR REPLACE FUNCTION cleanup_orphaned_records()
RETURNS TABLE(
    orphaned_steps INTEGER,
    orphaned_feedbacks INTEGER,
    orphaned_elements INTEGER,
    cleanup_timestamp TIMESTAMP
) AS $$
DECLARE
    steps_deleted INTEGER;
    feedbacks_deleted INTEGER;
    elements_deleted INTEGER;
BEGIN
    -- Delete orphaned steps (steps without valid threads)
    DELETE FROM steps 
    WHERE "threadId" NOT IN (SELECT "id" FROM threads);
    GET DIAGNOSTICS steps_deleted = ROW_COUNT;
    
    -- Delete orphaned feedbacks
    DELETE FROM feedbacks 
    WHERE "threadId" NOT IN (SELECT "id" FROM threads);
    GET DIAGNOSTICS feedbacks_deleted = ROW_COUNT;
    
    -- Delete orphaned elements
    DELETE FROM elements 
    WHERE "threadId" IS NOT NULL 
        AND "threadId" NOT IN (SELECT "id" FROM threads);
    GET DIAGNOSTICS elements_deleted = ROW_COUNT;
    
    RETURN QUERY SELECT 
        steps_deleted,
        feedbacks_deleted,
        elements_deleted,
        CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- PERFORMANCE OPTIMIZATION PROCEDURES
-- ==============================================

-- Analyze and update table statistics
CREATE OR REPLACE FUNCTION update_table_statistics()
RETURNS TABLE(
    table_name TEXT,
    analysis_timestamp TIMESTAMP
) AS $$
BEGIN
    ANALYZE users;
    RETURN QUERY SELECT 'users'::TEXT, CURRENT_TIMESTAMP;
    
    ANALYZE threads;
    RETURN QUERY SELECT 'threads'::TEXT, CURRENT_TIMESTAMP;
    
    ANALYZE steps;
    RETURN QUERY SELECT 'steps'::TEXT, CURRENT_TIMESTAMP;
    
    ANALYZE elements;
    RETURN QUERY SELECT 'elements'::TEXT, CURRENT_TIMESTAMP;
    
    ANALYZE feedbacks;
    RETURN QUERY SELECT 'feedbacks'::TEXT, CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Reindex tables for optimal performance
CREATE OR REPLACE FUNCTION reindex_tables()
RETURNS TABLE(
    table_name TEXT,
    reindex_timestamp TIMESTAMP
) AS $$
BEGIN
    REINDEX TABLE users;
    RETURN QUERY SELECT 'users'::TEXT, CURRENT_TIMESTAMP;
    
    REINDEX TABLE threads;
    RETURN QUERY SELECT 'threads'::TEXT, CURRENT_TIMESTAMP;
    
    REINDEX TABLE steps;
    RETURN QUERY SELECT 'steps'::TEXT, CURRENT_TIMESTAMP;
    
    REINDEX TABLE elements;
    RETURN QUERY SELECT 'elements'::TEXT, CURRENT_TIMESTAMP;
    
    REINDEX TABLE feedbacks;
    RETURN QUERY SELECT 'feedbacks'::TEXT, CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- DATA VALIDATION PROCEDURES
-- ==============================================

-- Validate data integrity and fix common issues
CREATE OR REPLACE FUNCTION validate_and_fix_data()
RETURNS TABLE(
    issue_type TEXT,
    records_affected INTEGER,
    action_taken TEXT,
    fix_timestamp TIMESTAMP
) AS $$
DECLARE
    affected_count INTEGER;
BEGIN
    -- Fix missing createdAt timestamps for threads
    UPDATE threads 
    SET "createdAt" = (
        SELECT MIN(steps."createdAt") 
        FROM steps 
        WHERE steps."threadId" = threads."id"
    )
    WHERE "createdAt" IS NULL OR "createdAt" = '';
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    
    IF affected_count > 0 THEN
        RETURN QUERY SELECT 
            'missing_thread_timestamps'::TEXT,
            affected_count,
            'Set createdAt from earliest step'::TEXT,
            CURRENT_TIMESTAMP;
    END IF;
    
    -- Fix missing step timestamps
    UPDATE steps 
    SET "createdAt" = (
        SELECT threads."createdAt" 
        FROM threads 
        WHERE threads."id" = steps."threadId"
    )
    WHERE "createdAt" IS NULL OR "createdAt" = '';
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    
    IF affected_count > 0 THEN
        RETURN QUERY SELECT 
            'missing_step_timestamps'::TEXT,
            affected_count,
            'Set createdAt from thread'::TEXT,
            CURRENT_TIMESTAMP;
    END IF;
    
    -- Validate and fix invalid feedback values
    UPDATE feedbacks 
    SET "value" = CASE 
        WHEN "value" < 1 THEN 1
        WHEN "value" > 5 THEN 5
        ELSE "value"
    END
    WHERE "value" NOT BETWEEN 1 AND 5;
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    
    IF affected_count > 0 THEN
        RETURN QUERY SELECT 
            'invalid_feedback_values'::TEXT,
            affected_count,
            'Clamped values to 1-5 range'::TEXT,
            CURRENT_TIMESTAMP;
    END IF;
    
    RETURN QUERY SELECT 
        'validation_complete'::TEXT,
        0,
        'All checks passed'::TEXT,
        CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- BACKUP AND ARCHIVAL PROCEDURES
-- ==============================================

-- Create summary statistics before archiving old data
CREATE OR REPLACE FUNCTION create_archive_summary(archive_date TIMESTAMP)
RETURNS TABLE(
    metric_name TEXT,
    metric_value BIGINT,
    archive_period TEXT,
    summary_timestamp TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        'total_users_archived'::TEXT,
        COUNT(DISTINCT t."userId")::BIGINT,
        'before_' || archive_date::DATE::TEXT,
        CURRENT_TIMESTAMP
    FROM threads t
    WHERE t."createdAt"::timestamp < archive_date
    
    UNION ALL
    
    SELECT 
        'total_conversations_archived'::TEXT,
        COUNT(*)::BIGINT,
        'before_' || archive_date::DATE::TEXT,
        CURRENT_TIMESTAMP
    FROM threads
    WHERE "createdAt"::timestamp < archive_date
    
    UNION ALL
    
    SELECT 
        'total_interactions_archived'::TEXT,
        COUNT(*)::BIGINT,
        'before_' || archive_date::DATE::TEXT,
        CURRENT_TIMESTAMP
    FROM steps s
    JOIN threads t ON s."threadId" = t."id"
    WHERE t."createdAt"::timestamp < archive_date
    
    UNION ALL
    
    SELECT 
        'total_feedback_archived'::TEXT,
        COUNT(*)::BIGINT,
        'before_' || archive_date::DATE::TEXT,
        CURRENT_TIMESTAMP
    FROM feedbacks f
    JOIN threads t ON f."threadId" = t."id"
    WHERE t."createdAt"::timestamp < archive_date;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- MONITORING AND ALERTING PROCEDURES
-- ==============================================

-- Check system health and return alerts
CREATE OR REPLACE FUNCTION system_health_check()
RETURNS TABLE(
    alert_level TEXT,
    alert_message TEXT,
    metric_value NUMERIC,
    threshold_value NUMERIC,
    check_timestamp TIMESTAMP
) AS $$
DECLARE
    error_rate NUMERIC;
    avg_response_time NUMERIC;
    recent_activity_count BIGINT;
BEGIN
    -- Check error rate in last 24 hours
    SELECT 
        CASE 
            WHEN COUNT(*) > 0 
            THEN 100.0 * COUNT(CASE WHEN "isError" = true THEN 1 END) / COUNT(*)
            ELSE 0 
        END
    INTO error_rate
    FROM steps 
    WHERE "createdAt"::timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours';
    
    IF error_rate > 5 THEN
        RETURN QUERY SELECT 
            'WARNING'::TEXT,
            'High error rate detected'::TEXT,
            error_rate,
            5.0::NUMERIC,
            CURRENT_TIMESTAMP;
    END IF;
    
    -- Check average response time
    SELECT 
        AVG(EXTRACT(EPOCH FROM ("end"::timestamp - "start"::timestamp)))
    INTO avg_response_time
    FROM steps 
    WHERE "type" = 'assistant_message'
        AND "start" IS NOT NULL 
        AND "end" IS NOT NULL
        AND CAST("createdAt" AS TIMESTAMP) >= CURRENT_TIMESTAMP - INTERVAL '24 hours';
    
    IF avg_response_time > 30 THEN
        RETURN QUERY SELECT 
            'WARNING'::TEXT,
            'Slow response times detected'::TEXT,
            avg_response_time,
            30.0::NUMERIC,
            CURRENT_TIMESTAMP;
    END IF;
    
    -- Check for recent activity
    SELECT COUNT(*) 
    INTO recent_activity_count
    FROM threads 
    WHERE CAST("createdAt" AS TIMESTAMP) >= CURRENT_TIMESTAMP - INTERVAL '1 hour';
    
    IF recent_activity_count = 0 THEN
        RETURN QUERY SELECT 
            'INFO'::TEXT,
            'No recent activity detected'::TEXT,
            recent_activity_count::NUMERIC,
            1.0::NUMERIC,
            CURRENT_TIMESTAMP;
    END IF;
    
    -- If no issues found
    IF error_rate <= 5 AND avg_response_time <= 30 AND recent_activity_count > 0 THEN
        RETURN QUERY SELECT 
            'OK'::TEXT,
            'All systems healthy'::TEXT,
            NULL::NUMERIC,
            NULL::NUMERIC,
            CURRENT_TIMESTAMP;
    END IF;
END;
$$ LANGUAGE plpgsql;
