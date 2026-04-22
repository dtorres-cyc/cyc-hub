// modules/cotizador/google.js — Drive + Gmail usando googleapis
// Migrado desde google_services.py. Lee credenciales desde variables de entorno
// para funcionar en Railway (sin archivos locales).

const { google } = require('googleapis');
const nodemailer  = require('nodemailer');
const { COMPANY, DRIVE_FOLDER_ID } = require('../../shared/config');

// ── Credenciales ──────────────────────────────────────────────────────────────
// En local: usa credentials.json y token.json del disco si existen.
// En Railway: lee desde variables de entorno GOOGLE_CREDENTIALS_JSON y GOOGLE_TOKEN_JSON.

const fs   = require('fs');
const path = require('path');

const CREDS_FILE = path.join(__dirname, '..', '..', 'credentials.json');
const TOKEN_FILE = path.join(__dirname, '..', '..', 'token.json');

function getCredentials() {
  // Prioridad: variable de entorno → archivo local
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    try { return JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON); }
    catch { throw new Error('GOOGLE_CREDENTIALS_JSON no es un JSON válido'); }
  }
  if (fs.existsSync(CREDS_FILE)) {
    return JSON.parse(fs.readFileSync(CREDS_FILE, 'utf8'));
  }
  return null;
}

function getToken() {
  if (process.env.GOOGLE_TOKEN_JSON) {
    try { return JSON.parse(process.env.GOOGLE_TOKEN_JSON); }
    catch { throw new Error('GOOGLE_TOKEN_JSON no es un JSON válido'); }
  }
  if (fs.existsSync(TOKEN_FILE)) {
    return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
  }
  return null;
}

function isReady() {
  return !!(getCredentials() && getToken());
}

function buildOAuth2Client() {
  const creds = getCredentials();
  const token = getToken();
  if (!creds || !token) throw new Error('Credenciales Google no configuradas');

  // Soporta tanto "installed" como "web" app credentials
  const { client_id, client_secret, redirect_uris } =
    creds.installed || creds.web;

  const auth = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  auth.setCredentials(token);
  return auth;
}

// ── Upload a Drive ─────────────────────────────────────────────────────────────
async function uploadToDrive(pdfBuffer, filename) {
  const auth    = buildOAuth2Client();
  const drive   = google.drive({ version: 'v3', auth });
  const { Readable } = require('stream');

  const stream = new Readable();
  stream.push(pdfBuffer);
  stream.push(null);

  const res = await drive.files.create({
    requestBody: {
      name:     filename,
      parents:  [DRIVE_FOLDER_ID],
      mimeType: 'application/pdf',
    },
    media: {
      mimeType: 'application/pdf',
      body:     stream,
    },
    fields: 'id,webViewLink',
  });

  return { fileId: res.data.id, webViewLink: res.data.webViewLink || '' };
}

// ── Envío de email via Gmail API ──────────────────────────────────────────────
async function sendEmailGmail({ toEmail, clienteNombre, numero, pdfBuffer, pdfFilename, notas }) {
  const auth    = buildOAuth2Client();
  const gmail   = google.gmail({ version: 'v1', auth });

  const bodyHtml = `
  <html><body style="font-family: Arial, sans-serif; color: #333; font-size: 14px;">
    <p>Estimado/a <strong>${clienteNombre}</strong>,</p>
    <p>Junto con saludar, adjuntamos la <strong>Cotización N°${String(numero).padStart(4,'0')}</strong>
       por los servicios de arriendo de maquinaria solicitados.</p>
    <p>Quedamos atentos a cualquier consulta o aclaración que necesite.</p>
    ${notas ? `<p><em>Notas adicionales:</em> ${notas}</p>` : ''}
    <br>
    <p>Atentamente,</p>
    <br>
    <p style="font-size:11px;color:#888;">
      Este correo y sus adjuntos son de carácter confidencial y están
      dirigidos exclusivamente al destinatario indicado.
    </p>
  </body></html>`;

  // Construir MIME manualmente (necesario para Gmail API)
  const boundary = 'boundary_cyc_' + Date.now();
  const pdfB64   = pdfBuffer.toString('base64');

  const rawMsg = [
    `To: ${toEmail}`,
    `From: ${COMPANY.name} <${COMPANY.email}>`,
    `Subject: =?UTF-8?B?${Buffer.from(`Cotización N°${String(numero).padStart(4,'0')} – ${COMPANY.name}`).toString('base64')}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: quoted-printable',
    '',
    bodyHtml,
    '',
    `--${boundary}`,
    'Content-Type: application/pdf',
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${pdfFilename}"`,
    '',
    pdfB64,
    '',
    `--${boundary}--`,
  ].join('\r\n');

  const encodedMsg = Buffer.from(rawMsg)
    .toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: encodedMsg },
  });

  return true;
}

module.exports = { isReady, uploadToDrive, sendEmailGmail };
