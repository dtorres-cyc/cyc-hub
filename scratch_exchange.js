const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const credentials = JSON.parse(fs.readFileSync('/Users/diegotorres/Desktop/cotizador-cyc/credentials.json', 'utf8'));
const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

const code = '4/0AeoWuM-x1-zQO_kN6_ftrZq7ALLjfTiVi5RJ6B73HurB4JrEnP4G2-9loimBBAKEKaO8vg';

oAuth2Client.getToken(code, (err, token) => {
  if (err) {
    console.error('Error:', err);
    return;
  }
  fs.writeFileSync('/Users/diegotorres/Desktop/cotizador-cyc/token.json', JSON.stringify(token));
  console.log('TOKEN_GENERADO:', JSON.stringify(token));
});
