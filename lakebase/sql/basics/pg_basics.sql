-- This will show you the current active sessions and their statuses, which can indicate if the instance is operational.
SELECT * FROM pg_stat_activity;

-- Running this query returns the current database and the user connected, confirming that you are successfully interacting with the Lakebase instance.
SELECT current_database(), current_user;

-- This will show all databases in your PostgreSQL instance, but Databricks typically creates a default database called databricks_postgres at instance creation
SELECT datname AS database_name FROM pg_database WHERE datistemplate = false;

-- To view all schemas in the currently selected database:
SELECT schema_name FROM information_schema.schemata;

-- This will list all base tables across all schemas in the current database. 
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_type = 'BASE TABLE'
-- AND table_schema = 'pg_catalog'
;