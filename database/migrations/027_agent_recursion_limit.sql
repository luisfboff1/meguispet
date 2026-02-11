-- Migration 027: Add recursion_limit to agent_configs
-- Allows users to configure how many steps the AI agent can take per query

ALTER TABLE agent_configs
ADD COLUMN IF NOT EXISTS recursion_limit INTEGER DEFAULT 25;

COMMENT ON COLUMN agent_configs.recursion_limit IS 'Max number of LangGraph recursion steps per query (5-50, default 25)';
