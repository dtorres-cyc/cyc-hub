require('dotenv').config();
const { getSheetData } = require('./shared/googleSheets');

async function checkSheet() {
  try {
    const SHEET_ID = '1Ry7QVd8jkzISDymg3CeLyL2iroYD4eO6eXIpjImdAXo';
    const data = await getSheetData(SHEET_ID, "'Detalle Estatus'!A:Z");
    console.log("Detalle Estatus headers:");
    console.log(data[0]);
    
    // Also try to read Equipos Externos
    try {
      const dataExt = await getSheetData(SHEET_ID, "'Equipos Externos'!A:Z");
      console.log("Equipos Externos headers:");
      console.log(dataExt[0]);
    } catch (e) {
      console.log("Equipos Externos no existe o error:", e.message);
    }
  } catch (e) {
    console.error(e);
  }
}
checkSheet();
