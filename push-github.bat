@echo off
chcp 65001 >nul

if "%~1"=="" (
    echo Uso: push-github.bat NOME_USUARIO_GITHUB
    echo Exemplo: push-github.bat Junio243
    exit /b 1
)

set USERNAME=%~1
set REPO_URL=https://github.com/%USERNAME%/docvault-api.git

echo ==========================================
echo    Fazendo push para GitHub
echo ==========================================
echo.
echo Usuario: %USERNAME%
echo Repositorio: %REPO_URL%
echo.

git remote add origin "%REPO_URL%" 2>nul || git remote set-url origin "%REPO_URL%"
git branch -M main
git push -u origin main

echo.
echo ==========================================
echo    ✅ Upload concluido!
echo ==========================================
echo.
echo Seu repositorio esta em:
echo    %REPO_URL%
echo.
pause