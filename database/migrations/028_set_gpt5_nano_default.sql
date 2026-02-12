-- Migration 028: Set GPT-5-nano as default model for all users
-- GPT-5-nano benefits:
-- - 400k context window (vs 128k)
-- - $0.05 input vs $2.50 (50x cheaper than GPT-4o)
-- - $0.01 cached input vs $1.25 (125x cheaper cache!)
-- - Fastest speed (5/5)
-- - Better for agent with large system prompts

-- 1. Update all existing configs to use gpt-5-nano
-- IMPORTANT: GPT-5-nano only supports temperature=1 (default)
UPDATE agent_configs
SET model = 'gpt-5-nano',
    temperature = 1.00,
    max_tokens = 8192
WHERE provider = 'openai'
  AND model IN ('gpt-4o', 'gpt-4o-mini', 'gpt-4.5-preview');

-- 2. Change default for new configs (alter column default)
ALTER TABLE agent_configs
ALTER COLUMN model SET DEFAULT 'gpt-5-nano';

-- 3. Adjust max_tokens default - keep reasonable to avoid excessively long responses
-- High values (100k+) cause the LLM to generate huge outputs that timeout
ALTER TABLE agent_configs
ALTER COLUMN max_tokens SET DEFAULT 8192;

-- 3b. Fix any existing configs with absurdly high max_tokens
UPDATE agent_configs SET max_tokens = 8192 WHERE max_tokens > 16384;

-- Log changes
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count FROM agent_configs WHERE model = 'gpt-5-nano';
  RAISE NOTICE 'Migration 028 complete: % configs now using gpt-5-nano', updated_count;
END $$;

COMMENT ON COLUMN agent_configs.model IS 'LLM model ID (default: gpt-5-nano with 400k context window)';
