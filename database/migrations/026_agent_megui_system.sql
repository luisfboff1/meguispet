-- =====================================================
-- AGENT MEGUI - AI CHAT SYSTEM
-- Per-user AI agent configurations, conversations, and messages
-- Uses LangChain SQL Agent with TypeORM + pg for read-only queries
-- =====================================================

-- Agent configurations per user
CREATE TABLE IF NOT EXISTS agent_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id BIGINT NOT NULL UNIQUE,

    -- LLM Provider Configuration
    provider VARCHAR(50) NOT NULL DEFAULT 'openai',
    model VARCHAR(100) NOT NULL DEFAULT 'gpt-4o',
    api_key_encrypted TEXT,

    -- Model Parameters
    temperature NUMERIC(3,2) DEFAULT 0.30,
    max_tokens INTEGER DEFAULT 4096,
    top_p NUMERIC(3,2) DEFAULT 1.00,
    frequency_penalty NUMERIC(3,2) DEFAULT 0.00,
    presence_penalty NUMERIC(3,2) DEFAULT 0.00,

    -- System Prompt / Custom Instructions
    system_prompt TEXT DEFAULT NULL,

    -- Skills Configuration (JSON array of enabled skill IDs)
    skills JSONB DEFAULT '["sql_query", "schema_explorer", "data_analysis"]'::jsonb,

    -- MCP Server Configuration (JSON array of server configs)
    mcp_servers JSONB DEFAULT '[]'::jsonb,

    -- Metadata
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT agent_configs_usuario_id_fkey
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Conversation threads (tabs)
CREATE TABLE IF NOT EXISTS agent_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id BIGINT NOT NULL,
    titulo VARCHAR(255) NOT NULL DEFAULT 'Nova conversa',

    -- Conversation metadata
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_pinned BOOLEAN NOT NULL DEFAULT false,

    -- Token tracking
    total_input_tokens INTEGER DEFAULT 0,
    total_output_tokens INTEGER DEFAULT 0,

    -- Timestamps
    last_message_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT agent_conversations_usuario_id_fkey
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Messages within conversations
CREATE TABLE IF NOT EXISTS agent_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL,

    -- Message content
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
    content TEXT NOT NULL,

    -- Tool call tracking
    tool_calls JSONB DEFAULT NULL,
    sql_queries JSONB DEFAULT NULL,

    -- Token usage for this specific message
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,

    -- Metadata
    model_used VARCHAR(100),
    thinking_time_ms INTEGER,

    -- File attachments
    attachments JSONB DEFAULT NULL,

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT agent_messages_conversation_id_fkey
        FOREIGN KEY (conversation_id) REFERENCES agent_conversations(id) ON DELETE CASCADE
);

-- =====================================================
-- PERFORMANCE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_agent_configs_usuario ON agent_configs(usuario_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_usuario ON agent_conversations(usuario_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_last_msg ON agent_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_active ON agent_conversations(usuario_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_agent_messages_conversation ON agent_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_created ON agent_messages(created_at ASC);

-- =====================================================
-- UPDATED_AT TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_agent_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_agent_configs_updated_at
    BEFORE UPDATE ON agent_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_configs_updated_at();

CREATE OR REPLACE FUNCTION update_agent_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_agent_conversations_updated_at
    BEFORE UPDATE ON agent_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_conversations_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE agent_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;

-- agent_configs: Users can only see/manage their own config
CREATE POLICY agent_configs_select ON agent_configs
    FOR SELECT USING (
        usuario_id IN (
            SELECT id FROM usuarios
            WHERE supabase_user_id = auth.uid()
        )
    );

CREATE POLICY agent_configs_insert ON agent_configs
    FOR INSERT WITH CHECK (
        usuario_id IN (
            SELECT id FROM usuarios
            WHERE supabase_user_id = auth.uid()
        )
    );

CREATE POLICY agent_configs_update ON agent_configs
    FOR UPDATE USING (
        usuario_id IN (
            SELECT id FROM usuarios
            WHERE supabase_user_id = auth.uid()
        )
    );

-- agent_conversations: Users can only see/manage their own conversations
CREATE POLICY agent_conversations_select ON agent_conversations
    FOR SELECT USING (
        usuario_id IN (
            SELECT id FROM usuarios
            WHERE supabase_user_id = auth.uid()
        )
    );

CREATE POLICY agent_conversations_insert ON agent_conversations
    FOR INSERT WITH CHECK (
        usuario_id IN (
            SELECT id FROM usuarios
            WHERE supabase_user_id = auth.uid()
        )
    );

CREATE POLICY agent_conversations_update ON agent_conversations
    FOR UPDATE USING (
        usuario_id IN (
            SELECT id FROM usuarios
            WHERE supabase_user_id = auth.uid()
        )
    );

CREATE POLICY agent_conversations_delete ON agent_conversations
    FOR DELETE USING (
        usuario_id IN (
            SELECT id FROM usuarios
            WHERE supabase_user_id = auth.uid()
        )
    );

-- agent_messages: Accessible if user owns the conversation
CREATE POLICY agent_messages_select ON agent_messages
    FOR SELECT USING (
        conversation_id IN (
            SELECT ac.id FROM agent_conversations ac
            JOIN usuarios u ON u.id = ac.usuario_id
            WHERE u.supabase_user_id = auth.uid()
        )
    );

CREATE POLICY agent_messages_insert ON agent_messages
    FOR INSERT WITH CHECK (
        conversation_id IN (
            SELECT ac.id FROM agent_conversations ac
            JOIN usuarios u ON u.id = ac.usuario_id
            WHERE u.supabase_user_id = auth.uid()
        )
    );

-- =====================================================
-- READ-ONLY QUERY EXECUTION FUNCTION
-- Safety layer for SQL Agent queries
-- =====================================================

CREATE OR REPLACE FUNCTION execute_readonly_query(query_text TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '10s'
SET work_mem = '16MB'
AS $$
DECLARE
  result JSONB;
  normalized TEXT;
BEGIN
  normalized := UPPER(TRIM(query_text));

  -- Block dangerous operations
  IF normalized ~ '\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|GRANT|REVOKE|COPY|EXECUTE)\b' THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed. Detected forbidden keyword.';
  END IF;

  -- Must start with SELECT or WITH (CTEs)
  IF NOT (normalized ~ '^\s*(SELECT|WITH)\b') THEN
    RAISE EXCEPTION 'Query must start with SELECT or WITH';
  END IF;

  -- Execute with row limit of 500
  EXECUTE format(
    'SELECT jsonb_agg(row_to_json(t)) FROM (SELECT * FROM (%s) sub LIMIT 500) t',
    query_text
  ) INTO result;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;
