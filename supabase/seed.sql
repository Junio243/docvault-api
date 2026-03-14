-- ============================================
-- DocVault API - Dados de Teste (Opcional)
-- ============================================

-- Nota: Execute isso apenas em ambiente de desenvolvimento
-- Substitua os UUIDs pelos IDs reais dos usuários de teste

/*
-- Inserir documentos de teste
INSERT INTO public.documents (id, title, owner_id, file_url, file_path, file_hash, status, version)
VALUES 
    (
        uuid_generate_v4(),
        'Contrato de Prestação de Serviços',
        'user-uuid-aqui',
        'https://...',
        'user-uuid-aqui/1234567890-contrato.pdf',
        'a1b2c3d4e5f6...',
        'signed',
        1
    ),
    (
        uuid_generate_v4(),
        'Proposta Comercial Q3 2024',
        'user-uuid-aqui',
        'https://...',
        'user-uuid-aqui/1234567891-proposta.pdf',
        'b2c3d4e5f6g7...',
        'pending',
        2
    );

-- Inserir versões de teste
INSERT INTO public.document_versions (document_id, version, file_url, file_path, file_hash, created_by, change_notes)
VALUES 
    (
        (SELECT id FROM public.documents WHERE title = 'Proposta Comercial Q3 2024'),
        1,
        'https://...',
        'user-uuid-aqui/1234567889-proposta-v1.pdf',
        'c3d4e5f6g7h8...',
        'user-uuid-aqui',
        'Versão inicial'
    );
*/