-- Migration: enable_pg_cron_keepalive
-- Enable pg_cron extension and set up keepalive job to prevent Supabase free tier pause
-- This runs a lightweight query every 3 days to keep the project active

-- Enable pg_cron extension (requires superuser, run via Supabase dashboard if needed)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage on cron schema to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Create keepalive job: runs every 3 days at midnight
-- This prevents the Supabase free tier project from being paused due to inactivity
SELECT cron.schedule(
  'bodulica-keepalive',
  '0 0 */3 * *',
  $$SELECT count(*) FROM products WHERE is_active = true$$
);

COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL - used to keep Supabase project alive on free tier';
