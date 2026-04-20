import os

# ─── CONFIGURACIÓN TRANSPORTES CYC ───────────────────────────────────────────
COMPANY = {
    "name":     "TRANSPORTES CYC LIMITADA",
    "rut":      "76.350.127-2",
    "giro":     "Transporte de Carga y Arriendo de Maquinaria",
    "address":  "Américo Vespucio Norte N°2880, Oficina 1003, Conchalí – Santiago",
    "phone":    "+56 2 XXXX XXXX",
    "email":    "dtorres@tcyc.cl",
    "web":      "www.tcyc.cl",
}

# ─── GOOGLE ───────────────────────────────────────────────────────────────────
GOOGLE_CREDENTIALS_FILE = "credentials.json"
GOOGLE_TOKEN_FILE       = "token.json"
GOOGLE_SCOPES           = [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/gmail.send",
]
DRIVE_FOLDER_ID = "1ibiJaDuGwiBwaO9mP5N_YSUI9huhxJLz"

# ─── COTIZACIONES ─────────────────────────────────────────────────────────────
QUOTE_START_NUMBER = 1000
DATABASE_FILE      = "cotizaciones.db"
ASSETS_DIR         = os.path.join(os.path.dirname(__file__), "assets")
LOGO_PATH          = os.path.join(ASSETS_DIR, "logo.png")

# ─── CONDICIONES COMERCIALES ──────────────────────────────────────────────────
TERMS = [
    "Tarifa considera certificación estándar del equipo.",
    "El valor del estado de pago mensual será calculado en base a las horas totales "
    "trabajadas, contabilizadas con el horómetro digital y satelital del equipo.",
    "CYC no se responsabiliza por lucro cesante del cliente ni por paralización de obras "
    "por huelga, fiestas u otras causas de fuerza mayor.",
    "Se considera un desgaste normal del 3% en base a 180 hrs mínimas mensuales.",
    "Cualquier daño producido al equipo por descuido o mala operación será cobrado al cliente.",
    "Toda intervención de reparación y mantención será realizada solo en talleres "
    "autorizados por la marca.",
    "Término del contrato de servicio con aviso mínimo de 30 días.",
    "Todos nuestros equipos cuentan con seguro con deducible del 10% del valor del siniestro, "
    "a cargo del cliente en caso de aceptación por la aseguradora. De lo contrario, "
    "el costo de reparación y/o reposición del activo es de cargo del cliente.",
    "Todos los valores son más IVA (19%).",
]

CARGO_ARRENDATARIO = [
    "Operador",
    "Combustible",
    "Lubricación / Engrase diario",
    "Desmovilización",
    "Elementos de Desgaste",
    "Reposición de Neumáticos en caso de cortes laterales",
    "Reparación en caso de daño por operación (Falla Operacional)",
]

CARGO_ARRENDADOR = [
    "KIT Mantenciones preventivas",
    "Fallas No Operacionales",
]
