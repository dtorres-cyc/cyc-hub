// modules/cotizador/db.js — SQLite para el cotizador (migrado desde database.py)
const Database = require('better-sqlite3');
const path = require('path');
const { QUOTE_START_NUMBER } = require('../../shared/config');

const DB_PATH = process.env.COTIZADOR_DB_PATH || path.join(__dirname, '..', '..', 'cotizaciones.db');

let _db = null;
function getDb() {
  if (!_db) _db = new Database(DB_PATH);
  return _db;
}

function initDb() {
  const db = getDb();

  db.exec(`
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
    );

    CREATE TABLE IF NOT EXISTS productos (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre      TEXT NOT NULL,
      descripcion TEXT,
      precio_hora REAL,
      precio_mes  REAL,
      activo      INTEGER DEFAULT 1
    );
  `);

  // Productos de ejemplo si la tabla está vacía
  const count = db.prepare('SELECT COUNT(*) as n FROM productos').get().n;
  if (count === 0) {
    const ins = db.prepare(
      'INSERT INTO productos (nombre, descripcion, precio_hora, precio_mes) VALUES (?, ?, ?, ?)'
    );
    ins.run('Camión Tolva Mercedes Benz Arocs 4848 22m³ (2021-2022)',
      'Horas mínimas: 180 hrs/mes. Periodo: 3 meses extendible. Incluye inclinómetro.', null, null);
    ins.run('Camión Aljibe',
      'Capacidad según disponibilidad. Consultar especificaciones técnicas.', null, null);
  }

  console.log('📦 Base de datos cotizador lista:', DB_PATH);
}

function nextQuoteNumber() {
  const db = getDb();
  const row = db.prepare('SELECT MAX(numero) as max FROM cotizaciones').get();
  const last = row.max ?? (QUOTE_START_NUMBER - 1);
  return last + 1;
}

function saveQuote(data) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO cotizaciones
      (numero, fecha, cliente_nombre, cliente_rut, cliente_empresa,
       cliente_email, cliente_fono, cliente_dir, cliente_cargo,
       items_json, subtotal, iva, total, validez_dias, notas, creado_en)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);
  const info = stmt.run(
    data.numero, data.fecha, data.cliente_nombre,
    data.cliente_rut || '', data.cliente_empresa || '',
    data.cliente_email || '', data.cliente_fono || '',
    data.cliente_dir || '', data.cliente_cargo || '',
    JSON.stringify(data.items),
    data.subtotal, data.iva, data.total,
    data.validez_dias ?? 30,
    data.notas || '',
    new Date().toISOString()
  );
  return info.lastInsertRowid;
}

function updateDriveInfo(rowId, fileId, url) {
  getDb().prepare(
    'UPDATE cotizaciones SET drive_file_id=?, drive_url=? WHERE id=?'
  ).run(fileId, url, rowId);
}

function updateEmailSent(rowId) {
  getDb().prepare('UPDATE cotizaciones SET email_enviado=1 WHERE id=?').run(rowId);
}

function getAllQuotes() {
  return getDb().prepare('SELECT * FROM cotizaciones ORDER BY numero DESC').all();
}

function getProducts() {
  return getDb().prepare('SELECT * FROM productos WHERE activo=1 ORDER BY nombre').all();
}

function addProduct(nombre, descripcion = '', precio_hora = null, precio_mes = null) {
  const info = getDb().prepare(
    'INSERT INTO productos (nombre, descripcion, precio_hora, precio_mes) VALUES (?,?,?,?)'
  ).run(nombre, descripcion, precio_hora, precio_mes);
  return info.lastInsertRowid;
}

function deleteProduct(pid) {
  getDb().prepare('UPDATE productos SET activo=0 WHERE id=?').run(pid);
}

module.exports = {
  initDb, nextQuoteNumber, saveQuote,
  updateDriveInfo, updateEmailSent,
  getAllQuotes, getProducts, addProduct, deleteProduct,
};
