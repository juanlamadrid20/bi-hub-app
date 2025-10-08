-- Business Intelligence Sample Queries for BI Hub App
-- Example queries that demonstrate BI capabilities for end users

-- ==============================================
-- REVENUE AND FINANCIAL ANALYTICS
-- ==============================================

-- Note: These are sample queries that would work with typical business data
-- Replace table names and columns with your actual data sources

-- Monthly Revenue Trend
-- (Example query - replace 'sales_data' with your actual table)
/*
SELECT 
    DATE_TRUNC('month', order_date) as month,
    SUM(revenue) as total_revenue,
    COUNT(DISTINCT customer_id) as unique_customers,
    AVG(revenue) as avg_order_value,
    SUM(revenue) - LAG(SUM(revenue)) OVER (ORDER BY DATE_TRUNC('month', order_date)) as revenue_growth
FROM sales_data 
WHERE order_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', order_date)
ORDER BY month;
*/

-- Customer Segmentation Analysis
/*
WITH customer_metrics AS (
    SELECT 
        customer_id,
        COUNT(*) as total_orders,
        SUM(revenue) as total_spent,
        MAX(order_date) as last_order_date,
        MIN(order_date) as first_order_date
    FROM sales_data
    WHERE order_date >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY customer_id
)
SELECT 
    CASE 
        WHEN total_spent >= 1000 AND last_order_date >= CURRENT_DATE - INTERVAL '90 days' THEN 'High Value Active'
        WHEN total_spent >= 1000 AND last_order_date < CURRENT_DATE - INTERVAL '90 days' THEN 'High Value Inactive'
        WHEN total_spent >= 500 AND last_order_date >= CURRENT_DATE - INTERVAL '90 days' THEN 'Medium Value Active'
        WHEN total_spent >= 500 AND last_order_date < CURRENT_DATE - INTERVAL '90 days' THEN 'Medium Value Inactive'
        WHEN last_order_date >= CURRENT_DATE - INTERVAL '90 days' THEN 'Low Value Active'
        ELSE 'Low Value Inactive'
    END as customer_segment,
    COUNT(*) as customer_count,
    AVG(total_spent) as avg_customer_value,
    AVG(total_orders) as avg_orders_per_customer
FROM customer_metrics
GROUP BY 
    CASE 
        WHEN total_spent >= 1000 AND last_order_date >= CURRENT_DATE - INTERVAL '90 days' THEN 'High Value Active'
        WHEN total_spent >= 1000 AND last_order_date < CURRENT_DATE - INTERVAL '90 days' THEN 'High Value Inactive'
        WHEN total_spent >= 500 AND last_order_date >= CURRENT_DATE - INTERVAL '90 days' THEN 'Medium Value Active'
        WHEN total_spent >= 500 AND last_order_date < CURRENT_DATE - INTERVAL '90 days' THEN 'Medium Value Inactive'
        WHEN last_order_date >= CURRENT_DATE - INTERVAL '90 days' THEN 'Low Value Active'
        ELSE 'Low Value Inactive'
    END
ORDER BY customer_count DESC;
*/

-- ==============================================
-- COMMON BI PATTERNS AND EXAMPLES
-- ==============================================

-- Year-over-Year Growth Analysis Template
/*
WITH current_year AS (
    SELECT 
        DATE_TRUNC('month', order_date) as month,
        SUM(revenue) as revenue
    FROM sales_data
    WHERE EXTRACT(YEAR FROM order_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    GROUP BY DATE_TRUNC('month', order_date)
),
previous_year AS (
    SELECT 
        DATE_TRUNC('month', order_date) + INTERVAL '1 year' as month,
        SUM(revenue) as revenue
    FROM sales_data
    WHERE EXTRACT(YEAR FROM order_date) = EXTRACT(YEAR FROM CURRENT_DATE) - 1
    GROUP BY DATE_TRUNC('month', order_date)
)
SELECT 
    cy.month,
    cy.revenue as current_year_revenue,
    py.revenue as previous_year_revenue,
    CASE 
        WHEN py.revenue > 0 
        THEN ROUND(100.0 * (cy.revenue - py.revenue) / py.revenue, 2)
        ELSE NULL 
    END as yoy_growth_percent
FROM current_year cy
LEFT JOIN previous_year py ON cy.month = py.month
ORDER BY cy.month;
*/

-- Cohort Analysis Template
/*
WITH customer_cohorts AS (
    SELECT 
        customer_id,
        DATE_TRUNC('month', MIN(order_date)) as cohort_month
    FROM sales_data
    GROUP BY customer_id
),
cohort_revenue AS (
    SELECT 
        cc.cohort_month,
        DATE_TRUNC('month', sd.order_date) as revenue_month,
        COUNT(DISTINCT cc.customer_id) as customers,
        SUM(sd.revenue) as revenue
    FROM customer_cohorts cc
    JOIN sales_data sd ON cc.customer_id = sd.customer_id
    GROUP BY cc.cohort_month, DATE_TRUNC('month', sd.order_date)
)
SELECT 
    cohort_month,
    revenue_month,
    EXTRACT(MONTH FROM AGE(revenue_month, cohort_month)) as month_number,
    customers,
    revenue,
    revenue / customers as revenue_per_customer
FROM cohort_revenue
WHERE revenue_month >= cohort_month
ORDER BY cohort_month, month_number;
*/

-- ==============================================
-- OPERATIONAL ANALYTICS
-- ==============================================

-- Top Performing Products/Categories
/*
SELECT 
    product_category,
    product_name,
    COUNT(*) as total_orders,
    SUM(quantity) as total_quantity_sold,
    SUM(revenue) as total_revenue,
    AVG(revenue) as avg_order_value,
    RANK() OVER (PARTITION BY product_category ORDER BY SUM(revenue) DESC) as category_rank
FROM sales_data sd
JOIN products p ON sd.product_id = p.id
WHERE order_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY product_category, product_name
ORDER BY total_revenue DESC
LIMIT 50;
*/

-- Geographic Performance Analysis
/*
SELECT 
    region,
    state,
    city,
    COUNT(DISTINCT customer_id) as unique_customers,
    COUNT(*) as total_orders,
    SUM(revenue) as total_revenue,
    AVG(revenue) as avg_order_value,
    SUM(revenue) / COUNT(DISTINCT customer_id) as revenue_per_customer
FROM sales_data sd
JOIN customers c ON sd.customer_id = c.id
WHERE order_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY region, state, city
HAVING COUNT(*) >= 10  -- Filter for cities with meaningful volume
ORDER BY total_revenue DESC;
*/

-- ==============================================
-- ADVANCED ANALYTICS PATTERNS
-- ==============================================

-- Customer Lifetime Value Prediction
/*
WITH customer_stats AS (
    SELECT 
        customer_id,
        COUNT(*) as total_orders,
        SUM(revenue) as total_revenue,
        AVG(revenue) as avg_order_value,
        EXTRACT(DAYS FROM (MAX(order_date) - MIN(order_date))) as customer_lifespan_days,
        MAX(order_date) as last_order_date
    FROM sales_data
    GROUP BY customer_id
    HAVING COUNT(*) >= 2  -- Customers with at least 2 orders
),
purchase_frequency AS (
    SELECT 
        customer_id,
        customer_lifespan_days / NULLIF(total_orders - 1, 0) as avg_days_between_orders
    FROM customer_stats
)
SELECT 
    cs.customer_id,
    cs.total_orders,
    cs.total_revenue,
    cs.avg_order_value,
    pf.avg_days_between_orders,
    -- Simple CLV calculation: avg_order_value * predicted_orders_per_year * assumed_retention_years
    CASE 
        WHEN pf.avg_days_between_orders > 0 
        THEN cs.avg_order_value * (365.0 / pf.avg_days_between_orders) * 2  -- Assuming 2-year retention
        ELSE cs.avg_order_value * 2  -- Fallback for single purchase customers
    END as estimated_clv,
    CASE 
        WHEN cs.last_order_date >= CURRENT_DATE - INTERVAL '90 days' THEN 'Active'
        WHEN cs.last_order_date >= CURRENT_DATE - INTERVAL '180 days' THEN 'At Risk'
        ELSE 'Churned'
    END as customer_status
FROM customer_stats cs
LEFT JOIN purchase_frequency pf ON cs.customer_id = pf.customer_id
ORDER BY estimated_clv DESC;
*/

-- ==============================================
-- DASHBOARD SUMMARY QUERIES
-- ==============================================

-- Executive Dashboard Summary
/*
SELECT 
    'Total Revenue (MTD)' as metric,
    SUM(revenue)::text as value
FROM sales_data
WHERE order_date >= DATE_TRUNC('month', CURRENT_DATE)
UNION ALL
SELECT 
    'Total Revenue (YTD)' as metric,
    SUM(revenue)::text as value
FROM sales_data
WHERE order_date >= DATE_TRUNC('year', CURRENT_DATE)
UNION ALL
SELECT 
    'Active Customers (30 days)' as metric,
    COUNT(DISTINCT customer_id)::text as value
FROM sales_data
WHERE order_date >= CURRENT_DATE - INTERVAL '30 days'
UNION ALL
SELECT 
    'Average Order Value (30 days)' as metric,
    ROUND(AVG(revenue), 2)::text as value
FROM sales_data
WHERE order_date >= CURRENT_DATE - INTERVAL '30 days';
*/
