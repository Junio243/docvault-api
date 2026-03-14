-- ============================================
-- DocVault API - Schema do Supabase
-- ============================================

-- Habilita extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Tabela: documents
-- ============================================
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_hash VARCHAR(64),
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'signed', 'archived')),
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para documents
CREATE INDEX idx_documents_owner_id ON public.documents(owner_id);
CREATE INDEX idx_documents_status ON public.documents(status);
CREATE INDEX idx_documents_created_at ON public.documents(created_at);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Tabela: document_versions
-- ============================================
CREATE TABLE IF NOT EXISTS public.document_versions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    file_url TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_hash VARCHAR(64),
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    change_notes TEXT,
    
    -- Garante versão única por documento
    UNIQUE(document_id, version)
);

-- Índices para document_versions
CREATE INDEX idx_document_versions_document_id ON public.document_versions(document_id);
CREATE INDEX idx_document_versions_created_by ON public.document_versions(created_by);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Habilita RLS nas tabelas
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

-- Políticas para documents
CREATE POLICY "Usuários podem ver seus próprios documentos"
    ON public.documents
    FOR SELECT
    USING (owner_id = auth.uid());

CREATE POLICY "Usuários podem criar seus próprios documentos"
    ON public.documents
    FOR INSERT
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Usuários podem atualizar seus próprios documentos"
    ON public.documents
    FOR UPDATE
    USING (owner_id = auth.uid());

CREATE POLICY "Usuários podem deletar seus próprios documentos"
    ON public.documents
    FOR DELETE
    USING (owner_id = auth.uid());

-- Políticas para document_versions
CREATE POLICY "Usuários podem ver versões de seus documentos"
    ON public.document_versions
    FOR SELECT
    USING (
        document_id IN (
            SELECT id FROM public.documents WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Usuários podem criar versões em seus documentos"
    ON public.document_versions
    FOR INSERT
    WITH CHECK (
        document_id IN (
            SELECT id FROM public.documents WHERE owner_id = auth.uid()
        )
    );

-- ============================================
-- Storage Bucket
-- ============================================

-- Cria bucket para documentos (executar no Storage do Supabase)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Políticas de storage (executar após criar o bucket)
/*
CREATE POLICY "Usuários podem fazer upload de seus próprios documentos"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'documents' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Usuários podem ver seus próprios documentos"
    ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'documents' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Usuários podem deletar seus próprios documentos"
    ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'documents' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );
*/