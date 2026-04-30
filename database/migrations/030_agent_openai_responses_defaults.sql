-- Migration 030: Agent defaults for OpenAI Responses API
--
-- The agent no longer uses LangChain. It calls OpenAI Responses API directly
-- with reasoning.effort = 'medium' and text.verbosity = 'low' in the backend.

UPDATE agent_configs
SET provider = 'openai',
    model = 'gpt-5-mini',
    temperature = 1.00,
    top_p = 1.00,
    frequency_penalty = 0,
    presence_penalty = 0,
    max_tokens = LEAST(COALESCE(max_tokens, 4096), 8192)
WHERE provider = 'openai'
  AND model IN ('gpt-5-nano', 'gpt-4o', 'gpt-4o-mini', 'gpt-4.5-preview');

ALTER TABLE agent_configs
ALTER COLUMN provider SET DEFAULT 'openai';

ALTER TABLE agent_configs
ALTER COLUMN model SET DEFAULT 'gpt-5-mini';

ALTER TABLE agent_configs
ALTER COLUMN max_tokens SET DEFAULT 4096;

COMMENT ON COLUMN agent_configs.model IS 'OpenAI model ID for the agent (default: gpt-5-mini; Responses API uses reasoning medium and verbosity low in backend)';
