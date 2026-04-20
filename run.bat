@echo off
title Cotizador CYC
color 0A

echo.
echo  ============================================
echo    TRANSPORTES CYC - Sistema de Cotizaciones
echo  ============================================
echo.

cd /d "%~dp0"

REM Verificar Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python no esta instalado.
    echo Descargalo desde: https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

REM Instalar dependencias si no existen
python -c "import flask" >nul 2>&1
if errorlevel 1 (
    echo Instalando dependencias por primera vez...
    pip install flask reportlab google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client
    if errorlevel 1 (
        echo [ERROR] No se pudieron instalar las dependencias.
        pause
        exit /b 1
    )
    echo Dependencias instaladas correctamente.
    echo.
)

echo  Iniciando servidor...
echo  Abre tu navegador en: http://localhost:5000
echo  Para cerrar: presiona Ctrl+C
echo.

REM Abrir navegador automaticamente
start /b "" timeout /t 2 /nobreak >nul 2>&1
start "" "http://localhost:5000"

python app.py

pause
