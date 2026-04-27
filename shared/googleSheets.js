const { google } = require('googleapis');
const { buildOAuth2Client } = require('../modules/cotizador/google');

async function getSheetsService() {
  const auth = buildOAuth2Client();
  return google.sheets({ version: 'v4', auth });
}

async function getSheetData(spreadsheetId, range) {
  const sheets = await getSheetsService();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });
  return response.data.values;
}

async function writeSheetData(spreadsheetId, range, values) {
  const sheets = await getSheetsService();
  const response = await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values,
    },
  });
  return response.data;
}

async function appendSheetData(spreadsheetId, range, values) {
  const sheets = await getSheetsService();
  const response = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values,
    },
  });
  return response.data;
}

async function clearSheetData(spreadsheetId, range) {
  const sheets = await getSheetsService();
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range,
  });
}

async function ensureSheetExists(spreadsheetId, sheetTitle) {
  const sheets = await getSheetsService();
  
  // Get all sheets
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId,
  });
  
  const existingSheet = spreadsheet.data.sheets.find(
    (s) => s.properties.title === sheetTitle
  );
  
  if (!existingSheet) {
    // Create new sheet
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: sheetTitle,
              },
            },
          },
        ],
      },
    });
  }
}

module.exports = {
  getSheetData,
  writeSheetData,
  appendSheetData,
  clearSheetData,
  ensureSheetExists
};
