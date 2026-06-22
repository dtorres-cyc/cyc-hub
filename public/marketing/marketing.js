// public/marketing/marketing.js — Lógica de visualización interactiva del dashboard

// Estado Global
let selectedPeriod = 30; // Días por defecto
let chartTrends = null;
let chartSpendShare = null;
let chartFollowers = null;

// Formateadores
const fmtCLP = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
});

const fmtNum = new Intl.NumberFormat('es-CL');

function formatCurrency(val) {
    return fmtCLP.format(val);
}

function formatNumber(val) {
    return fmtNum.format(val);
}

// Carga Inicial
document.addEventListener('DOMContentLoaded', () => {
    loadAllData();
});

// Cambiar de Período (7D, 30D, 90D)
function changePeriod(days) {
    selectedPeriod = days;
    
    // Actualizar UI activa del botón
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.getAttribute('data-days')) === days) {
            btn.classList.add('active');
        }
    });

    loadOverviewData();
}

// Cargar Todos los Datos
async function loadAllData() {
    showLoading();
    try {
        await Promise.all([
            loadOverviewData(),
            loadCampaignsData(),
            loadSocialData(),
            loadTrendsData()
        ]);
        updateTimestamp();
    } catch (err) {
        console.error('Error al cargar datos del dashboard de marketing:', err);
    }
}

// 1. Cargar Overview KPIs y Canales
async function loadOverviewData() {
    try {
        const response = await fetch(`/marketing/api/overview?days=${selectedPeriod}`);
        const data = await response.json();

        // Actualizar indicador de fuente de datos
        updateDataSourceIndicator(data.dataSource);

        // Actualizar KPIs Globales
        const g = data.global;
        document.getElementById('kpi-spend').innerText = formatCurrency(g.spend);
        document.getElementById('kpi-leads').innerText = formatNumber(g.leads);
        document.getElementById('kpi-cpl').innerText = formatCurrency(g.cpl);
        document.getElementById('kpi-cpc').innerText = formatCurrency(g.cpc);
        document.getElementById('kpi-ctr').innerText = `${g.ctr}%`;
        document.getElementById('kpi-roas').innerText = `${g.roas}x`;

        // Actualizar Tendencias / Comparativas
        updateTrendElement('kpi-spend-trend', g.comparativas.spendChange, '%');
        updateTrendElement('kpi-leads-trend', g.comparativas.leadsChange, '%');
        updateTrendElement('kpi-cpl-trend', g.comparativas.cplChange, '%', true); // invertido: negativo es bueno
        updateTrendElement('kpi-cpc-trend', g.comparativas.cpcChange, '%', true); // invertido
        updateTrendElement('kpi-ctr-trend', g.comparativas.ctrChange, '%');
        updateTrendElement('kpi-roas-trend', g.comparativas.roasChange, 'x');

        // Renderizar/Actualizar Gráfico de Torta de Inversión
        renderSpendShareChart(data.canales);

    } catch (err) {
        console.error('Error al cargar overview de marketing:', err);
    }
}

// 2. Cargar Rendimiento de Campañas
async function loadCampaignsData() {
    try {
        const response = await fetch('/marketing/api/campaigns');
        const data = await response.json();
        const tbody = document.getElementById('campaigns-table-body');
        tbody.innerHTML = '';

        if (!data.campaigns || data.campaigns.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted);">No hay campañas activas</td></tr>`;
            return;
        }

        data.campaigns.forEach(c => {
            const tr = document.createElement('tr');
            
            // Clase e Icono por plataforma
            let platformBadge = '';
            if (c.plataforma === 'meta') {
                platformBadge = `<span class="badge-platform badge-meta">Meta Ads</span>`;
            } else if (c.plataforma === 'google') {
                platformBadge = `<span class="badge-platform badge-google">Google Ads</span>`;
            } else if (c.plataforma === 'linkedin') {
                platformBadge = `<span class="badge-platform badge-linkedin">LinkedIn Ads</span>`;
            }

            // Estado
            const stateClass = c.estado === 'Activa' ? 'status-active' : 'status-paused';
            const stateText = `<span class="status-indicator ${stateClass}"><span class="status-dot"></span>${c.estado}</span>`;

            tr.innerHTML = `
                <td style="font-weight: 600; color: var(--text-main);">${c.nombre}</td>
                <td>${platformBadge}</td>
                <td>${stateText}</td>
                <td style="font-weight: 600;">${formatCurrency(c.gasto)}</td>
                <td style="color: var(--text-sidebar);">${formatNumber(c.impresiones)}</td>
                <td style="color: var(--text-sidebar);">${formatNumber(c.clics)}</td>
                <td style="font-weight: 500;">${c.ctr}%</td>
                <td style="font-weight: 600; color: var(--c-green);">${formatNumber(c.conversions)}</td>
                <td style="font-weight: 600;">${formatCurrency(c.cpa)}</td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error('Error al cargar campañas:', err);
    }
}

// 3. Cargar Redes Sociales Orgánicas
async function loadSocialData() {
    try {
        const response = await fetch('/marketing/api/social');
        const data = await response.json();

        // Facebook
        const fb = data.meta.facebook;
        document.getElementById('fb-followers').innerText = formatNumber(fb.seguidores);
        document.getElementById('fb-growth').innerText = `+${fb.crecimiento}`;
        document.getElementById('fb-engagement').innerText = `${fb.engagementRate}%`;
        document.getElementById('fb-reach').innerText = `${formatNumber(fb.alcanceTotal)} alcance`;

        // Instagram
        const ig = data.meta.instagram;
        document.getElementById('ig-followers').innerText = formatNumber(ig.seguidores);
        document.getElementById('ig-growth').innerText = `+${ig.crecimiento}`;
        document.getElementById('ig-engagement').innerText = `${ig.engagementRate}%`;
        document.getElementById('ig-reach').innerText = `${formatNumber(ig.alcanceTotal)} alcance`;

        // LinkedIn
        const li = data.linkedin;
        document.getElementById('li-followers').innerText = formatNumber(li.seguidores);
        document.getElementById('li-growth').innerText = `+${li.crecimiento}`;
        document.getElementById('li-engagement').innerText = `${li.engagementRate}%`;
        document.getElementById('li-views').innerText = `${formatNumber(li.visualizacionesPagina)} visitas`;

        // Historial de Seguidores Chart
        renderFollowersChart(data.seguidoresHistorial);

        // Renderizar Top Posts Orgánicos
        renderTopPosts(data.topPosts);

    } catch (err) {
        console.error('Error al cargar datos sociales orgánicos:', err);
    }
}

// 4. Cargar Tendencias de Inversión y CPL
async function loadTrendsData() {
    try {
        const response = await fetch('/marketing/api/trends?months=6');
        const data = await response.json();
        renderTrendsChart(data);
    } catch (err) {
        console.error('Error al cargar tendencias de marketing:', err);
    }
}

// --- Renderizadores de Gráficos (Chart.js) ---

// Gráfico de Tendencias: Inversión vs Leads
function renderTrendsChart(data) {
    const ctx = document.getElementById('chart-trends').getContext('2d');
    
    if (chartTrends) {
        chartTrends.destroy();
    }

    chartTrends = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: 'Inversión Publicitaria',
                    data: data.spend,
                    borderColor: '#e8651a',
                    backgroundColor: 'rgba(232, 101, 26, 0.05)',
                    fill: true,
                    tension: 0.3,
                    borderWidth: 3,
                    yAxisID: 'y'
                },
                {
                    label: 'Leads Generados',
                    data: data.leads,
                    borderColor: '#10b981',
                    backgroundColor: 'transparent',
                    tension: 0.3,
                    borderWidth: 3,
                    yAxisID: 'y1',
                    borderDash: [5, 5]
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: { family: 'Inter', size: 12 }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    ticks: {
                        callback: function(value) {
                            return '$' + formatNumber(value / 1000) + 'k';
                        }
                    },
                    grid: {
                        color: 'rgba(0,0,0,0.05)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    ticks: {
                        callback: function(value) {
                            return formatNumber(value) + ' leads';
                        }
                    }
                }
            }
        }
    });
}

// Gráfico de Torta: Distribución de Gasto
function renderSpendShareChart(canales) {
    const ctx = document.getElementById('chart-spend-share').getContext('2d');

    if (chartSpendShare) {
        chartSpendShare.destroy();
    }

    chartSpendShare = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Meta Ads', 'Google Ads', 'LinkedIn Ads'],
            datasets: [{
                data: [canales.meta.spend, canales.google.spend, canales.linkedin.spend],
                backgroundColor: ['#1877F2', '#4285F4', '#0A66C2'],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: { family: 'Inter', size: 12, weight: 'bold' },
                        boxWidth: 15
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const val = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = ((val / total) * 100).toFixed(1);
                            return ` ${context.label}: ${formatCurrency(val)} (${pct}%)`;
                        }
                    }
                }
            },
            cutout: '65%'
        }
    });
}

// Gráfico de Seguidores Históricos
function renderFollowersChart(data) {
    const ctx = document.getElementById('chart-followers').getContext('2d');

    if (chartFollowers) {
        chartFollowers.destroy();
    }

    chartFollowers = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: 'Facebook',
                    data: data.facebook,
                    backgroundColor: '#1877F2',
                    borderRadius: 4
                },
                {
                    label: 'Instagram',
                    data: data.instagram,
                    backgroundColor: '#E1306C',
                    borderRadius: 4
                },
                {
                    label: 'LinkedIn',
                    data: data.linkedin,
                    backgroundColor: '#0A66C2',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' }
            },
            scales: {
                x: { grid: { display: false } },
                y: {
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    ticks: {
                        callback: function(value) {
                            return formatNumber(value);
                        }
                    }
                }
            }
        }
    });
}

// Renderizar las Cards de Publicaciones Destacadas
function renderTopPosts(posts) {
    const grid = document.getElementById('top-posts-grid');
    grid.innerHTML = '';

    posts.forEach(p => {
        const card = document.createElement('div');
        card.className = 'post-card';

        // Emoji por plataforma
        let socialIcon = '📱';
        let platformClass = '';
        if (p.plataforma === 'facebook') { socialIcon = '📘 Facebook'; platformClass = 'facebook-title'; }
        else if (p.plataforma === 'instagram') { socialIcon = '📸 Instagram'; platformClass = 'instagram-title'; }
        else if (p.plataforma === 'linkedin') { socialIcon = '💼 LinkedIn'; platformClass = 'linkedin-title'; }

        // Caption corta
        const caption = p.caption || '(Sin texto)';

        // Maquetación de la tarjeta
        card.innerHTML = `
            <div class="post-media-demo" style="background-color: var(--c-primary); color: white;">
                ${p.plataforma === 'instagram' ? '📸' : p.plataforma === 'linkedin' ? '🤝' : '🚛'}
            </div>
            <div class="post-content">
                <div class="post-header-info">
                    <span class="social-title ${platformClass}" style="font-size: 13px; font-weight: 700;">${socialIcon}</span>
                    <span>${p.fecha || ''}</span>
                </div>
                <p class="post-caption" title="${caption}">${caption}</p>
                <div class="post-footer">
                    <div class="post-stat">
                        <span class="post-stat-label">Engagement</span>
                        <span class="post-stat-val" style="color: var(--c-primary);">${p.engagement || '--'}</span>
                    </div>
                    <div class="post-stat">
                        <span class="post-stat-label">Clicks Enlace</span>
                        <span class="post-stat-val">${p.clicks ? formatNumber(p.clicks) : '--'}</span>
                    </div>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// --- Helpers de UI ---

function showLoading() {
    document.getElementById('sync-timestamp').innerText = 'Actualizando...';
}

function updateTimestamp() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    const timeStr = now.toLocaleTimeString('es-CL', {
        hour: '2-digit',
        minute: '2-digit'
    });
    document.getElementById('sync-timestamp').innerText = `${dateStr} ${timeStr}`;
}

// Actualizar indicador de fuente de datos (Demo / Híbrido / Real)
function updateDataSourceIndicator(source) {
    const indicator = document.getElementById('datasource-indicator');
    const textSpan = document.getElementById('datasource-text');
    
    indicator.className = 'datasource-badge';
    
    if (source === 'demo') {
        indicator.classList.add('datasource-demo');
        textSpan.innerText = 'Datos de Simulación';
    } else if (source === 'hybrid') {
        indicator.classList.add('datasource-hybrid');
        textSpan.innerText = 'Conexión Híbrida (Demo + API)';
    } else {
        indicator.classList.add('datasource-real');
        textSpan.innerText = 'Integración Real (API)';
    }
}

// Actualizar Tendencia de KPI
function updateTrendElement(id, value, unit = '', isInverse = false) {
    const el = document.getElementById(id);
    if (!el) return;

    const sign = value >= 0 ? '+' : '';
    el.innerText = `${sign}${value}${unit}`;

    // Determinar si la tendencia es positiva o negativa según la métrica
    let isPositive = value >= 0;
    if (isInverse) {
        // En métricas como CPL o CPC, un decremento (negativo) es bueno (positivo para el negocio)
        isPositive = value <= 0;
    }

    if (isPositive) {
        el.className = 'kpi-trend positive';
        el.innerHTML = `▲ ${sign}${value}${unit}`;
    } else {
        el.className = 'kpi-trend negative';
        el.innerHTML = `▼ ${sign}${value}${unit}`;
    }
}

// Sincronizar datos (Llamada al Endpoint /marketing/api/sync)
async function syncData() {
    const btn = document.getElementById('sync-btn');
    btn.disabled = true;
    btn.innerHTML = '<span>↻</span> Sincronizando...';

    try {
        const response = await fetch('/marketing/api/sync', { method: 'POST' });
        const data = await response.json();
        
        if (data.success) {
            await loadAllData();
        }
    } catch (err) {
        console.error('Error al sincronizar datos:', err);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>↻</span> Sincronizar';
    }
}
