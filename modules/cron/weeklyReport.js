// modules/cron/weeklyReport.js — Informe semanal automático (Lunes 15:00)
const cron        = require('node-cron');
const nodemailer  = require('nodemailer');
const { PrismaClient } = require('@prisma/client');
const informeRouter    = require('../informe/router');

const prisma = new PrismaClient();

const transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT) || 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER || 'dtorres@tcyc.cl',
        pass: process.env.EMAIL_PASS || '',
    },
});

// ─── Helpers HTML ─────────────────────────────────────────────────────────────

const BORDER_COLORS = {
    green:  '#16a34a',
    yellow: '#f59e0b',
    red:    '#dc2626',
    blue:   '#2563eb',
    purple: '#7c3aed',
};

function section(color, title, content) {
    return `
    <div style="margin-top:20px;padding:20px;background:#f8fafc;border-left:4px solid ${BORDER_COLORS[color]};border-radius:6px;">
        <h3 style="margin:0 0 14px;color:#1a3a5c;font-size:15px;">${title}</h3>
        ${content}
    </div>`;
}

function metricRow(items) {
    return `<div style="display:flex;gap:24px;flex-wrap:wrap;">
        ${items.map(([label, value, color]) => `
        <div style="min-width:80px;">
            <span style="font-size:26px;font-weight:800;color:${color || '#1a3a5c'};">${value}</span><br>
            <span style="font-size:11px;color:#7f8c8d;">${label}</span>
        </div>`).join('')}
    </div>`;
}

function miniTable(headers, rows, emptyMsg = 'Sin registros.') {
    if (!rows.length) return `<p style="font-size:12px;color:#95a5a6;margin:0;">${emptyMsg}</p>`;
    return `
    <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:10px;">
        <thead><tr>${headers.map(h =>
            `<th style="text-align:left;padding:6px 8px;background:#e8edf2;color:#1a3a5c;font-weight:600;">${h}</th>`
        ).join('')}</tr></thead>
        <tbody>${rows.map((cells, i) =>
            `<tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'};">${cells.map(c =>
                `<td style="padding:6px 8px;border-bottom:1px solid #e8edf2;">${c}</td>`
            ).join('')}</tr>`
        ).join('')}</tbody>
    </table>`;
}

function clp(n) {
    if (!n) return '—';
    return '$' + Math.round(n).toLocaleString('es-CL');
}

// ─── Datos de EDPs y Daños desde Prisma ──────────────────────────────────────

async function getEdpResumen() {
    const hoy         = new Date();
    const mesActual   = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const mesAnterior = new Date(mesActual); mesAnterior.setMonth(mesAnterior.getMonth() - 1);
    const mesAnteriorStr = `${mesAnterior.getFullYear()}-${String(mesAnterior.getMonth() + 1).padStart(2, '0')}`;

    const edps = await prisma.eDP.findMany({
        where:   { estado: { not: 'Facturado' } },
        include: { contrato: { select: { cliente: true, numeroContrato: true } } },
        orderBy: { mesConsumo: 'asc' },
    });

    const byEstado = { Solicitud: [], Enviado: [], Negociación: [], Cerrado: [] };
    let totalEnRiesgo = 0;
    const vencidos = [];

    for (const e of edps) {
        if (byEstado[e.estado] !== undefined) byEstado[e.estado].push(e);
        totalEnRiesgo += e.total || 0;
        if (e.mesConsumo && e.mesConsumo <= mesAnteriorStr) vencidos.push(e);
    }

    return { edps, byEstado, totalEnRiesgo, vencidos };
}

async function getDanosResumen() {
    const hace15 = new Date(); hace15.setDate(hace15.getDate() - 15);

    const danos = await prisma.danosMerma.findMany({
        where:   { activo: true },
        orderBy: { createdAt: 'desc' },
    });

    const byEtapa = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    let totalPorCobrar   = 0;
    let totalFacturado   = 0;
    const sinMovimiento  = [];

    for (const d of danos) {
        if (byEtapa[d.etapa] !== undefined) byEtapa[d.etapa].push(d);
        if (d.etapa < 5) totalPorCobrar += d.montoDano || 0;
        if (d.etapa === 5) totalFacturado += d.montoFacturado || 0;
        if (d.etapa < 5 && new Date(d.updatedAt) < hace15) sinMovimiento.push(d);
    }

    return { danos, byEtapa, totalPorCobrar, totalFacturado, sinMovimiento };
}

// ─── Generación del HTML del correo ──────────────────────────────────────────

async function generateEmailHTML(data, edpRes, danosRes) {

    // Calcular KPIs de flota desde equipos reales si están disponibles
    let flotaOperativos = '—', flotaTaller = '—', flotaPanne = '—', flotaArrendados = '—';
    if (data.flota?.equipos?.length) {
        const eq = data.flota.equipos;
        const sl = v => (v || '').toString().trim().toLowerCase();
        flotaArrendados = eq.filter(e => sl(e.arrendado).includes('contrato')).length;
        flotaOperativos = eq.filter(e => sl(e.operativo).includes('operativ')).length;
        flotaTaller     = eq.filter(e => sl(e.operativo).includes('taller')).length;
        flotaPanne      = eq.filter(e => sl(e.operativo).includes('panne')).length;
    } else {
        flotaOperativos = data.flota?.operatividad?.['Operativo'] ?? '—';
        flotaTaller     = data.flota?.operatividad?.['Taller']    ?? '—';
        flotaPanne      = data.flota?.operatividad?.['Panne']     ?? '—';
    }

    const totalPipeline = [
        ...(data.crm?.negociacion  || []),
        ...(data.crm?.enviar_cot   || []),
        ...(data.crm?.retomar_top3 || []),
    ].reduce((s, item) => s + (item[2] || 0), 0);

    // ── Sección Flota ──
    const secFlota = section('green', '🚛 Arriendo y Flota',
        metricRow([
            ['Arrendados', flotaArrendados, '#16a34a'],
            ['Operativos', flotaOperativos, '#2563eb'],
            ['En Taller',  flotaTaller,     '#f59e0b'],
            ['En Panne',   flotaPanne,      '#dc2626'],
        ])
    );

    // ── Sección Pipeline ──
    const secPipeline = section('yellow', '📊 Pipeline CRM Activo',
        `<p style="margin:0;font-size:28px;font-weight:800;color:#f59e0b;">$${totalPipeline}M</p>
         <p style="margin:4px 0 0;font-size:12px;color:#7f8c8d;">Valor estimado en negocios en curso</p>
         ${data.crm?.negociacion?.length ? miniTable(
            ['Oportunidad', 'Contacto', 'Meses', 'Prioridad'],
            data.crm.negociacion.map(n => [n[0], n[1], n[2], n[3]])
         ) : ''}`
    );

    // ── Sección Facturación ──
    const facData = data.facturacion || {};
    const noPag  = facData.nopag_total || 0;
    const venc   = facData.venc_count  || 0;
    const secFac = section('red', '💳 Facturación Crítica',
        metricRow([
            ['Por Cobrar Total', clp(noPag * 1_000_000), '#1a3a5c'],
            ['Facturas Vencidas', venc, '#dc2626'],
        ])
    );

    // ── Sección EDPs ──────────────────────────────────────────────────────────
    const edpVencidosRows = edpRes.vencidos.slice(0, 8).map(e => [
        e.contrato?.cliente || '—',
        e.contrato?.numeroContrato || '—',
        e.mesConsumo || '—',
        `<span style="background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:3px;">${e.estado}</span>`,
        clp(e.total),
    ]);

    const secEDP = section('blue', '📋 Estado EDPs',
        `${metricRow([
            ['Total sin facturar', edpRes.edps.length,           '#2563eb'],
            ['En Solicitud',       edpRes.byEstado.Solicitud.length,  '#7c3aed'],
            ['Enviados',           edpRes.byEstado.Enviado.length,    '#f59e0b'],
            ['En Negociación',     edpRes.byEstado.Negociación.length,'#dc2626'],
            ['Cerrados',           edpRes.byEstado.Cerrado.length,    '#16a34a'],
        ])}
        <p style="margin:14px 0 4px;font-size:12px;color:#1a3a5c;font-weight:600;">
            💰 Monto total en proceso: <strong>${clp(edpRes.totalEnRiesgo)}</strong>
        </p>
        ${edpRes.vencidos.length > 0 ? `
        <p style="margin:14px 0 4px;font-size:12px;color:#dc2626;font-weight:600;">
            ⚠️ ${edpRes.vencidos.length} EDP(s) de meses anteriores sin cerrar:
        </p>
        ${miniTable(['Cliente', 'Contrato', 'Período', 'Estado', 'Total'], edpVencidosRows)}` :
        `<p style="margin:10px 0 0;font-size:12px;color:#16a34a;">✓ Todos los EDPs están al día.</p>`}`
    );

    // ── Sección Daños & Mermas ────────────────────────────────────────────────
    const ETAPA_LABEL = ['','Recepcionar','Levantamiento','Enviar Informe','Negociación','Facturado'];

    const danosActivosRows = danosRes.danos
        .filter(d => d.etapa < 5)
        .slice(0, 8)
        .map(d => [
            d.equipoId,
            d.cliente || '—',
            ETAPA_LABEL[d.etapa] || `Etapa ${d.etapa}`,
            clp(d.montoDano),
        ]);

    const danosSinMovRows = danosRes.sinMovimiento.slice(0, 5).map(d => [
        d.equipoId,
        d.cliente || '—',
        ETAPA_LABEL[d.etapa] || `Etapa ${d.etapa}`,
        `<span style="color:#dc2626;font-weight:700;">${Math.floor((new Date() - new Date(d.updatedAt)) / 86400000)} días</span>`,
    ]);

    const secDanos = section('purple', '🔧 Daños & Mermas',
        `${metricRow([
            ['Casos activos',       danosRes.danos.filter(d => d.etapa < 5).length, '#7c3aed'],
            ['Por cobrar',          danosRes.danos.filter(d => d.etapa < 5).length && clp(danosRes.totalPorCobrar) !== '—' ? clp(danosRes.totalPorCobrar) : '—', '#dc2626'],
            ['Facturados esta sem.', danosRes.byEtapa[5]?.length || 0, '#16a34a'],
            ['Sin movimiento +15d',  danosRes.sinMovimiento.length, '#f59e0b'],
        ])}
        ${danosRes.danos.filter(d => d.etapa < 5).length > 0 ? `
        <p style="margin:14px 0 4px;font-size:12px;color:#1a3a5c;font-weight:600;">Casos en curso:</p>
        ${miniTable(['Equipo', 'Cliente', 'Etapa', 'Monto est.'], danosActivosRows)}` :
        `<p style="margin:10px 0 0;font-size:12px;color:#16a34a;">✓ Sin casos de daños activos.</p>`}
        ${danosRes.sinMovimiento.length > 0 ? `
        <p style="margin:14px 0 4px;font-size:12px;color:#f59e0b;font-weight:600;">⏳ Casos sin movimiento en más de 15 días:</p>
        ${miniTable(['Equipo', 'Cliente', 'Etapa', 'Sin mov.'], danosSinMovRows)}` : ''}`
    );

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const fecha  = new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#2c3e50;border:1px solid #eef2f5;border-radius:12px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,0.05);">

        <div style="background:#1a3a5c;padding:28px 24px;text-align:center;color:#fff;">
            <h1 style="margin:0;font-size:22px;">Informe Comercial Gerencia CyC</h1>
            <p style="margin:6px 0 0;color:#a8c0d6;font-size:13px;">Resumen Ejecutivo · ${fecha}</p>
        </div>

        <div style="padding:24px 24px 10px;background:#fff;">
            <p style="font-size:14px;line-height:1.6;color:#34495e;margin-top:0;">
                Hola equipo,<br>
                A continuación el resumen ejecutivo de esta semana.
            </p>
            ${secFlota}
            ${secPipeline}
            ${secFac}
            ${secEDP}
            ${secDanos}

            <div style="text-align:center;margin:32px 0 20px;">
                <a href="${appUrl}/informe/index.html"
                   style="background:#2563eb;color:#fff;text-decoration:none;padding:13px 28px;border-radius:8px;font-weight:700;font-size:15px;display:inline-block;">
                   Ver Dashboard Completo →
                </a>
            </div>
        </div>

        <div style="background:#f4f6f8;padding:14px;text-align:center;color:#95a5a6;font-size:11px;">
            Generado automáticamente por CYC Hub · ${new Date().getFullYear()} Transportes CYC
        </div>
    </div>`;
}

// ─── Envío ────────────────────────────────────────────────────────────────────

async function sendWeeklyReport() {
    try {
        console.log('[CRON] Obteniendo datos para informe semanal...');

        const [data, edpRes, danosRes] = await Promise.all([
            informeRouter.getReportDataInternal(),
            getEdpResumen(),
            getDanosResumen(),
        ]);

        const htmlContent = await generateEmailHTML(data, edpRes, danosRes);

        const mailOptions = {
            from:    `"Gerencia CYC" <${process.env.EMAIL_USER || 'dtorres@tcyc.cl'}>`,
            to:      process.env.GERENCIA_EMAILS || 'dtorres@tcyc.cl',
            subject: `📊 Informe Semanal CyC · ${new Date().toLocaleDateString('es-CL')}`,
            html:    htmlContent,
        };

        console.log(`[CRON] Enviando correo semanal a: ${mailOptions.to}`);
        const info = await transporter.sendMail(mailOptions);
        console.log('[CRON] Correo enviado:', info.messageId);

    } catch (error) {
        console.error('[CRON] Error enviando informe:', error);
    }
}

// Lunes 15:00 hora Santiago
cron.schedule('0 15 * * 1', () => {
    console.log('[CRON] Ejecutando: Informe Semanal');
    sendWeeklyReport();
}, { timezone: 'America/Santiago' });

module.exports = { sendWeeklyReport };
