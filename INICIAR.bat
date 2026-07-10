@echo off
title O Melro - Visitor Management
echo ============================================
echo        O MELRO - VISITOR MANAGEMENT
echo ============================================
echo.

:: Inicia o servidor backend (backoffice)
echo [1/2] Iniciando servidor backend...
cd /d "%~dp0o-melro-backoffice teste (1)\server"
start "Melro Backend" cmd /k "node index.js"

:: Aguarda o servidor iniciar
timeout /t 3 /nobreak >nul

:: Inicia o frontend do backoffice
echo [2/2] Iniciando frontend backoffice...
cd /d "%~dp0o-melro-backoffice teste (1)"
start "Melro Backoffice" cmd /k "npx vite"

:: Inicia o frontend do visitor app
echo [3/3] Iniciando frontend visitor app...
cd /d "%~dp0"
start "Melro Visitor App" cmd /k "npx vite"

echo.
echo ============================================
echo  Tudo iniciado! Aguarde os servidores...
echo  Backend:    https://10.0.0.83:3001
echo  Backoffice: https://localhost:3000
echo  Visitor:    http://localhost:5173
echo ============================================
echo.
echo Pode fechar esta janela.
pause
