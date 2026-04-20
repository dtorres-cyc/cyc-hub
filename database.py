import sqlite3
import json
from datetime import datetime
from config import DATABASE_FILE, QUOTE_START_NUMBER


def get_conn():
    conn = sqlite3.connect(DATABASE_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_conn()
    c = conn.cursor()

    c.execute("""
        CREATE TABLE IF NOT EXISTS cotizaciones (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            numero          INTEGER UNIQUE NOT NULL,
            fecha           TEXT NOT NULL,
            cliente_nombre  TEXT NOT NULL,
            cliente_rut     TEXT,
            cliente_empresa TEXT,
            cliente_email   TEXT,
            cliente_fono    TEXT,
            cliente_dir     TEXT,
            cliente_cargo   TEXT,
            items_json      TEXT NOT NULL,
            subtotal        REAL NOT NULL,
            iva             REAL NOT NULL,
            total           REAL NOT NULL,
            validez_dias    INTEGER DEFAULT 30,
            notas           TEXT,
            drive_file_id   TEXT,
            drive_url       TEXT,
            email_enviado   INTEGER DEFAULT 0,
            creado_en       TEXT NOT NULL
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS productos (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre      TEXT NOT NULL,
            descripcion TEXT,
            precio_hora REAL,
            precio_mes  REAL,
            activo      INTEGER DEFAULT 1
        )
    """)

    # Productos iniciales de ejemplo
    c.execute("SELECT COUNT(*) FROM productos")
    if c.fetchone()[0] == 0:
        productos_default = [
            ("Camión Tolva Mercedes Benz Arocs 4848 22m³ (2021-2022)", "Horas mínimas: 180 hrs/mes. Periodo: 3 meses extendible. Incluye inclinómetro.", None, None),
            ("Camión Aljibe", "Capacidad según disponibilidad. Consultar especificaciones técnicas.", None, None),
        ]
        c.executemany(
            "INSERT INTO productos (nombre, descripcion, precio_hora, precio_mes) VALUES (?,?,?,?)",
            productos_default
        )

    conn.commit()
    conn.close()


def next_quote_number():
    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT MAX(numero) FROM cotizaciones")
    row = c.fetchone()
    conn.close()
    last = row[0] if row[0] else QUOTE_START_NUMBER - 1
    return last + 1


def save_quote(data: dict) -> int:
    conn = get_conn()
    c = conn.cursor()
    c.execute("""
        INSERT INTO cotizaciones
            (numero, fecha, cliente_nombre, cliente_rut, cliente_empresa,
             cliente_email, cliente_fono, cliente_dir, cliente_cargo,
             items_json, subtotal, iva, total, validez_dias, notas, creado_en)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    """, (
        data["numero"],
        data["fecha"],
        data["cliente_nombre"],
        data.get("cliente_rut", ""),
        data.get("cliente_empresa", ""),
        data.get("cliente_email", ""),
        data.get("cliente_fono", ""),
        data.get("cliente_dir", ""),
        data.get("cliente_cargo", ""),
        json.dumps(data["items"], ensure_ascii=False),
        data["subtotal"],
        data["iva"],
        data["total"],
        data.get("validez_dias", 30),
        data.get("notas", ""),
        datetime.now().isoformat(),
    ))
    row_id = c.lastrowid
    conn.commit()
    conn.close()
    return row_id


def update_drive_info(row_id: int, file_id: str, url: str):
    conn = get_conn()
    conn.execute(
        "UPDATE cotizaciones SET drive_file_id=?, drive_url=? WHERE id=?",
        (file_id, url, row_id)
    )
    conn.commit()
    conn.close()


def update_email_sent(row_id: int):
    conn = get_conn()
    conn.execute("UPDATE cotizaciones SET email_enviado=1 WHERE id=?", (row_id,))
    conn.commit()
    conn.close()


def get_all_quotes():
    conn = get_conn()
    rows = conn.execute(
        "SELECT * FROM cotizaciones ORDER BY numero DESC"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_products():
    conn = get_conn()
    rows = conn.execute(
        "SELECT * FROM productos WHERE activo=1 ORDER BY nombre"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def add_product(nombre, descripcion="", precio_hora=None, precio_mes=None):
    conn = get_conn()
    c = conn.cursor()
    c.execute(
        "INSERT INTO productos (nombre, descripcion, precio_hora, precio_mes) VALUES (?,?,?,?)",
        (nombre, descripcion, precio_hora, precio_mes)
    )
    pid = c.lastrowid
    conn.commit()
    conn.close()
    return pid


def delete_product(pid: int):
    conn = get_conn()
    conn.execute("UPDATE productos SET activo=0 WHERE id=?", (pid,))
    conn.commit()
    conn.close()
