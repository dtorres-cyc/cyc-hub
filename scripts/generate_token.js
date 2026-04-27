const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
const path = require('path');

require('dotenv').config();

// Mismos SCOPES originales + Google Sheets
const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/spreadsheets'
];

const CREDS_FILE = path.join(__dirname, '..', 'credentials.json');
const TOKEN_FILE = path.join(__dirname, '..', 'token.json');

function startAuth() {
  let credentials;
  
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
  } else if (fs.existsSync(CREDS_FILE)) {
    credentials = JSON.parse(fs.readFileSync(CREDS_FILE, 'utf8'));
  } else {
    console.error('❌ Error: No se encontró credentials.json ni en el disco ni en .env');
    return;
  }

  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log('\n=======================================');
  console.log('🔄 ACTUALIZACIÓN DE PERMISOS GOOGLE (Añadiendo Sheets)');
  console.log('=======================================');
  console.log('1. Abre este link en tu navegador:\n');
  console.log(authUrl);
  console.log('\n=======================================');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('2. Pega el código de autorización aquí: ', (code) => {
    rl.close();
    code = decodeURIComponent(code.trim());
    oAuth2Client.getToken(code, (err, token) => {
      if (err) {
        console.error('❌ Error obteniendo el token:', err);
        return;
      }
      fs.writeFileSync(TOKEN_FILE, JSON.stringify(token));
      console.log('\n✅ ¡ÉXITO! El nuevo token genareado fue guardado en token.json.');
      console.log('Ahora por favor actualiza también la variable GOOGLE_TOKEN_JSON en tu archivo .env con este contenido en una línea:');
      console.log('\n' + JSON.stringify(token) + '\n');
    });
  });
}

startAuth();
