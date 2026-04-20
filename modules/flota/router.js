// modules/flota/router.js — Rutas API del módulo de envío de flota
// Migrado desde server.js (Envío de flota disponible) a Express Router

const express  = require('express');
const router   = express.Router();
const path     = require('path');
const fs       = require('fs');

const { fetchEquipos, fetchContactos } = require('./notion');
const { getTransporter, buildEmailHtml } = require('./email');

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
    const contactos = await fetchContactos();
    res.json({ ok: true, contactos });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
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

module.exports = router;
