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
    document.getElementById('kpi-total-flota').textContent = flota.total;
    document.getElementById('kpi-en-contrato').textContent = flota.arrendado['Contrato'];
    document.getElementById('kpi-disponibles').textContent = flota.arrendado['Disponible'];
    
    document.getElementById('kpi-operativos').textContent = flota.operatividad['Operativo'];
    document.getElementById('kpi-taller').textContent = flota.operatividad['Taller'];
    document.getElementById('kpi-panne').textContent = flota.operatividad['Panne'];

    // Charts
    const ctxTipo = document.getElementById('chart-flota-tipo').getContext('2d');
    new Chart(ctxTipo, {
        type: 'doughnut',
        data: {
            labels: Object.keys(flota.por_tipo),
            datasets: [{
                data: Object.values(flota.por_tipo),
                backgroundColor: ['#1a3a5c', '#2563a8', '#3498db', '#1abc9c', '#27ae60', '#f39c12', '#e67e22', '#9b59b6', '#bdc3c7'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: {size: 11} } } },
            cutout: '65%'
        }
    });

    const ctxOp = document.getElementById('chart-flota-op').getContext('2d');
    new Chart(ctxOp, {
        type: 'bar',
        data: {
            labels: Object.keys(flota.operatividad),
            datasets: [{
                label: 'Equipos',
                data: Object.values(flota.operatividad),
                backgroundColor: ['#27ae60', '#f39c12', '#e74c3c'],
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: {display: false} },
            scales: { y: { beginAtZero: true } }
        }
    });
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
