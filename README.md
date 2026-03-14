# 📄 DocVault API

API REST completa para gerenciamento seguro de documentos — com autenticação JWT, upload de PDF, versionamento automático, verificação de integridade via hash SHA-256, rate limiting e dashboard web.

🔗 **Demo em produção:** [docvault-api-cl21.vercel.app](https://docvault-api-cl21.vercel.app)

---

## 🚀 Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 14+ (App Router) + TypeScript |
| Banco de dados | Supabase (PostgreSQL) |
| Autenticação | Supabase Auth (JWT) |
| Storage | Supabase Storage |
| Rate Limiting | Upstash Redis |
| Testes | Vitest + Testing Library |
| Deploy | Vercel |

---

## ✨ Funcionalidades

### 🔐 Autenticação
- Registro e login com email + senha
- Sessões JWT via Supabase Auth
- Middleware de autenticação em todas as rotas protegidas
- Renovação automática de tokens

### 📄 Documentos
- Upload de PDFs (máx. 10MB)
- CRUD completo com autorização por ownership
- Filtros por status e busca por título
- Paginação configurável

### 🗂️ Versionamento
- Histórico automático a cada novo upload
- Rastreio de quem criou cada versão e notas de mudança

### 🔒 Integridade
- Hash SHA-256 gerado no upload e salvo no banco
- Endpoint de verificação: compara o hash do arquivo enviado com o registrado
- Comparação timing-safe para evitar timing attacks

### 🔗 Webhooks
- Eventos automaticamente disparados: `document.created`, `document.updated`, `document.deleted`, `document.signed`, `version.created`
- Assinatura HMAC-SHA256 em todos os payloads
- Endpoint receptor protegido por `X-Webhook-Secret`

### 🛡️ Rate Limiting
- Limitação por IP via Upstash Redis (sliding window)
- Rotas de autenticação: **10 req/min**
- Demais rotas: **60 req/min**
- Headers informativos: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- Fail-open: se o Redis estiver indisponível, a API continua funcionando

### 🖥️ Dashboard
- Interface web completa acessível em `/`
- Login e cadastro integrados
- Listagem, busca e atualização de status de documentos
- Drag-and-drop para upload
- Verificação de integridade visual
- Notificações toast em tempo real

---

## 🛠️ Setup Local

### 1. Clone e instale

```bash
git clone https://github.com/Junio243/docvault-api.git
cd docvault-api
npm install
```

### 2. Configure o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Vá em **SQL Editor → New query**
3. Cole e execute o conteúdo de [`supabase/schema.sql`](supabase/schema.sql)
   > O script cria as tabelas, índices, políticas RLS e o bucket de storage automaticamente.

### 3. Configure as variáveis de ambiente

```bash
cp .env.example .env.local
```

Edite `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Webhook
WEBHOOK_SECRET=uma-string-secreta-qualquer

# Upstash Redis — Rate Limiting (opcional)
# Crie grátis em https://console.upstash.com/redis
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

> **Nota:** As variáveis do Upstash são opcionais. Sem elas, o rate limiting é desativado silenciosamente e tudo continua funcionando.

### 4. Rode

```bash
npm run dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

---

## 🧪 Testes

```bash
# Rodar todos os testes
npm test

# Modo watch (re-executa ao salvar)
npm run test:watch

# Com relatório de cobertura
npm run test:coverage
```

**Cobertura atual:** 26 testes passando em 3 suites:
- `tests/lib/crypto.test.ts` — hash SHA-256, HMAC, tokens
- `tests/lib/api-response.test.ts` — helpers de resposta padronizada
- `tests/api/documents.test.ts` — rota de listagem de documentos

---

## 📚 Documentação da API

### Base URL

```
Local:     http://localhost:3000/api
Produção:  https://docvault-api-cl21.vercel.app/api
```

### Autenticação

Todas as rotas protegidas requerem o cookie de sessão Supabase (gerenciado automaticamente pelo browser) ou Bearer Token:

```http
Authorization: Bearer <access_token>
```

---

## 🔐 Auth

### `POST /api/auth/signup`

```json
{ "email": "usuario@exemplo.com", "password": "senha123" }
```

### `POST /api/auth/login`

```json
{ "email": "usuario@exemplo.com", "password": "senha123" }
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "...", "created_at": "..." },
    "session": {
      "access_token": "...",
      "refresh_token": "...",
      "expires_at": 1234567890,
      "expires_in": 3600
    }
  }
}
```

### `POST /api/auth/logout`
### `POST /api/auth/refresh` — `{ "refresh_token": "..." }`
### `GET  /api/auth/me`

---

## 📄 Documentos

### `GET /api/documents`

| Param | Tipo | Default | Descrição |
|---|---|---|---|
| `page` | number | `1` | Página |
| `limit` | number | `10` | Itens por página (máx. 50) |
| `status` | string | — | Filtra: `draft`, `pending`, `signed`, `archived` |
| `search` | string | — | Busca no título |

### `POST /api/documents` — `multipart/form-data`

| Campo | Obrigatório | Descrição |
|---|---|---|
| `file` | ✅ | Arquivo PDF (máx. 10MB) |
| `title` | ✅ | Título do documento (1–255 chars) |
| `status` | ❌ | Status inicial (default: `draft`) |

### `GET    /api/documents/:id`
### `PATCH  /api/documents/:id` — mesmos campos do POST, todos opcionais
### `DELETE /api/documents/:id`

---

## 📜 Versionamento

### `GET /api/documents/:id/versions`

Retorna todas as versões em ordem decrescente.

---

## 🔒 Verificação de Integridade

### `POST /api/documents/:id/verify` — `multipart/form-data`

Envia um arquivo PDF e verifica se o hash SHA-256 bate com o armazenado.

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

### `GET /api/documents/:id/verify`

Retorna as informações do hash sem realizar comparação.

---

## 🔗 Webhooks

### `POST /api/webhooks`

Endpoint receptor de eventos. Requer o header:
```http
X-Webhook-Secret: <WEBHOOK_SECRET>
```

### Eventos

| Evento | Disparado quando |
|---|---|
| `document.created` | Novo documento criado |
| `document.updated` | Documento atualizado |
| `document.deleted` | Documento deletado |
| `document.signed` | Status alterado para `signed` |
| `version.created` | Novo arquivo enviado (nova versão) |

### Payload

```json
{
  "event": "document.signed",
  "document_id": "uuid",
  "timestamp": "2026-03-14T01:00:00Z",
  "data": { "signed_by": "user-uuid", "signed_at": "..." }
}
```

### Headers enviados

```http
X-Webhook-Signature: <hmac-sha256-do-payload>
X-Webhook-Event: document.signed
X-Webhook-Secret: <secret>
Content-Type: application/json
```

### Verificar assinatura no receptor

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
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

## ❌ Códigos de Erro

```json
{
  "success": false,
  "error": { "code": "ERROR_CODE", "message": "Descrição" }
}
```

| Código | HTTP | Descrição |
|---|---|---|
| `UNAUTHORIZED` | 401 | Token ausente ou inválido |
| `FORBIDDEN` | 403 | Sem permissão |
| `NOT_FOUND` | 404 | Recurso não existe |
| `VALIDATION_ERROR` | 400 | Dados inválidos (Zod) |
| `FILE_REQUIRED` | 400 | Arquivo não enviado |
| `INVALID_FILE_TYPE` | 400 | Apenas PDF aceito |
| `FILE_TOO_LARGE` | 400 | Arquivo acima de 10MB |
| `NO_HASH_REGISTERED` | 400 | Documento sem hash para verificar |
| `RATE_LIMIT_EXCEEDED` | 429 | Muitas requisições |
| `INTERNAL_ERROR` | 500 | Erro interno |

---

## 📁 Estrutura do Projeto

```
docvault-api/
├── app/
│   ├── page.tsx                    # Dashboard UI
│   ├── layout.tsx
│   ├── globals.css
│   ├── components/
│   │   ├── Toast.tsx
│   │   └── UploadModal.tsx
│   └── api/
│       ├── auth/
│       │   ├── login/route.ts
│       │   ├── logout/route.ts
│       │   ├── me/route.ts
│       │   ├── refresh/route.ts
│       │   └── signup/route.ts
│       ├── documents/
│       │   ├── route.ts
│       │   └── [id]/
│       │       ├── route.ts
│       │       ├── verify/route.ts
│       │       └── versions/route.ts
│       └── webhooks/route.ts
├── lib/
│   ├── api-response.ts             # Helpers de resposta padronizada
│   ├── auth.ts                     # getCurrentUser, requireAuth
│   ├── crypto.ts                   # SHA-256, HMAC, tokens seguros
│   ├── ratelimit.ts                # Upstash rate limiting
│   ├── storage.ts                  # Upload/download Supabase Storage
│   ├── supabase.ts                 # Clientes server/service/browser
│   └── webhook.ts                  # Disparo de eventos
├── tests/
│   ├── setup.ts
│   ├── api/documents.test.ts
│   └── lib/
│       ├── api-response.test.ts
│       └── crypto.test.ts
├── types/
│   ├── index.ts
│   └── supabase.ts
├── supabase/
│   ├── schema.sql                  # Schema v2 completo
│   └── seed.sql
├── middleware.ts                   # Auth + Rate Limiting
├── vitest.config.ts
├── next.config.js
├── tsconfig.json
└── package.json
```

---

## 🚢 Deploy na Vercel

1. Conecte o repositório em [vercel.com](https://vercel.com)
2. Adicione as variáveis de ambiente no painel da Vercel
3. Deploy automático a cada push na `main`

---

## 📝 Licença

MIT — livre para usar e adaptar.
