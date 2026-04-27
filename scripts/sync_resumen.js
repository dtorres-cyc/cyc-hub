const { getSheetData, writeSheetData, ensureSheetExists, clearSheetData } = require('../shared/googleSheets');

const SHEET_ID = '1Ry7QVd8jkzISDymg3CeLyL2iroYD4eO6eXIpjImdAXo';
const SOURCE_SHEET = 'Detalle Estatus';
const TARGET_SHEET = 'Resumen';

function safeTrim(val) {
  return val ? val.toString().trim() : '';
}

function safeLower(val) {
  return val ? val.toString().trim().toLowerCase() : '';
}

async function syncResumen() {
  console.log('🔄 Iniciando sincronización de Resumen...');
  
  try {
    // 1. Obtener datos origen
    const data = await getSheetData(SHEET_ID, `'${SOURCE_SHEET}'!A:Z`);
    if (!data || data.length < 2) {
      console.log('❌ No hay suficientes datos en Detalle Estatus.');
      return;
    }

    const headers = data[0];
    const rows = data.slice(1).filter(r => r[0] && r[0].trim() !== ''); // Filtra filas vacías

    // Índices de columnas
    const idxArrendado = 14;
    const idxCliente = 15;
    const idxOperativo = 17;

    let totalFlota = rows.length;
    let totalArrendados = 0;
    let sinArriendoNoVenta = 0;
    let aLaVenta = 0;
    let usoInterno = 0;
    let tallerOperativos = 0; // Necesitamos aclarar bien esta condición
    let enTaller = 0;
    let enTallerConPanne = 0;

    for (const row of rows) {
      const arrendado = safeLower(row[idxArrendado] || '');
      const cliente = safeLower(row[idxCliente] || '');
      const operativo = safeLower(row[idxOperativo] || '');

      // - Total Arrendados. Propios y de terceros
      if (arrendado === 'contrato') {
        totalArrendados++;
      }

      // - Equipos a la venta
      if (cliente === 'venta' || arrendado === 'venta') {
        aLaVenta++;
      }

      // - Equipos sin arriendo y que no están a la venta
      if (arrendado === 'disponible' && cliente !== 'venta') {
        sinArriendoNoVenta++;
      }

      // - Equipos para uso interno
      if (arrendado.includes('interno')) {
        usoInterno++;
      }

      // - Equipos en taller
      if (cliente === 'sin cliente' && operativo === 'taller') {
        enTaller++;
      }

      // - Equipo en panne
      if (cliente === 'sin cliente' && operativo === 'panne') {
        enTallerConPanne++;
      }
      
      // - Equipos operativos (disponibles / en terreno)
      if (cliente === 'sin cliente' && operativo === 'operativo') {
        tallerOperativos++; // Usamos la misma variable pero la renombraremos en la salida
      }
    }

    // 2. Preparar los datos a escribir
    const outputValues = [
      ['Métrica', 'Cantidad'],
      ['Total flota', totalFlota],
      ['Total Arrendados. Propios y de terceros', totalArrendados],
      ['Equipos sin arriendo y que no están a la venta', sinArriendoNoVenta],
      ['Equipos a la venta', aLaVenta],
      ['Equipos para uso interno', usoInterno],
      ['Equipos operativos', tallerOperativos],
      ['Equipos en taller', enTaller],
      ['Equipo en panne', enTallerConPanne],
      ['', ''],
      ['Última actualización:', new Date().toLocaleString('es-CL')]
    ];

    // 3. Escribir en la hoja destino
    await ensureSheetExists(SHEET_ID, TARGET_SHEET);
    await clearSheetData(SHEET_ID, `'${TARGET_SHEET}'!A:B`); // Limpia A y B
    await writeSheetData(SHEET_ID, `'${TARGET_SHEET}'!A1`, outputValues);

    console.log(`✅ ¡Resumen actualizado correctamente en Google Sheets!`);
    console.log(`Total Flota: ${totalFlota}`);
    console.log(`Arrendados: ${totalArrendados}`);
  } catch (error) {
    console.error('❌ Error sincronizando:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  syncResumen();
}

module.exports = { syncResumen };
