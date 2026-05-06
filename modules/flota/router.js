// modules/flota/router.js — Rutas API del módulo de envío de flota
// Migrado desde server.js (Envío de flota disponible) a Express Router

const express  = require('express');
const router   = express.Router();
const path     = require('path');
const fs       = require('fs');

const { fetchEquipos, fetchContactos } = require('./notion');
const { getTransporter, buildEmailHtml } = require('./email');
const { fetchContactosCRM } = require('./crm-contacts');

// ── Servir frontend de flota ──────────────────────────────────────────────────
router.use(express.static(path.join(__dirname, '..', '..', 'public', 'flota')));

router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'public', 'flota', 'index.html'));
});

// ── Historial ─────────────────────────────────────────────────────────────────
const HISTORIAL_PATH = path.join(__dirname, '..', '..', 'historial_flota.json');

function loadHistorial() {
  if (!fs.existsSync(HISTORIAL_PATH)) return [];
  try { return JSON.parse(fs.readFileSync(HISTORIAL_PATH, 'utf8')); }
  catch { return []; }
}

function saveHistorial(entry) {
  const hist = loadHistorial();
  hist.unshift(entry);
  fs.writeFileSync(HISTORIAL_PATH, JSON.stringify(hist.slice(0, 50), null, 2));
}

// ── API ───────────────────────────────────────────────────────────────────────
router.get('/api/equipos', async (req, res) => {
  try {
    const equipos = await fetchEquipos();
    res.json({ ok: true, equipos });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/api/contactos', async (req, res) => {
  try {
    // Intentar traer desde el CRM primero
    let contactos = await fetchContactosCRM();

    // Fallback a Notion si la BD del CRM está vacía
    if (!contactos.length) {
      console.log('   ⚠️  CRM vacío, usando Notion como fallback para contactos...');
      contactos = await fetchContactos();
    } else {
      console.log(`   ✅ Contactos desde CRM: ${contactos.length}`);
    }

    res.json({ ok: true, contactos, source: contactos.length ? 'crm' : 'notion' });
  } catch (err) {
    // Si falla CRM, intentar Notion
    try {
      const contactos = await fetchContactos();
      res.json({ ok: true, contactos, source: 'notion_fallback' });
    } catch (err2) {
      res.status(500).json({ ok: false, error: err.message });
    }
  }
});


router.post('/api/preview', async (req, res) => {
  try {
    const { equipoIds, includePhotos, messageText, showTarifa, customTarifas } = req.body;
    const todosLosEquipos = await fetchEquipos();
    const equipos = todosLosEquipos.filter(e => equipoIds.includes(e.id));
    const html = buildEmailHtml('Diego Torres', 'CYC (Vista Previa)', equipos, includePhotos, messageText, showTarifa, customTarifas || {});
    res.json({ ok: true, html });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/api/historial', (req, res) => {
  res.json({ ok: true, historial: loadHistorial() });
});

router.post('/api/send-campaign', async (req, res) => {
  const { equipoIds, contactoIds, includePhotos, subjectText, messageText,
          mode, senderEmail, showTarifa, customTarifas } = req.body;

  const transporter = getTransporter(senderEmail);
  const fromAddr    = senderEmail || process.env.GMAIL_USER;
  const fromHeader  = `"Diego Torres" <${fromAddr}>`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const emit = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    emit({ type: 'status', msg: 'Cargando datos desde Notion...' });
    const [todosLosEquipos, todosLosContactos] = await Promise.all([
      fetchEquipos(),
      fetchContactos(),
    ]);
    const equipos = todosLosEquipos.filter(e => equipoIds.includes(e.id));

    // ── MODO TEST ───────────────────────────────────────────────────────────
    if (mode === 'TEST') {
      emit({ type: 'status', msg: 'Generando correo de prueba...' });
      const html = buildEmailHtml('Diego Torres', 'CYC (Prueba)', equipos, includePhotos, messageText, showTarifa, customTarifas || {});

      emit({ type: 'status', msg: `Enviando a ${fromAddr}...` });
      await transporter.sendMail({
        from: fromHeader, to: fromAddr,
        subject: `[PRUEBA] ${subjectText}`, html,
      });

      saveHistorial({ id: Date.now(), fecha: new Date().toISOString(), modo: 'TEST', equipos: equipos.map(e => e.tipoMaquinaria), enviados: 1, saltados: 0 });
      emit({ type: 'done', enviados: 1, saltados: 0, msg: `✅ Prueba enviada a ${fromAddr}` });
      return res.end();
    }

    // ── MODO PRODUCCIÓN ─────────────────────────────────────────────────────
    const contactosAEnviar = todosLosContactos.filter(c => contactoIds.includes(c.id));
    const total = contactosAEnviar.length;
    let enviados = 0, saltados = 0;
    let whatsappCsv = 'Nombre,Empresa,Telefono,Mensaje_WhatsApp\n';
    const listaWpp = equipos.map(e => e.textoWpp).join('\n');

    emit({ type: 'total', total });

    for (const contacto of contactosAEnviar) {
      emit({ type: 'sending', current: `${contacto.nombre} <${contacto.correo}>`, enviados, total });

      const personalMsg = messageText.replace(/{{NOMBRE}}/g, contacto.nombre || '');
      const html = buildEmailHtml(contacto.nombre, contacto.empresa, equipos, includePhotos, personalMsg, showTarifa, customTarifas || {});

      try {
        await transporter.sendMail({
          from: fromHeader, to: contacto.correo,
          subject: subjectText.replace(/{{EMPRESA}}/g, contacto.empresa || ''),
          html,
        });
        enviados++;
      } catch (err) {
        saltados++;
        emit({ type: 'error', msg: `Error con ${contacto.correo}: ${err.message}` });
      }

      const wppMsg = `${personalMsg}\n\n${listaWpp}\n\nMe avisas cualquier cosa.`;
      whatsappCsv += `"${contacto.nombre}","${contacto.empresa}","${contacto.telefono}","${wppMsg.replace(/\n/g, '\\n')}"\n`;
    }

    fs.writeFileSync(path.join(__dirname, '..', '..', 'whatsapp_output.csv'), whatsappCsv, 'utf8');
    saveHistorial({ id: Date.now(), fecha: new Date().toISOString(), modo: 'PROD', equipos: equipos.map(e => e.tipoMaquinaria), enviados, saltados });
    emit({ type: 'done', enviados, saltados, msg: `✅ Campaña completada: ${enviados} enviados, ${saltados} saltados.` });
    res.end();

  } catch (err) {
    emit({ type: 'fatal', msg: `❌ Error: ${err.message}` });
    res.end();
  }
});

// ═══════════════════════════════════════════════════════
//  CRUD EQUIPOS — Base de Datos Local (reemplaza Notion)
// ═══════════════════════════════════════════════════════
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper: convierte registro DB al formato que usa el frontend de flota
function dbEquipoToFlota(e) {
  const tipoMaquinaria = e.tipoMaquinaria;
  const marca  = e.marca  || '';
  const modelo = e.modelo || '';
  const anio   = e.anio   || '';
  const horometro = e.horometro || '';
  const detalle   = e.detalle   || '';

  const especificacionesHtml = [
    marca     ? `<strong>Marca:</strong> ${marca}`           : '',
    modelo    ? `<strong>Modelo:</strong> ${modelo}`         : '',
    anio      ? `<strong>Año:</strong> ${anio}`              : '',
    horometro ? `<strong>Horómetro:</strong> ${horometro} hrs` : '',
    detalle   ? `<strong>Detalle:</strong> ${detalle}`       : '',
  ].filter(Boolean).join('<br>');

  return {
    id:               String(e.id),
    tipoMaquinaria,
    marca, modelo,
    año:              anio,
    horometro,
    detalle,
    tarifa:           e.tarifa      || '',
    imagenUrl:        e.imagenUrl   || null,
    numeroInterno:    e.numeroInterno || '',
    especificacionesHtml,
    textoWpp: [tipoMaquinaria, marca, modelo, anio ? `(${anio})` : ''].filter(Boolean).join(' '),
  };
}

// GET /flota/api/equipos/db — lista todos los equipos de la BD
router.get('/api/equipos/db', async (req, res) => {
  try {
    const equipos = await prisma.flotaEquipo.findMany({
      where: { activo: true },
      orderBy: { tipoMaquinaria: 'asc' }
    });
    res.json({ ok: true, equipos: equipos.map(dbEquipoToFlota), total: equipos.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /flota/api/equipos/admin — lista TODOS (incl. inactivos) para gestión
router.get('/api/equipos/admin', async (req, res) => {
  try {
    const equipos = await prisma.flotaEquipo.findMany({ orderBy: { tipoMaquinaria: 'asc' } });
    res.json({ ok: true, equipos });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /flota/api/equipos/db — crear equipo
router.post('/api/equipos/db', async (req, res) => {
  try {
    const { tipoMaquinaria, marca, modelo, anio, horometro, detalle, tarifa, imagenUrl, numeroInterno } = req.body;
    const eq = await prisma.flotaEquipo.create({
      data: { tipoMaquinaria, marca, modelo, anio, horometro, detalle, tarifa, imagenUrl, numeroInterno }
    });
    res.json({ ok: true, equipo: eq });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// PUT /flota/api/equipos/db/:id — actualizar equipo
router.put('/api/equipos/db/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { tipoMaquinaria, marca, modelo, anio, horometro, detalle, tarifa, imagenUrl, numeroInterno, activo } = req.body;
    const eq = await prisma.flotaEquipo.update({
      where: { id },
      data: { tipoMaquinaria, marca, modelo, anio, horometro, detalle, tarifa, imagenUrl, numeroInterno,
              activo: activo !== undefined ? Boolean(activo) : undefined }
    });
    res.json({ ok: true, equipo: eq });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// DELETE /flota/api/equipos/db/:id — eliminar equipo
router.delete('/api/equipos/db/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.flotaEquipo.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /flota/api/equipos/import-notion — importar desde Notion → BD (migración única)
router.post('/api/equipos/import-notion', async (req, res) => {
  try {
    const notionEquipos = await fetchEquipos();
    let creados = 0, existentes = 0;

    for (const e of notionEquipos) {
      const existing = e.id ? await prisma.flotaEquipo.findUnique({ where: { notionId: e.id } }) : null;
      if (existing) { existentes++; continue; }

      await prisma.flotaEquipo.create({
        data: {
          tipoMaquinaria: e.tipoMaquinaria || 'Sin Tipo',
          marca:          e.marca || null,
          modelo:         e.modelo || null,
          anio:           e.año || null,
          horometro:      e.horometro || null,
          detalle:        e.detalle || null,
          tarifa:         e.tarifa || null,
          imagenUrl:      e.imagenUrl || null,
          numeroInterno:  e.numeroInterno || null,
          notionId:       e.id || null,
        }
      });
      creados++;
    }

    res.json({ ok: true, creados, existentes, total: notionEquipos.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;

