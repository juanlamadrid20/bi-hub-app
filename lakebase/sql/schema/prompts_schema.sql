-- Prompts Schema for BI Hub
-- Stores reusable prompt templates for the chat interface
-- Run this in your Lakebase SQL editor

-- ==============================================
-- PROMPTS TABLE
-- ==============================================

-- Drop existing table if needed (uncomment if recreating)
-- DROP TABLE IF EXISTS prompts CASCADE;

-- Create prompts table
CREATE TABLE IF NOT EXISTS prompts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL UNIQUE,
    content TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    is_favorite BOOLEAN DEFAULT FALSE NOT NULL,
    usage_count INTEGER DEFAULT 0 NOT NULL,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT prompts_category_check CHECK (
        category IN ('customer', 'inventory', 'analytics', 'reporting', 'general')
    )
);

-- ==============================================
-- INDEXES
-- ==============================================

-- Index on category for filtering
CREATE INDEX IF NOT EXISTS ix_prompts_category ON prompts(category);

-- Index on is_favorite for quick favorites lookup
CREATE INDEX IF NOT EXISTS ix_prompts_is_favorite ON prompts(is_favorite);

-- Index on usage_count for sorting by popularity
CREATE INDEX IF NOT EXISTS ix_prompts_usage_count ON prompts(usage_count);

-- Index on last_used_at for recent prompts
CREATE INDEX IF NOT EXISTS ix_prompts_last_used_at ON prompts(last_used_at);

-- Index on title for slash command lookups
CREATE INDEX IF NOT EXISTS ix_prompts_title ON prompts(title);

-- ==============================================
-- TRIGGER FOR updated_at
-- ==============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_prompts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on row update
DROP TRIGGER IF EXISTS prompts_updated_at_trigger ON prompts;
CREATE TRIGGER prompts_updated_at_trigger
    BEFORE UPDATE ON prompts
    FOR EACH ROW
    EXECUTE FUNCTION update_prompts_updated_at();

-- ==============================================
-- GRANT PERMISSIONS
-- ==============================================

-- Grant permissions to app client ID
-- Replace <CLIENT_ID> with your actual app client ID from the Environment tab
-- Replace <DATABASE_NAME> with your actual database name

-- GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "<DATABASE_NAME>"."public"."prompts" TO "<CLIENT_ID>";
-- GRANT USAGE, SELECT ON SEQUENCE prompts_id_seq TO "<CLIENT_ID>";

-- ==============================================
-- SEED DATA - BI Hub Starter Prompts
-- ==============================================

-- Insert the homepage starter prompts as the initial prompt library
INSERT INTO prompts (title, content, category, description, is_favorite) VALUES
-- Customer Behavior (Single-Domain)
(
    'vip_analysis',
    'How many VIP customers do we have and what is their average lifetime value compared to other segments?',
    'customer',
    'Customer Behavior: VIP Analysis',
    true
),
(
    'cart_abandonment',
    'What is our cart abandonment rate and how much potential revenue are we leaving on the table?',
    'customer',
    'Customer Behavior: Cart Abandonment',
    true
),
-- Inventory Operations (Single-Domain)
(
    'inventory_health',
    'What is our current inventory health status across all locations, and how much revenue are we losing to stockouts?',
    'inventory',
    'Inventory Operations: Health Overview',
    true
),
(
    'reorder_priority',
    'What products need immediate reordering across our flagship stores? Prioritize by lost sales impact.',
    'inventory',
    'Inventory Operations: Reorder Priority',
    true
),
-- Voice of Customer (Single-Domain)
(
    'return_patterns',
    'What patterns do we see in return feedback? Which issues should we escalate to product teams?',
    'customer',
    'Voice of Customer: Return Patterns',
    true
),
(
    'brand_love',
    'What do customers love most about our brand? What themes emerge from 5-star reviews?',
    'customer',
    'Voice of Customer: Brand Love',
    true
),
-- Cross-Domain (Multi-Agent Coordination)
(
    'stockout_segments',
    'Which of our top-selling product categories have stockout risk, and which customer segments are most affected?',
    'analytics',
    'Cross-Domain: Stockout Segments',
    true
),
(
    'channel_migration',
    'How do our customers migrate between channels, and does our inventory allocation match their channel preferences?',
    'analytics',
    'Cross-Domain: Channel Migration',
    true
),
(
    'seasonal_trends',
    'What product categories are trending with our Loyal customers, and do we have adequate inventory coverage for the upcoming season?',
    'analytics',
    'Cross-Domain: Seasonal Trends',
    true
),
-- Triple-Agent (Reviews + Behavior + Inventory)
(
    'quality_retention',
    'Combine customer sentiment, purchase behavior, and inventory data: What are the top 3 product quality issues affecting VIP customer retention, and do we have inventory coverage for better alternatives?',
    'analytics',
    'Triple-Agent: Quality & Retention',
    true
)
ON CONFLICT (title) DO NOTHING;

-- ==============================================
-- VERIFICATION
-- ==============================================

-- Verify table was created successfully
SELECT 
    table_name,
    table_type,
    table_schema
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'prompts';

-- Show table structure
-- \d prompts;

-- Count prompts
SELECT COUNT(*) as prompt_count FROM prompts;
