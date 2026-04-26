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
        arrendado: { 'Contrato': 21, 'Disponible': 33, 'Uso interno': 3 },
        operatividad: { 'Operativo': 31, 'Taller': 14, 'Panne': 12 },
        ta_total: 40,
        ta_contrato: 21,
        ta_disponible: 19,
        ta_sc_op: { 'Taller': 11, 'Panne': 6, 'Operativo': 2 },
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

router.get('/api/data', (req, res) => {
    res.json(REPORT_DATA);
});

// Función interna para el cron de emails (para no hacer fetch HTTP local)
router.getReportDataInternal = () => {
    return REPORT_DATA;
};

module.exports = router;
