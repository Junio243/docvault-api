#!/bin/bash

set -e

echo "=========================================="
echo "   DOCVAULT API - Upload para GitHub"
echo "=========================================="
echo

# Verifica se git está instalado
if ! command -v git &> /dev/null; then
    echo "[ERRO] Git não encontrado!"
    echo "Instale o Git: https://git-scm.com/downloads"
    exit 1
fi

echo "[1/5] Inicializando repositório Git..."
git init

echo
echo "[2/5] Adicionando arquivos..."
git add .

echo
echo "[3/5] Criando commit inicial..."
git commit -m "feat: initial commit - DocVault API

- Setup Next.js 14+ with TypeScript
- Auth with JWT (Supabase Auth)
- Document CRUD with PDF upload
- Versioning system
- SHA-256 hash verification
- Webhook events
- Full API documentation"

echo
echo "=========================================="
echo "[4/5] PRÓXIMO PASSO:"
echo "=========================================="
echo
echo "1. Crie o repositório no GitHub:"
echo "   https://github.com/new"
echo
echo "2. Nome do repositório: docvault-api"
echo
echo "3. NÃO inicialize com README (já temos um)"
echo
echo "4. Após criar, execute estes comandos:"
echo
echo "   git remote add origin https://github.com/SEU_USUARIO/docvault-api.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo
echo "=========================================="
echo
echo "Ou execute o comando automático (substitua SEU_USUARIO):"
echo
echo "   ./push-github.sh SEU_USUARIO"
echo