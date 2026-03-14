# 🚀 Quick Start - DocVault API

Inicie em 5 minutos!

## 1. Instalação

```bash
# Clone (ou use seu próprio repo)
git clone https://github.com/seu-usuario/docvault-api.git
cd docvault-api

# Instale dependências
npm install
```

## 2. Configurar Supabase

### Criar Projeto
1. Acesse [supabase.com](https://supabase.com) → New Project
2. Anote a **URL** e **Anon Key** (Settings → API)
3. Pegue a **Service Role Key** (mesma página, role: service_role)

### Criar Tabelas
1. No Supabase Studio, vá em **SQL Editor** → **New query**
2. Cole o conteúdo de [`supabase/schema.sql`](supabase/schema.sql)
3. Clique em **Run**

### Criar Storage Bucket
1. Vá em **Storage** → **New bucket**
2. Nome: `documents`
3. **Public bucket**: OFF (desmarcado)
4. Clique em **Create bucket**

### Configurar Políticas de Storage
Execute isso no SQL Editor:

```sql
-- Políticas do bucket documents
CREATE POLICY "Users can upload their own documents"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'documents' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can view their own documents"
    ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'documents' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can delete their own documents"
    ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'documents' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );
```

## 3. Configurar Ambiente

```bash
cp .env.example .env.local
```

Edite `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 4. Rodar

```bash
npm run dev
```

Acesse: http://localhost:3000

---

## 🧪 Testar a API

### 1. Criar Usuário

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@exemplo.com",
    "password": "senha123"
  }'
```

### 2. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@exemplo.com",
    "password": "senha123"
  }'
```

Guarde o `access_token` da resposta!

### 3. Upload de Documento

```bash
curl -X POST http://localhost:3000/api/documents \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -F "title=Meu Primeiro Documento" \
  -F "status=draft" \
  -F "file=@/caminho/para/documento.pdf"
```

### 4. Listar Documentos

```bash
curl http://localhost:3000/api/documents \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### 5. Verificar Hash

```bash
curl -X POST http://localhost:3000/api/documents/ID_DO_DOC/verify \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -F "file=@/caminho/para/documento.pdf"
```

---

## 📤 Deploy na Vercel

### Opção 1: Git + Dashboard
1. Push para GitHub
2. Vá em [vercel.com](https://vercel.com) → Add New Project
3. Importe seu repositório
4. Adicione as variáveis de ambiente (mesmas do .env.local)
5. Deploy! 🎉

### Opção 2: CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

---

## ✅ Checklist

- [ ] Projeto Supabase criado
- [ ] Tabelas criadas (schema.sql)
- [ ] Bucket "documents" criado
- [ ] Políticas de storage configuradas
- [ ] Variáveis de ambiente configuradas
- [ ] `npm run dev` funciona
- [ ] Signup funciona
- [ ] Login funciona
- [ ] Upload de PDF funciona
- [ ] Versionamento funciona
- [ ] Verificação de hash funciona
- [ ] Deploy na Vercel realizado

---

## 🐛 Problemas Comuns

### "Failed to fetch"
Verifique se o servidor está rodando (`npm run dev`)

### "UNAUTHORIZED"
Token JWT expirado ou inválido. Faça login novamente.

### "Erro ao fazer upload"
Verifique se o bucket "documents" existe e as políticas estão configuradas

### "permission denied for table"
Verifique se as políticas RLS estão corretas no schema.sql

---

Pronto! 🎉 Consulte o [README.md](README.md) completo para mais detalhes.