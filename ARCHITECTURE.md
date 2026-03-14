# 🏗️ Arquitetura DocVault API

## Visão Geral

A DocVault API é uma aplicação serverless construída com Next.js App Router, utilizando Supabase como backend-as-a-service completo.

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTE                                  │
│                    (Insomnia, Postman, App)                     │
└─────────────────────┬───────────────────────────────────────────┘
                      │ HTTP / REST
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                      VERCEL EDGE                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  /api/auth  │  │ /api/docs   │  │ /api/documents/:id/...  │  │
│  │   Routes    │  │   Routes    │  │      Nested Routes      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Middleware de Autenticação                 │   │
│  │         (JWT validation + Header injection)             │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │    Auth     │  │  PostgreSQL │  │       Storage           │  │
│  │   (JWT)     │  │   (Tables)  │  │    (PDF Files)          │  │
│  │             │  │             │  │                         │  │
│  │ • Sign Up   │  │ • documents │  │ • Bucket: documents     │  │
│  │ • Sign In   │  │ • versions  │  │ • RLS Policies          │  │
│  │ • Sessions  │  │ • RLS       │  │ • Signed URLs           │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Fluxo de Autenticação

```
┌─────────┐     ┌─────────────┐     ┌──────────┐     ┌─────────┐
│ Cliente │────▶│ /auth/login │────▶│ Supabase │────▶│  JWT    │
└─────────┘     └─────────────┘     └──────────┘     └────┬────┘
                                                          │
                              ┌────────────────────────────┘
                              │
                              ▼
┌─────────┐     ┌─────────────┐     ┌─────────────────────────┐
│ Cliente │────▶│  API Route  │────▶│   JWT Validation        │
│ + JWT   │     │  Protegida  │     │   (Middleware)          │
└─────────┘     └─────────────┘     └─────────────────────────┘
```

## Fluxo de Upload de Documento

```
┌─────────┐     ┌─────────────┐     ┌──────────────────────────────┐
│ Cliente │────▶│ POST /docs  │────▶│  1. Validar arquivo (PDF)    │
│ + PDF   │     │  multipart  │     │  2. Gerar SHA-256 hash       │
└─────────┘     └─────────────┘     │  3. Upload para Storage      │
                                    │  4. Criar registro no DB     │
                                    │  5. Criar versão inicial     │
                                    │  6. Disparar webhook         │
                                    └──────────────────────────────┘
```

## Fluxo de Versionamento

```
┌─────────┐     ┌─────────────┐     ┌──────────────────────────────┐
│ Cliente │────▶│ PATCH /:id  │────▶│  1. Buscar documento atual   │
│+novo PDF│     │  + arquivo  │     │  2. Salvar versão anterior   │
└─────────┘     └─────────────┘     │  3. Fazer upload novo file   │
                                    │  4. Atualizar documento      │
                                    │  5. Incrementar versão       │
                                    └──────────────────────────────┘
```

## Fluxo de Verificação de Hash

```
┌─────────┐     ┌─────────────┐     ┌──────────────────────────────┐
│ Cliente │────▶│POST /verify │────▶│  1. Receber arquivo          │
│ + PDF   │     │  multipart  │     │  2. Calcular SHA-256         │
└─────────┘     └─────────────┘     │  3. Comparar com hash salvo  │
                                    │  4. Retornar resultado       │
                                    │     (timing-safe compare)    │
                                    └──────────────────────────────┘
```

## Modelo de Dados

### Tabela `documents`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | PK, auto-generated |
| title | VARCHAR(255) | Título do documento |
| owner_id | UUID | FK para auth.users |
| file_url | TEXT | URL assinada do arquivo |
| file_path | TEXT | Path no storage (userId/timestamp-filename) |
| file_hash | VARCHAR(64) | SHA-256 do arquivo (hex) |
| status | VARCHAR(50) | draft, pending, signed, archived |
| version | INTEGER | Versão atual (default: 1) |
| created_at | TIMESTAMPTZ | Data de criação |
| updated_at | TIMESTAMPTZ | Data de atualização |

### Tabela `document_versions`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | PK, auto-generated |
| document_id | UUID | FK para documents |
| version | INTEGER | Número da versão |
| file_url | TEXT | URL do arquivo nesta versão |
| file_path | TEXT | Path no storage |
| file_hash | VARCHAR(64) | SHA-256 do arquivo |
| created_by | UUID | FK para auth.users |
| created_at | TIMESTAMPTZ | Data da versão |
| change_notes | TEXT | Notas sobre a mudança |

## Segurança

### Row Level Security (RLS)

```sql
-- Usuários só veem seus próprios documentos
CREATE POLICY "Usuários podem ver seus próprios documentos"
    ON public.documents
    FOR SELECT
    USING (owner_id = auth.uid());
```

### Middleware de Autenticação

- Valida JWT em todas as rotas `/api/*`
- Injeta `X-User-Id` e `X-User-Email` nos headers
- Retorna 401 para tokens inválidos/ausentes

### Hash SHA-256

- Gerado no momento do upload
- Usado para verificação de integridade
- Comparação timing-safe para evitar timing attacks

### Storage

- Arquivos organizados por usuário: `userId/timestamp-filename.pdf`
- URLs assinadas com validade de 1 ano
- RLS policies para acesso controlado

## Webhooks

### Eventos

- `document.created` - Novo documento
- `document.updated` - Documento modificado
- `document.deleted` - Documento removido
- `document.signed` - Status alterado para "signed"
- `version.created` - Nova versão criada

### Assinatura

- HMAC-SHA256 do payload
- Header: `X-Webhook-Signature`
- Previne spoofing de webhooks

## Performance

### Otimizações

1. **Índices**: owner_id, status, created_at, document_id (versions)
2. **Paginação**: Todas as listagens são paginadas
3. **Caching**: URLs assinadas do storage com cache de 1 ano
4. **Selects específicos**: Evita `SELECT *` em queries complexas

### Escalabilidade

- Arquitetura serverless (auto-scaling)
- Supabase gerencia conexões PostgreSQL
- Storage com CDN global

## Testes

### Coleção de API

Veja [`api-collection.json`](api-collection.json) para importar no Insomnia/Postman.

### Testes Manuais

```bash
# 1. Registrar usuário
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@ex.com","password":"123456"}'

# 2. Login (salve o token)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@ex.com","password":"123456"}'

# 3. Upload documento
curl -X POST http://localhost:3000/api/documents \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@documento.pdf" \
  -F "title=Meu Documento"

# 4. Verificar hash
curl -X POST http://localhost:3000/api/documents/ID/verify \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@documento.pdf"
```