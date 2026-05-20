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

    const rows = data.slice(1).filter(r => r[0] && r[0].trim() !== '');
    let count = 0;

    for (const row of rows) {
      const facturaId = (row[0] || '').trim();
      if (!facturaId) continue;

      const neto  = parseFloat((row[7]  || '0').replace(/\./g, '').replace(/,/g, '.')) || 0;
      const saldo = parseFloat((row[11] || '0').replace(/\./g, '').replace(/,/g, '.')) || 0;

      const payload = {
        tipo:        row[1] || null,
        cliente:     row[2] || null,
        emision:     row[3] || null,
        vencimiento: row[4] || null,
        mesTxt:      row[5] || null,
        neto,
        saldo,
        estado:      (row[13] || '').trim().toLowerCase() || null,
        alerta:      (row[14] || '').trim().toLowerCase() || null,
        diasVencida: parseInt(row[16]) || 0,
        mesEmi:      parseInt(row[18]) || 0,
        anioEmi:     parseInt(row[19]) || 0,
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
