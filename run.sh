#!/bin/bash
echo ""
echo "============================================"
echo "  TRANSPORTES CYC - Sistema de Cotizaciones"
echo "============================================"
echo ""

cd "$(dirname "$0")"

# Verificar Python
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python 3 no está instalado."
    echo "Instálalo con: brew install python3  (Mac)"
    exit 1
fi

# Instalar TODAS las dependencias necesarias
echo "Verificando dependencias..."
pip3 install flask reportlab google-auth google-auth-oauthlib \
             google-auth-httplib2 google-api-python-client \
             --quiet --disable-pip-version-check

echo "✅ Dependencias listas"
echo ""
echo "Iniciando servidor en http://localhost:5001"
echo "Para cerrar: presiona Ctrl+C"
echo ""

# Abrir navegador (Mac)
sleep 3 && open "http://localhost:5001" &

python3 app.py
