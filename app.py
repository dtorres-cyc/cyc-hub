"""
Cotizador CYC – Backend Flask
"""

import os
import json
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory, send_file
from io import BytesIO

from database import (init_db, next_quote_number, save_quote,
                      update_drive_info, update_email_sent,
                      get_all_quotes, get_products, add_product, delete_product)
from pdf_generator import generate_pdf
from config import COMPANY

# ── Inicializar Google solo si existen credenciales ───────────────────────────
GOOGLE_READY = os.path.exists("credentials.json")
if GOOGLE_READY:
    try:
        from google_services import upload_to_drive, send_email as _send_email
    except ImportError:
        GOOGLE_READY = False

app = Flask(__name__, static_folder="templates", static_url_path="")

# ─── RUTAS ────────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return send_from_directory("templates", "index.html")


@app.route("/api/status")
def status():
    return jsonify({
        "company":      COMPANY,
        "google_ready": GOOGLE_READY,
        "next_number":  next_quote_number(),
    })


# ── Productos ─────────────────────────────────────────────────────────────────

@app.route("/api/products", methods=["GET"])
def api_get_products():
    return jsonify(get_products())


@app.route("/api/products", methods=["POST"])
def api_add_product():
    d = request.get_json()
    pid = add_product(
        d["nombre"],
        d.get("descripcion", ""),
        d.get("precio_hora"),
        d.get("precio_mes"),
    )
    return jsonify({"id": pid, "ok": True})


@app.route("/api/products/<int:pid>", methods=["DELETE"])
def api_delete_product(pid):
    delete_product(pid)
    return jsonify({"ok": True})


# ── Cotizaciones ──────────────────────────────────────────────────────────────

@app.route("/api/quotes", methods=["GET"])
def api_get_quotes():
    quotes = get_all_quotes()
    for q in quotes:
        q["items"] = json.loads(q["items_json"])
    return jsonify(quotes)


@app.route("/api/generate", methods=["POST"])
def api_generate():
    """
    Genera cotización:
    1. Asigna número
    2. Genera PDF
    3. Sube a Drive (si hay credenciales)
    4. Envía email (si hay credenciales y se solicita)
    5. Guarda en BBDD
    """
    d = request.get_json()

    numero = next_quote_number()
    fecha  = datetime.now().strftime("%d/%m/%Y")

    # Totales ya calculados en el frontend (con conversión UF→$)
    items    = d.get("items", [])
    subtotal = round(float(d.get("subtotal", 0)), 0)
    iva      = round(float(d.get("iva", 0)), 0)
    total    = round(float(d.get("total", 0)), 0)

    pdf_data = {
        "numero":       numero,
        "fecha":        fecha,
        "cliente":      d.get("cliente", {}),
        "items":        items,
        "subtotal":     subtotal,
        "iva":          iva,
        "total":        total,
        "validez_dias": d.get("validez_dias", 30),
        "notas":        d.get("notas", ""),
        "moneda":       d.get("moneda", "$"),
        "uf_valor":     d.get("uf_valor"),
    }

    # 2. Generar PDF
    pdf_bytes = generate_pdf(pdf_data)
    cliente_nombre = (d.get("cliente", {}).get("nombre")
                      or d.get("cliente", {}).get("empresa")
                      or "Cliente")
    pdf_filename = f"Cotización {numero:04d} - {cliente_nombre}.pdf"

    # 3. Guardar en DB primero
    db_data = {
        **pdf_data,
        "cliente_nombre":  cliente_nombre,
        "cliente_rut":     d["cliente"].get("rut", ""),
        "cliente_empresa": d["cliente"].get("empresa", ""),
        "cliente_email":   d["cliente"].get("email", ""),
        "cliente_fono":    d["cliente"].get("fono", ""),
        "cliente_dir":     d["cliente"].get("direccion", ""),
        "cliente_cargo":   d["cliente"].get("cargo", ""),
    }
    row_id = save_quote(db_data)

    # 4. Drive + Email
    drive_url  = ""
    drive_id   = ""
    email_sent = False
    errors     = []

    if GOOGLE_READY:
        try:
            drive_id, drive_url = upload_to_drive(pdf_bytes, pdf_filename)
            update_drive_info(row_id, drive_id, drive_url)
        except Exception as e:
            errors.append(f"Drive: {str(e)}")

        cliente_email = d["cliente"].get("email", "")
        send_mail     = d.get("send_email", True)
        if send_mail and cliente_email:
            try:
                _send_email(
                    to_email=cliente_email,
                    cliente_nombre=cliente_nombre,
                    numero=numero,
                    pdf_bytes=pdf_bytes,
                    pdf_filename=pdf_filename,
                    notas=d.get("notas", ""),
                )
                update_email_sent(row_id)
                email_sent = True
            except Exception as e:
                errors.append(f"Email: {str(e)}")
    else:
        errors.append("Google no configurado – PDF disponible para descarga manual.")

    return jsonify({
        "ok":        True,
        "numero":    numero,
        "row_id":    row_id,
        "drive_url": drive_url,
        "email_sent": email_sent,
        "pdf_b64":   __import__("base64").b64encode(pdf_bytes).decode(),
        "filename":  pdf_filename,
        "subtotal":  subtotal,
        "iva":       iva,
        "total":     total,
        "errors":    errors,
    })


@app.route("/api/preview", methods=["POST"])
def api_preview():
    """Vista previa del PDF sin guardar."""
    d        = request.get_json()
    subtotal = round(float(d.get("subtotal", 0)), 0)
    iva      = round(float(d.get("iva", 0)), 0)
    total    = round(float(d.get("total", 0)), 0)

    pdf_data = {
        "numero":       next_quote_number(),
        "fecha":        datetime.now().strftime("%d/%m/%Y"),
        "cliente":      d.get("cliente", {}),
        "items":        d.get("items", []),
        "subtotal":     subtotal,
        "iva":          iva,
        "total":        total,
        "validez_dias": d.get("validez_dias", 30),
        "notas":        d.get("notas", ""),
        "moneda":       d.get("moneda", "$"),
        "uf_valor":     d.get("uf_valor"),
    }
    pdf_bytes = generate_pdf(pdf_data)
    return send_file(BytesIO(pdf_bytes), mimetype="application/pdf",
                     download_name="preview.pdf")


# ─── ARRANQUE ─────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    init_db()
    print("=" * 55)
    print("  🚛  COTIZADOR TRANSPORTES CYC")
    print("=" * 55)
    print(f"  Abre tu navegador en:  http://localhost:5001")
    print(f"  Google configurado:    {'✅ Sí' if GOOGLE_READY else '❌ No (ver GUIA_CONFIGURACION.md)'}")
    print("=" * 55)
    app.run(host='0.0.0.0', port=5001, debug=True)
