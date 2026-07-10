@echo off
title O Melro - Visitantes (Desktop + Backoffice)
cd /d "%~dp0"

echo ===========================================
echo O MELRO - VISITANTES (DESKTOP + BACKOFFICE)
echo ===========================================
echo.

:: Fechar instancias antigas nas portas 3000/3001 (evita frontend/backend desatualizado)
for %%p in (3000 3001) do (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%%p " ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
)

:: Verificar se node_modules existe
if not exist "%~dp0node_modules" (
    echo [1/5] A instalar dependencias do visitor app...
    call npm install
    if errorlevel 1 (
        echo ERRO: Falha ao instalar dependencias!
        pause
        exit /b 1
    )
    echo.
)

:: Verificar dependencias do backoffice
if not exist "%~dp0o-melro-backoffice teste (1)\node_modules" (
    echo [*] A instalar dependencias do backoffice...
    cd /d "%~dp0o-melro-backoffice teste (1)"
    call npm install
    cd /d "%~dp0"
    echo.
)

:: Compilar o projeto
echo [2/5] A compilar o projeto...
call npm run build
if errorlevel 1 (
    echo ERRO: Falha na compilacao!
    pause
    exit /b 1
)
echo.

:: Iniciar backend do backoffice
echo [3/5] A iniciar servidor backend (backoffice)...
cd /d "%~dp0o-melro-backoffice teste (1)\server"
start "Melro Backend" /min cmd /c "node index.js"
cd /d "%~dp0"

:: Aguardar servidor iniciar
echo [4/5] A aguardar servidor backend...
timeout /t 3 /nobreak >nul
echo.

:: Iniciar frontend do backoffice
echo [*] A iniciar frontend backoffice...
cd /d "%~dp0o-melro-backoffice teste (1)"
start "Melro Backoffice" /min cmd /c "npx vite"
cd /d "%~dp0"
echo.

:: Iniciar Electron
echo [5/5] A iniciar O Melro (Desktop)...
echo.
echo ============================================
echo  Backend:    https://10.0.0.83:3001
echo  Backoffice: https://localhost:3000
echo  Desktop:    Electron
echo ============================================
echo.
npx electron .

pause
