const { getSheetData } = require('../shared/googleSheets');
const SHEET_ID = '1Ry7QVd8jkzISDymg3CeLyL2iroYD4eO6eXIpjImdAXo';

function safeLower(val) {
  return val ? val.toString().trim().toLowerCase() : '';
}

async function debug() {
    const data = await getSheetData(SHEET_ID, "'Detalle Estatus'!A:Z");
    const rows = data.slice(1).filter(r => r[0] && r[0].trim() !== '');
    
    let sinClienteCount = 0;
    
    for (let i = 0; i < rows.length; i++) {
        const cliente = safeLower(rows[i][15] || '');
        const estadoOp = safeLower(rows[i][17] || '');
        
        if (cliente === 'sin cliente') {
            console.log(`Fila ${i+2} - Cliente: '${cliente}', Operativo: '${estadoOp}'`);
            sinClienteCount++;
        }
    }
    console.log(`Filas con cliente === 'sin cliente': ${sinClienteCount}`);
}

debug().catch(console.error);
