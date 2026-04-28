const express = require('express');
const router = express.Router();

// Mock Data traducida desde informe_cyc_base.py
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
            total_arrendados: 21,
            sin_arriendo_no_venta: 33,
            arrendados_externos: 5,
            a_la_venta: 2,
            uso_interno: 3,
            operativos: 31,
            taller: 14,
            panne: 12
        },
        analisis: {
            arriendo_por_tipo: {'Tolva': 15, 'Aljibe': 6},
            peso_por_cliente: {'JCC': 6, 'Terracop': 4},
            total_propios: 50,
            arrendada_propia: 16
        },
        contrato_clientes: {
            'JCC': 6, 'Terracop': 4, 'Laguna Verde': 3,
            'Go Rental': 3, 'GoDiesel': 2, 'MAQSA': 2, 'Doers': 1
        },
        disponibles_ta: [
            ['RLLL-39', 'Aljibe', 2022, 11070, 'Taller'],
            ['RLLL-47', 'Aljibe', 2022, 10631, 'Taller'],
            ['PZFT-12', 'Tolva',  2021, 10501, 'Taller'],
            ['RHTD-45', 'Tolva',  2022, 10265, 'Taller'],
            ['RLLL-58', 'Aljibe', 2022,  9847, 'Taller'],
            ['RLKM-22', 'Tolva',  2020,  9310, 'Panne'],
            ['RYXZ-11', 'Tolva',  2021,  8790, 'Operativo'],
            ['RTBD-33', 'Tolva',  2020,  8450, 'Panne'],
        ]
    },
    crm: {
        negociacion: [
            ['2 Tolva Transportes Lucca', 'Paolo Crisosto', 12, 'Alta'],
            ['2 Tolva + Mant. MADISON',   'Luis Quepe',      6, 'Media'],
        ],
        enviar_cot: [
            ['2 Tolva Minera Los Maximos Spa', 'Andrea Ottonss', 12, 'Media'],
        ],
        retomar_top3: [
            ['CONSTRUCTORA INAC',   'Jose Castro',  36, 'Camiones con operador para faena'],
            ['GLOBAL RENTAL',       'Ivo Pavlov',   25, 'Enviar lista equipos disponibles'],
            ['ACV MAQUINARIA',      'Giselle',       9, 'Aljibe para Maria Helena y TalTal'],
        ],
        ganados: [
            ['6 Cam. Tolva Cerro Alto',   30],
            ['DOERS (Chanaral)',           40],
            ['MADISON (camiones)',         12],
            ['6 Cam. MANTOS VERDES JCC',   0],
        ],
        perdidos: [
            'IMOPAC', 'TCI Chile', 'SRD', 'Fenix Gold/Straccon',
            'Inka Oro', 'SICOMAQ', 'TCL Chile', 'Precipitadores Chile',
        ]
    },
    comercial: {
        tareas: {
            'Listo': ['Crear cotizador', 'Definir metricas comercial', 'Grabar videos RRSS'],
            'En progreso': ['Catalogo 2026', 'Estrategia comercial', 'Terminar Grilla Marketing'],
            'Sin empezar': ['Merchandasing', 'Marketing Afianzamiento clientes',
                            'Gestion Clientes', 'Calendario de prospeccion', 'Planificacion terreno'],
        },
        kpis_s14: {
            'Leads': [6, 15],
            'Reun. agendadas': [2, 4],
            'Reun. efectivas': [1, 2],
            'Cotizaciones': [3, 5],
            'Eq. cerrados': [0, 2],
        }
    },
    facturacion: {
        total_2026: 401.5,
        total_2025: 1571.8,
        mes_act_2026: 151.3,
        nopag_total: 237.8,
        venc_count: 21,
        pv_count: 10,
        mensual_2025: [19.1, 31.8, 78.0, 157.7, 89.9, 116.4, 162.0, 130.5, 75.3, 255.0, 79.2, 376.9],
        mensual_2026: [104.5, 116.9, 151.3, 28.8],
        meses_label: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    }
};

const { getSheetData } = require('../../shared/googleSheets');
const SHEET_ID = '1Ry7QVd8jkzISDymg3CeLyL2iroYD4eO6eXIpjImdAXo';

function safeLower(val) {
  return val ? val.toString().trim().toLowerCase() : '';
}

async function getFlotaData() {
    try {
        const data = await getSheetData(SHEET_ID, "'Detalle Estatus'!A:Z");
        if (!data || data.length < 2) return REPORT_DATA.flota; // Fallback a mock

        const rows = data.slice(1).filter(r => r[0] && r[0].trim() !== '');
        
        let total = rows.length;
        let equipos = [];

        for (const row of rows) {
            equipos.push({
                id: (row[0] || '').trim(),
                patente: (row[1] || '').trim(),
                tipo: (row[3] || 'Otros').trim(),
                horometro: (row[8] || '').trim(),
                fecha_horometro: (row[9] || '').trim(),
                ubicacion: (row[13] || '').trim(),
                arrendado: (row[14] || '').trim(),
                cliente: (row[15] || '').trim(),
                propietario: (row[16] || '').trim(),
                operativo: (row[17] || '').trim(),
                venc_permiso: (row[19] || '').trim(),
                venc_soap: (row[20] || '').trim(),
                venc_rev: (row[21] || '').trim(),
                venc_gases: (row[22] || '').trim()
            });
        }

        return {
            equipos,
            // Fallbacks requeridos para vistas antiguas, la lógica real estará en frontend
            total: equipos.length,
            por_tipo: REPORT_DATA.flota.por_tipo,
            estado_arriendo: REPORT_DATA.flota.estado_arriendo,
            analisis: REPORT_DATA.flota.analisis,
            arrendado: REPORT_DATA.flota.arrendado,
            operatividad: REPORT_DATA.flota.operatividad,
            ta_total: 40,
            ta_contrato: 21,
            ta_disponible: 19,
            ta_sc_op: { 'Taller': 11, 'Panne': 6, 'Operativo': 2 },
            contrato_clientes: REPORT_DATA.flota.contrato_clientes,
            disponibles_ta: REPORT_DATA.flota.disponibles_ta
        };
    } catch (e) {
        console.error('Error obteniendo data de sheets', e);
        return REPORT_DATA.flota; // Fallback
    }
}

async function getFacturacionData() {
    try {
        const SHEET_FACT_ID = '1C_bqGiH_oMtSB2dhw4AAzDMSrtcSPi7deUqnBwor5AE';
        const data = await getSheetData(SHEET_FACT_ID, "'BBDD Facturas Venta'!A:Z");
        if (!data || data.length < 2) return REPORT_DATA.facturacion;

        const rows = data.slice(1).filter(r => r[0] && r[0].trim() !== '');
        
        let total_2026 = 0;
        let total_2025 = 0;
        let mes_act_2026 = 0;
        let nopag_total = 0;
        let venc_count = 0;
        let pv_count = 0;
        
        let mensual_2025 = new Array(12).fill(0);
        let mensual_2026 = new Array(12).fill(0);

        const currentMonth = new Date().getMonth() + 1; // 1-12

        rows.forEach(row => {
            const netoStr = (row[7] || '0').replace(/\./g, '').replace(/,/g, '.');
            const neto = parseFloat(netoStr) || 0;
            const netoM = neto / 1000000;

            const saldoStr = (row[11] || '0').replace(/\./g, '').replace(/,/g, '.');
            const saldo = parseFloat(saldoStr) || 0;
            
            const estado = safeLower(row[13]);
            const alerta = safeLower(row[14]);
            
            const mesEmi = parseInt(row[18]) || 0;
            const anioEmi = parseInt(row[19]) || 0;

            if (anioEmi === 2025) {
                total_2025 += netoM;
                if (mesEmi >= 1 && mesEmi <= 12) {
                    mensual_2025[mesEmi - 1] += netoM;
                }
            } else if (anioEmi === 2026) {
                total_2026 += netoM;
                if (mesEmi >= 1 && mesEmi <= 12) {
                    mensual_2026[mesEmi - 1] += netoM;
                }
                if (mesEmi === currentMonth) {
                    mes_act_2026 += netoM;
                }
            }

            if (estado !== 'pagado') {
                nopag_total += (saldo / 1000000);
            }

            if (alerta === 'vencida') {
                venc_count++;
            } else if (alerta === 'por vencer' || alerta === '0-30') {
                pv_count++;
            }
        });

        const round1 = num => Math.round(num * 10) / 10;
        
        return {
            total_2026: round1(total_2026),
            total_2025: round1(total_2025),
            mes_act_2026: round1(mes_act_2026),
            nopag_total: round1(nopag_total),
            venc_count: venc_count,
            pv_count: pv_count,
            mensual_2025: mensual_2025.map(round1),
            mensual_2026: mensual_2026.map(round1),
            meses_label: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
        };

    } catch (e) {
        console.error('Error obteniendo data de facturacion', e);
        return REPORT_DATA.facturacion;
    }
}

router.get('/api/data', async (req, res) => {
    const realFlota = await getFlotaData();
    const realFacturacion = await getFacturacionData();
    const dataToSend = {
        ...REPORT_DATA,
        flota: realFlota,
        facturacion: realFacturacion
    };
    res.json(dataToSend);
});

// Función interna para el cron de emails
router.getReportDataInternal = async () => {
    const realFlota = await getFlotaData();
    const realFacturacion = await getFacturacionData();
    return {
        ...REPORT_DATA,
        flota: realFlota,
        facturacion: realFacturacion
    };
};

module.exports = router;
