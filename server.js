// server.js — CYC Hub: Entry point del servidor unificado
require('dotenv').config();

const express = require('express');
const path    = require('path');

const app = express();
app.use(express.json({ limit: '10mb' }));

// ── Módulos ───────────────────────────────────────────────────────────────────
const cotizadorRouter = require('./modules/cotizador/router');
const flotaRouter     = require('./modules/flota/router');
const informeRouter   = require('./modules/informe/router');
const crmRouter       = require('./modules/crm/router');

// ── Cron Jobs ─────────────────────────────────────────────────────────────────
require('./modules/cron/weeklyReport');

// Inicializar base de datos del cotizador
const { initDb } = require('./modules/cotizador/db');
initDb();

// ── Portal central ────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Montar módulos────────────────────────────────────────────────────────────
app.use('/cotizador', cotizadorRouter);
app.use('/flota',     flotaRouter);
app.use('/informe',   informeRouter);
app.use('/crm',       crmRouter);

// ── Arranque ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('  🚛  CYC HUB — Plataforma de Herramientas CYC');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  🌐  Portal:     http://localhost:${PORT}`);
  console.log(`  📄  Cotizador:  http://localhost:${PORT}/cotizador`);
  console.log(`  🚜  Flota:      http://localhost:${PORT}/flota`);
  console.log(`  📊  Informe:    http://localhost:${PORT}/informe/index.html`);
  console.log(`  🤝  CRM:        http://localhost:${PORT}/crm`);
  console.log('═══════════════════════════════════════════════════');
  console.log('');
});
