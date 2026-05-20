const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { getSheetData } = require('../../shared/googleSheets');

const prisma = new PrismaClient();

// ─── Datos mock como fallback ─────────────────────────────────────────────────
// Sólo se usan si la BD está vacía Y Google Sheets falla
const REPORT_DATA = {
    flota: {
        total: 57,
        por_tipo: {
            'Tolva': 34, 'Aljibe': 6, 'Rampla': 3,
            'C. Mantención': 4, 'Camion Plano': 2,
            'Tractocamion': 2, 'Camioneta': 2,
            'Semiremolque': 2, 'Otros': 2
        },
        estado_arriendo: {
            total_arrendados: 21, sin_arriendo_no_venta: 33,
            arrendados_externos: 5, a_la_venta: 2,
            uso_interno: 3, operativos: 31, taller: 14, panne: 12
        },
        analisis: { arriendo_por_tipo: {}, peso_por_cliente: {}, total_propios: 50, arrendada_propia: 16 },
        contrato_clientes: {},
        disponibles_ta: []
    },
    crm: { negociacion: [], enviar_cot: [], retomar_top3: [], ganados: [], perdidos: [] },
    comercial: { tareas: { 'Listo': [], 'En progreso': [], 'Sin empezar': [] }, kpis_s14: {} },
    facturacion: {
        total_2026: 0, total_2025: 0, mes_act_2026: 0,
        nopag_total: 0, venc_count: 0, pv_count: 0,
        mensual_2025: [], mensual_2026: [], meses_label: []
    }
};

const SHEET_FLOTA_ID = '1Ry7QVd8jkzISDymg3CeLyL2iroYD4eO6eXIpjImdAXo';
const SHEET_FACT_ID  = '1C_bqGiH_oMtSB2dhw4AAzDMSrtcSPi7deUqnBwor5AE';

function safeLower(val) {
  return val ? val.toString().trim().toLowerCase() : '';
}

// ─── Obtener flota: BD primero, Sheets como fallback ─────────────────────────
async function getFlotaData() {
    try {
        const dbEquipos = await prisma.flotaSyncEquipo.findMany({ orderBy: { equipoId: 'asc' } });

        if (dbEquipos.length > 0) {
            const equipos = dbEquipos.map(e => ({
                id:             e.equipoId,
                patente:        e.patente        || '',
                tipo:           e.tipo           || 'Otros',
                horometro:      e.horometro      || '',
                fecha_horometro: e.fechaHorometro || '',
                ubicacion:      e.ubicacion      || '',
                arrendado:      e.arrendado      || '',
                cliente:        e.cliente        || '',
                propietario:    e.propietario    || '',
                operativo:      e.operativo      || '',
                venc_permiso:   e.vencPermiso    || '',
                venc_soap:      e.vencSoap       || '',
                venc_rev:       e.vencRev        || '',
                venc_gases:     e.vencGases      || '',
                _fromDb:        true,
            }));
            return {
                equipos,
                total: equipos.length,
                por_tipo: REPORT_DATA.flota.por_tipo,
                estado_arriendo: REPORT_DATA.flota.estado_arriendo,
                analisis: REPORT_DATA.flota.analisis,
                ta_total: 40, ta_contrato: 21, ta_disponible: 19,
                ta_sc_op: { 'Taller': 11, 'Panne': 6, 'Operativo': 2 },
                contrato_clientes: REPORT_DATA.flota.contrato_clientes,
                disponibles_ta: REPORT_DATA.flota.disponibles_ta,
            };
        }

        // Fallback a Sheets si la BD está vacía (primera carga antes del sync)
        const data = await getSheetData(SHEET_FLOTA_ID, "'Detalle Estatus'!A:Z");
        if (!data || data.length < 2) return REPORT_DATA.flota;

        const rows = data.slice(1).filter(r => r[0] && r[0].trim() !== '');
        const equipos = rows.map(row => ({
            id:             (row[0]  || '').trim(),
            patente:        (row[1]  || '').trim(),
            tipo:           (row[3]  || 'Otros').trim(),
            horometro:      (row[8]  || '').trim(),
            fecha_horometro:(row[9]  || '').trim(),
            ubicacion:      (row[13] || '').trim(),
            arrendado:      (row[14] || '').trim(),
            cliente:        (row[15] || '').trim(),
            propietario:    (row[16] || '').trim(),
            operativo:      (row[17] || '').trim(),
            venc_permiso:   (row[19] || '').trim(),
            venc_soap:      (row[20] || '').trim(),
            venc_rev:       (row[21] || '').trim(),
            venc_gases:     (row[22] || '').trim(),
            _fromDb:        false,
        }));

        return {
            equipos,
            total: equipos.length,
            por_tipo: REPORT_DATA.flota.por_tipo,
            estado_arriendo: REPORT_DATA.flota.estado_arriendo,
            analisis: REPORT_DATA.flota.analisis,
            ta_total: 40, ta_contrato: 21, ta_disponible: 19,
            ta_sc_op: { 'Taller': 11, 'Panne': 6, 'Operativo': 2 },
            contrato_clientes: REPORT_DATA.flota.contrato_clientes,
            disponibles_ta: REPORT_DATA.flota.disponibles_ta,
        };
    } catch (e) {
        console.error('Error obteniendo flota:', e.message);
        return REPORT_DATA.flota;
    }
}

// ─── Obtener facturación: BD primero, Sheets como fallback ───────────────────
async function getFacturacionData() {
    try {
        const dbFacturas = await prisma.facturaSyncVenta.findMany({
            orderBy: { anioEmi: 'desc' },
        });

        if (dbFacturas.length > 0) {
            const facturas = dbFacturas.map(f => ({
                id:          f.facturaId,
                tipo:        f.tipo        || '',
                cliente:     f.cliente     || '',
                emision:     f.emision     || '',
                vencimiento: f.vencimiento || '',
                mes_txt:     f.mesTxt      || '',
                neto:        f.neto,
                saldo:       f.saldo,
                estado:      f.estado      || '',
                alerta:      f.alerta      || '',
                dias_vencida: f.diasVencida,
                mes_emi:     f.mesEmi,
                anio_emi:    f.anioEmi,
                _fromDb:     true,
            }));
            return { facturas };
        }

        // Fallback a Sheets
        const data = await getSheetData(SHEET_FACT_ID, "'BBDD Facturas Venta'!A:Z");
        if (!data || data.length < 2) return REPORT_DATA.facturacion;

        const rows = data.slice(1).filter(r => r[0] && r[0].trim() !== '');
        const facturas = rows.map(row => ({
            id:          row[0] || '',
            tipo:        row[1] || '',
            cliente:     row[2] || '',
            emision:     row[3] || '',
            vencimiento: row[4] || '',
            mes_txt:     row[5] || '',
            neto:        parseFloat((row[7]  || '0').replace(/\./g, '').replace(/,/g, '.')) || 0,
            saldo:       parseFloat((row[11] || '0').replace(/\./g, '').replace(/,/g, '.')) || 0,
            estado:      safeLower(row[13]),
            alerta:      safeLower(row[14]),
            dias_vencida: parseInt(row[16]) || 0,
            mes_emi:     parseInt(row[18]) || 0,
            anio_emi:    parseInt(row[19]) || 0,
            _fromDb:     false,
        }));

        return { facturas };
    } catch (e) {
        console.error('Error obteniendo facturación:', e.message);
        return REPORT_DATA.facturacion;
    }
}

// ─── Endpoint principal de datos ─────────────────────────────────────────────
router.get('/api/data', async (req, res) => {
    const [realFlota, realFacturacion] = await Promise.all([
        getFlotaData(),
        getFacturacionData(),
    ]);
    res.json({ ...REPORT_DATA, flota: realFlota, facturacion: realFacturacion });
});

// ─── Endpoint de alertas ──────────────────────────────────────────────────────
router.get('/api/alertas', async (req, res) => {
    try {
        const hoy   = new Date();
        const en30  = new Date(hoy); en30.setDate(hoy.getDate() + 30);
        const hace15 = new Date(hoy); hace15.setDate(hoy.getDate() - 15);

        // Mes de consumo anterior: si estamos en mayo, el mes anterior es "2026-04"
        const mesActual  = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        const mesAnterior = new Date(mesActual); mesAnterior.setMonth(mesAnterior.getMonth() - 1);
        const mesAnteriorStr = `${mesAnterior.getFullYear()}-${String(mesAnterior.getMonth() + 1).padStart(2, '0')}`;

        const [contratosVencen, edpsPendientes, danosSinMovimiento, facturasVencidas] = await Promise.all([

            // 1. Contratos que vencen en los próximos 30 días
            prisma.contrato.findMany({
                where: {
                    activo:      true,
                    fechaTermino: { gte: hoy, lte: en30 },
                },
                include: { contratoEquipos: { where: { activo: true } } },
                orderBy: { fechaTermino: 'asc' },
            }),

            // 2. EDPs del mes anterior o anteriores que no están facturadas
            prisma.eDP.findMany({
                where: {
                    estado: { in: ['Solicitud', 'Enviado', 'Negociación'] },
                    mesConsumo: { lte: mesAnteriorStr, not: '' },
                },
                include: { contrato: { select: { cliente: true, numeroContrato: true } } },
                orderBy: { mesConsumo: 'asc' },
            }),

            // 3. Daños/mermas activos sin actualización en más de 15 días
            prisma.danosMerma.findMany({
                where: {
                    activo:    true,
                    etapa:     { lt: 5 },
                    updatedAt: { lt: hace15 },
                },
                orderBy: { updatedAt: 'asc' },
            }),

            // 4. Facturas vencidas > 30 días desde la BD cacheada
            prisma.facturaSyncVenta.findMany({
                where: {
                    diasVencida: { gt: 30 },
                    estado:      { notIn: ['pagada', 'pagado', 'anulada'] },
                },
                orderBy: { diasVencida: 'desc' },
                take: 20,
            }),
        ]);

        res.json({
            contratosVencen: contratosVencen.map(c => ({
                id:            c.id,
                numeroContrato: c.numeroContrato,
                cliente:       c.cliente,
                fechaTermino:  c.fechaTermino,
                diasRestantes: Math.ceil((new Date(c.fechaTermino) - hoy) / (1000 * 60 * 60 * 24)),
                equiposActivos: c.contratoEquipos.length,
            })),
            edpsPendientes: edpsPendientes.map(e => ({
                id:          e.id,
                cliente:     e.contrato?.cliente || '-',
                contrato:    e.contrato?.numeroContrato || '-',
                mesConsumo:  e.mesConsumo,
                estado:      e.estado,
                total:       e.total,
            })),
            danosSinMovimiento: danosSinMovimiento.map(d => ({
                id:          d.id,
                equipoId:    d.equipoId,
                equipoDesc:  d.equipoDesc,
                cliente:     d.cliente,
                etapa:       d.etapa,
                diasSinMov:  Math.floor((hoy - new Date(d.updatedAt)) / (1000 * 60 * 60 * 24)),
                montoDano:   d.montoDano,
            })),
            facturasVencidas: facturasVencidas.map(f => ({
                id:          f.facturaId,
                cliente:     f.cliente,
                saldo:       f.saldo,
                neto:        f.neto,
                diasVencida: f.diasVencida,
                vencimiento: f.vencimiento,
            })),
            resumen: {
                contratosVencen:    contratosVencen.length,
                edpsPendientes:     edpsPendientes.length,
                danosSinMovimiento: danosSinMovimiento.length,
                facturasVencidas:   facturasVencidas.length,
                total:              contratosVencen.length + edpsPendientes.length + danosSinMovimiento.length + facturasVencidas.length,
            },
        });
    } catch (e) {
        console.error('Error en /api/alertas:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// Forzar envío manual del informe semanal (para testing desde el dashboard)
router.post('/api/send-report', async (req, res) => {
    try {
        const { sendWeeklyReport } = require('../cron/weeklyReport');
        await sendWeeklyReport();
        res.json({ ok: true, msg: 'Informe enviado correctamente.' });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// Función interna para el cron de emails
router.getReportDataInternal = async () => {
    const [realFlota, realFacturacion] = await Promise.all([
        getFlotaData(),
        getFacturacionData(),
    ]);
    return { ...REPORT_DATA, flota: realFlota, facturacion: realFacturacion };
};

module.exports = router;
