// shared/syncService.js — Sincronización de Google Sheets → PostgreSQL
const { PrismaClient } = require('@prisma/client');
const { getSheetData } = require('./googleSheets');

const prisma = new PrismaClient();

const SHEET_FLOTA_ID = '1Ry7QVd8jkzISDymg3CeLyL2iroYD4eO6eXIpjImdAXo';
const SHEET_FACT_ID  = '1C_bqGiH_oMtSB2dhw4AAzDMSrtcSPi7deUqnBwor5AE';

async function syncFlota() {
  try {
    const data = await getSheetData(SHEET_FLOTA_ID, "'Detalle Estatus'!A:Z");
    if (!data || data.length < 2) return { ok: false, msg: 'Sin datos en la hoja' };

    const rows = data.slice(1).filter(r => r[0] && r[0].trim() !== '');
    let count = 0;

    for (const row of rows) {
      const equipoId = (row[0] || '').trim();
      if (!equipoId) continue;

      const payload = {
        patente:        (row[1]  || '').trim() || null,
        tipo:           (row[3]  || 'Otros').trim(),
        horometro:      (row[8]  || '').trim() || null,
        fechaHorometro: (row[9]  || '').trim() || null,
        ubicacion:      (row[13] || '').trim() || null,
        arrendado:      (row[14] || '').trim() || null,
        cliente:        (row[15] || '').trim() || null,
        propietario:    (row[16] || '').trim() || null,
        operativo:      (row[17] || '').trim() || null,
        vencPermiso:    (row[19] || '').trim() || null,
        vencSoap:       (row[20] || '').trim() || null,
        vencRev:        (row[21] || '').trim() || null,
        vencGases:      (row[22] || '').trim() || null,
        syncedAt:       new Date(),
      };

      await prisma.flotaSyncEquipo.upsert({
        where:  { equipoId },
        update: payload,
        create: { equipoId, ...payload },
      });
      count++;
    }

    console.log(`[syncFlota] ${count} equipos sincronizados`);
    return { ok: true, count };
  } catch (e) {
    console.error('[syncFlota] Error:', e.message);
    return { ok: false, error: e.message };
  }
}

async function syncFacturacion() {
  try {
    const data = await getSheetData(SHEET_FACT_ID, "'BBDD Facturas Venta'!A:Z");
    if (!data || data.length < 2) return { ok: false, msg: 'Sin datos en la hoja' };

    const headers = data[0].map(h => (h || '').trim().toLowerCase());
    
    const getColIdx = (names, defaultIdx) => {
      for (const name of names) {
        const idx = headers.indexOf(name.toLowerCase());
        if (idx !== -1) return idx;
      }
      return defaultIdx;
    };

    const idxFacturaId = getColIdx(['n°factura', 'factura', 'nºfactura'], 0);
    const idxTipo      = getColIdx(['tipo'], 1);
    const idxCliente   = getColIdx(['cliente'], 2);
    const idxEmision   = getColIdx(['fecha de emisión', 'fecha emision', 'emision'], 3);
    const idxVencimiento = getColIdx(['fecha de vencimiento', 'fecha vencimiento', 'vencimiento'], 4);
    const idxMesTxt    = getColIdx(['mes'], 5);
    const idxNeto      = getColIdx(['neto'], 7);
    const idxSaldo     = getColIdx(['saldo pendiente', 'saldo'], 11);
    const idxEstado    = getColIdx(['estado'], 13);
    const idxAlerta    = getColIdx(['alerta'], 14);
    const idxDiasVencida = getColIdx(['días vencida', 'dias vencida'], 16);
    const idxMesEmi    = getColIdx(['mes emision', 'mesemi', 'mes emisión'], 18);
    const idxAnioEmi   = getColIdx(['año emisión', 'anioemi', 'año emision', 'anio emision'], 19);

    const rows = data.slice(1).filter(r => r[idxFacturaId] && r[idxFacturaId].trim() !== '');
    let count = 0;

    for (const row of rows) {
      const facturaId = (row[idxFacturaId] || '').trim();
      if (!facturaId) continue;

      const neto  = parseFloat((row[idxNeto]  || '0').replace(/\./g, '').replace(/,/g, '.')) || 0;
      const saldo = parseFloat((row[idxSaldo] || '0').replace(/\./g, '').replace(/,/g, '.')) || 0;

      const payload = {
        tipo:        row[idxTipo] || null,
        cliente:     row[idxCliente] || null,
        emision:     row[idxEmision] || null,
        vencimiento: row[idxVencimiento] || null,
        mesTxt:      row[idxMesTxt] || null,
        neto,
        saldo,
        estado:      (row[idxEstado] || '').trim().toLowerCase() || null,
        alerta:      (row[idxAlerta] || '').trim().toLowerCase() || null,
        diasVencida: parseInt(row[idxDiasVencida]) || 0,
        mesEmi:      parseInt(row[idxMesEmi]) || 0,
        anioEmi:     parseInt(row[idxAnioEmi]) || 0,
        syncedAt:    new Date(),
      };

      await prisma.facturaSyncVenta.upsert({
        where:  { facturaId },
        update: payload,
        create: { facturaId, ...payload },
      });
      count++;
    }

    console.log(`[syncFacturacion] ${count} facturas sincronizadas`);
    return { ok: true, count };
  } catch (e) {
    console.error('[syncFacturacion] Error:', e.message);
    return { ok: false, error: e.message };
  }
}

async function syncAll() {
  const [flotaResult, factResult] = await Promise.allSettled([
    syncFlota(),
    syncFacturacion(),
  ]);
  return {
    flota:       flotaResult.status === 'fulfilled' ? flotaResult.value : { ok: false, error: String(flotaResult.reason) },
    facturacion: factResult.status  === 'fulfilled' ? factResult.value  : { ok: false, error: String(factResult.reason) },
  };
}

module.exports = { syncFlota, syncFacturacion, syncAll };
