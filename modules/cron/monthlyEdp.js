// modules/cron/monthlyEdp.js — Auto-generación mensual de EDPs
const cron = require('node-cron');
const arriendoRouter = require('../arriendo/router');

// Se ejecuta el día 1 de cada mes a las 8:00 AM
// Cron: '0 8 1 * *'  → minuto 0, hora 8, día 1 del mes
cron.schedule('0 8 1 * *', async () => {
  console.log('[Cron EDP] Iniciando generación automática de EDPs mensuales...');
  try {
    const resultado = await arriendoRouter.generarEDPsMes();
    console.log(`[Cron EDP] ✅ ${resultado.creados} EDP(s) creados para ${resultado.periodo}`);
  } catch (e) {
    console.error('[Cron EDP] ❌ Error generando EDPs:', e.message);
  }
}, {
  timezone: 'America/Santiago'
});

console.log('[Cron EDP] Tarea mensual programada: día 1 de cada mes a las 08:00 (Santiago)');
