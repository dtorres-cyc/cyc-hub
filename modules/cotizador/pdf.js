// modules/cotizador/pdf.js — Generador de PDF con pdfkit
// Migrado desde pdf_generator.py (ReportLab → pdfkit)
// Mantiene la misma estructura visual y paleta de colores de CYC.

const PDFDocument = require('pdfkit');
const path        = require('path');
const fs          = require('fs');
const { COMPANY, TERMS, CARGO_ARRENDATARIO, CARGO_ARRENDADOR } = require('../../shared/config');

// ── Paleta ────────────────────────────────────────────────────────────────────
const C = {
  orange:  '#E8651A',
  dark:    '#222222',
  g1:      '#F5F5F5',
  g2:      '#DDDDDD',
  g3:      '#666666',
  g4:      '#444444',
  g5:      '#333333',
  white:   '#FFFFFF',
};

const LOGO_PATH = path.join(__dirname, '..', '..', 'assets', 'logo.png');

// ── Formateadores ─────────────────────────────────────────────────────────────
function clp(v) {
  const n = parseFloat(v) || 0;
  return '$ ' + n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
function uf(v) {
  const n = parseFloat(v) || 0;
  return 'UF ' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// ── Helpers de dibujo ─────────────────────────────────────────────────────────
function drawRect(doc, x, y, w, h, color) {
  doc.save().rect(x, y, w, h).fill(color).restore();
}

function hLine(doc, x, y, w, color = C.g2, thickness = 0.5) {
  doc.save().moveTo(x, y).lineTo(x + w, y).lineWidth(thickness).strokeColor(color).stroke().restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCIÓN PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
function generatePdf(data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title:   `Cotización ${String(data.numero).padStart(4,'0')} – ${COMPANY.name}`,
        Author:  COMPANY.name,
        Subject: 'Cotización de servicios',
      },
    });

    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageW   = doc.page.width;
    const pageH   = doc.page.height;
    const margin  = 50;
    const contentW = pageW - margin * 2;
    const ufVal   = data.uf_valor ? parseFloat(data.uf_valor) : null;

    // ── FOOTER (se dibuja en cada página) ─────────────────────────────────
    function drawFooter() {
      const fy = pageH - 40;
      drawRect(doc, margin, fy, contentW, 16, C.g4);
      doc.save()
        .fontSize(6.5).fillColor(C.white).font('Helvetica')
        .text(
          `${COMPANY.name}  |  RUT ${COMPANY.rut}  |  ${COMPANY.address}  |  ${COMPANY.email}`,
          margin, fy + 4, { width: contentW, align: 'center' }
        ).restore();

      doc.save()
        .fontSize(7).fillColor(C.g3).font('Helvetica')
        .text(`Página ${doc.bufferedPageRange().start + doc.bufferedPageRange().count}`,
              margin, fy + 22, { width: contentW, align: 'right' })
        .restore();
    }

    // ── HEADER ─────────────────────────────────────────────────────────────
    let y = margin;

    // Logo
    if (fs.existsSync(LOGO_PATH)) {
      try {
        doc.image(LOGO_PATH, margin, y, { height: 60, fit: [120, 60] });
      } catch (_) { /* sin logo */ }
    }

    // Datos empresa (columna media)
    const coX = margin + 130;
    doc.save()
      .font('Helvetica-Bold').fontSize(9).fillColor(C.dark)
      .text(COMPANY.name, coX, y)
      .restore();
    doc.save()
      .font('Helvetica').fontSize(7.5).fillColor(C.g3)
      .text(COMPANY.giro,    coX, y + 12)
      .text(`R.U.T.: ${COMPANY.rut}`, coX, y + 22)
      .text(COMPANY.address, coX, y + 32)
      .text(`${COMPANY.email}  |  ${COMPANY.web}`, coX, y + 42)
      .restore();

    // Bloque número cotización (columna derecha)
    const metaX = pageW - margin - 120;
    doc.save()
      .font('Helvetica-Bold').fontSize(7.5).fillColor(C.g3)
      .text('COTIZACIÓN N°', metaX, y, { width: 120, align: 'right' })
      .restore();
    doc.save()
      .font('Helvetica-Bold').fontSize(18).fillColor(C.dark)
      .text(String(data.numero).padStart(4, '0'), metaX, y + 10, { width: 120, align: 'right' })
      .restore();
    doc.save()
      .font('Helvetica-Bold').fontSize(7.5).fillColor(C.g4)
      .text(`Fecha: `, metaX, y + 32, { continued: true, width: 120 })
      .font('Helvetica').fillColor(C.dark)
      .text(data.fecha, { align: 'right' })
      .restore();
    doc.save()
      .font('Helvetica-Bold').fontSize(7.5).fillColor(C.g4)
      .text(`Validez: `, metaX, y + 44, { continued: true, width: 120 })
      .font('Helvetica').fillColor(C.dark)
      .text(`${data.validez_dias ?? 30} días`, { align: 'right' })
      .restore();
    if (ufVal) {
      doc.save()
        .font('Helvetica-Bold').fontSize(7.5).fillColor(C.g4)
        .text('Valor UF: ', metaX, y + 56, { continued: true, width: 120 })
        .font('Helvetica-Bold').fillColor(C.orange)
        .text(clp(ufVal), { align: 'right' })
        .restore();
    }

    y += 70;
    hLine(doc, margin, y, contentW, C.g2, 1);
    y += 10;

    // ── DATOS DEL CLIENTE ─────────────────────────────────────────────────
    doc.save().font('Helvetica-Bold').fontSize(9).fillColor(C.g4)
      .text('DATOS DEL CLIENTE', margin, y).restore();
    y += 14;

    drawRect(doc, margin, y, contentW, 72, C.g1);
    doc.save().rect(margin, y, contentW, 72).lineWidth(0.5).strokeColor(C.g2).stroke().restore();

    const cli   = data.cliente || {};
    const colW  = contentW / 2;
    const lw    = 90;
    const pad   = 10;

    function clienteRow(label, value, rx, ry) {
      doc.save()
        .font('Helvetica-Bold').fontSize(7.5).fillColor(C.g4)
        .text(`${label}:`, rx + pad, ry, { width: lw })
        .restore();
      doc.save()
        .font('Helvetica').fontSize(7.5).fillColor(C.dark)
        .text(value || '—', rx + pad + lw, ry, { width: colW - lw - pad * 2 })
        .restore();
    }

    let ry = y + 8;
    clienteRow('Empresa / Razón Social', cli.empresa, margin,         ry);
    clienteRow('Contacto',               cli.nombre,  margin + colW, ry); ry += 14;
    clienteRow('R.U.T.',                 cli.rut,     margin,         ry);
    clienteRow('Cargo',                  cli.cargo,   margin + colW, ry); ry += 14;
    clienteRow('Correo electrónico',     cli.email,   margin,         ry);
    clienteRow('Teléfono',               cli.fono,    margin + colW, ry); ry += 14;
    clienteRow('Dirección Comercial',    cli.direccion, margin,       ry);

    y += 82;

    // ── TABLA ÍTEMS ───────────────────────────────────────────────────────
    doc.save().font('Helvetica-Bold').fontSize(9).fillColor(C.g4)
      .text('DETALLE DE EQUIPOS Y SERVICIOS', margin, y).restore();
    y += 12;

    // Definir columnas: N° | Descripción | N°Eq | Unidad | Cant | PUnit | Total | Total$
    const cols = [
      { w: 20,  align: 'center', label: 'N°' },
      { w: 0,   align: 'left',   label: 'Descripción' },   // flex
      { w: 40,  align: 'center', label: 'N°Eq.' },
      { w: 45,  align: 'center', label: 'Unidad' },
      { w: 38,  align: 'center', label: 'Cant.' },
      { w: 75,  align: 'right',  label: 'Precio Unit.' },
      { w: 80,  align: 'right',  label: 'Total UF/$' },
      { w: 80,  align: 'right',  label: 'Total $' },
    ];
    const fixedW = cols.reduce((s, c) => s + c.w, 0);
    cols[1].w = contentW - fixedW;

    const headerH = 20;
    drawRect(doc, margin, y, contentW, headerH, C.g5);

    let cx = margin;
    for (const col of cols) {
      doc.save()
        .font('Helvetica-Bold').fontSize(7).fillColor(C.white)
        .text(col.label, cx + 3, y + 6, { width: col.w - 6, align: col.align })
        .restore();
      cx += col.w;
    }
    y += headerH;

    // Precalcular alturas dinámicas de fila
    const rowHeights = data.items.map(item => {
      let th = 0;
      if (item.nombre) th += doc.heightOfString(item.nombre, { width: cols[1].w - 6, font: 'Helvetica-Bold', fontSize: 7.5 });
      if (item.detalle) th += doc.heightOfString(item.detalle, { width: cols[1].w - 6, font: 'Helvetica-Oblique', fontSize: 7 });
      return Math.max(32, th + 12);
    });

    data.items.forEach((item, idx) => {
      const rowH = rowHeights[idx];
      const even = idx % 2 === 1;
      if (even) drawRect(doc, margin, y, contentW, rowH, C.g1);
      doc.save().rect(margin, y, contentW, rowH).lineWidth(0.3).strokeColor(C.g2).stroke().restore();

      cx = margin;
      const vals = [
        String(idx + 1),
        null,   // descripción especial
        String(item.n_equipos ?? 1),
        item.tipo_precio ?? 'Hora',
        String(item.cantidad ?? 1),
        null,   // precio unit especial
        null,   // total moneda especial
        null,   // total clp especial
      ];

      for (let i = 0; i < cols.length; i++) {
        const col  = cols[i];
        const val  = vals[i];
        const ty   = y + 4;

        if (i === 1) {
          // Descripción
          doc.save().font('Helvetica-Bold').fontSize(7.5).fillColor(C.dark)
            .text(item.nombre || '', cx + 3, ty, { width: col.w - 6 }).restore();
          if (item.detalle) {
            doc.save().font('Helvetica-Oblique').fontSize(7).fillColor(C.g3)
              .text(item.detalle, cx + 3, ty + 11, { width: col.w - 6 }).restore();
          }
        } else if (i === 5) {
          // Precio unitario
          const moneda = item.moneda ?? '$';
          const upStr  = moneda === 'UF' ? uf(item.precio_unitario) : clp(item.precio_unitario);
          doc.save().font('Helvetica').fontSize(7.5).fillColor(C.dark)
            .text(upStr, cx + 3, ty, { width: col.w - 6, align: 'right' }).restore();
          if (moneda === 'UF' && ufVal) {
            doc.save().font('Helvetica').fontSize(7).fillColor(C.g3)
              .text(`(${clp(parseFloat(item.precio_unitario) * ufVal)})`,
                cx + 3, ty + 11, { width: col.w - 6, align: 'right' }).restore();
          }
        } else if (i === 6) {
          // Total en moneda del ítem
          const moneda = item.moneda ?? '$';
          const totStr = moneda === 'UF' ? uf(item.total_moneda) : clp(item.total_moneda);
          doc.save().font('Helvetica').fontSize(7.5).fillColor(C.dark)
            .text(totStr, cx + 3, ty, { width: col.w - 6, align: 'right' }).restore();
          if (moneda === 'UF' && ufVal) {
            doc.save().font('Helvetica').fontSize(7).fillColor(C.g3)
              .text(`(${clp(parseFloat(item.total_moneda) * ufVal)})`,
                cx + 3, ty + 11, { width: col.w - 6, align: 'right' }).restore();
          }
        } else if (i === 7) {
          // Total en $
          const totalClp = parseFloat(item.total_clp) || 0;
          doc.save().font('Helvetica-Bold').fontSize(7.5).fillColor(C.orange)
            .text(totalClp > 0 ? clp(totalClp) : '—',
              cx + 3, ty, { width: col.w - 6, align: 'right' }).restore();
        } else {
          doc.save().font('Helvetica').fontSize(7.5).fillColor(C.dark)
            .text(val, cx + 3, ty, { width: col.w - 6, align: col.align }).restore();
        }
        cx += col.w;
      }
      y += rowH;
    });

    // Nota UF
    const hasUF = data.items.some(i => i.moneda === 'UF');
    if (hasUF && ufVal) {
      drawRect(doc, margin, y + 6, contentW, 16, C.g1);
      doc.save().rect(margin, y + 6, contentW, 16).lineWidth(0.3).strokeColor(C.g2).stroke().restore();
      doc.save().font('Helvetica-Oblique').fontSize(7).fillColor(C.g3)
        .text(`Nota: Valores en UF calculados con 1 UF = ${clp(ufVal)} a la fecha de la cotización.`,
          margin + 6, y + 11, { width: contentW - 12 })
        .restore();
      y += 24;
    }

    y += 10;

    // ── TOTALES ───────────────────────────────────────────────────────────
    const totW  = 160;
    const totX  = pageW - margin - totW;

    // Subtotal y IVA
    const subH = 20;
    doc.save().font('Helvetica-Bold').fontSize(8.5).fillColor(C.dark)
      .text('Subtotal Neto:', totX, y + 3, { width: totW - 6, align: 'right' }).restore();
    doc.save().font('Helvetica-Bold').fontSize(8.5).fillColor(C.dark)
      .text(clp(data.subtotal), totX, y + 3, { width: totW, align: 'right' }).restore();
    y += subH;

    doc.save().font('Helvetica-Bold').fontSize(8.5).fillColor(C.dark)
      .text('IVA (19%):', totX, y + 3, { width: totW - 6, align: 'right' }).restore();
    doc.save().font('Helvetica-Bold').fontSize(8.5).fillColor(C.dark)
      .text(clp(data.iva), totX, y + 3, { width: totW, align: 'right' }).restore();
    y += subH;

    // Total con fondo naranja
    drawRect(doc, totX - 10, y, totW + 10, 28, C.orange);
    doc.save().font('Helvetica-Bold').fontSize(10).fillColor(C.white)
      .text('TOTAL CON IVA:', totX - 4, y + 8, { width: totW - 6, align: 'right' }).restore();
    doc.save().font('Helvetica-Bold').fontSize(10).fillColor(C.white)
      .text(clp(data.total), totX, y + 8, { width: totW, align: 'right' }).restore();

    y += 44;

    // ── RESPONSABILIDADES ─────────────────────────────────────────────────
    // Verificar si hay espacio suficiente, si no saltar página
    if (y > pageH - 200) {
      doc.addPage();
      y = margin;
    }

    doc.save().font('Helvetica-Bold').fontSize(9).fillColor(C.g4)
      .text('RESPONSABILIDADES', margin, y).restore();
    y += 12;

    function drawRespCol(title, items, x, w, bgColor) {
      const rh = 16;
      drawRect(doc, x, y, w, rh, bgColor);
      doc.save().font('Helvetica-Bold').fontSize(7.5).fillColor(C.white)
        .text(title, x + 6, y + 4, { width: w - 12 }).restore();
      let iry = y + rh;
      items.forEach((item, i) => {
        const txt = `• ${item}`;
        const th = doc.heightOfString(txt, { width: w - 12, font: 'Helvetica', fontSize: 7 });
        const boxH = Math.max(14, th + 6);
        
        if (i % 2 === 0) drawRect(doc, x, iry, w, boxH, C.g1);
        doc.save().rect(x, iry, w, boxH).lineWidth(0.3).strokeColor(C.g2).stroke().restore();
        doc.save().font('Helvetica').fontSize(7).fillColor(C.dark)
          .text(txt, x + 6, iry + 3, { width: w - 12 }).restore();
        iry += boxH;
      });
      return iry;
    }

    const halfW = contentW / 2 - 3;
    const endLeft  = drawRespCol('CARGO ARRENDATARIO (Cliente)', CARGO_ARRENDATARIO, margin, halfW, C.g4);
    const endRight = drawRespCol('CARGO ARRENDADOR (CYC)',       CARGO_ARRENDADOR,  margin + halfW + 6, halfW, C.g5);
    y = Math.max(endLeft, endRight) + 14;

    // ── NOTAS ADICIONALES ─────────────────────────────────────────────────
    if (data.notas) {
      if (y > pageH - 120) { doc.addPage(); y = margin; }
      doc.save().font('Helvetica-Bold').fontSize(9).fillColor(C.g4)
        .text('NOTAS ADICIONALES', margin, y).restore();
      y += 10;
      
      const txt = data.notas;
      const th = doc.heightOfString(txt, { width: contentW - 16, font: 'Helvetica-Oblique', fontSize: 7.5 });
      const boxH = Math.max(40, th + 16);
      
      drawRect(doc, margin, y, contentW, boxH, C.g1);
      doc.save().rect(margin, y, contentW, boxH).lineWidth(0.5).strokeColor(C.g2).stroke().restore();
      doc.save().font('Helvetica-Oblique').fontSize(7.5).fillColor(C.g3)
        .text(txt, margin + 8, y + 8, { width: contentW - 16 }).restore();
      y += boxH + 12;
    }

    // ── TÉRMINOS Y CONDICIONES ────────────────────────────────────────────
    if (y > pageH - 150) { doc.addPage(); y = margin; }
    doc.save().font('Helvetica-Bold').fontSize(9).fillColor(C.g4)
      .text('TÉRMINOS Y CONDICIONES', margin, y).restore();
    y += 10;
    TERMS.forEach((term, i) => {
      const txt = `${i + 1}. ${term}`;
      const th = doc.heightOfString(txt, { width: contentW, font: 'Helvetica', fontSize: 7 });
      
      doc.save().font('Helvetica').fontSize(7).fillColor(C.g3)
        .text(txt, margin, y, { width: contentW, align: 'justify' }).restore();
      y += th + 4;
    });
    y += 10;

    // ── FIRMAS ────────────────────────────────────────────────────────────
    if (y > pageH - 80) { doc.addPage(); y = margin; }
    const sigW = contentW / 2 - 20;

    function drawSignature(label, name, x) {
      doc.save().font('Helvetica').fontSize(8).fillColor(C.g3)
        .text('_______________________________', x, y + 10, { width: sigW, align: 'center' })
        .text(name, x, y + 22, { width: sigW, align: 'center' })
        .text(label, x, y + 32, { width: sigW, align: 'center' })
        .restore();
    }
    drawSignature('Firma y Timbre', COMPANY.name, margin);
    drawSignature('Firma y Timbre Cliente', cli.empresa || cli.nombre || '', margin + sigW + 40);

    // ── FOOTER ────────────────────────────────────────────────────────────
    drawFooter();

    doc.end();
  });
}

module.exports = { generatePdf };
