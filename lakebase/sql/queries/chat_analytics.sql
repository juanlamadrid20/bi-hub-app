-- Chat Analytics Queries for BI Hub App
-- Provides insights into conversation patterns and AI assistant performance

-- ==============================================
-- CONVERSATION METRICS
-- ==============================================

-- Conversation Length Distribution
SELECT 
    CASE 
        WHEN step_count = 1 THEN '1 interaction'
        WHEN step_count BETWEEN 2 AND 5 THEN '2-5 interactions'
        WHEN step_count BETWEEN 6 AND 10 THEN '6-10 interactions'
        WHEN step_count BETWEEN 11 AND 20 THEN '11-20 interactions'
        ELSE '20+ interactions'
    END as conversation_length_bucket,
    COUNT(*) as conversation_count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM (
    SELECT 
        threads."id",
        COUNT(steps."id") as step_count
    FROM threads
    LEFT JOIN steps ON threads."id" = steps."threadId"
    WHERE CAST(threads."createdAt" AS TIMESTAMP) >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY threads."id"
) conversation_lengths
GROUP BY 
    CASE 
        WHEN step_count = 1 THEN '1 interaction'
        WHEN step_count BETWEEN 2 AND 5 THEN '2-5 interactions'
        WHEN step_count BETWEEN 6 AND 10 THEN '6-10 interactions'
        WHEN step_count BETWEEN 11 AND 20 THEN '11-20 interactions'
        ELSE '20+ interactions'
    END
ORDER BY 
    MIN(CASE 
        WHEN step_count = 1 THEN 1
        WHEN step_count BETWEEN 2 AND 5 THEN 2
        WHEN step_count BETWEEN 6 AND 10 THEN 3
        WHEN step_count BETWEEN 11 AND 20 THEN 4
        ELSE 5
    END);

-- Average Response Time Analysis
SELECT 
    DATE(CAST(steps."createdAt" AS TIMESTAMP)) as date,
    COUNT(*) as total_responses,
    AVG(
        CASE 
            WHEN steps."end" IS NOT NULL AND steps."start" IS NOT NULL
            THEN EXTRACT(EPOCH FROM (steps."end"::timestamp - steps."start"::timestamp))
            ELSE NULL
        END
    ) as avg_response_time_seconds,
    PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY 
            CASE 
                WHEN steps."end" IS NOT NULL AND steps."start" IS NOT NULL
                THEN EXTRACT(EPOCH FROM (steps."end"::timestamp - steps."start"::timestamp))
                ELSE NULL
            END
    ) as median_response_time_seconds,
    PERCENTILE_CONT(0.95) WITHIN GROUP (
        ORDER BY 
            CASE 
                WHEN steps."end" IS NOT NULL AND steps."start" IS NOT NULL
                THEN EXTRACT(EPOCH FROM (steps."end"::timestamp - steps."start"::timestamp))
                ELSE NULL
            END
    ) as p95_response_time_seconds
FROM steps
WHERE CAST(steps."createdAt" AS TIMESTAMP) >= CURRENT_DATE - INTERVAL '7 days'
    AND steps."type" = 'assistant_message'
    AND steps."start" IS NOT NULL
    AND steps."end" IS NOT NULL
GROUP BY DATE(CAST(steps."createdAt" AS TIMESTAMP))
ORDER BY date DESC;

-- ==============================================
-- CONVERSATION TOPICS AND PATTERNS
-- ==============================================

-- Most Common User Queries (by input length and patterns)
SELECT 
    CASE 
        WHEN LENGTH(steps."input") <= 50 THEN 'Short queries (≤50 chars)'
        WHEN LENGTH(steps."input") <= 100 THEN 'Medium queries (51-100 chars)'
        WHEN LENGTH(steps."input") <= 200 THEN 'Long queries (101-200 chars)'
        ELSE 'Very long queries (>200 chars)'
    END as query_length_category,
    COUNT(*) as query_count,
    AVG(LENGTH(steps."input")) as avg_input_length,
    AVG(LENGTH(steps."output")) as avg_output_length
FROM steps
WHERE steps."type" = 'user_message'
    AND steps."input" IS NOT NULL
    AND CAST(steps."createdAt" AS TIMESTAMP) >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY 
    CASE 
        WHEN LENGTH(steps."input") <= 50 THEN 'Short queries (≤50 chars)'
        WHEN LENGTH(steps."input") <= 100 THEN 'Medium queries (51-100 chars)'
        WHEN LENGTH(steps."input") <= 200 THEN 'Long queries (101-200 chars)'
        ELSE 'Very long queries (>200 chars)'
    END
ORDER BY query_count DESC;

-- Error Rate Analysis
SELECT 
    DATE(CAST(steps."createdAt" AS TIMESTAMP)) as date,
    COUNT(*) as total_steps,
    COUNT(CASE WHEN steps."isError" = true THEN 1 END) as error_count,
    ROUND(
        100.0 * COUNT(CASE WHEN steps."isError" = true THEN 1 END) / COUNT(*),
        2
    ) as error_rate_percentage
FROM steps
WHERE CAST(steps."createdAt" AS TIMESTAMP) >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(CAST(steps."createdAt" AS TIMESTAMP))
ORDER BY date DESC;

-- ==============================================
-- USER FEEDBACK ANALYSIS
-- ==============================================

-- Feedback Distribution
SELECT 
    feedbacks."value" as feedback_value,
    COUNT(*) as feedback_count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage,
    COUNT(CASE WHEN feedbacks."comment" IS NOT NULL AND LENGTH(feedbacks."comment") > 0 THEN 1 END) as with_comments
FROM feedbacks
WHERE feedbacks."id" IS NOT NULL
GROUP BY feedbacks."value"
ORDER BY feedbacks."value";

-- Feedback Trends Over Time
SELECT 
    DATE(CAST(threads."createdAt" AS TIMESTAMP)) as feedback_date,
    AVG(feedbacks."value") as avg_feedback_score,
    COUNT(*) as total_feedback_count,
    COUNT(CASE WHEN feedbacks."value" >= 4 THEN 1 END) as positive_feedback,
    COUNT(CASE WHEN feedbacks."value" <= 2 THEN 1 END) as negative_feedback
FROM feedbacks
JOIN threads ON feedbacks."threadId" = threads."id"
WHERE CAST(threads."createdAt" AS TIMESTAMP) >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(CAST(threads."createdAt" AS TIMESTAMP))
ORDER BY feedback_date DESC;
