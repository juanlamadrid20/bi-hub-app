# Timestamp Casting Fixes for BI Hub SQL

## Issue Description
The Chainlit schema stores `createdAt` fields as `TEXT` rather than `TIMESTAMP`, causing PostgreSQL function errors like:
```
ERROR: function date_trunc(unknown, text) does not exist
Hint: No function matches the given name and argument types. You might need to add explicit type casts.
```

## Solution Applied
All SQL files have been updated to use explicit `CAST` operations when working with timestamp fields.

## Fixed Patterns

### ❌ Before (Incorrect)
```sql
-- Date functions on TEXT fields
DATE(threads."createdAt")
DATE_TRUNC('month', threads."createdAt")
threads."createdAt" >= CURRENT_DATE - INTERVAL '30 days'
EXTRACT(EPOCH FROM (threads."createdAt" - other_date))
```

### ✅ After (Correct)
```sql
-- Explicit casting to TIMESTAMP
DATE(CAST(threads."createdAt" AS TIMESTAMP))
DATE_TRUNC('month', CAST(threads."createdAt" AS TIMESTAMP))
CAST(threads."createdAt" AS TIMESTAMP) >= CURRENT_DATE - INTERVAL '30 days'
EXTRACT(EPOCH FROM (CAST(threads."createdAt" AS TIMESTAMP) - other_date))
```

## Files Updated

### Core Query Files
- ✅ `sql/queries/user_analytics.sql`
- ✅ `sql/queries/chat_analytics.sql`
- ✅ `sql/queries/system_health.sql`

### View Definitions
- ✅ `sql/views/user_summary_view.sql`
- ✅ `sql/views/chat_summary_view.sql`
- ✅ `sql/views/performance_dashboard_view.sql`

### Analytics Files
- ✅ `sql/analytics/databricks_analytics.sql`
- ✅ `sql/analytics/bi_sample_queries.sql` (templates were already commented)

### Maintenance & Monitoring
- ✅ `sql/procedures/maintenance_procedures.sql`
- ✅ `sql/monitoring/data_quality_checks.sql`

## Common Patterns Fixed

1. **Date Extraction**
   ```sql
   -- Before
   DATE(threads."createdAt")
   -- After  
   DATE(CAST(threads."createdAt" AS TIMESTAMP))
   ```

2. **Date Truncation**
   ```sql
   -- Before
   DATE_TRUNC('month', threads."createdAt")
   -- After
   DATE_TRUNC('month', CAST(threads."createdAt" AS TIMESTAMP))
   ```

3. **Date Comparisons**
   ```sql
   -- Before
   WHERE threads."createdAt" >= CURRENT_DATE - INTERVAL '30 days'
   -- After
   WHERE CAST(threads."createdAt" AS TIMESTAMP) >= CURRENT_DATE - INTERVAL '30 days'
   ```

4. **Date Arithmetic**
   ```sql
   -- Before
   MAX(threads."createdAt")::timestamp - MIN(threads."createdAt")::timestamp
   -- After
   MAX(CAST(threads."createdAt" AS TIMESTAMP)) - MIN(CAST(threads."createdAt" AS TIMESTAMP))
   ```

## Testing Recommendations

1. **Validate Core Queries**
   ```sql
   -- Test basic date functions
   SELECT DATE(CAST(threads."createdAt" AS TIMESTAMP)) FROM threads LIMIT 1;
   
   -- Test date arithmetic
   SELECT COUNT(*) FROM threads 
   WHERE CAST(threads."createdAt" AS TIMESTAMP) >= CURRENT_DATE - INTERVAL '7 days';
   ```

2. **Test Analytics Views**
   ```sql
   -- Test view creation
   SELECT * FROM user_summary_view LIMIT 5;
   SELECT * FROM chat_summary_view LIMIT 5;
   SELECT * FROM performance_dashboard_view LIMIT 5;
   ```

3. **Verify Procedures**
   ```sql
   -- Test maintenance functions
   SELECT * FROM system_health_check();
   ```

## Performance Notes

- **Indexing**: Consider adding functional indexes for frequently used casted dates:
  ```sql
  CREATE INDEX idx_threads_created_at_timestamp 
  ON threads (CAST("createdAt" AS TIMESTAMP));
  ```

- **Alternative**: If possible, consider migrating the schema to use actual `TIMESTAMP` columns instead of `TEXT` for better performance and type safety.

## Schema Considerations

The Chainlit schema uses TEXT for timestamps, likely for compatibility across different database systems. The casting approach maintains compatibility while enabling proper date/time operations.

For production systems, consider:
1. Adding functional indexes on casted timestamp expressions
2. Monitoring query performance after applying fixes
3. Consider schema migration to native TIMESTAMP types if feasible

## Verification Script

Run this query to verify all timestamp operations work correctly:
```sql
-- Comprehensive timestamp verification
SELECT 
    'Daily Stats' as test_category,
    DATE(CAST(threads."createdAt" AS TIMESTAMP)) as test_date,
    COUNT(*) as record_count
FROM threads 
WHERE CAST(threads."createdAt" AS TIMESTAMP) >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(CAST(threads."createdAt" AS TIMESTAMP))
ORDER BY test_date DESC
LIMIT 5;
```
