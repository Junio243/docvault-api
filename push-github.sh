#!/bin/bash

if [ -z "$1" ]; then
    echo "Uso: ./push-github.sh NOME_USUARIO_GITHUB"
    echo "Exemplo: ./push-github.sh Junio243"
    exit 1
fi

USERNAME=$1
REPO_URL="https://github.com/$USERNAME/docvault-api.git"

echo "=========================================="
echo "   Fazendo push para GitHub"
echo "=========================================="
echo
echo "Usuário: $USERNAME"
echo "Repositório: $REPO_URL"
echo

git remote add origin "$REPO_URL" 2>/dev/null || git remote set-url origin "$REPO_URL"
git branch -M main
git push -u origin main

echo
echo "=========================================="
echo "   ✅ Upload concluído!"
echo "=========================================="
echo
echo "Seu repositório está em:"
echo "   $REPO_URL"
echo