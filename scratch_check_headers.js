

const SHEET_ID = '1Ry7QVd8jkzISDymg3CeLyL2iroYD4eO6eXIpjImdAXo';

async function test() {
  try {
    const data = await getSheetData(SHEET_ID, "'Detalle Estatus'!A1:Z2");
    
    if (!data || data.length === 0) return;
    
    console.log('Headers:');
    data[0].forEach((h, i) => console.log(`${i}: ${h}`));
    
    console.log('\nRow 1:');
    data[1].forEach((v, i) => console.log(`${i}: ${v}`));
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

async function getSheetData(spreadsheetId, range) {
  const sheets = await getSheetsService();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });
  return response.data.values;
}

async function getSheetsService() {
  const { google } = require('googleapis');
  const { buildOAuth2Client } = require('./modules/cotizador/google');
  const auth = buildOAuth2Client();
  return google.sheets({ version: 'v4', auth });
}

test();
