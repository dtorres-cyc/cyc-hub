let globalEquipos = [];
let globalFacturas = [];
let chartTipo = null;
let chartCliente = null;
let chartFacturacion = null;
let chartFacCliente = null;
let chartFacTipo = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Activar ChartDataLabels
    if (typeof ChartDataLabels !== 'undefined') {
        Chart.register(ChartDataLabels);
    }
    
    // Configuración global de colores para ChartJS modo claro
    Chart.defaults.color = '#64748b';
    Chart.defaults.borderColor = '#e2e8f0';

    const now = new Date();
    document.getElementById('timestamp').textContent = now.toLocaleString('es-CL');

    try {
        const response = await fetch('/informe/api/data');
        const data = await response.json();
        
        if (data.flota && data.flota.equipos) {
            globalEquipos = data.flota.equipos;
            populateFilters(globalEquipos);
            applyFilters(); // Calcula KPIs, gráficos y dibuja tabla
        }
        
        // CRM ahora carga desde la API real de Prisma, no se usa renderCRM con data mockeada.
        
        if (data.facturacion && data.facturacion.facturas) {
            globalFacturas = data.facturacion.facturas;
            populateFacFilters(globalFacturas);
            applyFacFilters();
        }
    } catch (e) {
        console.error('Error fetching data', e);
    }
});

function switchTab(tabId, el) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
    document.getElementById(tabId).style.display = 'block';
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    el.classList.add('active');
}

function safeLower(val) {
    return val ? val.toString().trim().toLowerCase() : '';
}

function populateFilters(equipos) {
    const tipos = [...new Set(equipos.map(e => e.tipo).filter(t => t))].sort();
    const selectTipo = document.getElementById('filter-tipo');
    tipos.forEach(t => {
        const option = document.createElement('option');
        option.value = t.toLowerCase();
        option.textContent = t;
        selectTipo.appendChild(option);
    });
}

function applyFilters() {
    const filterId = safeLower(document.getElementById('filter-id').value);
    const filterTipo = document.getElementById('filter-tipo').value;
    const filterProp = document.getElementById('filter-propietario').value;

    const filtered = globalEquipos.filter(e => {
        const matchId = !filterId || safeLower(e.id).includes(filterId) || safeLower(e.patente).includes(filterId);
        const matchTipo = !filterTipo || safeLower(e.tipo) === filterTipo;
        const esCyc = safeLower(e.propietario).includes('cyc');
        const matchProp = !filterProp || (filterProp === 'cyc' ? esCyc : true);
        return matchId && matchTipo && matchProp;
    });

    calculateFlotaKPIs(filtered);
    updateDocumentAlerts(filtered);
    renderTabla(filtered);
    filterTable(); // Re-aplicar filtro de columnas por si quedó alguno escrito
}

function toggleAlerts(id) {
    const el = document.getElementById(id);
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function showEquiposDetails(cat) {
    const container = document.getElementById('kpi-details-container');
    const content = document.getElementById('kpi-details-content');
    const title = document.getElementById('kpi-details-title');

    const titles = {
        flota_cyc: 'Total Parque',
        arrendados_total: 'Total Arrendados',
        sin_arriendo: 'Sin Arriendo',
        arrendados_externos: 'Arrendados Externos',
        venta: 'A la Venta',
        interno: 'Uso Interno',
        operativos: 'Operativos',
        taller: 'En Taller',
        panne: 'En Panne'
    };

    title.textContent = 'Detalle: ' + titles[cat];
    const list = window.equipos_lists ? window.equipos_lists[cat] : [];
    
    if (!list || list.length === 0) {
        content.innerHTML = '<p style="color:var(--text-muted); font-size:13px;">No hay equipos en esta categoría.</p>';
    } else {
        let tableHtml = `
          <div style="overflow-x:auto;">
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; color:var(--text-main);">
            <thead>
              <tr style="background-color: var(--c-gray); border-bottom: 2px solid var(--border);">
                <th style="padding: 8px;">ID / Patente</th>
                <th style="padding: 8px;">Tipo</th>
                <th style="padding: 8px;">Ubicación</th>
                <th style="padding: 8px;">Arrendado</th>
                <th style="padding: 8px;">Cliente</th>
                <th style="padding: 8px;">Dueño</th>
                <th style="padding: 8px;">Horómetro</th>
                <th style="padding: 8px;">Operativo</th>
              </tr>
            </thead>
            <tbody>
        `;
        list.forEach(e => {
            tableHtml += `
              <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding: 8px; font-weight:600;">${e.id || e.patente || '-'}</td>
                <td style="padding: 8px;">${e.tipo || '-'}</td>
                <td style="padding: 8px;">${e.ubicacion || '-'}</td>
                <td style="padding: 8px;">${e.arrendado || '-'}</td>
                <td style="padding: 8px;">${e.cliente || '-'}</td>
                <td style="padding: 8px;">${e.propietario || '-'}</td>
                <td style="padding: 8px;">${e.horometro || '-'}</td>
                <td style="padding: 8px;">${e.operativo || '-'}</td>
              </tr>
            `;
        });
        tableHtml += '</tbody></table></div>';
        content.innerHTML = tableHtml;
    }
    
    document.getElementById('kpi-modal-backdrop').style.display = 'block';
    container.style.display = 'block';
}

function closeModal() {
    document.getElementById('kpi-details-container').style.display = 'none';
    document.getElementById('kpi-modal-backdrop').style.display = 'none';
}

function updateDocumentAlerts(equipos) {
    let vencidos_contrato = [];
    let vencidos_sin = [];
    let porVencer_contrato = [];
    let porVencer_sin = [];
    
    let vencidosCount = 0;
    let porVencerCount = 0;
    
    equipos.forEach(e => {
        const id = e.id || e.patente || 'Sin ID';
        const arr = safeLower(e.arrendado);
        const hasContrato = arr === 'contrato';
        
        const docs = [
            { name: 'Permiso Cir.', date: e.venc_permiso },
            { name: 'SOAP', date: e.venc_soap },
            { name: 'Rev. Téc.', date: e.venc_rev },
            { name: 'Gases', date: e.venc_gases }
        ];
        
        docs.forEach(doc => {
            const d = parseDate(doc.date);
            if (!d) return;
            const diffDays = (d - new Date()) / (1000 * 60 * 60 * 24);
            const str = `<li><strong>${id}</strong>: ${doc.name} <span style="color:#666; font-size:12px;">(${doc.date})</span></li>`;
            
            if (diffDays < 0) {
                vencidosCount++;
                if (hasContrato) vencidos_contrato.push(str);
                else vencidos_sin.push(str);
            } else if (diffDays <= 30) {
                porVencerCount++;
                if (hasContrato) porVencer_contrato.push(str);
                else porVencer_sin.push(str);
            }
        });
    });

    document.getElementById('kpi-doc-vencidos').textContent = vencidosCount;
    document.getElementById('kpi-doc-porvencer').textContent = porVencerCount;

    document.getElementById('vencidos-content').innerHTML = `
        <h5 style="margin-top:5px; color:var(--text-main);">Equipos con Contrato</h5>
        <ul style="margin-bottom:15px; padding-left:20px; font-size:13px; color:var(--text-main);">${vencidos_contrato.join('') || '<li style="color:var(--text-muted);">Ninguno</li>'}</ul>
        <h5 style="color:var(--text-main);">Equipos sin Contrato</h5>
        <ul style="padding-left:20px; font-size:13px; margin-bottom:5px; color:var(--text-main);">${vencidos_sin.join('') || '<li style="color:var(--text-muted);">Ninguno</li>'}</ul>
    `;
    
    document.getElementById('porvencer-content').innerHTML = `
        <h5 style="margin-top:5px; color:var(--text-main);">Equipos con Contrato</h5>
        <ul style="margin-bottom:15px; padding-left:20px; font-size:13px; color:var(--text-main);">${porVencer_contrato.join('') || '<li style="color:var(--text-muted);">Ninguno</li>'}</ul>
        <h5 style="color:var(--text-main);">Equipos sin Contrato</h5>
        <ul style="padding-left:20px; font-size:13px; margin-bottom:5px; color:var(--text-main);">${porVencer_sin.join('') || '<li style="color:var(--text-muted);">Ninguno</li>'}</ul>
    `;
}

function calculateFlotaKPIs(equipos) {
    let total_parque = 0;
    let total_arrendados = 0;
    let arrendados_externos = 0;
    let arrendada_propia = 0;
    let sin_arriendo = 0;
    let a_la_venta = 0;
    let uso_interno = 0;
    let operativos = 0;
    let taller = 0;
    let panne = 0;
    
    let arriendo_por_tipo = {};
    let peso_por_cliente = {};

    // Ahora guardamos el objeto completo del equipo
    window.equipos_lists = {
        flota_cyc: [], arrendados_total: [], sin_arriendo: [], arrendados_externos: [],
        venta: [], interno: [], operativos: [], taller: [], panne: []
    };

    equipos.forEach(e => {
        const esCyc = safeLower(e.propietario).includes('cyc');
        const arr = safeLower(e.arrendado);
        const cli = safeLower(e.cliente);
        const op = safeLower(e.operativo);
        const t = e.tipo || 'Otros';

        // Total Parque = todos los equipos
        total_parque++;
        window.equipos_lists.flota_cyc.push(e);

        if (arr === 'contrato') {
            total_arrendados++; window.equipos_lists.arrendados_total.push(e);
            if (!esCyc) { arrendados_externos++; window.equipos_lists.arrendados_externos.push(e); }
            if (esCyc) arrendada_propia++;
            
            arriendo_por_tipo[t] = (arriendo_por_tipo[t] || 0) + 1;
            
            const cName = e.cliente || 'Desconocido';
            if (!peso_por_cliente[cName]) peso_por_cliente[cName] = { count: 0, items: [], tipos: {} };
            peso_por_cliente[cName].count++;
            peso_por_cliente[cName].items.push(e.id || e.patente);
            peso_por_cliente[cName].tipos[t] = (peso_por_cliente[cName].tipos[t] || 0) + 1;
        }

        // Sin Arriendo = todo lo que tenga Arrendado = "Disponible"
        if (arr === 'disponible') {
            sin_arriendo++;
            window.equipos_lists.sin_arriendo.push(e);

            // Estado de Taller = sub-filtro de los Sin Arriendo
            if (op === 'operativo') { operativos++; window.equipos_lists.operativos.push(e); }
            if (op === 'taller') { taller++; window.equipos_lists.taller.push(e); }
            if (op === 'panne') { panne++; window.equipos_lists.panne.push(e); }
        }

        if (cli === 'venta' || arr === 'venta') { a_la_venta++; window.equipos_lists.venta.push(e); }
        if (arr.includes('interno')) { uso_interno++; window.equipos_lists.interno.push(e); }
    });

    document.getElementById('kpi-flota-cyc').textContent = total_parque;
    document.getElementById('kpi-arrendados-total').textContent = total_arrendados;
    document.getElementById('kpi-sin-arriendo').textContent = sin_arriendo;
    document.getElementById('kpi-arrendados-externos').textContent = arrendados_externos;
    document.getElementById('kpi-venta').textContent = a_la_venta;
    document.getElementById('kpi-interno').textContent = uso_interno;
    document.getElementById('kpi-operativos').textContent = operativos;
    document.getElementById('kpi-taller').textContent = taller;
    document.getElementById('kpi-panne').textContent = panne;

    renderAnalisisGraficos(arriendo_por_tipo, peso_por_cliente);
    renderAnalisisMetas(total_parque, arrendada_propia, total_arrendados);
}

function renderAnalisisGraficos(arriendo_por_tipo, peso_por_cliente) {
    if (chartTipo) chartTipo.destroy();
    if (chartCliente) chartCliente.destroy();

    const ctxTipo = document.getElementById('chart-arriendo-tipo').getContext('2d');
    chartTipo = new Chart(ctxTipo, {
        type: 'pie',
        data: {
            labels: Object.keys(arriendo_por_tipo),
            datasets: [{
                data: Object.values(arriendo_por_tipo),
                backgroundColor: [
                    'rgba(59,130,246,0.6)', 'rgba(249,115,22,0.6)', 'rgba(34,197,94,0.6)',
                    'rgba(239,68,68,0.6)', 'rgba(168,85,247,0.6)', 'rgba(234,179,8,0.6)',
                    'rgba(236,72,153,0.6)', 'rgba(6,182,212,0.6)', 'rgba(100,116,139,0.6)'
                ],
                borderColor: [
                    '#3b82f6', '#f97316', '#22c55e', '#ef4444', '#a855f7', '#eab308', '#ec4899', '#06b6d4', '#64748b'
                ],
                borderWidth: 2,
                hoverOffset: 12,
                offset: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'right', labels: { boxWidth: 10, font: {size: 11} } },
                datalabels: {
                    color: '#fff',
                    font: { weight: 'bold', size: 14 },
                    formatter: (value) => value > 0 ? value : ''
                }
            }
        }
    });

    const sortedClientes = Object.entries(peso_por_cliente).sort((a, b) => b[1].count - a[1].count);
    const ctxCliente = document.getElementById('chart-arriendo-cliente').getContext('2d');
    
    const allTipos = Object.keys(arriendo_por_tipo);
    const datasets = [];

    // Línea de Total
    datasets.push({
        type: 'line',
        label: 'Total Equipos',
        data: sortedClientes.map(item => item[1].count),
        borderColor: '#f39c12',
        backgroundColor: '#f39c12',
        borderWidth: 2,
        yAxisID: 'y',
        order: 0,
        datalabels: {
            align: 'top',
            color: '#f39c12',
            font: { weight: 'bold' }
        }
    });

    // Barras apiladas por Tipo
    const chartColors = [
        'rgba(59,130,246,0.55)', 'rgba(249,115,22,0.55)', 'rgba(34,197,94,0.55)',
        'rgba(239,68,68,0.55)', 'rgba(168,85,247,0.55)', 'rgba(234,179,8,0.55)', 'rgba(100,116,139,0.55)'
    ];
    const chartBorders = ['#3b82f6', '#f97316', '#22c55e', '#ef4444', '#a855f7', '#eab308', '#64748b'];
    allTipos.forEach((tipo, idx) => {
        datasets.push({
            type: 'bar',
            label: tipo,
            data: sortedClientes.map(item => item[1].tipos[tipo] || 0),
            backgroundColor: chartColors[idx % chartColors.length],
            borderColor: chartBorders[idx % chartBorders.length],
            borderWidth: 1,
            borderRadius: 6,
            yAxisID: 'y',
            order: 1,
            stacked: true,
            datalabels: { display: false }
        });
    });

    chartCliente = new Chart(ctxCliente, {
        data: {
            labels: sortedClientes.map(item => item[0]),
            datasets: datasets
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12, font: {size: 10} } },
                tooltip: {
                    callbacks: {
                        afterBody: function(context) {
                            if (context[0].dataset.type === 'line') {
                                const clientData = sortedClientes[context[0].dataIndex][1];
                                return '\nEquipos: ' + clientData.items.join(', ');
                            }
                            return '';
                        }
                    }
                }
            },
            scales: {
                x: { stacked: true },
                y: { stacked: true, beginAtZero: true }
            }
        }
    });
}

function renderAnalisisMetas(totalCyc, arrendadaPropia, totalArrendados) {
    const metaFlota = 85;
    const porcentajePropia = totalCyc > 0 ? Math.round((arrendadaPropia / totalCyc) * 100) : 0;
    
    document.getElementById('kpi-meta-flota').textContent = `${porcentajePropia}%`;
    document.getElementById('kpi-meta-flota-text').textContent = `(${arrendadaPropia} de ${totalCyc} equipos)`;
    
    const barFlota = document.getElementById('bar-meta-flota');
    barFlota.style.width = `${Math.min(porcentajePropia, 100)}%`;
    barFlota.style.background = porcentajePropia >= metaFlota ? '#27ae60' : (porcentajePropia >= 60 ? '#f39c12' : '#e74c3c');
    
    const metaFacturacion = 180000000;
    const tarifaEstimada = 6200000;
    const facturacionActual = totalArrendados * tarifaEstimada;
    const porcentajeFact = Math.round((facturacionActual / metaFacturacion) * 100);
    
    document.getElementById('kpi-facturacion-esperada').textContent = formatterM(facturacionActual / 1000000);
    document.getElementById('kpi-facturacion-porcentaje').textContent = `${porcentajeFact}%`;
    
    const barFact = document.getElementById('bar-facturacion');
    barFact.style.width = `${Math.min(porcentajeFact, 100)}%`;
    barFact.style.background = porcentajeFact >= 100 ? '#27ae60' : (porcentajeFact >= 75 ? '#f39c12' : '#e74c3c');
}

function parseDate(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    return new Date(parts[2], parts[1] - 1, parts[0]);
}

function checkDateAlarm(dateStr) {
    const d = parseDate(dateStr);
    if (!d) return '';
    const diffDays = (d - new Date()) / (1000 * 60 * 60 * 24);
    if (diffDays < 0) return 'background-color: rgba(220, 38, 38, 0.1); color: #dc2626; font-weight:bold;'; // Vencido
    if (diffDays <= 30) return 'background-color: rgba(249, 115, 22, 0.1); color: #ea580c; font-weight:bold;'; // Por vencer
    return '';
}

function renderTabla(equipos) {
    const tbody = document.getElementById('table-equipos-body');
    tbody.innerHTML = '';
    
    equipos.forEach(e => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #eee';
        
        const stylePermiso = checkDateAlarm(e.venc_permiso);
        const styleSoap = checkDateAlarm(e.venc_soap);
        const styleRev = checkDateAlarm(e.venc_rev);
        const styleGases = checkDateAlarm(e.venc_gases);

        tr.innerHTML = `
            <td style="padding:10px 8px;"><strong>${e.id || e.patente}</strong></td>
            <td style="padding:10px 8px;">${e.tipo}</td>
            <td style="padding:10px 8px;">${e.ubicacion}</td>
            <td style="padding:10px 8px;">
                <span style="padding:2px 6px; border-radius:4px; font-size:11px; background:${safeLower(e.arrendado)==='contrato'?'rgba(34, 197, 94, 0.2)':'rgba(239, 68, 68, 0.2)'}; color:${safeLower(e.arrendado)==='contrato'?'#86efac':'#fca5a5'}">
                    ${e.arrendado}
                </span>
            </td>
            <td style="padding:10px 8px;">${e.cliente}</td>
            <td style="padding:10px 8px; font-size:11px;">${e.propietario}</td>
            <td style="padding:10px 8px;">${e.horometro} <br><small style="color:#888">${e.fecha_horometro}</small></td>
            <td style="padding:10px 8px; ${stylePermiso}">${e.venc_permiso}</td>
            <td style="padding:10px 8px; ${styleSoap}">${e.venc_soap}</td>
            <td style="padding:10px 8px; ${styleRev}">${e.venc_rev}</td>
            <td style="padding:10px 8px; ${styleGases}">${e.venc_gases}</td>
        `;
        tbody.appendChild(tr);
    });
}

function filterTable() {
    const inputs = document.querySelectorAll('.col-filter');
    const rows = document.querySelectorAll('#table-equipos-body tr');
    
    rows.forEach(row => {
        let show = true;
        inputs.forEach((input, index) => {
            const text = input.value.toLowerCase().trim();
            if (text) {
                const cellText = row.cells[index] ? row.cells[index].textContent.toLowerCase() : '';
                if (!cellText.includes(text)) {
                    show = false;
                }
            }
        });
        row.style.display = show ? '' : 'none';
    });
}

function formatterM(val) {
    return '$' + val.toLocaleString('es-CL') + 'M';
}

function populateFacFilters(facturas) {
    const meses = [...new Set(facturas.map(f => f.mes_txt).filter(m => m))];
    const tipos = [...new Set(facturas.map(f => f.tipo).filter(t => t))].sort();

    const selectMes = document.getElementById('fac-filter-mes');
    meses.forEach(m => {
        const option = document.createElement('option');
        option.value = m;
        option.textContent = m.charAt(0).toUpperCase() + m.slice(1);
        selectMes.appendChild(option);
    });

    const selectTipo = document.getElementById('fac-filter-tipo');
    tipos.forEach(t => {
        const option = document.createElement('option');
        option.value = t;
        option.textContent = t;
        selectTipo.appendChild(option);
    });
}

function applyFacFilters() {
    const mes = document.getElementById('fac-filter-mes').value.toLowerCase();
    const tipo = document.getElementById('fac-filter-tipo').value.toLowerCase();
    const cliente = document.getElementById('fac-filter-cliente').value.toLowerCase();

    let filtered = globalFacturas;
    if (mes) filtered = filtered.filter(f => safeLower(f.mes_txt) === mes);
    if (tipo) filtered = filtered.filter(f => safeLower(f.tipo) === tipo);
    if (cliente) filtered = filtered.filter(f => safeLower(f.cliente).includes(cliente));

    calculateFacKPIs(filtered);
}

function calculateFacKPIs(facturas) {
    let total_2026 = 0, total_2025 = 0, mes_act_2026 = 0, nopag_total = 0;
    let venc_count = 0, pv_count = 0, incobrables_count = 0;
    let mensual_2025 = new Array(12).fill(0);
    let mensual_2026 = new Array(12).fill(0);

    const currentMonth = new Date().getMonth() + 1;
    
    // Arrays para modales
    window.facLists = {
        vencidas: [],
        porvencer: [],
        incobrables: [],
        vencidas_seg: {}
    };

    let deudaPorCliente = {};

    let facturacionPorTipo = {};

    facturas.forEach(f => {
        const netoM = f.neto / 1000000;
        const saldoM = f.saldo / 1000000;

        if (f.anio_emi === 2025) {
            total_2025 += netoM;
            if (f.mes_emi >= 1 && f.mes_emi <= 12) mensual_2025[f.mes_emi - 1] += netoM;
        } else if (f.anio_emi === 2026) {
            total_2026 += netoM;
            if (f.mes_emi >= 1 && f.mes_emi <= 12) mensual_2026[f.mes_emi - 1] += netoM;
            if (f.mes_emi === currentMonth) mes_act_2026 += netoM;
        }

        const tipoStr = f.tipo || 'Otros';
        facturacionPorTipo[tipoStr] = (facturacionPorTipo[tipoStr] || 0) + netoM;

        if (f.estado !== 'pagado') {
            nopag_total += saldoM;
        }
        
        if (f.estado === 'pendiente' && f.saldo > 0) {
            deudaPorCliente[f.cliente] = (deudaPorCliente[f.cliente] || 0) + saldoM;
        }

        const facItem = { f };

        if (f.alerta === 'vencida') {
            venc_count++;
            window.facLists.vencidas.push(facItem);
            
            if (!window.facLists.vencidas_seg[f.tipo]) {
                window.facLists.vencidas_seg[f.tipo] = [];
            }
            window.facLists.vencidas_seg[f.tipo].push(facItem);
        } else if (f.alerta === 'por vencer' || f.alerta === '0-30') {
            pv_count++;
            window.facLists.porvencer.push(facItem);
        }
        
        if (f.dias_vencida > 120 && f.estado === 'pendiente') {
            incobrables_count += saldoM;
            window.facLists.incobrables.push(facItem);
        }
    });

    document.getElementById('fac-total').textContent = formatterM(total_2026);
    document.getElementById('fac-mes').textContent = formatterM(mes_act_2026);
    document.getElementById('fac-porcobrar').textContent = formatterM(nopag_total);
    document.getElementById('fac-vencidas').textContent = venc_count;
    document.getElementById('fac-porvencer').textContent = pv_count;
    document.getElementById('fac-incobrables').textContent = formatterM(incobrables_count);
    
    // Generar string para segmento
    let segHtml = Object.keys(window.facLists.vencidas_seg).map(t => {
        return `<div style="display:flex;justify-content:space-between;margin-bottom:2px;"><span>${t}</span> <strong>${window.facLists.vencidas_seg[t].length}</strong></div>`;
    }).join('');
    if(!segHtml) segHtml = "0";
    document.getElementById('fac-vencidas-seg-list').innerHTML = segHtml;

    if (chartFacturacion) chartFacturacion.destroy();
    const ctxFac = document.getElementById('chart-facturacion').getContext('2d');
    chartFacturacion = new Chart(ctxFac, {
        type: 'bar',
        data: {
            labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
            datasets: [
                { label: '2025', data: mensual_2025.map(n => Math.round(n*10)/10), backgroundColor: 'rgba(189,195,199,0.5)', borderColor: '#95a5a6', borderWidth: 1, borderRadius: 8, borderSkipped: false },
                { label: '2026', data: mensual_2026.map(n => Math.round(n*10)/10), backgroundColor: 'rgba(37,99,168,0.55)', borderColor: '#2563a8', borderWidth: 1, borderRadius: 8, borderSkipped: false }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { position: 'top' },
                datalabels: { display: false } // Ocultar datalabels porque se ven mal en mensual plano
            },
            scales: { y: { beginAtZero: true } }
        }
    });

    if (chartFacTipo) chartFacTipo.destroy();
    const ctxFacTipo = document.getElementById('chart-fac-tipo').getContext('2d');
    let tiposArr = Object.keys(facturacionPorTipo).map(t => ({ tipo: t, monto: facturacionPorTipo[t] })).sort((a,b) => b.monto - a.monto);
    chartFacTipo = new Chart(ctxFacTipo, {
        type: 'doughnut',
        data: {
            labels: tiposArr.map(t => t.tipo),
            datasets: [{
                data: tiposArr.map(t => Math.round(t.monto*10)/10),
                backgroundColor: [
                    'rgba(52,152,219,0.6)', 'rgba(46,204,113,0.6)', 'rgba(231,76,60,0.6)', 
                    'rgba(241,196,15,0.6)', 'rgba(155,89,182,0.6)', 'rgba(149,165,166,0.6)'
                ],
                borderColor: ['#3498db', '#2ecc71', '#e74c3c', '#f1c40f', '#9b59b6', '#95a5a6'],
                borderWidth: 2,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom', labels: { font: { size: 10 } } },
                datalabels: {
                    color: '#fff',
                    font: { weight: 'bold', size: 10 },
                    formatter: (value) => value > 0 ? value : ''
                }
            }
        }
    });

    if (chartFacCliente) chartFacCliente.destroy();
    const ctxFacCli = document.getElementById('chart-fac-cliente').getContext('2d');
    
    let topDeuda = Object.keys(deudaPorCliente)
        .filter(c => c && c.trim() !== '')
        .map(c => ({ cliente: c, monto: deudaPorCliente[c] }))
        .sort((a, b) => b.monto - a.monto)
        .slice(0, 10);
        
    chartFacCliente = new Chart(ctxFacCli, {
        type: 'pie',
        data: {
            labels: topDeuda.map(d => d.cliente), // No recortar el texto
            datasets: [{
                data: topDeuda.map(d => Math.round(d.monto * 10) / 10),
                backgroundColor: [
                    'rgba(231,76,60,0.6)', 'rgba(230,126,34,0.6)', 'rgba(241,196,15,0.6)',
                    'rgba(52,152,219,0.6)', 'rgba(155,89,182,0.6)', 'rgba(46,204,113,0.6)',
                    'rgba(26,188,156,0.6)', 'rgba(52,73,94,0.6)', 'rgba(149,165,166,0.6)', 'rgba(127,140,141,0.6)'
                ],
                borderColor: ['#e74c3c', '#e67e22', '#f1c40f', '#3498db', '#9b59b6', '#2ecc71', '#1abc9c', '#34495e', '#95a5a6', '#7f8c8d'],
                borderWidth: 2,
                hoverOffset: 12,
                offset: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'right', labels: { font: { size: 10 } } },
                datalabels: {
                    color: '#fff',
                    font: { weight: 'bold', size: 10 },
                    formatter: (value) => value > 0 ? value : ''
                }
            }
        }
    });
}

function showFacDetails(tipoLista) {
    const list = window.facLists[tipoLista];
    let items = [];
    let titulo = "Detalle de Facturas";
    
    if (tipoLista === 'vencidas') {
        titulo = "Facturas Vencidas";
        items = list;
    } else if (tipoLista === 'porvencer') {
        titulo = "Facturas por Vencer";
        items = list;
    } else if (tipoLista === 'incobrables') {
        titulo = "Facturas Incobrables (> 120 días)";
        items = list;
    } else if (tipoLista === 'vencidas_seg') {
        titulo = "Facturas Vencidas por Segmento";
        // Convert object values to flat array
        Object.keys(list).forEach(tipo => {
            list[tipo].forEach(item => {
                items.push({
                    f: item.f,
                    tipoOverride: tipo
                });
            });
        });
    }

    if (!items || items.length === 0) return;

    document.getElementById('kpi-details-title').textContent = titulo;
    const content = document.getElementById('kpi-details-content');
    
    let tableHtml = `
      <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; color:var(--text-main);">
        <thead>
          <tr style="border-bottom: 2px solid var(--border); color:var(--text-muted);">
            <th style="padding: 8px;">Factura</th>
            <th style="padding: 8px;">Cliente</th>
            <th style="padding: 8px;">Segmento</th>
            <th style="padding: 8px;">Saldo</th>
            <th style="padding: 8px;">Días V.</th>
          </tr>
        </thead>
        <tbody>
    `;

    items.forEach(item => {
        const seg = item.tipoOverride || item.f.tipo || '-';
        tableHtml += `
          <tr style="border-bottom: 1px solid var(--border);">
            <td style="padding: 8px;">N°${item.f.id}</td>
            <td style="padding: 8px;" title="${item.f.cliente}">${item.f.cliente.substring(0, 20)}${item.f.cliente.length > 20 ? '...' : ''}</td>
            <td style="padding: 8px;">${seg}</td>
            <td style="padding: 8px; font-weight:bold; color:var(--c-primary);">$${formatterM(item.f.saldo / 1000000)}M</td>
            <td style="padding: 8px; color:var(--c-red);">${item.f.dias_vencida}</td>
          </tr>
        `;
    });
    tableHtml += `</tbody></table>`;
    
    content.innerHTML = tableHtml;
    
    document.getElementById('kpi-modal-backdrop').style.display = 'block';
    document.getElementById('kpi-details-container').style.display = 'block';
}

let sortDirections = [];
function sortTable(n) {
    const tableBody = document.getElementById('table-equipos-body');
    const rows = Array.from(tableBody.rows);
    let dir = sortDirections[n] === 'asc' ? 'desc' : 'asc';
    sortDirections[n] = dir;

    rows.sort((a, b) => {
        let valA = a.cells[n].innerText.trim().toLowerCase();
        let valB = b.cells[n].innerText.trim().toLowerCase();

        // Extraer numero para la columna horometro
        if (n === 6) { 
            const numA = parseFloat(valA.replace(/[^0-9.-]+/g,""));
            const numB = parseFloat(valB.replace(/[^0-9.-]+/g,""));
            if (!isNaN(numA) && !isNaN(numB)) {
                return dir === 'asc' ? numA - numB : numB - numA;
            }
        }

        if (valA < valB) return dir === 'asc' ? -1 : 1;
        if (valA > valB) return dir === 'asc' ? 1 : -1;
        return 0;
    });

    tableBody.innerHTML = '';
    rows.forEach(row => tableBody.appendChild(row));
}

// ==========================================
// LOGICA CRM INTEGRADA
// ==========================================
let crmCurrentTab = 'opportunities';
let globalCompanies = [];
let globalContacts = [];
let globalOpportunities = [];
let crmEditingId = null;

const STAGES = ['Prospecto', 'Calificado', 'Cotización Enviada', 'Negociación', 'Ganado', 'Perdido'];

document.addEventListener('DOMContentLoaded', () => {
    fetchCrmData();
    // if form exists in this document, listen
    const formNuevo = document.getElementById('form-nuevo');
    if(formNuevo) formNuevo.addEventListener('submit', handleFormSubmit);
});

async function fetchCrmData() {
    try {
        const [compRes, contRes, oppRes] = await Promise.all([
            fetch('/crm/api/companies'),
            fetch('/crm/api/contacts'),
            fetch('/crm/api/opportunities')
        ]);
        
        globalCompanies = await compRes.json();
        globalContacts = await contRes.json();
        globalOpportunities = await oppRes.json();

        renderCrmViews();
    } catch (err) {
        console.error("Error cargando datos CRM:", err);
    }
}

function renderCrmViews() {
    if(document.getElementById('kanban-board')){
        renderKanban();
        renderContacts();
        renderCompanies();
    }
}

function switchCrmTab(tab) {
    crmCurrentTab = tab;
    
    // UI Tabs
    document.querySelectorAll('.crm-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    
    // UI Views
    document.getElementById('view-opportunities').style.display = 'none';
    document.getElementById('view-contacts').style.display = 'none';
    document.getElementById('view-companies').style.display = 'none';
    
    document.getElementById(`view-${tab}`).style.display = 'block';
}

function renderKanban() {
    const board = document.getElementById('kanban-board');
    if(!board) return;
    board.innerHTML = '';

    STAGES.forEach(stage => {
        const col = document.createElement('div');
        col.className = 'kanban-column';
        
        const h3 = document.createElement('h3');
        h3.textContent = stage;
        col.appendChild(h3);
        
        const cardsContainer = document.createElement('div');
        cardsContainer.className = 'kanban-cards';
        cardsContainer.dataset.stage = stage;
        
        cardsContainer.addEventListener('dragover', e => {
            e.preventDefault();
            cardsContainer.style.background = 'rgba(0,0,0,0.05)';
        });
        cardsContainer.addEventListener('dragleave', e => {
            cardsContainer.style.background = 'transparent';
        });
        cardsContainer.addEventListener('drop', handleDrop);

        const opps = globalOpportunities.filter(o => o.stage === stage);
        opps.forEach(opp => {
            const card = document.createElement('div');
            card.className = 'kanban-card';
            card.draggable = true;
            card.dataset.id = opp.id;
            
            card.addEventListener('dragstart', e => {
                e.dataTransfer.setData('text/plain', opp.id);
            });

            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                    <span style="font-size:10px; background:var(--c-gray); padding:2px 6px; border-radius:4px;">${new Date(opp.createdAt).toLocaleDateString()}</span>
                    <span style="font-size:10px; font-weight:bold; color: ${opp.priority === 'Alta' ? 'var(--c-orange)' : (opp.priority === 'Media' ? 'var(--c-primary)' : 'var(--text-muted)')}">${opp.priority}</span>
                </div>
                <div class="title">${opp.name}</div>
                <div class="company" style="margin-bottom:4px;">🏢 ${opp.company ? opp.company.name : 'Sin empresa'}</div>
                <div class="company">👤 ${opp.contact ? (opp.contact.firstName + ' ' + (opp.contact.lastName || '')) : 'Sin contacto'}</div>
                <div class="amount">$${opp.amount.toLocaleString('es-CL')}</div>
                ${opp.expectedClose ? `<div style="font-size:11px; margin-top:8px; color:var(--text-muted);">Cierre est: ${new Date(opp.expectedClose).toLocaleDateString()}</div>` : ''}
            `;
            cardsContainer.appendChild(card);
        });

        col.appendChild(cardsContainer);
        board.appendChild(col);
    });
}

async function handleDrop(e) {
    e.preventDefault();
    this.style.background = 'transparent';
    const oppId = e.dataTransfer.getData('text/plain');
    const newStage = this.dataset.stage;
    
    const opp = globalOpportunities.find(o => o.id == oppId);
    if(opp && opp.stage !== newStage) {
        opp.stage = newStage;
        renderKanban(); 
        
        try {
            await fetch(`/crm/api/opportunities/${oppId}/stage`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stage: newStage })
            });
        } catch(err) {
            console.error("Error al actualizar etapa", err);
            fetchCrmData(); 
        }
    }
}

function renderContacts() {
    const tbody = document.getElementById('table-contacts');
    if(!tbody) return;
    tbody.innerHTML = '';
    globalContacts.forEach(c => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--border)';
        tr.onclick = () => openCrmModal(c);
        tr.innerHTML = `
            <td style="padding:10px;"><strong>${c.firstName} ${c.lastName || ''}</strong></td>
            <td style="padding:10px;">${c.firstName || '-'}</td>
            <td style="padding:10px;">${c.lastName || '-'}</td>
            <td style="padding:10px;">${c.role || '-'}</td>
            <td style="padding:10px;">${c.phone || '-'}</td>
            <td style="padding:10px;">${c.email || '-'}</td>
            <td style="padding:10px;">${c.company ? c.company.name : '-'}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderCompanies() {
    const tbody = document.getElementById('table-companies');
    if(!tbody) return;
    tbody.innerHTML = '';
    globalCompanies.forEach(c => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--border)';
        tr.onclick = () => openCrmModal(c);
        tr.innerHTML = `
            <td style="padding:10px;"><strong>${c.name}</strong></td>
            <td style="padding:10px;">${c.rut || '-'}</td>
            <td style="padding:10px;">${c.size || '-'}</td>
            <td style="padding:10px;">${c.industry || '-'}</td>
            <td style="padding:10px;">${c.contacts ? c.contacts.length : 0}</td>
        `;
        tbody.appendChild(tr);
    });
}

function openCrmModal(editData = null) {
    crmEditingId = editData ? editData.id : null;
    const title = document.getElementById('crm-modal-title');
    const fields = document.getElementById('crm-modal-fields');
    fields.innerHTML = '';

    if (crmCurrentTab === 'companies') {
        title.textContent = editData ? 'Editar Empresa' : 'Nueva Empresa';
        fields.innerHTML = `
            <div class="form-group"><label>Nombre</label><input type="text" name="name" value="${editData ? (editData.name || '') : ''}" required></div>
            <div class="form-group"><label>RUT</label><input type="text" name="rut" value="${editData ? (editData.rut || '') : ''}"></div>
            <div class="form-group"><label>Tamaño</label><input type="text" name="size" value="${editData ? (editData.size || '') : ''}"></div>
            <div class="form-group"><label>Industria</label><input type="text" name="industry" value="${editData ? (editData.industry || '') : ''}"></div>
            <div class="form-group"><label>Propietario</label><input type="text" name="owner" value="${editData ? (editData.owner || '') : ''}"></div>
        `;
    } else if (crmCurrentTab === 'contacts') {
        title.textContent = editData ? 'Editar Contacto' : 'Nuevo Contacto';
        const compOptions = globalCompanies.map(c => `<option value="${c.id}" ${editData && editData.companyId === c.id ? 'selected' : ''}>${c.name}</option>`).join('');
        fields.innerHTML = `
            <div class="form-group"><label>Nombre</label><input type="text" name="firstName" value="${editData ? (editData.firstName || '') : ''}" required></div>
            <div class="form-group"><label>Apellido</label><input type="text" name="lastName" value="${editData ? (editData.lastName || '') : ''}"></div>
            <div class="form-group"><label>Cargo</label><input type="text" name="role" value="${editData ? (editData.role || '') : ''}"></div>
            <div class="form-group"><label>Teléfono</label><input type="text" name="phone" value="${editData ? (editData.phone || '') : ''}"></div>
            <div class="form-group"><label>Email</label><input type="email" name="email" value="${editData ? (editData.email || '') : ''}"></div>
            <div class="form-group"><label>Empresa</label>
                <select name="companyId"><option value="">Ninguna</option>${compOptions}</select>
            </div>
        `;
    } else if (crmCurrentTab === 'opportunities') {
        title.textContent = 'Nueva Oportunidad';
        const compOptions = globalCompanies.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        const contOptions = globalContacts.map(c => `<option value="${c.id}">${c.firstName} ${c.lastName || ''}</option>`).join('');
        
        fields.innerHTML = `
            <div class="form-group"><label>Nombre del Negocio</label><input type="text" name="name" required></div>
            <div class="form-group"><label>Monto Estimado ($)</label><input type="number" name="amount" required></div>
            
            <div style="display:flex; gap:10px;">
                <div class="form-group" style="flex:1;"><label>Prioridad</label>
                    <select name="priority"><option value="Baja">Baja</option><option value="Media" selected>Media</option><option value="Alta">Alta</option></select>
                </div>
                <div class="form-group" style="flex:1;"><label>Cierre Esperado</label>
                    <input type="date" name="expectedClose">
                </div>
            </div>

            <div class="form-group"><label>Etapa</label>
                <select name="stage">${STAGES.map(s => `<option value="${s}">${s}</option>`).join('')}</select>
            </div>

            <div style="border-top:1px solid var(--border); padding-top:15px; margin-top:15px;">
                <h4 style="font-size:13px; margin-bottom:10px; color:var(--text-main);">Asignar Empresa</h4>
                <div class="form-group">
                    <select name="companyId" id="opp-comp-select" onchange="toggleNewCompany()">
                        <option value="">-- Crear Nueva Empresa --</option>
                        ${compOptions}
                    </select>
                </div>
                <div class="form-group" id="opp-comp-new">
                    <input type="text" name="newCompanyName" placeholder="Nombre de la nueva empresa">
                </div>
            </div>

            <div style="border-top:1px solid var(--border); padding-top:15px; margin-top:15px;">
                <h4 style="font-size:13px; margin-bottom:10px; color:var(--text-main);">Asignar Contacto</h4>
                <div class="form-group">
                    <select name="contactId" id="opp-cont-select" onchange="toggleNewContact()">
                        <option value="">-- Crear Nuevo Contacto --</option>
                        ${contOptions}
                    </select>
                </div>
                <div id="opp-cont-new" style="display:flex; gap:10px;">
                    <input type="text" name="newContactFirstName" placeholder="Nombre" style="flex:1; padding:8px; border:1px solid var(--border); border-radius:4px;">
                    <input type="text" name="newContactLastName" placeholder="Apellido" style="flex:1; padding:8px; border:1px solid var(--border); border-radius:4px;">
                </div>
            </div>
        `;
    }

    document.getElementById('crm-modal-backdrop').style.display = 'block';
    if(crmCurrentTab === 'opportunities') {
        toggleNewCompany();
        toggleNewContact();
    }
}

function toggleNewCompany() {
    const select = document.getElementById('opp-comp-select');
    const newDiv = document.getElementById('opp-comp-new');
    if(select && newDiv) {
        if(select.value === '') {
            newDiv.style.display = 'block';
        } else {
            newDiv.style.display = 'none';
            const i = document.querySelector('input[name="newCompanyName"]');
            if(i) i.value = '';
        }
    }
}

function toggleNewContact() {
    const select = document.getElementById('opp-cont-select');
    const newDiv = document.getElementById('opp-cont-new');
    if(select && newDiv) {
        if(select.value === '') {
            newDiv.style.display = 'flex';
        } else {
            newDiv.style.display = 'none';
            const i1 = document.querySelector('input[name="newContactFirstName"]');
            const i2 = document.querySelector('input[name="newContactLastName"]');
            if(i1) i1.value = '';
            if(i2) i2.value = '';
        }
    }
}

function closeCrmModal() {
    document.getElementById('crm-modal-backdrop').style.display = 'none';
    document.getElementById('form-nuevo').reset();
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    let endpoint = '';
    let method = crmEditingId ? 'PUT' : 'POST';

    if (crmCurrentTab === 'companies') endpoint = '/crm/api/companies' + (crmEditingId ? `/${crmEditingId}` : '');
    else if (crmCurrentTab === 'contacts') endpoint = '/crm/api/contacts' + (crmEditingId ? `/${crmEditingId}` : '');
    else if (crmCurrentTab === 'opportunities') endpoint = '/crm/api/opportunities' + (crmEditingId ? `/${crmEditingId}` : '');

    try {
        await fetch(endpoint, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        closeCrmModal();
        fetchCrmData(); 
    } catch (err) {
        console.error("Error al guardar:", err);
        alert("Ocurrió un error al guardar.");
    }
}

function handleCSVUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        const text = e.target.result;
        // Basic CSV parsing
        const rows = text.split('\n').map(row => row.trim()).filter(row => row);
        if (rows.length < 2) return alert("El archivo está vacío o no tiene datos.");
        
        // Asumiendo delimitador por comas (,) o punto y coma (;)
        const delimiter = rows[0].includes(';') ? ';' : ',';
        const headers = rows[0].split(delimiter).map(h => h.trim());
        const data = rows.slice(1).map(row => {
            // Manejar comillas simples en un parseo rápido
            const values = row.split(delimiter).map(v => v.replace(/^"|"$/g, '').trim());
            let obj = {};
            headers.forEach((h, i) => { obj[h] = values[i]; });
            return obj;
        });

        // Determinar endpoint
        let endpoint = '';
        if (crmCurrentTab === 'companies') endpoint = '/crm/api/companies/bulk';
        else if (crmCurrentTab === 'contacts') endpoint = '/crm/api/contacts/bulk';
        else {
            alert("La carga masiva solo está disponible para Empresas o Contactos.");
            // Reset input
            event.target.value = '';
            return;
        }

        if(!confirm(`¿Estás seguro que deseas cargar ${data.length} registros en ${crmCurrentTab}?`)) {
            event.target.value = '';
            return;
        }

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if(res.ok) {
                alert("Carga masiva completada con éxito");
                fetchCrmData();
            } else {
                alert("Hubo un error del servidor en la carga masiva.");
            }
        } catch(err) {
            console.error(err);
            alert("Error de red en la carga masiva.");
        }
        
        // Reset input
        event.target.value = '';
    };
    reader.readAsText(file);
}
