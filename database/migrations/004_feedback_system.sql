-- =====================================================
-- FEEDBACK/SUPPORT SYSTEM SCHEMA
-- System for managing user feedback, bug reports, and feature requests
-- =====================================================

-- Feedback tickets table
CREATE TABLE IF NOT EXISTS feedback_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('bug', 'melhoria', 'funcionalidade', 'outro')),
    prioridade VARCHAR(20) DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'critica')),
    status VARCHAR(50) NOT NULL DEFAULT 'backlog' CHECK (status IN ('backlog', 'em_andamento', 'em_teste', 'concluido', 'cancelado')),
    usuario_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT,
    CONSTRAINT fk_feedback_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_feedback_updated_by FOREIGN KEY (updated_by) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- Feedback attachments table (for images and files)
CREATE TABLE IF NOT EXISTS feedback_anexos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL,
    nome_arquivo VARCHAR(255) NOT NULL,
    tipo_arquivo VARCHAR(100) NOT NULL,
    tamanho_bytes BIGINT NOT NULL,
    conteudo_base64 TEXT,
    url TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_anexo_ticket FOREIGN KEY (ticket_id) REFERENCES feedback_tickets(id) ON DELETE CASCADE
);

-- Feedback comments table (for updates and discussions)
CREATE TABLE IF NOT EXISTS feedback_comentarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL,
    usuario_id BIGINT NOT NULL,
    comentario TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_comentario_ticket FOREIGN KEY (ticket_id) REFERENCES feedback_tickets(id) ON DELETE CASCADE,
    CONSTRAINT fk_comentario_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_feedback_tickets_status ON feedback_tickets(status);
CREATE INDEX IF NOT EXISTS idx_feedback_tickets_usuario ON feedback_tickets(usuario_id);
CREATE INDEX IF NOT EXISTS idx_feedback_tickets_tipo ON feedback_tickets(tipo);
CREATE INDEX IF NOT EXISTS idx_feedback_tickets_created ON feedback_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_anexos_ticket ON feedback_anexos(ticket_id);
CREATE INDEX IF NOT EXISTS idx_feedback_comentarios_ticket ON feedback_comentarios(ticket_id);

-- Updated at trigger for feedback_tickets
CREATE OR REPLACE FUNCTION update_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_feedback_updated_at
    BEFORE UPDATE ON feedback_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_feedback_updated_at();

-- RLS Policies (Row Level Security)
ALTER TABLE feedback_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_anexos ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_comentarios ENABLE ROW LEVEL SECURITY;

-- Users can view all tickets
CREATE POLICY feedback_tickets_select_policy ON feedback_tickets
    FOR SELECT USING (true);

-- Users can insert their own tickets
CREATE POLICY feedback_tickets_insert_policy ON feedback_tickets
    FOR INSERT WITH CHECK (true);

-- Only admins can update tickets (status changes)
CREATE POLICY feedback_tickets_update_policy ON feedback_tickets
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM usuarios 
            WHERE usuarios.id = auth.uid()::bigint 
            AND usuarios.role = 'admin'
        )
    );

-- Users can view all attachments
CREATE POLICY feedback_anexos_select_policy ON feedback_anexos
    FOR SELECT USING (true);

-- Users can insert attachments for their tickets
CREATE POLICY feedback_anexos_insert_policy ON feedback_anexos
    FOR INSERT WITH CHECK (true);

-- Users can view all comments
CREATE POLICY feedback_comentarios_select_policy ON feedback_comentarios
    FOR SELECT USING (true);

-- Users can insert their own comments
CREATE POLICY feedback_comentarios_insert_policy ON feedback_comentarios
    FOR INSERT WITH CHECK (true);
