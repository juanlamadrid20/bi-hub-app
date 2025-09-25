-- Chat Summary View for BI Hub App
-- Aggregated conversation statistics and metrics

CREATE OR REPLACE VIEW chat_summary_view AS
SELECT 
    t."id" as thread_id,
    t."name" as conversation_name,
    t."createdAt" as conversation_start_time,
    u."identifier" as user_id,
    u."metadata"->>'email' as user_email,
    
    -- Conversation metrics
    COUNT(s."id") as total_steps,
    COUNT(CASE WHEN s."type" = 'user_message' THEN 1 END) as user_messages,
    COUNT(CASE WHEN s."type" = 'assistant_message' THEN 1 END) as assistant_responses,
    COUNT(CASE WHEN s."isError" = true THEN 1 END) as error_count,
    
    -- Timing metrics
    MIN(CAST(s."createdAt" AS TIMESTAMP)) as first_interaction,
    MAX(CAST(s."createdAt" AS TIMESTAMP)) as last_interaction,
    EXTRACT(EPOCH FROM (MAX(CAST(s."createdAt" AS TIMESTAMP)) - MIN(CAST(s."createdAt" AS TIMESTAMP)))) / 60 as conversation_duration_minutes,
    
    -- Response time metrics (for assistant messages)
    AVG(
        CASE 
            WHEN s."type" = 'assistant_message' 
                AND s."end" IS NOT NULL 
                AND s."start" IS NOT NULL
            THEN EXTRACT(EPOCH FROM (s."end"::timestamp - s."start"::timestamp))
            ELSE NULL
        END
    ) as avg_response_time_seconds,
    
    -- Content metrics
    AVG(LENGTH(s."input")) as avg_input_length,
    AVG(LENGTH(s."output")) as avg_output_length,
    MAX(LENGTH(s."input")) as max_input_length,
    MAX(LENGTH(s."output")) as max_output_length,
    
    -- Conversation classification
    CASE 
        WHEN COUNT(s."id") = 1 THEN 'Single Interaction'
        WHEN COUNT(s."id") BETWEEN 2 AND 5 THEN 'Short Conversation'
        WHEN COUNT(s."id") BETWEEN 6 AND 15 THEN 'Medium Conversation'
        WHEN COUNT(s."id") BETWEEN 16 AND 30 THEN 'Long Conversation'
        ELSE 'Extended Conversation'
    END as conversation_type,
    
    -- Quality metrics
    CASE 
        WHEN COUNT(CASE WHEN s."isError" = true THEN 1 END) = 0 THEN 'No Errors'
        WHEN COUNT(CASE WHEN s."isError" = true THEN 1 END) = 1 THEN 'Minor Issues'
        WHEN COUNT(CASE WHEN s."isError" = true THEN 1 END) <= 3 THEN 'Some Issues'
        ELSE 'Major Issues'
    END as conversation_quality,
    
    -- Feedback metrics
    COUNT(f."id") as feedback_count,
    AVG(f."value") as avg_feedback_score,
    STRING_AGG(f."comment", ' | ') as feedback_comments,
    
    -- Elements and attachments
    COUNT(e."id") as elements_count,
    STRING_AGG(DISTINCT e."type", ', ') as element_types,
    
    -- Tags and metadata
    ARRAY_TO_STRING(t."tags", ', ') as conversation_tags,
    t."metadata" as thread_metadata,
    
    -- Data freshness
    CURRENT_TIMESTAMP as view_last_updated
    
FROM threads t
LEFT JOIN users u ON t."userId" = u."id"
LEFT JOIN steps s ON t."id" = s."threadId"
LEFT JOIN feedbacks f ON t."id" = f."threadId"
LEFT JOIN elements e ON t."id" = e."threadId"
GROUP BY 
    t."id",
    t."name",
    t."createdAt",
    u."identifier",
    u."metadata"->>'email',
    t."tags",
    t."metadata";

-- Grant permissions
GRANT SELECT ON chat_summary_view TO PUBLIC;
