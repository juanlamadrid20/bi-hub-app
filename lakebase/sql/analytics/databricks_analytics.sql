-- Databricks-Specific Analytics Queries for BI Hub App
-- Advanced analytics using Databricks SQL features and functions

-- ==============================================
-- TIME SERIES ANALYSIS
-- ==============================================

-- Daily conversation trends with 7-day moving average
WITH daily_stats AS (
    SELECT 
        DATE(threads."createdAt"::timestamp) as conversation_date,
        COUNT(DISTINCT threads."id") as daily_conversations,
        COUNT(DISTINCT threads."userId") as daily_active_users,
        COUNT(steps."id") as daily_interactions,
        AVG(
            CASE
                WHEN steps."type" = 'assistant_message'
                    AND steps."end" IS NOT NULL
                    AND steps."start" IS NOT NULL
                THEN EXTRACT(EPOCH FROM (steps."end"::timestamp - steps."start"::timestamp))
                ELSE NULL
            END
        ) as avg_response_time
    FROM threads
    LEFT JOIN steps ON threads."id" = steps."threadId"
    WHERE threads."createdAt"::timestamp >= CURRENT_DATE - INTERVAL '60 days'
    GROUP BY DATE(threads."createdAt"::timestamp)
)
SELECT 
    conversation_date,
    daily_conversations,
    daily_active_users,
    daily_interactions,
    avg_response_time,
    AVG(daily_conversations) OVER (
        ORDER BY conversation_date 
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) as conversations_7day_ma,
    AVG(daily_active_users) OVER (
        ORDER BY conversation_date 
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) as users_7day_ma,
    AVG(avg_response_time) OVER (
        ORDER BY conversation_date 
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) as response_time_7day_ma
FROM daily_stats
ORDER BY conversation_date;

-- ==============================================
-- USER SEGMENTATION AND COHORT ANALYSIS
-- ==============================================

-- RFM Analysis (Recency, Frequency, Monetary - adapted for chat app)
WITH user_metrics AS (
    SELECT
        users.identifier as user_id,
        users.metadata['email'] as user_email,
        MAX(threads."createdAt") as last_conversation_date,
        COUNT(DISTINCT threads.id) as total_conversations,
        COUNT(steps.id) as total_interactions,
        (CURRENT_DATE - MAX(CAST(threads."createdAt" AS DATE))) as days_since_last_conversation
    FROM users
    LEFT JOIN threads ON users.id = threads."userId"
    LEFT JOIN steps ON threads.id = steps."threadId"
    WHERE CAST(threads."createdAt" AS DATE) >= CURRENT_DATE - INTERVAL '180 days'
    GROUP BY users.identifier, users.metadata['email']
),
rfm_scores AS (
    SELECT
        user_id,
        user_email,
        last_conversation_date,
        total_conversations,
        total_interactions,
        days_since_last_conversation,
        CASE
            WHEN days_since_last_conversation <= 7 THEN 5
            WHEN days_since_last_conversation <= 30 THEN 4
            WHEN days_since_last_conversation <= 60 THEN 3
            WHEN days_since_last_conversation <= 90 THEN 2
            ELSE 1
        END as recency_score,
        CASE
            WHEN total_conversations >= 20 THEN 5
            WHEN total_conversations >= 10 THEN 4
            WHEN total_conversations >= 5 THEN 3
            WHEN total_conversations >= 2 THEN 2
            ELSE 1
        END as frequency_score,
        CASE
            WHEN total_interactions >= 100 THEN 5
            WHEN total_interactions >= 50 THEN 4
            WHEN total_interactions >= 20 THEN 3
            WHEN total_interactions >= 10 THEN 2
            ELSE 1
        END as engagement_score
    FROM user_metrics
    WHERE total_conversations > 0
)
SELECT
    user_id,
    user_email,
    recency_score,
    frequency_score,
    engagement_score,
    CASE
        WHEN recency_score >= 4 AND frequency_score >= 4 AND engagement_score >= 4 THEN 'Champions'
        WHEN recency_score >= 3 AND frequency_score >= 3 AND engagement_score >= 3 THEN 'Loyal Users'
        WHEN recency_score >= 4 AND frequency_score <= 2 THEN 'New Users'
        WHEN recency_score <= 2 AND frequency_score >= 3 THEN 'At Risk'
        WHEN recency_score <= 2 AND frequency_score <= 2 AND engagement_score >= 3 THEN 'Cannot Lose Them'
        WHEN recency_score <= 2 AND frequency_score <= 2 AND engagement_score <= 2 THEN 'Lost Users'
        WHEN recency_score >= 3 AND frequency_score <= 3 AND engagement_score <= 3 THEN 'Potential Loyalists'
        ELSE 'Others'
    END as user_segment,
    total_conversations,
    total_interactions,
    days_since_last_conversation
FROM rfm_scores
ORDER BY recency_score DESC, frequency_score DESC, engagement_score DESC;

-- ==============================================
-- CONVERSATION FLOW ANALYSIS
-- ==============================================

-- Conversation funnel analysis (where do users drop off?)
WITH conversation_flows AS (
    SELECT 
        threads."id" as thread_id,
        users."identifier" as user_id,
        COUNT(steps."id") as total_steps,
        COUNT(CASE WHEN steps."type" = 'user_message' THEN 1 END) as user_messages,
        COUNT(CASE WHEN steps."type" = 'assistant_message' THEN 1 END) as assistant_responses,
        COUNT(CASE WHEN steps."isError" = true THEN 1 END) as error_count,
        MAX(steps."createdAt") as last_interaction,
        MIN(steps."createdAt") as first_interaction,
        EXTRACT(MINUTES FROM (MAX(steps."createdAt")::timestamp - MIN(steps."createdAt")::timestamp)) as conversation_duration_minutes
    FROM threads
    JOIN users ON threads."userId" = users."id"
    LEFT JOIN steps ON threads."id" = steps."threadId"
    WHERE CAST(threads."createdAt" AS TIMESTAMP) >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY threads."id", users."identifier"
),
flow_stages AS (
    SELECT 
        'Started Conversation' as stage,
        COUNT(*) as user_count,
        1 as stage_order
    FROM conversation_flows
    WHERE total_steps >= 1
    
    UNION ALL
    
    SELECT 
        'Engaged (2+ interactions)' as stage,
        COUNT(*) as user_count,
        2 as stage_order
    FROM conversation_flows
    WHERE total_steps >= 2
    
    UNION ALL
    
    SELECT 
        'Active Discussion (5+ interactions)' as stage,
        COUNT(*) as user_count,
        3 as stage_order
    FROM conversation_flows
    WHERE total_steps >= 5
    
    UNION ALL
    
    SELECT 
        'Extended Conversation (10+ interactions)' as stage,
        COUNT(*) as user_count,
        4 as stage_order
    FROM conversation_flows
    WHERE total_steps >= 10
    
    UNION ALL
    
    SELECT 
        'Power User (20+ interactions)' as stage,
        COUNT(*) as user_count,
        5 as stage_order
    FROM conversation_flows
    WHERE total_steps >= 20
)
SELECT 
    stage,
    user_count,
    LAG(user_count) OVER (ORDER BY stage_order) as previous_stage_count,
    CASE 
        WHEN LAG(user_count) OVER (ORDER BY stage_order) > 0
        THEN ROUND(100.0 * user_count / LAG(user_count) OVER (ORDER BY stage_order), 2)
        ELSE 100.0
    END as conversion_rate_percent,
    CASE 
        WHEN LAG(user_count) OVER (ORDER BY stage_order) > 0
        THEN LAG(user_count) OVER (ORDER BY stage_order) - user_count
        ELSE 0
    END as drop_off_count
FROM flow_stages
ORDER BY stage_order;

-- ==============================================
-- PREDICTIVE ANALYTICS
-- ==============================================

-- User churn prediction based on activity patterns
WITH user_activity_features AS (
    SELECT 
        users."identifier" as user_id,
        COUNT(DISTINCT threads."id") as total_conversations,
        COUNT(steps."id") as total_interactions,
        AVG(conversation_lengths.steps_per_conversation) as avg_conversation_length,
        STDDEV(conversation_lengths.steps_per_conversation) as conversation_length_variance,
        MAX(threads."createdAt") as last_activity_date,
        MIN(threads."createdAt") as first_activity_date,
        EXTRACT(DAYS FROM (MAX(threads."createdAt")::timestamp - MIN(threads."createdAt")::timestamp)) as user_lifetime_days,
        COUNT(CASE WHEN steps."isError" = true THEN 1 END) as total_errors,
        COUNT(feedbacks."id") as total_feedback_given,
        AVG(feedbacks."value") as avg_feedback_score
    FROM users
    LEFT JOIN threads ON users."id" = threads."userId"
    LEFT JOIN steps ON threads."id" = steps."threadId"
    LEFT JOIN feedbacks ON threads."id" = feedbacks."threadId"
    LEFT JOIN (
        SELECT 
            "threadId",
            COUNT(*) as steps_per_conversation
        FROM steps
        GROUP BY "threadId"
    ) conversation_lengths ON threads."id" = conversation_lengths."threadId"
    WHERE CAST(threads."createdAt" AS TIMESTAMP) >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY users."identifier"
    HAVING COUNT(DISTINCT threads."id") > 0
)
SELECT 
    user_id,
    total_conversations,
    total_interactions,
    avg_conversation_length,
    conversation_length_variance,
    last_activity_date,
    EXTRACT(DAYS FROM (CURRENT_DATE - last_activity_date::date)) as days_since_last_activity,
    user_lifetime_days,
    total_errors,
    total_feedback_given,
    avg_feedback_score,
    -- Churn risk scoring
    CASE 
        WHEN EXTRACT(DAYS FROM (CURRENT_DATE - last_activity_date::date)) > 30 THEN 'High Risk'
        WHEN EXTRACT(DAYS FROM (CURRENT_DATE - last_activity_date::date)) > 14 THEN 'Medium Risk'
        WHEN EXTRACT(DAYS FROM (CURRENT_DATE - last_activity_date::date)) > 7 THEN 'Low Risk'
        ELSE 'Active'
    END as churn_risk_category,
    -- Engagement health score (0-100)
    ROUND(
        (CASE WHEN total_conversations > 0 THEN LEAST(total_conversations * 10, 30) ELSE 0 END) +
        (CASE WHEN avg_conversation_length > 0 THEN LEAST(avg_conversation_length * 5, 25) ELSE 0 END) +
        (CASE WHEN days_since_last_activity <= 7 THEN 25 WHEN days_since_last_activity <= 14 THEN 15 WHEN days_since_last_activity <= 30 THEN 5 ELSE 0 END) +
        (CASE WHEN avg_feedback_score >= 4 THEN 20 WHEN avg_feedback_score >= 3 THEN 10 ELSE 0 END), 
        0
    ) as engagement_health_score
FROM user_activity_features
ORDER BY 
    CASE 
        WHEN EXTRACT(DAYS FROM (CURRENT_DATE - last_activity_date::date)) > 30 THEN 1
        WHEN EXTRACT(DAYS FROM (CURRENT_DATE - last_activity_date::date)) > 14 THEN 2
        WHEN EXTRACT(DAYS FROM (CURRENT_DATE - last_activity_date::date)) > 7 THEN 3
        ELSE 4
    END,
    total_conversations DESC;

-- ==============================================
-- ADVANCED PERFORMANCE ANALYTICS
-- ==============================================

-- Response time percentile analysis with breakdown by time of day
WITH response_times AS (
    SELECT 
        steps."id",
        steps."threadId",
        EXTRACT(HOUR FROM CAST(steps."createdAt" AS TIMESTAMP)) as hour_of_day,
        EXTRACT(DOW FROM CAST(steps."createdAt" AS TIMESTAMP)) as day_of_week,
        EXTRACT(EPOCH FROM (steps."end"::timestamp - steps."start"::timestamp)) as response_time_seconds
    FROM steps
    WHERE steps."type" = 'assistant_message'
        AND steps."start" IS NOT NULL
        AND steps."end" IS NOT NULL
        AND CAST(steps."createdAt" AS TIMESTAMP) >= CURRENT_DATE - INTERVAL '7 days'
),
hourly_performance AS (
    SELECT 
        hour_of_day,
        COUNT(*) as total_responses,
        ROUND(AVG(response_time_seconds), 2) as avg_response_time,
        ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time_seconds), 2) as median_response_time,
        ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_seconds), 2) as p95_response_time,
        ROUND(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time_seconds), 2) as p99_response_time,
        MAX(response_time_seconds) as max_response_time
    FROM response_times
    GROUP BY hour_of_day
)
SELECT 
    hour_of_day,
    CASE 
        WHEN hour_of_day BETWEEN 6 AND 11 THEN 'Morning'
        WHEN hour_of_day BETWEEN 12 AND 17 THEN 'Afternoon'
        WHEN hour_of_day BETWEEN 18 AND 22 THEN 'Evening'
        ELSE 'Night'
    END as time_period,
    total_responses,
    avg_response_time,
    median_response_time,
    p95_response_time,
    p99_response_time,
    max_response_time,
    CASE 
        WHEN p95_response_time <= 5 THEN 'Excellent'
        WHEN p95_response_time <= 10 THEN 'Good'
        WHEN p95_response_time <= 20 THEN 'Fair'
        ELSE 'Poor'
    END as performance_rating
FROM hourly_performance
ORDER BY hour_of_day;
