-- Migration 029: Add timing_breakdown to agent_messages
-- Adds detailed timing information to track LLM thinking time vs tool execution time

ALTER TABLE agent_messages
ADD COLUMN IF NOT EXISTS timing_breakdown JSONB DEFAULT NULL;

COMMENT ON COLUMN agent_messages.timing_breakdown IS 'Detailed timing breakdown: {total_time_ms, llm_thinking_ms, tool_execution_ms, tools_count}';

-- Example structure:
-- {
--   "total_time_ms": 68737,
--   "llm_thinking_ms": 67917,
--   "tool_execution_ms": 820,
--   "tools_count": 5
-- }
