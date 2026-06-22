// modules/marketing/services/demoData.js — Datos de simulación realistas para marketing digital

function getOverviewData(days = 30) {
    // Escalar según los días seleccionados
    const scale = days / 30;
    
    // Gasto por plataforma
    const metaSpend = Math.round(1125000 * scale);
    const googleSpend = Math.round(875000 * scale);
    const linkedinSpend = Math.round(500000 * scale);
    const totalSpend = metaSpend + googleSpend + linkedinSpend;

    // Leads generados
    const metaLeads = Math.round(156 * scale);
    const googleLeads = Math.round(124 * scale);
    const linkedinLeads = Math.round(62 * scale);
    const totalLeads = metaLeads + googleLeads + linkedinLeads;

    // Clics
    const metaClicks = Math.round(12400 * scale);
    const googleClicks = Math.round(8200 * scale);
    const linkedinClicks = Math.round(3100 * scale);
    const totalClicks = metaClicks + googleClicks + linkedinClicks;

    // Impresiones
    const metaImp = Math.round(413000 * scale);
    const googleImp = Math.round(148000 * scale);
    const linkedinImp = Math.round(59000 * scale);
    const totalImpressions = metaImp + googleImp + linkedinImp;

    // ROAS (Retorno estimado basado en leads convertidos a un valor promedio)
    const estimatedRevenue = totalLeads * 0.15 * 850000; // 15% conversion a ventas de arriendo promedio $850k
    const roas = parseFloat((estimatedRevenue / totalSpend).toFixed(2));

    return {
        periodo: `${days} días`,
        global: {
            spend: totalSpend,
            leads: totalLeads,
            clicks: totalClicks,
            impressions: totalImpressions,
            cpl: Math.round(totalSpend / totalLeads),
            cpc: Math.round(totalSpend / totalClicks),
            ctr: parseFloat(((totalClicks / totalImpressions) * 100).toFixed(2)),
            roas: roas,
            comparativas: {
                spendChange: 12.4, // delta % vs período anterior
                leadsChange: 8.2,
                cplChange: -4.8,
                cpcChange: -2.9,
                ctrChange: 0.35,
                roasChange: 0.15
            }
        },
        canales: {
            meta: {
                spend: metaSpend,
                leads: metaLeads,
                clicks: metaClicks,
                impressions: metaImp,
                cpl: Math.round(metaSpend / metaLeads),
                cpc: Math.round(metaSpend / metaClicks),
                ctr: parseFloat(((metaClicks / metaImp) * 100).toFixed(2)),
                conversions: metaLeads
            },
            google: {
                spend: googleSpend,
                leads: googleLeads,
                clicks: googleClicks,
                impressions: googleImp,
                cpl: Math.round(googleSpend / googleLeads),
                cpc: Math.round(googleSpend / googleClicks),
                ctr: parseFloat(((googleClicks / googleImp) * 100).toFixed(2)),
                conversions: googleLeads
            },
            linkedin: {
                spend: linkedinSpend,
                leads: linkedinLeads,
                clicks: linkedinClicks,
                impressions: linkedinImp,
                cpl: Math.round(linkedinSpend / linkedinLeads),
                cpc: Math.round(linkedinSpend / linkedinClicks),
                ctr: parseFloat(((linkedinClicks / linkedinImp) * 100).toFixed(2)),
                conversions: linkedinLeads
            }
        }
    };
}

function getTrends(months = 6) {
    const labels = [];
    const spendData = [];
    const leadsData = [];
    const cplData = [];

    const date = new Date();
    date.setMonth(date.getMonth() - months + 1);

    const nombresMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    // Valores iniciales y tendencias base
    let baseSpend = 1800000;
    let baseLeads = 240;

    for (let i = 0; i < months; i++) {
        const label = nombresMeses[date.getMonth()] + ' ' + date.getFullYear().toString().substring(2);
        labels.push(label);

        // Agrega variaciones aleatorias pero coherentes y en tendencia al alza
        const rVal = 0.9 + Math.random() * 0.25; // 0.9 a 1.15
        const currentSpend = Math.round(baseSpend * rVal);
        // La eficiencia del lead mejora un poco cada mes
        const currentLeads = Math.round(baseLeads * rVal * (1.0 + (i * 0.03)));
        const currentCpl = Math.round(currentSpend / currentLeads);

        spendData.push(currentSpend);
        leadsData.push(currentLeads);
        cplData.push(currentCpl);

        // Incrementar bases para el siguiente mes (crecimiento orgánico de campañas)
        baseSpend = Math.round(baseSpend * 1.04);
        baseLeads = Math.round(baseLeads * 1.05);

        date.setMonth(date.getMonth() + 1);
    }

    return {
        labels,
        spend: spendData,
        leads: leadsData,
        cpl: cplData
    };
}

function getSocialData() {
    return {
        meta: {
            facebook: {
                seguidores: 12435,
                crecimiento: 234,
                engagementRate: 4.25,
                visualizacionesPagina: 1840,
                alcanceTotal: 48900
            },
            instagram: {
                seguidores: 8742,
                crecimiento: 412,
                engagementRate: 6.12,
                visualizacionesPagina: 3410,
                alcanceTotal: 32400
            }
        },
        linkedin: {
            seguidores: 3218,
            crecimiento: 89,
            engagementRate: 3.84,
            visualizacionesPagina: 950,
            alcanceTotal: 12800
        },
        topPosts: [
            {
                id: 'p1',
                plataforma: 'instagram',
                imagen: '/assets/post_maquinaria_demo.jpg', // Ruta demo, controlada en frontend
                caption: '🚛 ¡Nueva incorporación a nuestra flota de tolvas! Listos para responder a los requerimientos de la minería en el norte. #TransportesCYC #MineriaChile #MaquinariaPesada',
                engagement: '8.4%',
                clicks: 345,
                alcance: 12400,
                fecha: 'Hace 3 días'
            },
            {
                id: 'p2',
                plataforma: 'linkedin',
                caption: 'Celebrando el hito de 500 días sin accidentes incapacitantes en nuestras operaciones de arriendo de camiones aljibe. El compromiso con la seguridad de nuestro equipo y clientes es lo primero. 👷‍♂️💪 #SeguridadIndustrial #TransportesCYC #OperacionesSeguras',
                engagement: '5.8%',
                clicks: 412,
                alcance: 8900,
                fecha: 'Hace 5 días'
            },
            {
                id: 'p3',
                plataforma: 'facebook',
                caption: '¿Buscas optimizar el movimiento de tierras en tu obra? Consulta por nuestro servicio integral de arriendo de camiones tolva 8x4. Equipos de última generación y operadores certificados.',
                engagement: '3.1%',
                clicks: 198,
                alcance: 6200,
                fecha: 'Hace 1 semana'
            },
            {
                id: 'p4',
                plataforma: 'instagram',
                caption: 'Operando bajo los estándares climáticos más exigentes. Nuestro equipo en ruta demostrando por qué somos líderes en logística de carga pesada. ❄️🏔️ #FaenaMinera #CamionesAljibe #Logistica',
                engagement: '7.2%',
                clicks: 280,
                alcance: 9100,
                fecha: 'Hace 10 días'
            },
            {
                id: 'p5',
                plataforma: 'linkedin',
                caption: 'Agradecemos a Compañía Minera Doña Inés de Collahuasi por renovar la confianza en nuestros servicios de apoyo operacional de flota por todo el período 2026. ¡Seguimos avanzando juntos!',
                engagement: '6.5%',
                clicks: 530,
                alcance: 11200,
                fecha: 'Hace 2 semanas'
            }
        ],
        seguidoresHistorial: {
            labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
            facebook: [11200, 11450, 11680, 11950, 12201, 12435],
            instagram: [6800, 7150, 7500, 7880, 8330, 8742],
            linkedin: [2700, 2810, 2900, 3010, 3129, 3218]
        }
    };
}

function getTopCampaigns() {
    return [
        {
            id: 'c1',
            nombre: 'Arriendo Camiones Tolva Minería 2026',
            plataforma: 'google',
            estado: 'Activa',
            gasto: 450000,
            impresiones: 35000,
            clics: 2800,
            ctr: 8.0,
            conversions: 45,
            cpa: 10000
        },
        {
            id: 'c2',
            nombre: 'Branding Industrial - Soluciones Logísticas',
            plataforma: 'linkedin',
            estado: 'Activa',
            gasto: 350000,
            impresiones: 45000,
            clics: 950,
            ctr: 2.11,
            conversions: 18,
            cpa: 19444
        },
        {
            id: 'c3',
            nombre: 'Arriendo de Camiones Aljibe y Combustible',
            plataforma: 'meta',
            estado: 'Activa',
            gasto: 520000,
            impresiones: 185000,
            clics: 5400,
            ctr: 2.92,
            conversions: 68,
            cpa: 7647
        },
        {
            id: 'c4',
            nombre: 'Reclutamiento Operadores Camión Dumper',
            plataforma: 'meta',
            estado: 'Pausada',
            gasto: 150000,
            impresiones: 82000,
            clics: 2200,
            ctr: 2.68,
            conversions: 94,
            cpa: 1595
        },
        {
            id: 'c5',
            nombre: 'Servicio de Transportes de Equipos y CamaBaja',
            plataforma: 'google',
            estado: 'Activa',
            gasto: 280000,
            impresiones: 22000,
            clics: 1650,
            ctr: 7.5,
            conversions: 25,
            cpa: 11200
        }
    ];
}

module.exports = {
    getOverviewData,
    getTrends,
    getSocialData,
    getTopCampaigns
};
