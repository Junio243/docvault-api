# 📄 DocVault API

API REST de gerenciamento de documentos com autenticação JWT, upload de PDF, versionamento e verificação de integridade via hash SHA-256.

## 🚀 Stack

- **Next.js 14+** (App Router) com TypeScript
- **Supabase** - Banco de dados + Autenticação + Storage
- **Vercel** - Deploy

## 📋 Funcionalidades

### ✅ Fase 1 - Core
- [x] Autenticação com JWT via Supabase Auth (email + senha)
- [x] Upload de arquivos PDF para Supabase Storage
- [x] CRUD completo de documentos
- [x] Cada documento tem: id, title, owner_id, file_url, created_at, status

### ✅ Fase 2 - Intermediário
- [x] Versionamento: ao fazer upload de um novo PDF, salva histórico de versões
- [x] Endpoint `GET /api/documents/:id/versions` retornando todas as versões
- [x] Middleware de autorização: só o dono pode editar/deletar seu documento

### ✅ Fase 3 - Avançado
- [x] Gera hash SHA-256 do arquivo no upload e salva no banco
- [x] Endpoint `GET /api/documents/:id/verify` que recebe arquivo e verifica hash
- [x] Webhook que dispara eventos quando documento é assinado

---

## 🛠️ Setup Local

### 1. Clone e Instale

```bash
git clone https://github.com/seu-usuario/docvault-api.git
cd docvault-api
npm install
```

### 2. Configure o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Vá em **SQL Editor** → **New query**
3. Cole e execute o conteúdo de [`supabase/schema.sql`](supabase/schema.sql)
4. Crie um bucket de storage chamado `documents` (público: false)
5. Configure as políticas de storage (instruções no arquivo schema.sql)

### 3. Configure as Variáveis de Ambiente

```bash
cp .env.example .env.local
```

Edite `.env.local` com suas credenciais do Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Rode o Projeto

```bash
npm run dev
```

Acesse: http://localhost:3000

---

## 📚 Documentação da API

### Base URL

```
Local: http://localhost:3000/api
Produção: https://seu-app.vercel.app/api
```

### Autenticação

Todas as rotas (exceto auth) requerem autenticação via Bearer Token:

```http
Authorization: Bearer <access_token>
```

---

## 🔐 Autenticação

### Registrar Usuário

```http
POST /auth/signup
Content-Type: application/json

{
  "email": "usuario@exemplo.com",
  "password": "senha123"
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "usuario@exemplo.com",
      "created_at": "2024-01-15T10:30:00Z"
    },
    "message": "Usuário criado com sucesso. Verifique seu email para confirmar."
  }
}
```

### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "usuario@exemplo.com",
  "password": "senha123"
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "session": {
      "access_token": "jwt-token",
      "refresh_token": "refresh-token",
      "expires_at": 1234567890,
      "expires_in": 3600
    }
  }
}
```

### Refresh Token

```http
POST /auth/refresh
Content-Type: application/json

{
  "refresh_token": "refresh-token"
}
```

### Logout

```http
POST /auth/logout
Authorization: Bearer <token>
```

### Obter Usuário Atual

```http
GET /auth/me
Authorization: Bearer <token>
```

---

## 📄 Documentos

### Listar Documentos

```http
GET /documents?page=1&limit=10&status=draft&search=contrato
Authorization: Bearer <token>
```

**Query Params:**
- `page` (opcional): Página atual (default: 1)
- `limit` (opcional): Itens por página (max: 50, default: 10)
- `status` (opcional): Filtra por status (draft, pending, signed, archived)
- `search` (opcional): Busca no título

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Contrato de Serviços",
      "owner_id": "uuid",
      "file_url": "https://...",
      "file_path": "user-id/timestamp-file.pdf",
      "file_hash": "sha256-hash",
      "status": "draft",
      "version": 1,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "meta": {
    "total": 25,
    "page": 1,
    "limit": 10
  }
}
```

### Criar Documento

```http
POST /documents
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <arquivo.pdf>
title: "Título do Documento"
status: "draft" (opcional)
```

**Restrições:**
- Apenas arquivos PDF
- Tamanho máximo: 10MB

### Obter Documento

```http
GET /documents/:id
Authorization: Bearer <token>
```

### Atualizar Documento

```http
PATCH /documents/:id
Authorization: Bearer <token>
Content-Type: multipart/form-data

title: "Novo Título" (opcional)
status: "signed" (opcional)
file: <novo-arquivo.pdf> (opcional)
change_notes: "Notas sobre a mudança" (opcional)
```

**Nota:** Ao enviar um novo arquivo, uma nova versão é criada automaticamente.

### Deletar Documento

```http
DELETE /documents/:id
Authorization: Bearer <token>
```

---

## 📜 Versionamento

### Listar Versões

```http
GET /documents/:id/versions
Authorization: Bearer <token>
```

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "document_id": "uuid",
      "version": 2,
      "file_url": "https://...",
      "file_path": "user-id/timestamp-v2.pdf",
      "file_hash": "sha256-hash",
      "created_by": "uuid",
      "created_at": "2024-01-15T11:00:00Z",
      "change_notes": "Atualização de valores"
    },
    {
      "id": "uuid",
      "document_id": "uuid",
      "version": 1,
      "file_url": "https://...",
      "file_path": "user-id/timestamp-v1.pdf",
      "file_hash": "sha256-hash",
      "created_by": "uuid",
      "created_at": "2024-01-15T10:30:00Z",
      "change_notes": "Versão inicial"
    }
  ],
  "meta": {
    "total": 2
  }
}
```

---

## 🔐 Verificação de Integridade

### Verificar Hash do Documento

```http
POST /documents/:id/verify
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <arquivo-para-verificar.pdf>
```

**Resposta (Hash válido):**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "document_id": "uuid",
    "version": 2,
    "stored_hash": "abc123...",
    "provided_hash": "abc123...",
    "message": "Integridade verificada: O arquivo é idêntico ao registrado"
  }
}
```

**Resposta (Hash inválido):**
```json
{
  "success": true,
  "data": {
    "valid": false,
    "document_id": "uuid",
    "version": 2,
    "stored_hash": "abc123...",
    "provided_hash": "xyz789...",
    "message": "ALERTA: O arquivo foi alterado! Os hashes não correspondem."
  }
}
```

### Obter Informações do Hash

```http
GET /documents/:id/verify
Authorization: Bearer <token>
```

---

## 🔗 Webhooks

### Eventos Disponíveis

| Evento | Descrição |
|--------|-----------|
| `document.created` | Novo documento criado |
| `document.updated` | Documento atualizado |
| `document.deleted` | Documento deletado |
| `document.signed` | Documento foi assinado (status: signed) |
| `version.created` | Nova versão criada |

### Payload do Webhook

```json
{
  "event": "document.signed",
  "document_id": "uuid",
  "timestamp": "2024-01-15T14:30:00Z",
  "data": {
    "signed_by": "user-uuid",
    "signed_at": "2024-01-15T14:30:00Z"
  }
}
```

### Headers

```http
X-Webhook-Signature: sha256=signature
X-Webhook-Event: document.signed
Content-Type: application/json
```

### Verificação de Assinatura

```javascript
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

---

## ❌ Erros

### Formato de Erro

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Descrição do erro",
    "details": { }
  }
}
```

### Códigos de Erro

| Código | HTTP | Descrição |
|--------|------|-----------|
| `UNAUTHORIZED` | 401 | Token inválido ou ausente |
| `FORBIDDEN` | 403 | Sem permissão para acessar recurso |
| `NOT_FOUND` | 404 | Recurso não encontrado |
| `BAD_REQUEST` | 400 | Requisição inválida |
| `VALIDATION_ERROR` | 400 | Dados de entrada inválidos |
| `FILE_REQUIRED` | 400 | Arquivo obrigatório não enviado |
| `INVALID_FILE_TYPE` | 400 | Apenas PDF aceito |
| `FILE_TOO_LARGE` | 400 | Arquivo > 10MB |
| `NO_HASH_REGISTERED` | 400 | Documento sem hash para verificar |
| `INTERNAL_ERROR` | 500 | Erro interno do servidor |

---

## 📁 Estrutura do Projeto

```
docvault-api/
├── app/
│   └── api/
│       ├── auth/
│       │   ├── signup/route.ts
│       │   ├── login/route.ts
│       │   ├── logout/route.ts
│       │   ├── me/route.ts
│       │   └── refresh/route.ts
│       └── documents/
│           ├── route.ts
│           └── [id]/
│               ├── route.ts
│               ├── versions/route.ts
│               └── verify/route.ts
├── lib/
│   ├── supabase.ts       # Clientes Supabase
│   ├── crypto.ts         # Hash SHA-256 & utilitários
│   ├── storage.ts        # Operações de storage
│   ├── auth.ts           # Funções de autenticação
│   ├── api-response.ts   # Helpers de resposta
│   └── webhook.ts        # Disparo de webhooks
├── types/
│   ├── index.ts          # Tipos da aplicação
│   └── supabase.ts       # Tipos do Supabase
├── supabase/
│   ├── schema.sql        # Schema do banco
│   └── seed.sql          # Dados de teste
├── middleware.ts         # Auth middleware
├── next.config.js
├── tsconfig.json
└── package.json
```

---

## 🚀 Deploy

### Vercel

1. Conecte seu repositório GitHub na Vercel
2. Configure as variáveis de ambiente
3. Deploy automático a cada push

```bash
# Deploy manual (opcional)
npm i -g vercel
vercel --prod
```

---

## 📝 Licença

MIT - Sinta-se livre para usar e modificar!

---

## 👨‍💻 Autor

Desenvolvido como desafio técnico de full-stack com foco em segurança e cloud.

---

## 📞 Suporte

Para dúvidas ou problemas, abra uma issue no repositório.