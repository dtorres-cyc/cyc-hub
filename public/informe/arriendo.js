// ═══════════════════════════════════════════════════════════
// MÓDULO: GESTIÓN DE CONTRATOS & EDPs
// ═══════════════════════════════════════════════════════════

const EDP_ETAPAS = [
  { label: '1. Pedir Horómetros', icon: '📏' },
  { label: '2. Enviar EDP',       icon: '📤' },
  { label: '3. Negociación',      icon: '🤝' },
  { label: '4. EDP Facturado',    icon: '✅' }
];

const DANO_ETAPAS = [
  { label: '1. Recepcionar',    icon: '🚛' },
  { label: '2. Levantamiento',  icon: '🔍' },
  { label: '3. Enviar Informe', icon: '📄' },
  { label: '4. Negociación',    icon: '🤝' },
  { label: '5. Facturado',      icon: '🧾' },
  { label: '6. Pagado',         icon: '✅' }
];

let globalContratos = [];
let globalDanos     = [];

// ─── Carga inicial ────────────────────────────────────────────────────────────

async function loadArriendo() {
  try {
    const [contratos, danos] = await Promise.all([
      fetch('/arriendo/contratos').then(r => r.json()),
      fetch('/arriendo/danos').then(r => r.json())
    ]);
    globalContratos = contratos;
    globalDanos     = danos;
    renderContratosKPIs();
    renderContratosList();
    renderGanttChart();
    renderEdpsKanban();
    renderDanosKPIs();
    renderDanosKanban();
  } catch(e) { console.error('Error cargando arriendo:', e); }
}

// ─── KPIs Contratos ───────────────────────────────────────────────────────────

function renderContratosKPIs() {
  const hoy = new Date();
  const en30 = new Date(); en30.setDate(en30.getDate() + 30);
  let activos = 0, proximos = 0, docsInc = 0, edpsPend = 0;
  globalContratos.forEach(c => {
    if (!c.activo) return;
    activos++;
    const termino = new Date(c.fechaTermino);
    if (termino <= en30 && termino >= hoy) proximos++;
    if (!c.docOC || !c.docContrato || !c.docActaEntrega) docsInc++;
    (c.edps || []).forEach(e => { if (e.etapa < 4) edpsPend++; });
  });
  document.getElementById('arr-kpi-activos').textContent         = activos;
  document.getElementById('arr-kpi-proximos').textContent        = proximos;
  document.getElementById('arr-kpi-docs-incompletos').textContent = docsInc;
  document.getElementById('arr-kpi-edps-pendientes').textContent  = edpsPend;
}

// ─── Lista de Contratos ───────────────────────────────────────────────────────

function renderContratosList() {
  const container = document.getElementById('contratos-list');
  if (!globalContratos.length) {
    container.innerHTML = `<div class="empty-state"><span class="empty-icon">📋</span>No hay contratos registrados. Crea el primero.</div>`;
    return;
  }
  container.innerHTML = globalContratos.map(c => renderContratoCard(c)).join('');
}

function switchContratosView(mode) {
  if (mode === 'list') {
    document.getElementById('btn-view-list').classList.add('active');
    document.getElementById('btn-view-list').style.background = 'var(--c-blue)';
    document.getElementById('btn-view-list').style.color = 'white';
    
    document.getElementById('btn-view-gantt').classList.remove('active');
    document.getElementById('btn-view-gantt').style.background = 'transparent';
    document.getElementById('btn-view-gantt').style.color = 'var(--text-muted)';
    
    document.getElementById('view-contratos-list').style.display = 'block';
    document.getElementById('view-contratos-gantt').style.display = 'none';
  } else {
    document.getElementById('btn-view-gantt').classList.add('active');
    document.getElementById('btn-view-gantt').style.background = 'var(--c-blue)';
    document.getElementById('btn-view-gantt').style.color = 'white';
    
    document.getElementById('btn-view-list').classList.remove('active');
    document.getElementById('btn-view-list').style.background = 'transparent';
    document.getElementById('btn-view-list').style.color = 'var(--text-muted)';
    
    document.getElementById('view-contratos-list').style.display = 'none';
    document.getElementById('view-contratos-gantt').style.display = 'block';
    
    renderGanttChart();
  }
}

function renderGanttChart() {
  const container = document.getElementById('gantt-container');
  if (!globalContratos.length) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:12px;text-align:center;">No hay contratos activos para mostrar.</p>';
    return;
  }
  
  const hoy = new Date();
  hoy.setHours(0,0,0,0);
  const msPorDia = 1000 * 60 * 60 * 24;
  const diasGantt = 30;
  
  let headersHtml = '';
  for (let i = 0; i < diasGantt; i++) {
    const d = new Date(hoy.getTime() + i * msPorDia);
    const dayName = d.toLocaleDateString('es-CL', { weekday: 'short' }).charAt(0).toUpperCase();
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    headersHtml += `
      <div style="flex:1; text-align:center; min-width:30px; border-right:1px solid var(--border); background:${isWeekend ? 'var(--bg-body)' : 'transparent'}; padding:4px 0;">
        <div style="font-size:9px; color:var(--text-muted);">${dayName}</div>
        <div style="font-size:11px; font-weight:700; color:var(--text-main);">${d.getDate()}</div>
      </div>
    `;
  }
  
  let rowsHtml = '';
  
  globalContratos.forEach(c => {
    if (!c.contratoEquipos || !c.contratoEquipos.length) return;
    
    c.contratoEquipos.forEach(eq => {
      if (!eq.activo && eq.fechaBaja) {
        const dBaja = new Date(eq.fechaBaja);
        dBaja.setHours(0,0,0,0);
        if (dBaja < hoy) return; // Ya fue dado de baja y su fecha pasó
      }
      
      const fInicio = new Date(eq.fechaEntrega || c.fechaInicio);
      fInicio.setHours(0,0,0,0);
      
      let fTermino = eq.fechaBaja ? new Date(eq.fechaBaja) : new Date(c.fechaTermino);
      fTermino.setHours(0,0,0,0);
      
      let startOffset = Math.round((fInicio - hoy) / msPorDia);
      let endOffset = Math.round((fTermino - hoy) / msPorDia);
      
      if (endOffset < 0) return; 
      if (startOffset >= diasGantt) return; 
      
      const realStart = Math.max(0, startOffset);
      const realEnd = Math.min(diasGantt - 1, endOffset);
      
      let colorClass = 'var(--c-green)';
      const diasRestantes = Math.ceil((fTermino - hoy) / msPorDia);
      if (!eq.activo || diasRestantes < 0) colorClass = 'var(--c-red)';
      else if (diasRestantes <= 15) colorClass = 'var(--c-orange)';
      
      rowsHtml += `
        <div style="display:flex; border-bottom:1px solid var(--border); min-width:1060px;">
          <div style="width:160px; padding:10px; font-size:11px; border-right:1px solid var(--border); background:var(--bg-card); flex-shrink:0;">
            <div style="font-weight:700; color:var(--text-main);">${eq.equipoId}</div>
            <div style="color:var(--text-muted); font-size:10px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">🏢 ${c.cliente}</div>
          </div>
          <div style="flex:1; display:flex; position:relative; background:var(--bg-body);">
            <!-- Background grid -->
            <div style="position:absolute; inset:0; display:flex;">
               ${Array.from({length: diasGantt}).map((_, i) => {
                 const d = new Date(hoy.getTime() + i * msPorDia);
                 const isW = d.getDay() === 0 || d.getDay() === 6;
                 return `<div style="flex:1; border-right:1px dashed var(--border); background:${isW ? 'rgba(0,0,0,0.02)' : 'transparent'};"></div>`;
               }).join('')}
            </div>
            
            <!-- Barra -->
            <div style="position:absolute; top:8px; bottom:8px; left:calc(100% / ${diasGantt} * ${realStart}); width:calc(100% / ${diasGantt} * ${realEnd - realStart + 1}); background:${colorClass}; border-radius:4px; opacity:0.9; display:flex; align-items:center; padding:0 8px; box-shadow:0 2px 4px rgba(0,0,0,0.1); overflow:hidden;" title="${eq.equipoId} - Vence: ${fTermino.toLocaleDateString('es-CL')}">
              <span style="color:white; font-size:10px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${eq.tipoCobro === 'fijo' ? eq.valorFijo + (eq.moneda==='UF'?' UF/m':'/m') : 'x Hora'}</span>
            </div>
          </div>
        </div>
      `;
    });
  });
  
  if (!rowsHtml) rowsHtml = '<p style="padding:20px; text-align:center; color:var(--text-muted); font-size:12px;">No hay equipos en terreno para las fechas seleccionadas.</p>';

  container.innerHTML = `
    <div style="display:flex; border-bottom:2px solid var(--border); background:var(--bg-card); min-width:1060px;">
      <div style="width:160px; padding:10px; font-size:10px; font-weight:800; color:var(--text-muted); border-right:1px solid var(--border); flex-shrink:0; display:flex; align-items:center;">
        EQUIPO / CLIENTE
      </div>
      <div style="flex:1; display:flex;">
        ${headersHtml}
      </div>
    </div>
    <div style="max-height:400px; overflow-y:auto; overflow-x:hidden;">
      ${rowsHtml}
    </div>
  `;
}

function renderContratoCard(c) {
  const hoy = new Date();
  const inicio  = new Date(c.fechaInicio);
  const termino = new Date(c.fechaTermino);
  const diasRestantes = Math.ceil((termino - hoy) / (1000*60*60*24));
  let badgeClass = 'badge-activo', badgeTxt = '● Activo';
  let termClass = '';
  if (!c.activo) { badgeClass = 'badge-terminado'; badgeTxt = '✕ Terminado'; }
  else if (diasRestantes <= 30 && diasRestantes >= 0) { badgeClass = 'badge-proximo'; badgeTxt = `⚠ Vence en ${diasRestantes}d`; termClass = 'vence-pronto'; }
  else if (diasRestantes < 0) { badgeClass = 'badge-terminado'; badgeTxt = 'Vencido'; termClass = 'vencido'; }

  const contratoEquipos = c.contratoEquipos || [];

  // Tabla de equipos con sus detalles
  const equiposHtml = contratoEquipos.length ? `
    <div style="margin-bottom:14px;">
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead>
          <tr style="border-bottom:2px solid var(--border);">
            <th style="text-align:left;padding:4px 8px;color:var(--text-muted);font-size:10px;text-transform:uppercase;letter-spacing:0.4px;">N° Interno</th>
            <th style="text-align:left;padding:4px 8px;color:var(--text-muted);font-size:10px;text-transform:uppercase;letter-spacing:0.4px;">Tipo</th>
            <th style="text-align:left;padding:4px 8px;color:var(--text-muted);font-size:10px;text-transform:uppercase;letter-spacing:0.4px;">F. Entrega</th>
            <th style="text-align:left;padding:4px 8px;color:var(--text-muted);font-size:10px;text-transform:uppercase;letter-spacing:0.4px;">Horóm.</th>
            <th style="text-align:left;padding:4px 8px;color:var(--text-muted);font-size:10px;text-transform:uppercase;letter-spacing:0.4px;">Cobro</th>
            <th style="text-align:left;padding:4px 8px;color:var(--text-muted);font-size:10px;text-transform:uppercase;letter-spacing:0.4px;">Estado</th>
            <th style="padding:4px 8px;"></th>
          </tr>
        </thead>
        <tbody>
          ${contratoEquipos.map(eq => {
            const cobroLabel = eq.tipoCobro === 'hora'
              ? `${eq.moneda} $${(eq.tarifaHora || 0).toLocaleString('es-CL')}/h (mín: ${eq.horasMinimas || '-'}h)`
              : `${eq.moneda} $${(eq.valorFijo || 0).toLocaleString('es-CL')}/mes`;
            const estadoBadge = eq.activo
              ? `<span style="color:var(--c-green);font-weight:700;">● Activo</span>`
              : `<span style="color:var(--c-red);font-weight:700;">✕ Baja</span>`;
            const bajaBtn = eq.activo && c.activo
              ? `<button class="contrato-btn btn-dar-baja" style="padding:3px 8px;font-size:11px;" onclick="darDeBajaEquipo(${eq.id})">🔧 Baja</button>` : '';
            return `
              <tr style="border-bottom:1px solid var(--border);">
                <td style="padding:6px 8px;font-weight:800;color:var(--c-primary);">${eq.equipoId}</td>
                <td style="padding:6px 8px;color:var(--text-muted);">${eq.equipoTipo || '-'}</td>
                <td style="padding:6px 8px;">${eq.fechaEntrega ? new Date(eq.fechaEntrega).toLocaleDateString('es-CL') : '-'}</td>
                <td style="padding:6px 8px;">${eq.horometroEntrega != null ? eq.horometroEntrega.toLocaleString('es-CL') : '-'}</td>
                <td style="padding:6px 8px;">${cobroLabel}</td>
                <td style="padding:6px 8px;">${estadoBadge}</td>
                <td style="padding:6px 8px;">${bajaBtn}</td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>` : `<p style="font-size:12px;color:var(--text-muted);margin-bottom:14px;">Sin equipos configurados.</p>`;

  const docCheck = (ok, label) => `<span class="check-item ${ok ? 'check-ok' : 'check-missing'}">${ok ? '✓' : '✗'} ${label}</span>`;

  const edpsMinis = (c.edps || []).slice(0, 6).map(edp => `
    <div class="edp-mini-card" onclick="openEdpModal(${JSON.stringify(edp).replace(/"/g,'&quot;')})">
      <div class="edp-mini-periodo">${edp.periodo}</div>
      <div class="edp-mini-etapa edp-etapa-${edp.etapa}">${EDP_ETAPAS[edp.etapa-1]?.icon} ${EDP_ETAPAS[edp.etapa-1]?.label}</div>
      ${edp.montoEdp ? `<div style="font-size:11px;color:var(--c-primary);margin-top:3px;">$${edp.montoEdp.toLocaleString('es-CL')}</div>` : ''}
    </div>`).join('');

  const alertaHtml = diasRestantes <= 30 && diasRestantes >= 0
    ? `<span class="alerta-vencimiento">⚠ Vence en ${diasRestantes} días</span>` : '';

  return `
  <div class="contrato-card" style="position:relative;">
    <input type="checkbox" class="contrato-cb" value="${c.id}" onchange="toggleContratoBulkBtn()" style="position:absolute; top:16px; right:16px; width:18px; height:18px; cursor:pointer; z-index:10;" />
    <div class="contrato-card-header" style="padding-right: 40px;">
      <div>
        <div class="contrato-card-title">${c.numeroContrato} ${alertaHtml}</div>
        <div class="contrato-card-cliente">🏢 ${c.cliente}</div>
      </div>
      <span class="contrato-badge ${badgeClass}">${badgeTxt}</span>
    </div>
    <div class="contrato-dates">
      <div class="contrato-date-item">
        <span class="contrato-date-label">Inicio</span>
        <span class="contrato-date-val">${inicio.toLocaleDateString('es-CL')}</span>
      </div>
      <div class="contrato-date-item">
        <span class="contrato-date-label">Término</span>
        <span class="contrato-date-val ${termClass}">${termino.toLocaleDateString('es-CL')}</span>
      </div>
      <div class="contrato-date-item">
        <span class="contrato-date-label">Equipos</span>
        <span class="contrato-date-val">${contratoEquipos.filter(e => e.activo).length} activo${contratoEquipos.filter(e=>e.activo).length !== 1 ? 's' : ''}</span>
      </div>
    </div>
    ${equiposHtml}
    <div class="checklist-row">
      ${docCheck(c.docOC, 'OC')}
      ${docCheck(c.docContrato, 'Contrato')}
      ${docCheck(c.docActaEntrega, 'Actas de Entrega')}
    </div>
    ${edpsMinis ? `<div style="margin-bottom:8px;font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">EDPs</div><div class="contrato-edps-row">${edpsMinis}</div>` : ''}
    <div class="contrato-actions">
      <button class="contrato-btn btn-editar" onclick="editContrato(${c.id})">✏ Editar</button>
      <button class="contrato-btn btn-nuevo-edp" onclick="crearEdpManual(${c.id})">+ Nuevo EDP</button>
    </div>
  </div>`;
}

function toggleContratoBulkBtn() {
  const anyChecked = Array.from(document.querySelectorAll('.contrato-cb')).some(cb => cb.checked);
  const btn = document.getElementById('btn-bulk-delete-contratos');
  if (btn) btn.style.display = anyChecked ? 'inline-block' : 'none';
}

async function bulkDeleteContratos() {
  const selected = Array.from(document.querySelectorAll('.contrato-cb:checked')).map(cb => cb.value);
  if (!selected.length) return;
  if (!confirm(`¿Estás seguro de que deseas borrar ${selected.length} contrato(s)? Esta acción no se puede deshacer y eliminará sus EDPs y Daños asociados.`)) return;

  try {
    for (const id of selected) {
      await fetch(`/arriendo/contratos/${id}`, { method: 'DELETE' });
    }
    await loadArriendo();
    toggleContratoBulkBtn(); // Ocultar botón tras recargar
  } catch(e) {
    console.error('Error en bulk delete:', e);
    alert('Ocurrió un error al borrar los contratos.');
  }
}


// ─── Kanban EDPs Global ───────────────────────────────────────────────────────

function renderEdpsKanban() {
  const board = document.getElementById('edps-kanban');
  const cols = EDP_ETAPAS.map((et, i) => ({ ...et, etapa: i + 1, cards: [] }));
  globalContratos.forEach(c => {
    (c.edps || []).forEach(edp => {
      const col = cols.find(col => col.etapa === edp.etapa);
      if (col) col.cards.push({ ...edp, clienteNombre: c.cliente, contratoNum: c.numeroContrato });
    });
  });
  board.innerHTML = cols.map(col => `
    <div class="edp-kanban-col">
      <div class="edp-kanban-header" style="color:${['#6366f1','#f97316','#ec4899','#16a34a'][col.etapa-1]}">
        ${col.icon} ${col.label} <span style="background:rgba(0,0,0,0.08);padding:2px 8px;border-radius:10px;font-size:10px;margin-left:auto;">${col.cards.length}</span>
      </div>
      ${col.cards.length ? col.cards.map(edp => `
        <div class="edp-kanban-card" onclick="openEdpModal(${JSON.stringify(edp).replace(/"/g,'&quot;')})">
          <div class="edp-kanban-cliente">${edp.clienteNombre} · ${edp.contratoNum}</div>
          <div class="edp-kanban-periodo">${edp.periodo}</div>
          ${edp.montoEdp ? `<div class="edp-kanban-monto">$${edp.montoEdp.toLocaleString('es-CL')}</div>` : ''}
        </div>`).join('') : `<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px;">Sin EDPs</div>`}
    </div>`).join('');
}

// ─── Modal Contrato ───────────────────────────────────────────────────────────

// ─── Selector de Equipos por N° Interno ──────────────────────────────────────

let modalEquiposData = {};

function renderEquiposSelector() {
  const list    = document.getElementById('c-equipos-list');
  const search  = (document.getElementById('c-equipos-search')?.value || '').toLowerCase();
  const equipos = (typeof globalEquipos !== 'undefined' ? globalEquipos : []);

  const filtered = equipos.filter(e => {
    const id   = (e.id || '').toLowerCase();
    const tipo = (e.tipo || '').toLowerCase();
    return !search || id.includes(search) || tipo.includes(search);
  });

  if (!filtered.length) {
    list.innerHTML = `<p style="padding:12px; color:var(--text-muted); font-size:12px; text-align:center;">Sin resultados</p>`;
    updateEquiposCount();
    return;
  }

  list.innerHTML = filtered.map(e => {
    const checked = modalEquiposData[e.id] ? 'checked' : '';
    const arrendadoTag = e.arrendado && e.arrendado.toLowerCase() === 'contrato'
      ? `<span style="font-size:10px;background:rgba(220,38,38,0.1);color:var(--c-red);padding:1px 6px;border-radius:10px;">En contrato</span>` : '';
    return `
      <label style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid var(--border);cursor:pointer;transition:background 0.15s;" onmouseover="this.style.background='var(--c-gray)'" onmouseout="this.style.background=''">
        <input type="checkbox" value="${e.id}" data-tipo="${e.tipo || ''}" ${checked} onchange="onEquipoCheckChange(this)" style="width:15px;height:15px;cursor:pointer;">
        <span style="font-weight:700;font-size:13px;min-width:80px;">${e.id}</span>
        <span style="font-size:12px;color:var(--text-muted);flex:1;">${e.tipo || ''}${e.patente ? ' · ' + e.patente : ''}</span>
        ${arrendadoTag}
      </label>`;
  }).join('');

  updateEquiposCount();
  renderEquiposConfig();
}

function filterEquiposSelector() {
  syncModalEquiposData();
  renderEquiposSelector();
}

function onEquipoCheckChange(cb) {
  syncModalEquiposData();
  if (cb.checked) {
    modalEquiposData[cb.value] = { equipoId: cb.value, equipoTipo: cb.dataset.tipo || '', tipoCobro: 'fijo', moneda: 'CLP' };
  } else {
    delete modalEquiposData[cb.value];
  }
  updateEquiposCount();
  renderEquiposConfig();
}

function updateEquiposCount() {
  const count = Object.keys(modalEquiposData).length;
  const el = document.getElementById('c-equipos-count');
  if (el) el.textContent = count ? `${count} seleccionado${count !== 1 ? 's' : ''}` : '';
}


// ─── Config por equipo ────────────────────────────────────────────────────────

function renderEquiposConfig() {
  const container = document.getElementById('c-equipos-config');
  const list      = document.getElementById('c-equipos-config-list');
  if (!container || !list) return;

  const selected = Object.values(modalEquiposData);
  if (!selected.length) { container.style.display = 'none'; return; }
  container.style.display = 'block';

  list.innerHTML = selected.map(eq => {
    const d = eq;
    const tipoCobro   = d.tipoCobro || 'fijo';
    const moneda      = d.moneda || 'CLP';
    const isHora      = tipoCobro === 'hora';
    return `
    <div style="background:var(--c-gray);border:1px solid var(--border);border-radius:10px;padding:14px 16px;" id="cfg-${eq.equipoId}">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <span style="font-size:14px;font-weight:800;color:var(--c-primary);">${eq.equipoId}</span>
        ${eq.equipoTipo ? `<span style="font-size:11px;color:var(--text-muted);background:var(--bg-card);padding:2px 8px;border-radius:10px;border:1px solid var(--border);">${eq.equipoTipo}</span>` : ''}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
        <div class="form-group" style="margin:0;">
          <label style="font-size:11px;">Fecha Entrega</label>
          <input type="date" id="cfg-fecha-${eq.equipoId}" value="${d.fechaEntrega ? (d.fechaEntrega.includes('T') ? d.fechaEntrega.split('T')[0] : d.fechaEntrega) : ''}" style="width:100%;padding:7px;border:1px solid var(--border);border-radius:6px;font-family:inherit;font-size:12px;">
        </div>
        <div class="form-group" style="margin:0;">
          <label style="font-size:11px;">Horómetro Entrega</label>
          <input type="number" id="cfg-horo-${eq.equipoId}" value="${d.horometroEntrega || ''}" placeholder="ej: 12500" step="0.1" style="width:100%;padding:7px;border:1px solid var(--border);border-radius:6px;font-family:inherit;font-size:12px;">
        </div>
        <div class="form-group" style="margin:0;">
          <label style="font-size:11px;">Moneda</label>
          <select id="cfg-moneda-${eq.equipoId}" style="width:100%;padding:7px;border:1px solid var(--border);border-radius:6px;font-family:inherit;font-size:12px;">
            <option value="CLP" ${moneda === 'CLP' ? 'selected' : ''}>CLP</option>
            <option value="UF"  ${moneda === 'UF'  ? 'selected' : ''}>UF</option>
          </select>
        </div>
      </div>
      <!-- Tipo de cobro -->
      <div style="margin-top:12px;">
        <label style="font-size:11px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:6px;">TIPO DE COBRO</label>
        <div style="display:flex;gap:10px;margin-bottom:10px;">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;">
            <input type="radio" name="cfg-tipo-${eq.equipoId}" value="fijo" ${!isHora ? 'checked' : ''} onchange="onTipoCobroChange('${eq.equipoId}')">
            Valor Fijo
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;">
            <input type="radio" name="cfg-tipo-${eq.equipoId}" value="hora" ${isHora ? 'checked' : ''} onchange="onTipoCobroChange('${eq.equipoId}')">
            Valor × Hora
          </label>
        </div>
        <!-- Campos valor fijo -->
        <div id="cfg-fijo-${eq.equipoId}" style="display:${!isHora ? 'block' : 'none'}">
          <div class="form-group" style="margin:0;">
            <label style="font-size:11px;">Valor Fijo (mensual)</label>
            <input type="number" id="cfg-valorfijo-${eq.equipoId}" value="${d.valorFijo || ''}" placeholder="ej: 6200000" step="any" min="0" style="width:100%;padding:7px;border:1px solid var(--border);border-radius:6px;font-family:inherit;font-size:12px;">
          </div>
        </div>
        <!-- Campos valor por hora -->
        <div id="cfg-hora-${eq.equipoId}" style="display:${isHora ? 'grid' : 'none'};grid-template-columns:1fr 1fr 1fr;gap:10px;">
          <div class="form-group" style="margin:0;">
            <label style="font-size:11px;">Tarifa / Hora</label>
            <input type="number" id="cfg-tarifah-${eq.equipoId}" value="${d.tarifaHora || ''}" placeholder="ej: 45000" step="any" min="0" style="width:100%;padding:7px;border:1px solid var(--border);border-radius:6px;font-family:inherit;font-size:12px;">
          </div>
          <div class="form-group" style="margin:0;">
            <label style="font-size:11px;">Horas Mínimas</label>
            <input type="number" id="cfg-horasmin-${eq.equipoId}" value="${d.horasMinimas || ''}" placeholder="ej: 160" step="any" min="0" style="width:100%;padding:7px;border:1px solid var(--border);border-radius:6px;font-family:inherit;font-size:12px;">
          </div>
          <div class="form-group" style="margin:0;">
            <label style="font-size:11px;">Val. Hora Extra</label>
            <input type="number" id="cfg-horaextra-${eq.equipoId}" value="${d.valorHoraExtra || ''}" placeholder="ej: 55000" step="any" min="0" style="width:100%;padding:7px;border:1px solid var(--border);border-radius:6px;font-family:inherit;font-size:12px;">
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
}

function onTipoCobroChange(equipoId) {
  const radio = document.querySelector(`input[name="cfg-tipo-${equipoId}"]:checked`);
  const isHora = radio?.value === 'hora';
  document.getElementById(`cfg-fijo-${equipoId}`).style.display = isHora ? 'none' : 'block';
  document.getElementById(`cfg-hora-${equipoId}`).style.display = isHora ? 'grid' : 'none';
}

function syncModalEquiposData() {
  Object.keys(modalEquiposData).forEach(id => {
    const container = document.getElementById(`cfg-${id}`);
    if (container) {
      const radio = document.querySelector(`input[name="cfg-tipo-${id}"]:checked`);
      const tipo  = radio?.value || 'fijo';
      modalEquiposData[id] = {
        equipoId:         id,
        equipoTipo:       modalEquiposData[id].equipoTipo,
        fechaEntrega:     document.getElementById(`cfg-fecha-${id}`)?.value || null,
        horometroEntrega: document.getElementById(`cfg-horo-${id}`)?.value || null,
        tipoCobro:        tipo,
        moneda:           document.getElementById(`cfg-moneda-${id}`)?.value || 'CLP',
        valorFijo:        tipo === 'fijo' ? (document.getElementById(`cfg-valorfijo-${id}`)?.value || null) : null,
        tarifaHora:       tipo === 'hora' ? (document.getElementById(`cfg-tarifah-${id}`)?.value || null) : null,
        horasMinimas:     tipo === 'hora' ? (document.getElementById(`cfg-horasmin-${id}`)?.value || null) : null,
        valorHoraExtra:   tipo === 'hora' ? (document.getElementById(`cfg-horaextra-${id}`)?.value || null) : null,
      };
    }
  });
}

function openContratoModal(contrato = null) {
  document.getElementById('c-edit-id').value         = contrato?.id || '';
  document.getElementById('c-numero').value          = contrato?.numeroContrato || '';
  document.getElementById('c-cliente').value         = contrato?.cliente || '';
  document.getElementById('c-notas').value           = contrato?.notas || '';
  document.getElementById('c-doc-oc').checked        = !!contrato?.docOC;
  document.getElementById('c-doc-contrato').checked  = !!contrato?.docContrato;
  document.getElementById('c-doc-acta').checked      = !!contrato?.docActaEntrega;
  document.getElementById('c-equipos-search').value  = '';
  document.getElementById('contrato-modal-title').textContent = contrato ? 'Editar Contrato' : 'Nuevo Contrato';
  if (contrato?.fechaInicio)  document.getElementById('c-fecha-inicio').value  = contrato.fechaInicio.split('T')[0];
  if (contrato?.fechaTermino) document.getElementById('c-fecha-termino').value = contrato.fechaTermino.split('T')[0];

  // Inicializar estado modalEquiposData
  modalEquiposData = {};
  const ceList = contrato?.contratoEquipos || [];
  ceList.forEach(eq => {
    modalEquiposData[eq.equipoId] = {
      ...eq,
      equipoId: eq.equipoId,
      equipoTipo: eq.equipoTipo || ''
    };
  });

  renderEquiposSelector();
  document.getElementById('contrato-modal-backdrop').style.display = 'block';
}

function closeContratoModal() {
  document.getElementById('contrato-modal-backdrop').style.display = 'none';
}

function editContrato(id) {
  const c = globalContratos.find(c => c.id === id);
  if (c) openContratoModal(c);
}

async function submitContratoForm(e) {
  e.preventDefault();
  syncModalEquiposData();
  const id     = document.getElementById('c-edit-id').value;
  const contratoEquipos = Object.values(modalEquiposData);
  const payload = {
    numeroContrato: document.getElementById('c-numero').value.trim(),
    cliente:        document.getElementById('c-cliente').value.trim(),
    fechaInicio:    document.getElementById('c-fecha-inicio').value,
    fechaTermino:   document.getElementById('c-fecha-termino').value,
    docOC:          document.getElementById('c-doc-oc').checked,
    docContrato:    document.getElementById('c-doc-contrato').checked,
    docActaEntrega: document.getElementById('c-doc-acta').checked,
    notas:          document.getElementById('c-notas').value.trim(),
    contratoEquipos
  };
  const url    = id ? `/arriendo/contratos/${id}` : '/arriendo/contratos';
  const method = id ? 'PUT' : 'POST';
  try {
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    closeContratoModal();
    await loadArriendo();
  } catch(err) { console.error(err); alert('Error guardando contrato'); }
}

async function darDeBajaEquipo(contratoEquipoId) {
  const motivo = prompt('Motivo de baja del equipo (opcional):');
  if (motivo === null) return; // canceló
  try {
    await fetch(`/arriendo/contratos/equipos/${contratoEquipoId}/baja`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motivoBaja: motivo || null })
    });
    await loadArriendo();
    // Navegar a tab daños
    const navDanos = document.querySelector('[onclick*="tab-danos"]');
    if (navDanos) switchTab('tab-danos', navDanos);
  } catch(err) { console.error(err); alert('Error dando de baja equipo'); }
}

// ─── Modal EDP ────────────────────────────────────────────────────────────────

let currentEdpAdicionales = [];
let currentContratoEquipos = [];

function openEdpModal(edp) {
  document.getElementById('edp-edit-id').value      = edp.id;
  document.getElementById('edp-contrato-id').value  = edp.contratoId;
  document.getElementById('edp-etapa-actual').value = edp.etapa;
  
  document.getElementById('edp-mes-consumo').value  = edp.mesConsumo || '';
  document.getElementById('edp-uf-cierre').value    = edp.valorUfCierre || '';
  document.getElementById('edp-obs').value          = edp.observaciones || '';
  
  const contrato = globalContratos.find(c => c.id === edp.contratoId);
  document.getElementById('edp-modal-title').textContent = `EDP: ${edp.periodo || edp.mesConsumo}`;
  document.getElementById('edp-modal-sub').textContent   = contrato ? `${contrato.cliente} · ${contrato.numeroContrato}` : '';
  
  // Stepper
  const stepper = document.getElementById('edp-stepper');
  stepper.innerHTML = EDP_ETAPAS.map((et, i) => {
    const n = i + 1;
    let cls = n < edp.etapa ? 'done' : n === edp.etapa ? 'active' : '';
    return `<div class="step-item ${cls}" title="${et.label}">${et.icon}<br><span style="font-size:9px;">${et.label.split('.')[1]?.trim()}</span></div>`;
  }).join('');
  
  // Render Equipos
  currentContratoEquipos = contrato ? contrato.contratoEquipos : [];
  const tbody = document.getElementById('edp-equipos-tbody');
  tbody.innerHTML = '';
  
  currentContratoEquipos.forEach(eq => {
    if (!eq.activo && !edp.detalles?.find(d => d.contratoEquipoId === eq.id)) return;
    
    const det = edp.detalles?.find(d => d.contratoEquipoId === eq.id) || {};
    const dias = det.diasTrabajados !== undefined ? det.diasTrabajados : 30;
    const horometro = det.horometroCierre !== undefined && det.horometroCierre !== null ? det.horometroCierre : '';
    const hExtras = det.horasExtras !== undefined && det.horasExtras !== null ? det.horasExtras : '';
    
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--border)';
    tr.innerHTML = `
      <td style="padding:10px; font-weight:600; color:var(--text-main);">${eq.equipoId} <span style="font-size:10px; font-weight:400; color:var(--text-muted); display:block;">${eq.equipoTipo||''}</span></td>
      <td style="padding:10px; color:var(--text-muted);">
        ${eq.tipoCobro === 'fijo' ? (eq.moneda==='UF' ? `${eq.valorFijo} UF/m` : `$${(eq.valorFijo||0).toLocaleString('es-CL')}/m`) : (eq.moneda==='UF' ? `${eq.tarifaHora} UF/h` : `$${(eq.tarifaHora||0).toLocaleString('es-CL')}/h`)}
      </td>
      <td style="padding:10px;">
        <input type="number" class="edp-input-dias" data-eq="${eq.id}" value="${dias}" min="0" max="31" style="width:60px; padding:6px; border:1px solid var(--border); border-radius:6px;" oninput="calcularMatrizEdp()">
      </td>
      <td style="padding:10px;">
        <input type="number" step="0.1" class="edp-input-horometro" data-eq="${eq.id}" value="${horometro}" style="width:80px; padding:6px; border:1px solid var(--border); border-radius:6px;" oninput="calcularMatrizEdp()">
      </td>
      <td style="padding:10px;">
        <input type="number" step="0.1" class="edp-input-hextras" data-eq="${eq.id}" value="${hExtras}" style="width:60px; padding:6px; border:1px solid var(--border); border-radius:6px;" oninput="calcularMatrizEdp()">
      </td>
      <td style="padding:10px; text-align:right; font-weight:600; color:var(--text-main);" class="edp-row-subtotal" data-eq="${eq.id}">$0</td>
    `;
    tbody.appendChild(tr);
  });
  
  currentEdpAdicionales = edp.adicionales ? [...edp.adicionales] : [];
  renderEdpAdicionales();
  
  const btns = document.getElementById('edp-form-btns');
  btns.innerHTML = `
    ${edp.etapa > 1 ? `<button type="button" class="action-btn" style="background:var(--c-orange);" onclick="retrocederEdp()">← Retroceder</button>` : ''}
    <button type="submit" class="action-btn" style="background:var(--c-blue);">Guardar</button>
    ${edp.etapa < 4 ? `<button type="button" class="action-btn" style="background:var(--c-green);" onclick="avanzarEdp()">Avanzar →</button>` : ''}
  `;
  
  document.getElementById('edp-modal-backdrop').style.display = 'block';
  calcularMatrizEdp();
}

function renderEdpAdicionales() {
  const container = document.getElementById('edp-adicionales-container');
  container.innerHTML = '';
  currentEdpAdicionales.forEach((ad, i) => {
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.gap = '10px';
    div.innerHTML = `
      <select class="edp-ad-tipo" onchange="updateAdicional(${i}, 'tipo', this.value)" style="padding:6px; border:1px solid var(--border); border-radius:6px; font-size:12px;">
        <option value="Cargo" ${ad.tipo === 'Cargo' ? 'selected' : ''}>Cargo (+)</option>
        <option value="Descuento" ${ad.tipo === 'Descuento' ? 'selected' : ''}>Descuento (-)</option>
      </select>
      <input type="text" class="edp-ad-concepto" value="${ad.concepto||''}" placeholder="Descripción" oninput="updateAdicional(${i}, 'concepto', this.value)" style="flex:1; padding:6px; border:1px solid var(--border); border-radius:6px; font-size:12px;">
      <input type="number" class="edp-ad-monto" value="${ad.monto||''}" placeholder="Monto $" oninput="updateAdicional(${i}, 'monto', this.value)" style="width:120px; padding:6px; border:1px solid var(--border); border-radius:6px; font-size:12px;">
      <button type="button" onclick="removeEdpAdicional(${i})" style="background:var(--c-red); color:white; border:none; border-radius:6px; width:30px; cursor:pointer;">X</button>
    `;
    container.appendChild(div);
  });
}

function addEdpAdicionalRow() {
  currentEdpAdicionales.push({ tipo: 'Cargo', concepto: '', monto: 0 });
  renderEdpAdicionales();
  calcularMatrizEdp();
}

function updateAdicional(idx, field, value) {
  if (field === 'monto') currentEdpAdicionales[idx][field] = parseFloat(value) || 0;
  else currentEdpAdicionales[idx][field] = value;
  calcularMatrizEdp();
}

function removeEdpAdicional(idx) {
  currentEdpAdicionales.splice(idx, 1);
  renderEdpAdicionales();
  calcularMatrizEdp();
}

function calcularMatrizEdp() {
  let subtotalNeto = 0;
  const uf = parseFloat(document.getElementById('edp-uf-cierre').value) || 0;
  
  currentContratoEquipos.forEach(eq => {
    const inputDias = document.querySelector(`.edp-input-dias[data-eq="${eq.id}"]`);
    if (!inputDias) return;
    const dias = parseInt(inputDias.value) || 0;
    const hExtras = parseFloat(document.querySelector(`.edp-input-hextras[data-eq="${eq.id}"]`).value) || 0;
    
    let totalEq = 0;
    if (eq.tipoCobro === 'fijo') {
      const tarifaDiaria = eq.moneda === 'UF' ? (eq.valorFijo * uf / 30) : (eq.valorFijo / 30);
      totalEq = tarifaDiaria * dias;
    } else {
      const hm = eq.horasMinimas || 0;
      const tarifaDiaria = eq.moneda === 'UF' ? (hm * eq.tarifaHora * uf / 30) : (hm * eq.tarifaHora / 30);
      const tarifaExtra = eq.moneda === 'UF' ? ((eq.valorHoraExtra || eq.tarifaHora) * uf) : (eq.valorHoraExtra || eq.tarifaHora);
      totalEq = (tarifaDiaria * dias) + (hExtras * tarifaExtra);
    }
    
    document.querySelector(`.edp-row-subtotal[data-eq="${eq.id}"]`).textContent = `$${Math.round(totalEq).toLocaleString('es-CL')}`;
    subtotalNeto += totalEq;
  });
  
  currentEdpAdicionales.forEach(ad => {
    if (ad.tipo === 'Cargo') subtotalNeto += (ad.monto || 0);
    else subtotalNeto -= (ad.monto || 0);
  });
  
  const iva = subtotalNeto * 0.19;
  const total = subtotalNeto + iva;
  
  document.getElementById('edp-resumen-subtotal').textContent = `$${Math.round(subtotalNeto).toLocaleString('es-CL')}`;
  document.getElementById('edp-resumen-iva').textContent = `$${Math.round(iva).toLocaleString('es-CL')}`;
  document.getElementById('edp-resumen-total').textContent = `$${Math.round(total).toLocaleString('es-CL')}`;
  
  return { subtotal: subtotalNeto, iva, total };
}

function closeEdpModal() {
  document.getElementById('edp-modal-backdrop').style.display = 'none';
}

async function submitEdpForm(e) {
  if (e) e.preventDefault();
  await saveEdpData(false);
}

async function avanzarEdp() {
  await saveEdpData(true);
}

async function saveEdpData(avanzar = false) {
  const id     = document.getElementById('edp-edit-id').value;
  const etapa  = parseInt(document.getElementById('edp-etapa-actual').value);
  
  const calculo = calcularMatrizEdp();
  const detalles = [];
  currentContratoEquipos.forEach(eq => {
    const inputDias = document.querySelector(`.edp-input-dias[data-eq="${eq.id}"]`);
    if (!inputDias) return;
    detalles.push({
      contratoEquipoId: eq.id,
      diasTrabajados: parseInt(inputDias.value) || 0,
      horometroCierre: parseFloat(document.querySelector(`.edp-input-horometro[data-eq="${eq.id}"]`).value) || null,
      horasExtras: parseFloat(document.querySelector(`.edp-input-hextras[data-eq="${eq.id}"]`).value) || null
    });
  });

  const payload = {
    mesConsumo: document.getElementById('edp-mes-consumo').value,
    valorUfCierre: parseFloat(document.getElementById('edp-uf-cierre').value) || null,
    observaciones: document.getElementById('edp-obs').value.trim(),
    subtotal: calculo.subtotal,
    iva: calculo.iva,
    total: calculo.total,
    detalles,
    adicionales: currentEdpAdicionales
  };

  if (avanzar) {
    const newEtapa = Math.min(etapa + 1, 4);
    payload.etapa = newEtapa;
    const ahora = new Date().toISOString();
    if (etapa === 1) payload.horometroRecibido = ahora;
    if (etapa === 2) payload.edpEnviado = ahora;
    if (etapa === 3) payload.negociacionInicio = ahora;
    if (etapa === 4) payload.facturado = ahora;
  }

  try {
    await fetch(`/arriendo/edps/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    closeEdpModal();
    await loadArriendo();
  } catch(err) { console.error(err); }
}

async function retrocederEdp() {
  const id    = document.getElementById('edp-edit-id').value;
  const etapa = parseInt(document.getElementById('edp-etapa-actual').value);
  if (etapa <= 1) return;
  await fetch(`/arriendo/edps/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ etapa: etapa - 1 }) });
  closeEdpModal();
  await loadArriendo();
}

async function crearEdpManual(contratoId) {
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const hoy   = new Date();
  const mes   = hoy.getMonth() + 1;
  const anio  = hoy.getFullYear();
  const periodo = `${meses[mes-1]} ${anio}`;
  if (!confirm(`¿Crear EDP para ${periodo}?`)) return;
  try {
    await fetch('/arriendo/edps', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contratoId, mes, anio, periodo }) });
    await loadArriendo();
  } catch(err) { console.error(err); }
}

async function generarEDPsMes() {
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const hoy   = new Date();
  const periodo = `${meses[hoy.getMonth()]} ${hoy.getFullYear()}`;
  if (!confirm(`¿Generar EDPs para todos los contratos activos del período ${periodo}?`)) return;
  try {
    const res = await fetch('/arriendo/edps/generar-mes', { method: 'POST' });
    const data = await res.json();
    alert(`✅ ${data.creados} EDP(s) creados para ${data.periodo}`);
    await loadArriendo();
  } catch(err) { alert('Error generando EDPs'); }
}

// ═══════════════════════════════════════════════════════════
// MÓDULO: DAÑOS & MERMAS
// ═══════════════════════════════════════════════════════════

function renderDanosKPIs() {
  let activos = 0, porFacturar = 0, facturado = 0, pagado = 0;
  globalDanos.forEach(d => {
    activos++;
    if (d.etapa < 5 && d.montoDano) porFacturar += d.montoDano;
    if (d.etapa >= 5 && d.montoFacturado) facturado += d.montoFacturado;
    if (d.etapa === 6 && d.montoFacturado) pagado += d.montoFacturado;
  });
  document.getElementById('dan-kpi-activos').textContent     = activos;
  document.getElementById('dan-kpi-por-facturar').textContent = `$${porFacturar.toLocaleString('es-CL')}`;
  document.getElementById('dan-kpi-facturado').textContent   = `$${facturado.toLocaleString('es-CL')}`;
  document.getElementById('dan-kpi-pagado').textContent      = `$${pagado.toLocaleString('es-CL')}`;
}

function renderDanosKanban() {
  const board = document.getElementById('danos-kanban');
  const cols = DANO_ETAPAS.map((et, i) => ({ ...et, etapa: i + 1, cards: [] }));
  globalDanos.forEach(d => {
    const col = cols.find(c => c.etapa === d.etapa);
    if (col) col.cards.push(d);
  });
  board.innerHTML = cols.map(col => `
    <div class="dano-kanban-col">
      <div class="dano-kanban-header">
        <span>${col.icon} ${col.label}</span>
        <span style="background:rgba(0,0,0,0.08);padding:2px 8px;border-radius:10px;font-size:10px;">${col.cards.length}</span>
      </div>
      <div class="dano-kanban-cards-container" style="flex:1; min-height:100px; display:flex; flex-direction:column; gap:10px;" ondragover="event.preventDefault()" ondrop="dropDano(event, ${col.etapa})">
      ${col.cards.map(d => `
        <div class="dano-kanban-card" draggable="true" ondragstart="dragDano(event, ${d.id})" onclick="openDanoModal(${JSON.stringify(d).replace(/"/g,'&quot;')})">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div class="dano-equipo">${d.equipoId}</div>
            ${d.pdfLink ? `<a href="${d.pdfLink}" target="_blank" onclick="event.stopPropagation()" style="text-decoration:none;font-size:16px;" title="Ver PDF">📄</a>` : ''}
          </div>
          ${d.equipoDesc ? `<div class="dano-cliente">${d.equipoDesc}</div>` : ''}
          ${d.cliente ? `<div class="dano-cliente">🏢 ${d.cliente}</div>` : ''}
          ${d.montoDano ? `<div class="dano-monto" style="font-size:11px;color:var(--text-muted);margin-top:4px;">Inicial: <span style="color:var(--text-main);font-weight:700;">$${d.montoDano.toLocaleString('es-CL')}</span></div>` : ''}
          ${d.montoFacturado ? `<div class="dano-monto" style="font-size:11px;color:var(--c-green);">Facturado: <span style="font-weight:700;">$${d.montoFacturado.toLocaleString('es-CL')}</span></div>` : ''}
          <div class="dano-fecha">${new Date(d.createdAt).toLocaleDateString('es-CL')}</div>
        </div>`).join('') || `<div style="text-align:center;padding:16px;color:var(--text-muted);font-size:12px;pointer-events:none;">Sin casos</div>`}
      </div>
    </div>`).join('');
}

function dragDano(e, id) {
  e.dataTransfer.setData('text/plain', id);
  e.dataTransfer.effectAllowed = 'move';
}

async function dropDano(e, nuevaEtapa) {
  e.preventDefault();
  const id = e.dataTransfer.getData('text/plain');
  if (!id) return;
  const dano = globalDanos.find(d => d.id == id);
  if (!dano || dano.etapa === nuevaEtapa) return;

  try {
    const extra = {};
    const ahora = new Date().toISOString();
    if (nuevaEtapa === 1) extra.recepcionFecha = ahora;
    if (nuevaEtapa === 2) extra.levantamientoFecha = ahora;
    if (nuevaEtapa === 3) extra.informeEnviado = ahora;
    if (nuevaEtapa === 4) extra.negociacionInicio = ahora;
    if (nuevaEtapa === 5) extra.facturadoFecha = ahora;
    if (nuevaEtapa === 6) extra.pagadoFecha = ahora;

    await fetch(`/arriendo/danos/${id}`, { 
      method: 'PUT', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ etapa: nuevaEtapa, ...extra }) 
    });
    await loadArriendo();
  } catch(err) {
    console.error('Error moviendo daño:', err);
  }
}

// ─── Modal Daños ──────────────────────────────────────────────────────────────

function openDanoModal(dano = null) {
  const esEdicion = !!dano?.id;
  document.getElementById('dan-edit-id').value    = dano?.id || '';
  document.getElementById('dan-etapa-actual').value = dano?.etapa || 1;
  document.getElementById('dan-cliente').value    = dano?.cliente || '';
  document.getElementById('dan-monto').value      = dano?.montoDano || '';
  document.getElementById('dan-monto-facturado').value = dano?.montoFacturado || '';
  document.getElementById('dan-obs').value        = dano?.observaciones || '';
  document.getElementById('dan-pdf').value        = dano?.pdfLink || '';
  document.getElementById('dano-modal-title').textContent = esEdicion ? `🔧 ${dano.equipoId}` : '🔧 Registrar Daño / Merma';

  const datalist = document.getElementById('dan-equipo-list');
  const input = document.getElementById('dan-equipo-id');
  const equipos = typeof globalEquipos !== 'undefined' ? globalEquipos : [];
  
  if (esEdicion) {
    input.readOnly = true;
    input.value = dano.equipoId;
  } else {
    input.readOnly = false;
    datalist.innerHTML = equipos.map(e => `<option value="${e.id}">${e.tipo || ''}</option>`).join('');
    input.value = dano?.equipoId || '';
  }
  
  document.getElementById('dan-equipo-desc').value = dano?.equipoDesc || '';

  // Stepper
  const stepper = document.getElementById('dano-stepper');
  if (esEdicion) {
    stepper.style.display = 'flex';
    stepper.style.marginBottom = '20px';
    stepper.style.borderRadius = '8px';
    stepper.style.overflow = 'hidden';
    stepper.style.border = '1px solid var(--border)';
    stepper.innerHTML = DANO_ETAPAS.map((et, i) => {
      const n = i + 1;
      let cls = n < dano.etapa ? 'done' : n === dano.etapa ? 'active' : '';
      return `<div class="step-item ${cls}" style="flex:1;text-align:center;padding:8px 4px;font-size:10px;">${et.icon}<br>${et.label.split('.')[1]?.trim()}</div>`;
    }).join('');
  } else {
    stepper.style.display = 'none';
  }

  // Botones
  const btns = document.getElementById('dano-form-btns');
  btns.innerHTML = `
    <button type="button" class="action-btn" style="background:var(--c-gray);color:var(--text-main);" onclick="closeDanoModal()">Cancelar</button>
    ${esEdicion && dano.etapa > 1 ? `<button type="button" class="action-btn" style="background:var(--c-orange);" onclick="retrocederDano()">← Retroceder</button>` : ''}
    ${esEdicion ? `<button type="submit" class="action-btn" style="background:var(--c-blue);">Guardar</button>` : `<button type="submit" class="action-btn" style="background:var(--c-red);">Crear</button>`}
    ${esEdicion && dano.etapa < 6 ? `<button type="button" class="action-btn" style="background:var(--c-green);" onclick="avanzarDanoModal()">Avanzar →</button>` : ''}
    ${esEdicion ? `<button type="button" class="action-btn" style="background:var(--c-red);" onclick="eliminarDano(${dano.id})">🗑 Eliminar</button>` : ''}`;

  document.getElementById('dano-modal-backdrop').style.display = 'block';
}

function closeDanoModal() {
  document.getElementById('dano-modal-backdrop').style.display = 'none';
}

function onDanoEquipoSelectChange() {
  const input = document.getElementById('dan-equipo-id');
  const eqId = input.value;
  const equipos = typeof globalEquipos !== 'undefined' ? globalEquipos : [];
  const equipo = equipos.find(e => e.id === eqId);
  if (equipo) {
    document.getElementById('dan-equipo-desc').value = equipo.tipo || '';
  } else {
    document.getElementById('dan-equipo-desc').value = '';
  }
}

async function submitDanoForm(e) {
  if (e) e.preventDefault();
  await saveDanoData(false);
}

async function avanzarDanoModal() {
  await saveDanoData(true);
}

async function saveDanoData(avanzar = false) {
  const id    = document.getElementById('dan-edit-id').value;
  const etapa = parseInt(document.getElementById('dan-etapa-actual').value);
  const payload = {
    equipoId:      document.getElementById('dan-equipo-id').value.trim(),
    equipoDesc:    document.getElementById('dan-equipo-desc').value.trim(),
    cliente:       document.getElementById('dan-cliente').value.trim(),
    montoDano:     document.getElementById('dan-monto').value || null,
    montoFacturado:document.getElementById('dan-monto-facturado').value || null,
    observaciones: document.getElementById('dan-obs').value.trim(),
    pdfLink:       document.getElementById('dan-pdf').value.trim() || null
  };
  try {
    if (id) {
      if (avanzar) {
        const newEtapa = Math.min(etapa + 1, 6);
        const ahora    = new Date().toISOString();
        const extra    = {};
        if (etapa === 1) extra.recepcionFecha = ahora;
        if (etapa === 2) extra.levantamientoFecha = ahora;
        if (etapa === 3) extra.informeEnviado = ahora;
        if (etapa === 4) extra.negociacionInicio = ahora;
        if (etapa === 5) extra.facturadoFecha = ahora;
        if (etapa === 6) extra.pagadoFecha = ahora;
        await fetch(`/arriendo/danos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, etapa: newEtapa, ...extra }) });
      } else {
        await fetch(`/arriendo/danos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      }
    } else {
      await fetch('/arriendo/danos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    }
    closeDanoModal();
    await loadArriendo();
  } catch(err) { console.error(err); }
}

async function retrocederDano() {
  const id    = document.getElementById('dan-edit-id').value;
  const etapa = parseInt(document.getElementById('dan-etapa-actual').value);
  if (etapa <= 1) return;
  await fetch(`/arriendo/danos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ etapa: etapa - 1 }) });
  closeDanoModal();
  await loadArriendo();
}

async function eliminarDano(id) {
  if (!confirm('¿Eliminar este caso de daños/mermas?')) return;
  await fetch(`/arriendo/danos/${id}`, { method: 'DELETE' });
  closeDanoModal();
  await loadArriendo();
}
