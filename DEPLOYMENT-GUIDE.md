# 🚀 Guia de Deploy - DocVault API

## ✅ O que já foi feito

### 1. GitHub
- ✅ Repositório criado: https://github.com/Junio243/docvault-api
- ✅ Código completo enviado (34 arquivos)
- ✅ README completo com documentação da API
- ✅ Correção do ESLint aplicada

### 2. Supabase
- ✅ Organização "DocVault Projects" criada
- ✅ Projeto "docvault-api" provisionado
- 🔄 Aguardando finalização (pode levar alguns minutos)
- **Project ID**: `pffpbhzobwiwxdnzoubs`
- **URL**: https://supabase.com/dashboard/project/pffpbhzobwiwxdnzoubs

### 3. Vercel
- ✅ Tentativa de deploy realizada
- ⚠️ Deploy falhou - faltam variáveis de ambiente

---

## 📋 Próximos Passos (Manuais)

### 1. Configurar Supabase (5 minutos)

Acesse: https://supabase.com/dashboard/project/pffpbhzobwiwxdnzoubs

#### a) Criar Tabelas
1. Vá em **SQL Editor** (no menu lateral)
2. Clique em **New query**
3. Cole o conteúdo do arquivo [`supabase/schema.sql`](supabase/schema.sql)
4. Clique em **Run**

#### b) Criar Bucket de Storage
1. Vá em **Storage** (no menu lateral)
2. Clique em **New bucket**
3. Nome: `documents`
4. Desmarque "Public bucket"
5. Clique em **Create bucket**

#### c) Configurar Políticas do Storage
1. No SQL Editor, execute:
```sql
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

#### d) Pegar Credenciais
1. Vá em **Settings** → **API**
2. Copie:
   - **Project URL** (NEXT_PUBLIC_SUPABASE_URL)
   - **anon public** (NEXT_PUBLIC_SUPABASE_ANON_KEY)
   - **service_role secret** (SUPABASE_SERVICE_ROLE_KEY)

---

### 2. Configurar Vercel (3 minutos)

#### a) Adicionar Variáveis de Ambiente
1. Acesse: https://vercel.com/dashboard
2. Clique no projeto **docvault-api**
3. Vá em **Settings** → **Environment Variables**
4. Adicione as seguintes variáveis:

| Nome | Valor | Ambiente |
|------|-------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://pffpbhzobwiwxdnzoubs.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbG...` (anon key) | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbG...` (service_role key) | Production, Preview, Development |
| `NEXT_PUBLIC_APP_URL` | `https://docvault-api.vercel.app` | Production |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Development |

5. Clique em **Save**

#### b) Redeploy
1. Vá em **Deployments**
2. Encontre o deploy que falhou
3. Clique nos três pontos (...) → **Redeploy**
4. Marque "Use existing Build Cache"
5. Clique em **Redeploy**

---

### 3. Testar a API (2 minutos)

Após o deploy bem-sucedido:

```bash
# 1. Testar se a API está online
curl https://docvault-api.vercel.app/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@exemplo.com","password":"senha123"}'

# 2. Login
curl https://docvault-api.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@exemplo.com","password":"senha123"}'
```

---

## 🔗 Links Importantes

| Serviço | URL |
|---------|-----|
| **GitHub Repo** | https://github.com/Junio243/docvault-api |
| **Supabase Project** | https://supabase.com/dashboard/project/pffpbhzobwiwxdnzoubs |
| **Vercel Dashboard** | https://vercel.com/dashboard |

---

## 🐛 Problemas Comuns

### "Build failed: Cannot find module"
- Solução: Verifique se todas as dependências estão no package.json

### "Error: Cannot read property of undefined"
- Solução: Verifique se as variáveis de ambiente do Supabase estão configuradas

### "Deployment failed without error"
- Solução: Tente fazer um novo commit qualquer para forçar novo deploy

---

## ✅ Checklist Final

- [ ] Tabelas criadas no Supabase
- [ ] Bucket "documents" criado
- [ ] Políticas de storage configuradas
- [ ] Variáveis de ambiente no Vercel
- [ ] Deploy realizado com sucesso
- [ ] Teste de signup funcionando
- [ ] Teste de login funcionando
- [ ] Teste de upload de PDF funcionando

---

## 📝 Notas

- O projeto foi configurado para usar **Next.js 14+** com **App Router**
- O middleware de autenticação requer as variáveis do Supabase para funcionar
- O storage usa o bucket "documents" com acesso restrito por usuário
- As políticas RLS garantem que cada usuário só acesse seus próprios documentos

**Pronto!** 🎉 Após seguir estes passos, sua API estará totalmente funcional na nuvem!