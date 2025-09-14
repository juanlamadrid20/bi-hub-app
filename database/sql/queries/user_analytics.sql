-- User Analytics Queries for BI Hub App
-- Provides insights into user engagement and behavior

-- ==============================================
-- USER ENGAGEMENT METRICS
-- ==============================================

-- Daily Active Users
SELECT 
    DATE(CAST(threads."createdAt" AS TIMESTAMP)) as activity_date,
    COUNT(DISTINCT users."identifier") as daily_active_users,
    COUNT(DISTINCT threads."id") as total_conversations
FROM users 
JOIN threads ON users."id" = threads."userId"
WHERE CAST(threads."createdAt" AS TIMESTAMP) >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(CAST(threads."createdAt" AS TIMESTAMP))
ORDER BY activity_date DESC;

-- User Session Summary
SELECT 
    users."identifier" as user_id,
    users."metadata"->>'email' as user_email,
    COUNT(DISTINCT threads."id") as total_conversations,
    COUNT(steps."id") as total_interactions,
    MIN(CAST(threads."createdAt" AS TIMESTAMP)) as first_conversation,
    MAX(CAST(threads."createdAt" AS TIMESTAMP)) as last_conversation,
    AVG(steps_per_thread.step_count) as avg_interactions_per_conversation
FROM users
LEFT JOIN threads ON users."id" = threads."userId"
LEFT JOIN steps ON threads."id" = steps."threadId"
LEFT JOIN (
    SELECT
        "threadId",
        COUNT(*) as step_count
    FROM steps
    GROUP BY "threadId"
) steps_per_thread ON threads."id" = steps_per_thread."threadId"
WHERE CAST(threads."createdAt" AS TIMESTAMP) >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY users."identifier", users."metadata"->>'email'
ORDER BY total_conversations DESC;

-- Most Active Users (Last 30 Days)
SELECT 
    users."identifier" as user_id,
    users."metadata"->>'email' as user_email,
    COUNT(DISTINCT threads."id") as conversations_started,
    COUNT(steps."id") as total_interactions,
    COUNT(DISTINCT DATE(CAST(threads."createdAt" AS TIMESTAMP))) as active_days
FROM users
JOIN threads ON users."id" = threads."userId"
JOIN steps ON threads."id" = steps."threadId"
WHERE CAST(threads."createdAt" AS TIMESTAMP) >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY users."identifier", users."metadata"->>'email'
HAVING COUNT(DISTINCT threads."id") >= 5
ORDER BY conversations_started DESC, total_interactions DESC
LIMIT 20;

-- ==============================================
-- USER RETENTION ANALYSIS
-- ==============================================

-- User Retention by Cohort (Monthly)
WITH user_cohorts AS (
    SELECT 
        users."identifier",
        DATE_TRUNC('month', MIN(CAST(threads."createdAt" AS TIMESTAMP))) as cohort_month
    FROM users
    JOIN threads ON users."id" = threads."userId"
    GROUP BY users."identifier"
),
user_activities AS (
    SELECT 
        users."identifier",
        DATE_TRUNC('month', CAST(threads."createdAt" AS TIMESTAMP)) as activity_month
    FROM users
    JOIN threads ON users."id" = threads."userId"
),
cohort_retention AS (
    SELECT 
        uc.cohort_month,
        ua.activity_month,
        COUNT(DISTINCT uc."identifier") as retained_users,
        EXTRACT(MONTH FROM AGE(ua.activity_month, uc.cohort_month)) as month_number
    FROM user_cohorts uc
    JOIN user_activities ua ON uc."identifier" = ua."identifier"
    WHERE ua.activity_month >= uc.cohort_month
    GROUP BY uc.cohort_month, ua.activity_month
)
SELECT 
    cohort_month,
    month_number,
    retained_users,
    ROUND(
        100.0 * retained_users / 
        FIRST_VALUE(retained_users) OVER (PARTITION BY cohort_month ORDER BY month_number),
        2
    ) as retention_percentage
FROM cohort_retention
ORDER BY cohort_month, month_number;
