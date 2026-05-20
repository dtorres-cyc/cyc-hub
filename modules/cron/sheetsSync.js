// modules/cron/sheetsSync.js — Sync Google Sheets → DB cada 30 minutos
const cron = require('node-cron');
const { syncAll } = require('../../shared/syncService');

cron.schedule('*/30 * * * *', async () => {
  console.log('[cron/sheetsSync] Sincronizando Sheets → DB...');
  const result = await syncAll();
  const flotaMsg = result.flota.ok    ? `✓ ${result.flota.count} equipos`   : `✗ ${result.flota.error}`;
  const factMsg  = result.facturacion.ok ? `✓ ${result.facturacion.count} facturas` : `✗ ${result.facturacion.error}`;
  console.log(`[cron/sheetsSync] Flota: ${flotaMsg} | Facturación: ${factMsg}`);
}, { timezone: 'America/Santiago' });

// Sync inicial al arrancar el servidor (con delay para esperar conexión a DB)
setTimeout(async () => {
  console.log('[cron/sheetsSync] Sync inicial al arrancar...');
  await syncAll();
}, 8000);
