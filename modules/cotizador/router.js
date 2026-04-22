// modules/cotizador/router.js — Rutas API del cotizador
// Migrado desde app.py (Flask) a Express

const express = require('express');
const router  = express.Router();
const path    = require('path');

const db     = require('./db');
const google = require('./google');
const { generatePdf } = require('./pdf');

// ── Servir frontend del cotizador ─────────────────────────────────────────────
router.use(express.static(path.join(__dirname, '..', '..', 'public', 'cotizador')));

router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'public', 'cotizador', 'index.html'));
});

// ── Status ────────────────────────────────────────────────────────────────────
router.get('/api/status', (req, res) => {
  res.json({
    company:      require('../../shared/config').COMPANY,
    google_ready: google.isReady(),
    next_number:  db.nextQuoteNumber(),
  });
});

// ── Productos ─────────────────────────────────────────────────────────────────
router.get('/api/products', (req, res) => {
  res.json(db.getProducts());
});

router.post('/api/products', (req, res) => {
  const d  = req.body;
  const id = db.addProduct(
    d.nombre,
    d.descripcion || '',
    d.precio_hora ?? null,
    d.precio_mes  ?? null,
  );
  res.json({ id, ok: true });
});

router.delete('/api/products/:pid', (req, res) => {
  db.deleteProduct(parseInt(req.params.pid));
  res.json({ ok: true });
});

// ── Cotizaciones ──────────────────────────────────────────────────────────────
router.get('/api/quotes', (req, res) => {
  const quotes = db.getAllQuotes().map(q => ({
    ...q,
    items: JSON.parse(q.items_json || '[]'),
  }));
  res.json(quotes);
});

// ── Generar cotización ─────────────────────────────────────────────────────────
router.post('/api/generate', async (req, res) => {
  try {
    const d = req.body;

    const numero = db.nextQuoteNumber();
    const fecha  = new Date().toLocaleDateString('es-CL', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });

    const items    = d.items   || [];
    const subtotal = Math.round(parseFloat(d.subtotal) || 0);
    const iva      = Math.round(parseFloat(d.iva)      || 0);
    const total    = Math.round(parseFloat(d.total)    || 0);

    const pdfData = {
      numero, fecha,
      cliente:     d.cliente || {},
      items,
      subtotal, iva, total,
      validez_dias: d.validez_dias ?? 30,
      notas:        d.notas || '',
      moneda:       d.moneda || '$',
      uf_valor:     d.uf_valor ?? null,
    };

    // Generar PDF
    const pdfBuffer = await generatePdf(pdfData);

    const clienteNombre = d.cliente?.nombre || d.cliente?.empresa || 'Cliente';
    const nombreParaArchivo = d.cliente?.empresa || d.cliente?.nombre || 'Cliente';
    const pdfFilename   = `Cotización N°${String(numero).padStart(4,'0')} - ${nombreParaArchivo}.pdf`;

    // Guardar en DB
    const dbData = {
      ...pdfData,
      cliente_nombre:  clienteNombre,
      cliente_rut:     d.cliente?.rut        || '',
      cliente_empresa: d.cliente?.empresa    || '',
      cliente_email:   d.cliente?.email      || '',
      cliente_fono:    d.cliente?.fono       || '',
      cliente_dir:     d.cliente?.direccion  || '',
      cliente_cargo:   d.cliente?.cargo      || '',
    };
    const rowId = db.saveQuote(dbData);

    // Drive + Email
    let driveUrl   = '';
    let driveId    = '';
    let emailSent  = false;
    const errors   = [];

    if (google.isReady()) {
      try {
        const { fileId, webViewLink } = await google.uploadToDrive(pdfBuffer, pdfFilename);
        driveId  = fileId;
        driveUrl = webViewLink;
        db.updateDriveInfo(rowId, driveId, driveUrl);
      } catch (e) {
        errors.push(`Drive: ${e.message}`);
      }

      const emailTo      = d.emailTo || d.cliente?.email;
      const emailCc      = d.emailCc || '';
      const sendMail     = d.send_email !== false;
      if (sendMail && emailTo) {
        try {
          await google.sendEmailGmail({
            toEmail:       emailTo,
            ccEmail:       emailCc,
            clienteNombre,
            nombreEmpresa: nombreParaArchivo,
            numero,
            pdfBuffer,
            pdfFilename,
            notas:         d.notas || '',
          });
          db.updateEmailSent(rowId);
          emailSent = true;
        } catch (e) {
          errors.push(`Email: ${e.message}`);
        }
      }
    } else {
      errors.push('Google no configurado – PDF disponible para descarga manual.');
    }

    res.json({
      ok:        true,
      numero,
      row_id:    rowId,
      drive_url: driveUrl,
      email_sent: emailSent,
      pdf_b64:   pdfBuffer.toString('base64'),
      filename:  pdfFilename,
      subtotal, iva, total,
      errors,
    });

  } catch (err) {
    console.error('Error en /api/generate:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Vista previa PDF ──────────────────────────────────────────────────────────
router.post('/api/preview', async (req, res) => {
  try {
    const d = req.body;
    const pdfData = {
      numero:       db.nextQuoteNumber(),
      fecha:        new Date().toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      cliente:      d.cliente || {},
      items:        d.items   || [],
      subtotal:     Math.round(parseFloat(d.subtotal) || 0),
      iva:          Math.round(parseFloat(d.iva)      || 0),
      total:        Math.round(parseFloat(d.total)    || 0),
      validez_dias: d.validez_dias ?? 30,
      notas:        d.notas || '',
      moneda:       d.moneda || '$',
      uf_valor:     d.uf_valor ?? null,
    };
    const pdfBuffer = await generatePdf(pdfData);
    res.set('Content-Type', 'application/pdf');
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
