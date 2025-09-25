-- User Summary View for BI Hub App
-- Aggregated user statistics and metrics for dashboard consumption

CREATE OR REPLACE VIEW user_summary_view AS
SELECT 
    u."identifier" as user_id,
    u."metadata"->>'email' as user_email,
    u."metadata"->>'name' as user_name,
    u."metadata"->>'department' as user_department,
    u."createdAt" as user_created_at,
    
    -- Conversation metrics
    COUNT(DISTINCT t."id") as total_conversations,
    COUNT(DISTINCT DATE(t."createdAt")) as active_days,
    MIN(t."createdAt") as first_conversation_date,
    MAX(t."createdAt") as last_conversation_date,
    
    -- Interaction metrics
    COUNT(s."id") as total_interactions,
    COUNT(CASE WHEN s."type" = 'user_message' THEN 1 END) as user_messages,
    COUNT(CASE WHEN s."type" = 'assistant_message' THEN 1 END) as assistant_responses,
    COUNT(CASE WHEN s."isError" = true THEN 1 END) as error_count,
    
    -- Average metrics
    CASE 
        WHEN COUNT(DISTINCT t."id") > 0 
        THEN ROUND(COUNT(s."id")::decimal / COUNT(DISTINCT t."id"), 2)
        ELSE 0 
    END as avg_interactions_per_conversation,
    
    -- Engagement scoring
    CASE 
        WHEN COUNT(DISTINCT t."id") = 0 THEN 'Inactive'
        WHEN COUNT(DISTINCT t."id") BETWEEN 1 AND 2 THEN 'Low'
        WHEN COUNT(DISTINCT t."id") BETWEEN 3 AND 10 THEN 'Medium'
        WHEN COUNT(DISTINCT t."id") BETWEEN 11 AND 25 THEN 'High'
        ELSE 'Very High'
    END as engagement_level,
    
    -- Recency scoring
    CASE 
        WHEN MAX(t."createdAt") >= CURRENT_DATE - INTERVAL '1 day' THEN 'Very Recent'
        WHEN MAX(t."createdAt") >= CURRENT_DATE - INTERVAL '7 days' THEN 'Recent'
        WHEN MAX(t."createdAt") >= CURRENT_DATE - INTERVAL '30 days' THEN 'Moderate'
        WHEN MAX(t."createdAt") >= CURRENT_DATE - INTERVAL '90 days' THEN 'Old'
        ELSE 'Very Old'
    END as recency_level,
    
    -- Feedback metrics
    COUNT(f."id") as total_feedback_given,
    AVG(f."value") as avg_feedback_score,
    COUNT(CASE WHEN f."value" >= 4 THEN 1 END) as positive_feedback_count,
    COUNT(CASE WHEN f."value" <= 2 THEN 1 END) as negative_feedback_count,
    
    -- Data freshness
    CURRENT_TIMESTAMP as view_last_updated
    
FROM users u
LEFT JOIN threads t ON u."id" = t."userId"
LEFT JOIN steps s ON t."id" = s."threadId"
LEFT JOIN feedbacks f ON t."id" = f."threadId"
GROUP BY 
    u."identifier",
    u."metadata"->>'email',
    u."metadata"->>'name',
    u."metadata"->>'department',
    u."createdAt";

-- Grant permissions
GRANT SELECT ON user_summary_view TO PUBLIC;
