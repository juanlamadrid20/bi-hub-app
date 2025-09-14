-- Performance Dashboard View for BI Hub App
-- Key metrics for operational dashboards and monitoring

CREATE OR REPLACE VIEW performance_dashboard_view AS
WITH daily_metrics AS (
    SELECT 
        DATE(CAST(t."createdAt" AS TIMESTAMP)) as metric_date,
        COUNT(DISTINCT t."id") as daily_conversations,
        COUNT(DISTINCT u."identifier") as daily_active_users,
        COUNT(s."id") as daily_interactions,
        COUNT(CASE WHEN s."isError" = true THEN 1 END) as daily_errors,
        COUNT(f."id") as daily_feedback,
        AVG(f."value") as daily_avg_feedback_score,
        AVG(
            CASE 
                WHEN s."type" = 'assistant_message' 
                    AND s."end" IS NOT NULL 
                    AND s."start" IS NOT NULL
                THEN EXTRACT(EPOCH FROM (s."end"::timestamp - s."start"::timestamp))
                ELSE NULL
            END
        ) as daily_avg_response_time,
        PERCENTILE_CONT(0.95) WITHIN GROUP (
            ORDER BY 
                CASE 
                    WHEN s."type" = 'assistant_message' 
                        AND s."end" IS NOT NULL 
                        AND s."start" IS NOT NULL
                    THEN EXTRACT(EPOCH FROM (s."end"::timestamp - s."start"::timestamp))
                    ELSE NULL
                END
        ) as daily_p95_response_time
    FROM threads t
    LEFT JOIN users u ON t."userId" = u."id"
    LEFT JOIN steps s ON t."id" = s."threadId"
    LEFT JOIN feedbacks f ON t."id" = f."threadId"
    WHERE CAST(t."createdAt" AS TIMESTAMP) >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY DATE(CAST(t."createdAt" AS TIMESTAMP))
),
trend_metrics AS (
    SELECT 
        *,
        LAG(daily_conversations, 1) OVER (ORDER BY metric_date) as prev_day_conversations,
        LAG(daily_active_users, 1) OVER (ORDER BY metric_date) as prev_day_users,
        LAG(daily_avg_response_time, 1) OVER (ORDER BY metric_date) as prev_day_response_time,
        AVG(daily_conversations) OVER (ORDER BY metric_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as conversations_7day_avg,
        AVG(daily_active_users) OVER (ORDER BY metric_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as users_7day_avg,
        AVG(daily_avg_response_time) OVER (ORDER BY metric_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as response_time_7day_avg
    FROM daily_metrics
)
SELECT 
    metric_date,
    
    -- Core volume metrics
    daily_conversations,
    daily_active_users,
    daily_interactions,
    daily_errors,
    
    -- Quality metrics
    CASE 
        WHEN daily_interactions > 0 
        THEN ROUND(100.0 * daily_errors / daily_interactions, 2)
        ELSE 0 
    END as error_rate_percent,
    daily_avg_feedback_score,
    daily_feedback as feedback_volume,
    
    -- Performance metrics
    ROUND(daily_avg_response_time, 2) as avg_response_time_seconds,
    ROUND(daily_p95_response_time, 2) as p95_response_time_seconds,
    
    -- Trend indicators (day-over-day change)
    CASE 
        WHEN prev_day_conversations > 0 
        THEN ROUND(100.0 * (daily_conversations - prev_day_conversations) / prev_day_conversations, 1)
        ELSE NULL 
    END as conversations_change_percent,
    
    CASE 
        WHEN prev_day_users > 0 
        THEN ROUND(100.0 * (daily_active_users - prev_day_users) / prev_day_users, 1)
        ELSE NULL 
    END as users_change_percent,
    
    CASE 
        WHEN prev_day_response_time > 0 
        THEN ROUND(100.0 * (daily_avg_response_time - prev_day_response_time) / prev_day_response_time, 1)
        ELSE NULL 
    END as response_time_change_percent,
    
    -- Rolling averages
    ROUND(conversations_7day_avg, 1) as conversations_7day_avg,
    ROUND(users_7day_avg, 1) as users_7day_avg,
    ROUND(response_time_7day_avg, 2) as response_time_7day_avg,
    
    -- Health indicators
    CASE 
        WHEN daily_errors::float / NULLIF(daily_interactions, 0) > 0.05 THEN 'Poor'
        WHEN daily_errors::float / NULLIF(daily_interactions, 0) > 0.02 THEN 'Fair'
        WHEN daily_errors::float / NULLIF(daily_interactions, 0) > 0.01 THEN 'Good'
        ELSE 'Excellent'
    END as error_health_status,
    
    CASE 
        WHEN daily_avg_response_time > 30 THEN 'Poor'
        WHEN daily_avg_response_time > 15 THEN 'Fair'
        WHEN daily_avg_response_time > 5 THEN 'Good'
        ELSE 'Excellent'
    END as response_time_health_status,
    
    CASE 
        WHEN daily_avg_feedback_score >= 4.5 THEN 'Excellent'
        WHEN daily_avg_feedback_score >= 4.0 THEN 'Good'
        WHEN daily_avg_feedback_score >= 3.5 THEN 'Fair'
        ELSE 'Poor'
    END as feedback_health_status,
    
    -- Data freshness
    CURRENT_TIMESTAMP as view_last_updated
    
FROM trend_metrics
ORDER BY metric_date DESC;

-- Grant permissions
GRANT SELECT ON performance_dashboard_view TO PUBLIC;
