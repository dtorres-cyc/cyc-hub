let globalEquipos = [];
let chartTipo = null;
let chartCliente = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Activar ChartDataLabels
    if (typeof ChartDataLabels !== 'undefined') {
        Chart.register(ChartDataLabels);
    }

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
        
        renderCRM(data.crm);
        renderFacturacion(data.facturacion);
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
        <h5 style="margin-top:5px; color:#555;">Equipos con Contrato</h5>
        <ul style="margin-bottom:15px; padding-left:20px; font-size:13px;">${vencidos_contrato.join('') || '<li style="color:#aaa;">Ninguno</li>'}</ul>
        <h5 style="color:#555;">Equipos sin Contrato</h5>
        <ul style="padding-left:20px; font-size:13px; margin-bottom:5px;">${vencidos_sin.join('') || '<li style="color:#aaa;">Ninguno</li>'}</ul>
    `;
    
    document.getElementById('porvencer-content').innerHTML = `
        <h5 style="margin-top:5px; color:#555;">Equipos con Contrato</h5>
        <ul style="margin-bottom:15px; padding-left:20px; font-size:13px;">${porVencer_contrato.join('') || '<li style="color:#aaa;">Ninguno</li>'}</ul>
        <h5 style="color:#555;">Equipos sin Contrato</h5>
        <ul style="padding-left:20px; font-size:13px; margin-bottom:5px;">${porVencer_sin.join('') || '<li style="color:#aaa;">Ninguno</li>'}</ul>
    `;
}

function calculateFlotaKPIs(equipos) {
    let total_cyc = 0;
    let total_arrendados = 0;
    let arrendados_externos = 0;
    let arrendada_propia = 0;
    let sin_arriendo_no_venta = 0;
    let a_la_venta = 0;
    let uso_interno = 0;
    let operativos = 0;
    let taller = 0;
    let panne = 0;
    
    let arriendo_por_tipo = {};
    let peso_por_cliente = {};

    equipos.forEach(e => {
        const esCyc = safeLower(e.propietario).includes('cyc');
        const arr = safeLower(e.arrendado);
        const cli = safeLower(e.cliente);
        const op = safeLower(e.operativo);
        const t = e.tipo || 'Otros';

        if (esCyc) total_cyc++;

        if (arr === 'contrato') {
            total_arrendados++;
            if (!esCyc) arrendados_externos++;
            if (esCyc) arrendada_propia++;
            
            arriendo_por_tipo[t] = (arriendo_por_tipo[t] || 0) + 1;
            
            const cName = e.cliente || 'Desconocido';
            if (!peso_por_cliente[cName]) peso_por_cliente[cName] = { count: 0, items: [], tipos: {} };
            peso_por_cliente[cName].count++;
            peso_por_cliente[cName].items.push(e.id || e.patente);
            peso_por_cliente[cName].tipos[t] = (peso_por_cliente[cName].tipos[t] || 0) + 1;
        }

        if (arr === 'disponible' && cli !== 'venta') sin_arriendo_no_venta++;
        if (cli === 'venta' || arr === 'venta') a_la_venta++;
        if (arr.includes('interno')) uso_interno++;

        if (cli === 'sin cliente') {
            if (op === 'operativo') operativos++;
            if (op === 'taller') taller++;
            if (op === 'panne') panne++;
        }
    });

    document.getElementById('kpi-flota-cyc').textContent = total_cyc;
    document.getElementById('kpi-arrendados-total').textContent = total_arrendados;
    document.getElementById('kpi-sin-arriendo').textContent = sin_arriendo_no_venta;
    document.getElementById('kpi-arrendados-externos').textContent = arrendados_externos;
    document.getElementById('kpi-venta').textContent = a_la_venta;
    document.getElementById('kpi-interno').textContent = uso_interno;
    document.getElementById('kpi-operativos').textContent = operativos;
    document.getElementById('kpi-taller').textContent = taller;
    document.getElementById('kpi-panne').textContent = panne;

    renderAnalisisGraficos(arriendo_por_tipo, peso_por_cliente);
    renderAnalisisMetas(total_cyc, arrendada_propia, total_arrendados);
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
                backgroundColor: ['#1a3a5c', '#2563a8', '#3498db', '#1abc9c', '#27ae60', '#f39c12', '#e67e22', '#9b59b6', '#bdc3c7'],
                borderWidth: 0
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
    const chartColors = ['#1a3a5c', '#7f8c8d', '#9ca3af', '#4b5563', '#d1d5db', '#111827', '#374151'];
    allTipos.forEach((tipo, idx) => {
        datasets.push({
            type: 'bar',
            label: tipo,
            data: sortedClientes.map(item => item[1].tipos[tipo] || 0),
            backgroundColor: chartColors[idx % chartColors.length],
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
    if (diffDays < 0) return 'background-color: #f8d7da; color: #721c24; font-weight:bold;'; // Vencido
    if (diffDays <= 30) return 'background-color: #fff3cd; color: #856404; font-weight:bold;'; // Por vencer
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
                <span style="padding:2px 6px; border-radius:4px; font-size:11px; background:${safeLower(e.arrendado)==='contrato'?'#d4edda':'#f8d7da'}">
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

function renderCRM(crm) {
    if(!crm) return;
    let totalPipeline = 0;
    const negContainer = document.getElementById('crm-negociaciones');
    negContainer.innerHTML = '';
    crm.negociacion.forEach(item => {
        totalPipeline += item[2];
        negContainer.innerHTML += `
            <div class="crm-item">
                <div class="crm-item-info"><strong>${item[0]}</strong><span>${item[1]}</span></div>
                <div class="crm-item-val val-${item[3].toLowerCase()}">$${item[2]}M</div>
            </div>`;
    });

    const cotContainer = document.getElementById('crm-cotizar');
    cotContainer.innerHTML = '';
    crm.enviar_cot.forEach(item => {
        totalPipeline += item[2];
        cotContainer.innerHTML += `
            <div class="crm-item" style="border-left: 4px solid var(--c-orange)">
                <div class="crm-item-info"><strong>${item[0]}</strong><span>${item[1]}</span></div>
                <div class="crm-item-val" style="color:var(--c-orange)">$${item[2]}M</div>
            </div>`;
    });

    const retContainer = document.getElementById('crm-retomar');
    retContainer.innerHTML = '';
    crm.retomar_top3.forEach(item => {
        totalPipeline += item[2] || 0;
        retContainer.innerHTML += `
            <div class="crm-item" style="border-left: 4px solid var(--c-primary)">
                <div class="crm-item-info"><strong>${item[0]}</strong><span>${item[1]} - ${item[3]}</span></div>
                <div class="crm-item-val" style="color:var(--c-primary)">$${item[2]}M</div>
            </div>`;
    });
    document.getElementById('pipeline-total').textContent = formatterM(totalPipeline);
}

function renderFacturacion(fac) {
    if(!fac) return;
    document.getElementById('fac-total').textContent = formatterM(fac.total_2026);
    document.getElementById('fac-mes').textContent = formatterM(fac.mes_act_2026);
    document.getElementById('fac-porcobrar').textContent = formatterM(fac.nopag_total);
    document.getElementById('fac-vencidas').textContent = fac.venc_count;

    const ctxFac = document.getElementById('chart-facturacion').getContext('2d');
    new Chart(ctxFac, {
        type: 'bar',
        data: {
            labels: fac.meses_label,
            datasets: [
                { label: '2025', data: fac.mensual_2025, backgroundColor: '#bdc3c7', borderRadius: 4 },
                { label: '2026', data: fac.mensual_2026, backgroundColor: '#2563a8', borderRadius: 4 }
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'top' } },
            scales: { y: { beginAtZero: true } }
        }
    });
}
