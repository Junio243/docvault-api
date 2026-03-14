-- ============================================
-- DocVault API - Schema Completo v2
-- Execute no SQL Editor do Supabase
-- ============================================

-- Habilita extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- TABELA: documents
-- ============================================
CREATE TABLE IF NOT EXISTS public.documents (
    id          UUID         DEFAULT uuid_generate_v4() PRIMARY KEY,
    title       VARCHAR(255) NOT NULL,
    owner_id    UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_url    TEXT         NOT NULL,
    file_path   TEXT         NOT NULL,
    file_hash   VARCHAR(64),                          -- SHA-256 hex do arquivo
    status      VARCHAR(50)  DEFAULT 'draft'
                CHECK (status IN ('draft', 'pending', 'signed', 'archived')),
    version     INTEGER      DEFAULT 1 CHECK (version >= 1),
    created_at  TIMESTAMPTZ  DEFAULT NOW() NOT NULL,
    updated_at  TIMESTAMPTZ  DEFAULT NOW() NOT NULL
);

-- Índices de desempenho
CREATE INDEX IF NOT EXISTS idx_documents_owner_id   ON public.documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_status      ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at  ON public.documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_file_hash   ON public.documents(file_hash) WHERE file_hash IS NOT NULL;
-- Índice para busca Full-Text no título
CREATE INDEX IF NOT EXISTS idx_documents_title_search
    ON public.documents USING gin(to_tsvector('portuguese', title));

-- ============================================
-- TABELA: document_versions
-- ============================================
CREATE TABLE IF NOT EXISTS public.document_versions (
    id           UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
    document_id  UUID        NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    version      INTEGER     NOT NULL CHECK (version >= 1),
    file_url     TEXT        NOT NULL,
    file_path    TEXT        NOT NULL,
    file_hash    VARCHAR(64),
    created_by   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    change_notes TEXT,

    -- Versão única por documento
    UNIQUE(document_id, version)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_doc_versions_document_id ON public.document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_versions_created_by  ON public.document_versions(created_by);

-- ============================================
-- TABELA: webhook_logs (nova — auditoria)
-- ============================================
CREATE TABLE IF NOT EXISTS public.webhook_logs (
    id           UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
    event        VARCHAR(100) NOT NULL,   -- ex: document.created
    document_id  UUID        REFERENCES public.documents(id) ON DELETE SET NULL,
    payload      JSONB       NOT NULL,
    status       VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'retried')),
    response_status INTEGER,              -- HTTP status da resposta do webhook
    created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_document_id ON public.webhook_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event        ON public.webhook_logs(event);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at   ON public.webhook_logs(created_at DESC);

-- ============================================
-- FUNCTION + TRIGGER: auto atualiza updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_documents_updated_at ON public.documents;
CREATE TRIGGER trg_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE public.documents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs     ENABLE ROW LEVEL SECURITY;

-- --- Políticas: documents ---

DROP POLICY IF EXISTS "docs_select_own" ON public.documents;
CREATE POLICY "docs_select_own"
    ON public.documents FOR SELECT
    USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "docs_insert_own" ON public.documents;
CREATE POLICY "docs_insert_own"
    ON public.documents FOR INSERT
    WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "docs_update_own" ON public.documents;
CREATE POLICY "docs_update_own"
    ON public.documents FOR UPDATE
    USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "docs_delete_own" ON public.documents;
CREATE POLICY "docs_delete_own"
    ON public.documents FOR DELETE
    USING (owner_id = auth.uid());

-- --- Políticas: document_versions ---

DROP POLICY IF EXISTS "versions_select_own" ON public.document_versions;
CREATE POLICY "versions_select_own"
    ON public.document_versions FOR SELECT
    USING (
        document_id IN (
            SELECT id FROM public.documents WHERE owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "versions_insert_own" ON public.document_versions;
CREATE POLICY "versions_insert_own"
    ON public.document_versions FOR INSERT
    WITH CHECK (
        document_id IN (
            SELECT id FROM public.documents WHERE owner_id = auth.uid()
        )
    );

-- --- Políticas: webhook_logs (somente leitura para o dono) ---

DROP POLICY IF EXISTS "webhook_logs_select_own" ON public.webhook_logs;
CREATE POLICY "webhook_logs_select_own"
    ON public.webhook_logs FOR SELECT
    USING (
        document_id IN (
            SELECT id FROM public.documents WHERE owner_id = auth.uid()
        )
    );

-- ============================================
-- VIEW: document_summary (útil para dashboard)
-- ============================================
CREATE OR REPLACE VIEW public.document_summary AS
SELECT
    owner_id,
    COUNT(*)                                            AS total,
    COUNT(*) FILTER (WHERE status = 'draft')           AS draft_count,
    COUNT(*) FILTER (WHERE status = 'pending')         AS pending_count,
    COUNT(*) FILTER (WHERE status = 'signed')          AS signed_count,
    COUNT(*) FILTER (WHERE status = 'archived')        AS archived_count,
    COUNT(*) FILTER (WHERE file_hash IS NOT NULL)      AS with_hash_count,
    MAX(created_at)                                     AS last_document_at
FROM public.documents
GROUP BY owner_id;

-- ============================================
-- STORAGE BUCKET: documents (privado)
-- ============================================
-- Execute UMA VEZ no painel do Supabase > Storage > New Bucket
-- ou rode este SQL:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'documents',
    'documents',
    false,                          -- bucket privado
    10485760,                       -- 10 MB por arquivo
    ARRAY['application/pdf']        -- somente PDF
)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage
DROP POLICY IF EXISTS "storage_upload_own" ON storage.objects;
CREATE POLICY "storage_upload_own"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'documents' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "storage_select_own" ON storage.objects;
CREATE POLICY "storage_select_own"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'documents' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "storage_delete_own" ON storage.objects;
CREATE POLICY "storage_delete_own"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'documents' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );