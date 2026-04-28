document.addEventListener('DOMContentLoaded', async () => {
    // Current Timestamp
    const now = new Date();
    document.getElementById('timestamp').textContent = now.toLocaleString('es-CL');

    try {
        const response = await fetch('/informe/api/data');
        const data = await response.json();
        
        renderFlota(data.flota);
        renderCRM(data.crm);
        renderFacturacion(data.facturacion);
    } catch (e) {
        console.error('Error fetching data', e);
    }
});

function formatterM(val) {
    return '$' + val.toLocaleString('es-CL') + 'M';
}

function renderFlota(flota) {
    const estado = flota.estado_arriendo || {};
    
    document.getElementById('kpi-arrendados-total').textContent = estado.total_arrendados || 0;
    document.getElementById('kpi-sin-arriendo').textContent = estado.sin_arriendo_no_venta || 0;
    document.getElementById('kpi-arrendados-externos').textContent = estado.arrendados_externos || 0;
    document.getElementById('kpi-venta').textContent = estado.a_la_venta || 0;
    document.getElementById('kpi-interno').textContent = estado.uso_interno || 0;
    
    document.getElementById('kpi-operativos').textContent = estado.operativos || 0;
    document.getElementById('kpi-taller').textContent = estado.taller || 0;
    document.getElementById('kpi-panne').textContent = estado.panne || 0;

    renderAnalisisArriendo(flota.analisis || {}, estado.total_arrendados || 0);
}

function renderAnalisisArriendo(analisis, totalArrendados) {
    // Gráfico: Arriendo por Tipo
    const ctxTipo = document.getElementById('chart-arriendo-tipo').getContext('2d');
    new Chart(ctxTipo, {
        type: 'pie',
        data: {
            labels: Object.keys(analisis.arriendo_por_tipo || {}),
            datasets: [{
                data: Object.values(analisis.arriendo_por_tipo || {}),
                backgroundColor: ['#1a3a5c', '#2563a8', '#3498db', '#1abc9c', '#27ae60', '#f39c12', '#e67e22', '#9b59b6', '#bdc3c7'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: {size: 11} } } }
        }
    });

    // Gráfico: Peso por Cliente
    const ctxCliente = document.getElementById('chart-arriendo-cliente').getContext('2d');
    const sortedClientes = Object.entries(analisis.peso_por_cliente || {})
        .sort((a, b) => b[1] - a[1]); // Ordenar mayor a menor
        
    new Chart(ctxCliente, {
        type: 'bar',
        data: {
            labels: sortedClientes.map(item => item[0]),
            datasets: [{
                label: 'Equipos',
                data: sortedClientes.map(item => item[1]),
                backgroundColor: '#2563a8',
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y', // Barras horizontales
            responsive: true,
            plugins: { legend: {display: false} },
            scales: { x: { beginAtZero: true } }
        }
    });

    // Metas y Barras de Progreso
    // 1. % Flota Arrendada Propia
    const metaFlota = 85;
    const propiosTotales = analisis.total_propios || 1; // Evitar division por cero
    const arrendadaPropia = analisis.arrendada_propia || 0;
    const porcentajePropia = Math.round((arrendadaPropia / propiosTotales) * 100);
    
    document.getElementById('kpi-meta-flota').textContent = `${porcentajePropia}%`;
    document.getElementById('kpi-meta-flota-text').textContent = `(${arrendadaPropia} de ${propiosTotales} equipos)`;
    
    const barFlota = document.getElementById('bar-meta-flota');
    barFlota.style.width = `${Math.min(porcentajePropia, 100)}%`;
    if (porcentajePropia >= metaFlota) barFlota.style.background = '#27ae60'; // Verde si cumple
    else if (porcentajePropia >= 60) barFlota.style.background = '#f39c12'; // Naranja
    else barFlota.style.background = '#e74c3c'; // Rojo
    
    // 2. Facturación Esperada
    const metaFacturacion = 180000000;
    const tarifaEstimada = 6200000;
    const facturacionActual = totalArrendados * tarifaEstimada;
    const porcentajeFact = Math.round((facturacionActual / metaFacturacion) * 100);
    
    document.getElementById('kpi-facturacion-esperada').textContent = formatterM(facturacionActual / 1000000); // formatterM usa formato de millones
    document.getElementById('kpi-facturacion-porcentaje').textContent = `${porcentajeFact}%`;
    
    const barFact = document.getElementById('bar-facturacion');
    barFact.style.width = `${Math.min(porcentajeFact, 100)}%`;
    if (porcentajeFact >= 100) barFact.style.background = '#27ae60';
    else if (porcentajeFact >= 75) barFact.style.background = '#f39c12';
}

function renderCRM(crm) {
    let totalPipeline = 0;

    const negContainer = document.getElementById('crm-negociaciones');
    crm.negociacion.forEach(item => {
        totalPipeline += item[2];
        negContainer.innerHTML += `
            <div class="crm-item">
                <div class="crm-item-info">
                    <strong>${item[0]}</strong>
                    <span>${item[1]}</span>
                </div>
                <div class="crm-item-val val-${item[3].toLowerCase()}">$${item[2]}M</div>
            </div>
        `;
    });

    const cotContainer = document.getElementById('crm-cotizar');
    crm.enviar_cot.forEach(item => {
        totalPipeline += item[2];
        cotContainer.innerHTML += `
            <div class="crm-item" style="border-left: 4px solid var(--c-orange)">
                <div class="crm-item-info">
                    <strong>${item[0]}</strong>
                    <span>${item[1]}</span>
                </div>
                <div class="crm-item-val" style="color:var(--c-orange)">$${item[2]}M</div>
            </div>
        `;
    });

    const retContainer = document.getElementById('crm-retomar');
    crm.retomar_top3.forEach(item => {
        totalPipeline += item[2] || 0;
        retContainer.innerHTML += `
            <div class="crm-item" style="border-left: 4px solid var(--c-primary)">
                <div class="crm-item-info">
                    <strong>${item[0]}</strong>
                    <span>${item[1]} - ${item[3]}</span>
                </div>
                <div class="crm-item-val" style="color:var(--c-primary)">$${item[2]}M</div>
            </div>
        `;
    });

    document.getElementById('pipeline-total').textContent = formatterM(totalPipeline);
}

function renderFacturacion(fac) {
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
                {
                    label: '2025',
                    data: fac.mensual_2025,
                    backgroundColor: '#bdc3c7',
                    borderRadius: 4
                },
                {
                    label: '2026',
                    data: fac.mensual_2026,
                    backgroundColor: '#2563a8',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'top' } },
            scales: { y: { beginAtZero: true } }
        }
    });
}
