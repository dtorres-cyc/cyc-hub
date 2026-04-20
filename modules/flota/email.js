// modules/flota/email.js — Lógica de email y construcción de HTML para el módulo flota
// Extraído y refactorizado desde server.js (Envío de flota disponible)

const nodemailer = require('nodemailer');
const fs         = require('fs');
const path       = require('path');

const PLANTILLA_PATH = path.join(__dirname, 'plantillas', 'email_table.html');

// ── Transporter dinámico ──────────────────────────────────────────────────────
function getTransporter(senderEmail) {
  const useSecond = senderEmail && senderEmail === process.env.GMAIL_USER_2;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: useSecond ? process.env.GMAIL_USER_2 : process.env.GMAIL_USER,
      pass: useSecond ? process.env.GMAIL_APP_PASSWORD_2 : process.env.GMAIL_APP_PASSWORD,
    },
  });
}

// ── Constructor de HTML del correo ────────────────────────────────────────────
function buildEmailHtml(nombre, empresa, equipos, includePhotos, messageText, showTarifa = false, customTarifas = {}) {
  const rawHtml = fs.readFileSync(PLANTILLA_PATH, 'utf8');

  // Agrupar por tipoMaquinaria
  const groups = {};
  equipos.forEach(eq => {
    const key = eq.tipoMaquinaria || 'Equipos';
    if (!groups[key]) groups[key] = [];
    groups[key].push(eq);
  });
  const sortedTypes = Object.keys(groups).sort((a, b) => a.localeCompare(b, 'es'));
  const colSpan = includePhotos ? 3 : 2;

  let filasHtml = '';

  sortedTypes.forEach((tipo, groupIdx) => {
    filasHtml += `
    <tr>
        <td colspan="${colSpan}" class="eq-group-td" style="padding:12px 14px 8px 14px;background-color:#fff8f5;border-bottom:1px solid #ffd5b8;${groupIdx > 0 ? 'border-top:2px solid #eee;' : ''}">
            <strong style="color:#F96B11;font-size:11px;text-transform:uppercase;letter-spacing:1.2px;">&#9658; ${tipo}</strong>
        </td>
    </tr>`;

    groups[tipo].forEach(eq => {
      let tdFoto = '';
      if (includePhotos) {
        const imgSrc = eq.imagenUrl || '';
        tdFoto = imgSrc
          ? `<td class="eq-photo-td" width="130" valign="top"
                 style="width:130px;min-width:130px;padding:10px 8px 10px 14px;border-bottom:1px solid #eee;vertical-align:top;">
                 <img src="${imgSrc}" alt="${eq.tipoMaquinaria}" width="120" height="90"
                      style="display:block;width:120px;max-width:120px;height:auto;border-radius:6px;-ms-interpolation-mode:bicubic;" />
             </td>`
          : `<td class="eq-photo-td" width="130"
                 style="width:130px;padding:10px 8px 10px 14px;border-bottom:1px solid #eee;vertical-align:middle;text-align:center;font-size:28px;">🔧</td>`;
      }

      // Tarifa personalizada o desde Notion
      let tarifaHtml = '';
      const ct = customTarifas[eq.id];
      if (showTarifa) {
        const horas    = ct?.horas    ? parseFloat(ct.horas)    : null;
        const tarifaUF = ct?.tarifaUF ? parseFloat(ct.tarifaUF) : null;

        if (horas && tarifaUF) {
          const total = (horas * tarifaUF).toFixed(1);
          tarifaHtml = `<br><span style="display:inline-block;margin-top:6px;padding:4px 10px;background:#fff3f0;border:1px solid #ffd0b5;border-radius:4px;font-size:12px;color:#c44a00;font-weight:600;">
              💰 ${ct.horas}h mín. &times; ${ct.tarifaUF} UF/h = <strong>${total} UF</strong>
          </span>`;
        } else if (horas) {
          tarifaHtml = `<br><span style="display:inline-block;margin-top:6px;padding:4px 10px;background:#fff3f0;border:1px solid #ffd0b5;border-radius:4px;font-size:12px;color:#c44a00;font-weight:600;">
              📋 Mínimo ${ct.horas} horas
          </span>`;
        } else if (eq.tarifa) {
          tarifaHtml = `<br><span style="display:inline-block;margin-top:6px;padding:4px 10px;background:#fff3f0;border:1px solid #ffd0b5;border-radius:4px;font-size:12px;color:#c44a00;font-weight:600;">
              💰 ${eq.tarifa}
          </span>`;
        }
      }

      filasHtml += `
      <tr>
          ${tdFoto}
          <td class="eq-content-td" style="padding:12px 14px;border-bottom:1px solid #eee;color:#111827;font-size:14px;font-weight:600;vertical-align:top;">
              ${eq.tipoMaquinaria}
              <br><span style="display:inline-block;margin-top:4px;padding:2px 7px;background-color:#dcfce7;color:#166534;font-size:10px;border-radius:10px;text-transform:uppercase;font-weight:bold;letter-spacing:0.3px;">Entrega Inmediata</span>
              ${tarifaHtml}
          </td>
          <td class="eq-specs-td" style="padding:12px 14px;border-bottom:1px solid #eee;color:#4b5563;font-size:13px;line-height:1.7;vertical-align:top;">
              ${eq.especificacionesHtml}
          </td>
      </tr>`;
    });
  });

  const resolvedMessage = (messageText || '').replace(/{{NOMBRE}}/g, nombre || 'Cliente');
  const formattedMessage = resolvedMessage.split('\n').map(l => `<p style="margin-bottom:10px;color:#1a1a1a;">${l}</p>`).join('');

  let html = rawHtml;
  html = html.replace(/{{NOMBRE}}/g, nombre || 'Cliente');
  html = html.replace(/{{EMPRESA}}/g, empresa || '');
  html = html.replace(/{{MENSAJE_PERSONALIZADO}}/g, formattedMessage);
  html = html.replace(/{{TH_FOTO}}/g, includePhotos
    ? '<th align="left" style="padding:11px 14px;background-color:#f7f7f7;border-bottom:2px solid #e0e0e0;color:#555;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;width:130px;">Foto</th>'
    : '');
  html = html.replace(/<!-- START_EQUIPOS_LOOP -->[\s\S]*<!-- END_EQUIPOS_LOOP -->/g, filasHtml);
  return html;
}

module.exports = { getTransporter, buildEmailHtml };
