// ── Estado Global ─────────────────────────────────────────────────
let allEquipos   = [];
let allContactos = [];
let filteredEquipos = [];
let selectedEquipoIds = new Set();
let selectedContactoIds = new Set();
let equipoTarifas = {}; // { [id]: { horas: string, tarifaUF: string } }
let currentView  = 'grid'; // 'grid' | 'table'
let currentStep  = 1;
let isSending    = false;
let previewDebounce = null;

// ── Init ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    loadEquipos();
    loadHistorial();
});

// ═══════════════════════════════════════════════════════════════════
// STEP 1 — EQUIPO SELECTION
// ═══════════════════════════════════════════════════════════════════

async function loadEquipos() {
    show('loadingState');
    hide('equipmentGrid');
    hide('equipmentTableWrap');

    try {
        // Intentar primero desde BD local
        let res  = await fetch('api/equipos/db');
        let data = await res.json();
        if (!data.ok) throw new Error(data.error);

        allEquipos      = data.equipos;
        filteredEquipos = [...allEquipos];
        buildFilterOptions();
        renderEquipos();
        hide('loadingState');
    } catch (err) {
        hide('loadingState');
        toast(`Error cargando equipos: ${err.message}`, 'error');
    }
}


// ── Filtros ───────────────────────────────────────────────────────
function buildFilterOptions() {
    const tipos   = [...new Set(allEquipos.map(e => e.tipoMaquinaria).filter(Boolean))].sort();
    const marcas  = [...new Set(allEquipos.map(e => e.marca).filter(Boolean))].sort();

    const tipoSel = document.getElementById('filterTipo');
    tipoSel.innerHTML = '<option value="">Todos los Tipos</option>';
    tipos.forEach(t => tipoSel.innerHTML += `<option value="${t}">${t}</option>`);

    const marcaSel = document.getElementById('filterMarca');
    marcaSel.innerHTML = '<option value="">Todas las Marcas</option>';
    marcas.forEach(m => marcaSel.innerHTML += `<option value="${m}">${m}</option>`);
}

function applyFilters() {
    const tipo  = document.getElementById('filterTipo').value;
    const marca = document.getElementById('filterMarca').value;
    const sort  = document.getElementById('sortEquipos').value;

    filteredEquipos = allEquipos.filter(e => {
        if (tipo  && e.tipoMaquinaria !== tipo)  return false;
        if (marca && e.marca           !== marca) return false;
        return true;
    });

    if (sort === 'tipo_az')  filteredEquipos.sort((a,b) => a.tipoMaquinaria.localeCompare(b.tipoMaquinaria, 'es'));
    if (sort === 'tipo_za')  filteredEquipos.sort((a,b) => b.tipoMaquinaria.localeCompare(a.tipoMaquinaria, 'es'));
    if (sort === 'marca_az') filteredEquipos.sort((a,b) => a.marca.localeCompare(b.marca, 'es'));

    renderEquipos();
}

// ── Vista ─────────────────────────────────────────────────────────
function setViewMode(mode) {
    currentView = mode;
    document.getElementById('btnViewGrid').classList.toggle('active', mode === 'grid');
    document.getElementById('btnViewTable').classList.toggle('active', mode === 'table');
    renderEquipos();
}

function renderEquipos() {
    if (currentView === 'grid') {
        show('equipmentGrid');
        hide('equipmentTableWrap');
        renderGrid();
    } else {
        hide('equipmentGrid');
        show('equipmentTableWrap');
        renderTable();
    }
    updateStep1UI();
}

// ── Grid ──────────────────────────────────────────────────────────
function renderGrid() {
    const grid    = document.getElementById('equipmentGrid');
    const tarifaOn = document.getElementById('confShowTarifa')?.checked;
    grid.innerHTML = '';

    if (!filteredEquipos.length) {
        grid.innerHTML = '<p style="color:var(--text-muted);grid-column:1/-1;text-align:center;padding:40px 0;">Sin resultados con los filtros aplicados.</p>';
        return;
    }

    filteredEquipos.forEach(eq => {
        const sel  = selectedEquipoIds.has(eq.id);
        const card = document.createElement('div');
        card.className = `eq-card ${sel ? 'selected' : ''}`;
        card.dataset.id = eq.id;
        card.onclick = () => toggleEquipo(eq.id);

        const imgHtml = eq.imagenUrl
            ? `<img src="${eq.imagenUrl}" alt="foto" loading="lazy">`
            : getEquipmentIcon(eq.tipoMaquinaria);

        const numInternoHtml = eq.numeroInterno
            ? `<div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">N° ${eq.numeroInterno}</div>` : '';

        // Tarifa box: solo cuando (está seleccionado) Y (toggle activo)
        const tarifaHtml = (sel && tarifaOn)
            ? buildTarifaBoxHtml(eq.id, equipoTarifas[eq.id] || {})
            : '';

        card.innerHTML = `
            <div class="eq-checkbox">${sel ? '✓' : ''}</div>
            <div class="eq-img-box">${imgHtml}</div>
            <div class="eq-type">${eq.tipoMaquinaria || '—'}</div>
            ${numInternoHtml}
            <div class="eq-subtitle">${[eq.marca, eq.modelo].filter(Boolean).join(' · ') || '—'}</div>
            ${eq.tarifa ? `<div class="eq-price">💰 ${eq.tarifa}</div>` : ''}
            ${eq.horometro ? `<div style="font-size:12px;color:var(--text-muted);">⏱ ${eq.horometro} hrs · ${eq.año||'—'}</div>` : ''}
            ${tarifaHtml}
        `;
        grid.appendChild(card);
    });
}

// ── Table ─────────────────────────────────────────────────────────
function renderTable() {
    const tbody = document.getElementById('equipmentTableBody');
    tbody.innerHTML = '';

    if (!filteredEquipos.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:30px;">Sin resultados.</td></tr>';
        return;
    }

    filteredEquipos.forEach(eq => {
        const sel = selectedEquipoIds.has(eq.id);
        const tr  = document.createElement('tr');
        tr.className = sel ? 'selected' : '';
        tr.dataset.id = eq.id;
        tr.onclick = () => toggleEquipo(eq.id);

        const imgCell = eq.imagenUrl
            ? `<img src="${eq.imagenUrl}" class="table-img" loading="lazy">`
            : `<span style="font-size:24px;">${getEquipmentIcon(eq.tipoMaquinaria)}</span>`;

        tr.innerHTML = `
            <td><input type="checkbox" class="td-checkbox" ${sel ? 'checked' : ''} onclick="event.stopPropagation(); toggleEquipo('${eq.id}')"></td>
            <td>${imgCell}</td>
            <td>
                <div style="font-weight:600;color:var(--text);margin-bottom:3px;">${eq.tipoMaquinaria||'—'}</div>
                <div style="font-size:11px;color:var(--text-muted);">${eq.detalle||''}</div>
            </td>
            <td style="color:var(--text-secondary);">${eq.numeroInterno || '—'}</td>
            <td style="color:var(--text-secondary);">${[eq.marca, eq.modelo].filter(Boolean).join(' ')}</td>
            <td style="color:var(--text-secondary);">${eq.año||'—'} / ${eq.horometro ? eq.horometro+' hrs' : '—'}</td>
            <td style="color:#10b981;font-weight:600;">${eq.tarifa||'—'}</td>
        `;
        tbody.appendChild(tr);
    });
}

// ── Toggle selección ──────────────────────────────────────────────
function toggleEquipo(id) {
    if (selectedEquipoIds.has(id)) {
        selectedEquipoIds.delete(id);
        delete equipoTarifas[id];
    } else {
        selectedEquipoIds.add(id);
        if (!equipoTarifas[id]) equipoTarifas[id] = { horas: '180', tarifaUF: '' };
    }
    // Re-render completo: más simple y 100% confiable
    renderEquipos();
    updateStep1UI();
}

// Activa/Desactiva el toggle de tarifa → re-renderiza
function onTarifaToggle() {
    renderEquipos();
}


// Genera el HTML de los inputs de tarifa para una card
function buildTarifaBoxHtml(id, datos = {}) {
    const horas     = datos.horas     || '180';
    const tarifaUF  = datos.tarifaUF  || '';
    const total     = horas && tarifaUF ? (parseFloat(horas) * parseFloat(tarifaUF)).toFixed(1) + ' UF' : '—';
    return `
    <div class="eq-tarifa-box" id="tarifabox-${id}" onclick="event.stopPropagation()">
        <div class="tarifa-row">
            <div class="tarifa-field">
                <label>Horas mín.</label>
                <input class="tarifa-input" type="number" id="horas-${id}" value="${horas}"
                       oninput="updateTarifa('${id}')" placeholder="180">
            </div>
            <div class="tarifa-field">
                <label>UF / hora</label>
                <input class="tarifa-input" type="number" id="uf-${id}" value="${tarifaUF}"
                       oninput="updateTarifa('${id}')" placeholder="3.5" step="0.1">
            </div>
        </div>
        <div class="tarifa-total" id="total-${id}">Total: ${total}</div>
    </div>`;
}

// Actualiza el total calculado y guarda en el mapa
function updateTarifa(id) {
    const horas    = document.getElementById(`horas-${id}`)?.value || '';
    const tarifaUF = document.getElementById(`uf-${id}`)?.value    || '';
    equipoTarifas[id] = { horas, tarifaUF };
    const total = horas && tarifaUF
        ? (parseFloat(horas) * parseFloat(tarifaUF)).toFixed(1) + ' UF'
        : '—';
    const totalEl = document.getElementById(`total-${id}`);
    if (totalEl) totalEl.textContent = `Total: ${total}`;
}

function selectAll() {
    filteredEquipos.forEach(e => selectedEquipoIds.add(e.id));
    renderEquipos();
}

function deselectAll() {
    selectedEquipoIds.clear();
    renderEquipos();
}

function updateStep1UI() {
    const count = selectedEquipoIds.size;
    document.getElementById('selectedCount').textContent = count;
    document.getElementById('btnNext').disabled = count === 0;
}

// ═══════════════════════════════════════════════════════════════════
// STEP 2 — AUDIENCE & CONFIG
// ═══════════════════════════════════════════════════════════════════

async function goToStep2() {
    show('step2-container');
    hide('step1-container');
    show('actionBarStep2');
    hide('actionBarStep1');
    document.getElementById('step-nav-1').classList.remove('active');
    document.getElementById('step-nav-2').classList.add('active');
    currentStep = 2;
    
    // Cargar contactos si aún no están
    if (allContactos.length === 0) await loadContactos();
    
    // Disparar vista previa automática
    schedulePreview();
}

function goToStep1() {
    hide('step2-container');
    show('step1-container');
    hide('actionBarStep2');
    show('actionBarStep1');
    document.getElementById('step-nav-1').classList.add('active');
    document.getElementById('step-nav-2').classList.remove('active');
    currentStep = 1;
}

// ── Contactos ─────────────────────────────────────────────────────
async function refreshContactos() {
    // Reset estado y UI antes de recargar
    allContactos = [];
    selectedContactoIds.clear();
    const searchEl = document.getElementById('contactSearch');
    if (searchEl) searchEl.value = '';

    const btn = document.getElementById('btnRefreshContactos');
    if (btn) { btn.textContent = '⏳'; btn.disabled = true; }

    await loadContactos();

    if (btn) { btn.textContent = '↻'; btn.disabled = false; }
    toast('Lista de contactos actualizada desde Notion', 'success');
}

async function loadContactos() {
    document.getElementById('contactsList').innerHTML = '<p style="padding:16px;color:var(--text-muted);font-size:12px;">Cargando...</p>';
    try {
        const res  = await fetch('api/contactos');
        const data = await res.json();
        if (!data.ok) throw new Error(data.error);
        
        allContactos = data.contactos;
        // Todos seleccionados por defecto
        allContactos.forEach(c => selectedContactoIds.add(c.id));
        renderContactosList();
        updateContactCount();
    } catch (err) {
        document.getElementById('contactsList').innerHTML = `<p style="padding:16px;color:var(--red);font-size:12px;">Error: ${err.message}</p>`;
    }
}

function renderContactosList(filter = '') {
    const list = document.getElementById('contactsList');
    if (!allContactos.length) {
        list.innerHTML = '<p style="padding:16px;color:var(--text-muted);font-size:12px;">No se encontraron contactos con correo.</p>';
        return;
    }

    const q = filter.toLowerCase().trim();
    const visible = q
        ? allContactos.filter(c =>
            (c.nombre  || '').toLowerCase().includes(q) ||
            (c.empresa || '').toLowerCase().includes(q)
          )
        : allContactos;

    if (!visible.length) {
        list.innerHTML = `<p class="contacts-no-results">Sin resultados para "${filter}"</p>`;
        updateContactCount();
        return;
    }

    list.innerHTML = visible.map(c => {
        const sel      = selectedContactoIds.has(c.id);
        const nombre   = c.nombre || '';
        const empresa  = c.empresa || '';
        const initials = (nombre[0] || empresa[0] || '?').toUpperCase() +
                         (nombre.split(' ')[1]?.[0] || '').toUpperCase();
        return `
        <div class="contact-item ${sel ? '' : 'deselected'}" id="contact-${c.id}" onclick="toggleContacto('${c.id}')">
            <div class="contact-avatar">${initials}</div>
            <div class="contact-info">
                <div class="c-name">${nombre || '(Sin nombre)'}</div>
                <div class="c-empresa">${empresa}</div>
                <div class="c-email">${c.correo}</div>
            </div>
            <input type="checkbox" ${sel ? 'checked' : ''}
                   onclick="event.stopPropagation(); toggleContacto('${c.id}')"
                   style="flex-shrink:0;accent-color:var(--blue);width:15px;height:15px;">
        </div>`;
    }).join('');
    updateContactCount();
}

function filterContacts() {
    const q = document.getElementById('contactSearch')?.value || '';
    renderContactosList(q);
}

function toggleContacto(id) {
    if (selectedContactoIds.has(id)) selectedContactoIds.delete(id);
    else selectedContactoIds.add(id);

    const item = document.getElementById(`contact-${id}`);
    if (item) {
        const sel = selectedContactoIds.has(id);
        item.classList.toggle('deselected', !sel);
        const cb = item.querySelector('input[type=checkbox]');
        if (cb) cb.checked = sel;
    }
    updateContactCount();
}

function toggleAllContacts(value) {
    allContactos.forEach(c => {
        if (value) selectedContactoIds.add(c.id);
        else selectedContactoIds.delete(c.id);
    });
    const q = document.getElementById('contactSearch')?.value || '';
    renderContactosList(q);
    return false;
}

function updateContactCount() {
    document.getElementById('contactCount').textContent =
        `${selectedContactoIds.size} / ${allContactos.length}`;
}

// ── Vista Previa en Vivo ──────────────────────────────────────────
function schedulePreview() {
    clearTimeout(previewDebounce);
    previewDebounce = setTimeout(refreshPreview, 600);
}

async function refreshPreview() {
    const iframe = document.getElementById('livePreviewFrame');
    show('previewLoading');

    try {
        const res = await fetch('api/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                equipoIds:    [...selectedEquipoIds],
                includePhotos: document.getElementById('confPhotos').checked,
                messageText:  document.getElementById('confMessage').value,
                showTarifa:   document.getElementById('confShowTarifa')?.checked || false,
                customTarifas: equipoTarifas,
            })
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error);
        iframe.srcdoc = data.html;
    } catch (err) {
        toast(`Error en vista previa: ${err.message}`, 'error');
    } finally {
        hide('previewLoading');
    }
}

// Escuchar cambios en el paso 2 para actualizar preview
document.addEventListener('change', (e) => {
    if (currentStep === 2 && (e.target.id === 'confPhotos')) {
        schedulePreview();
    }
});
document.addEventListener('input', (e) => {
    if (currentStep === 2 && (e.target.id === 'confMessage' || e.target.id === 'confSubject')) {
        schedulePreview();
    }
});


// ═══════════════════════════════════════════════════════════════════
// ENVÍO DE CAMPAÑA
// ═══════════════════════════════════════════════════════════════════

function openConfirm() {
    const eqs  = selectedEquipoIds.size;
    const cons = selectedContactoIds.size;
    document.getElementById('confirmText').innerHTML =
        `Estás a punto de enviar un correo con <strong>${eqs} equipo${eqs!==1?'s':''}</strong> a <strong>${cons} contacto${cons!==1?'s':''}</strong>.<br><br>Esta acción no se puede deshacer.`;
    show('confirmOverlay');
}
function closeConfirm() { hide('confirmOverlay'); }

async function sendCampaign(mode) {
    if (isSending) return;
    closeConfirm();
    isSending = true;

    document.getElementById('progressTitle').textContent = mode === 'TEST' ? '🧪 Enviando Prueba...' : '🚀 Enviando Campaña...';
    document.getElementById('progressLabel').textContent  = 'Iniciando...';
    document.getElementById('progressFill').style.width   = '0%';
    document.getElementById('progressLog').innerHTML       = '';
    document.getElementById('progressFooter').style.display = 'none';
    show('progressOverlay');

    const log = (msg, type = '') => {
        const d  = document.createElement('div');
        d.className = type ? `log-${type}` : '';
        d.textContent = msg;
        const el = document.getElementById('progressLog');
        el.appendChild(d);
        el.scrollTop = el.scrollHeight;
    };

    try {
        const body = {
            mode,
            equipoIds:    [...selectedEquipoIds],
            contactoIds:  [...selectedContactoIds],
            includePhotos: document.getElementById('confPhotos').checked,
            showTarifa:   document.getElementById('confShowTarifa').checked,
            subjectText:  document.getElementById('confSubject').value,
            messageText:  document.getElementById('confMessage').value,
            senderEmail:  document.querySelector('input[name=senderEmail]:checked')?.value || '',
            customTarifas: equipoTarifas,
        };

        const res    = await fetch('api/send-campaign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const reader  = res.body.getReader();
        const decoder = new TextDecoder();
        let   buffer  = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            buffer.split('\n').forEach(line => {
                if (!line.startsWith('data: ')) return;
                try {
                    const evt = JSON.parse(line.slice(6));
                    if (evt.type === 'status')  { document.getElementById('progressLabel').textContent = evt.msg; log(evt.msg); }
                    if (evt.type === 'total')   { document.getElementById('progressLabel').textContent = `0 / ${evt.total} enviados`; }
                    if (evt.type === 'sending') {
                        const pct = evt.total ? Math.round((evt.enviados / evt.total) * 100) : 0;
                        document.getElementById('progressFill').style.width = `${pct}%`;
                        document.getElementById('progressLabel').textContent = `${evt.enviados} / ${evt.total} — ${evt.current}`;
                        log(`✉ ${evt.current}`);
                    }
                    if (evt.type === 'error') log(`✗ ${evt.msg}`, 'err');
                    if (evt.type === 'done') {
                        document.getElementById('progressFill').style.width = '100%';
                        document.getElementById('progressTitle').textContent  = '✅ Completado';
                        document.getElementById('progressLabel').textContent  = evt.msg;
                        log(evt.msg, 'ok');
                        toast(evt.msg, 'success');
                        loadHistorial();
                    }
                    if (evt.type === 'fatal') {
                        document.getElementById('progressTitle').textContent = '❌ Error';
                        log(evt.msg, 'err');
                        toast(evt.msg, 'error');
                    }
                } catch {}
            });
            buffer = buffer.split('\n').pop();
        }
    } catch (err) {
        log(`Error de conexión: ${err.message}`, 'err');
    } finally {
        isSending = false;
        document.getElementById('progressFooter').style.display = 'flex';
    }
}

function closeProgress() { hide('progressOverlay'); }

// ═══════════════════════════════════════════════════════════════════
// HISTORIAL
// ═══════════════════════════════════════════════════════════════════
let historialVisible = false;
function toggleHistorial() {
    historialVisible = !historialVisible;
    document.getElementById('historialPanel').classList.toggle('hidden', !historialVisible);
}

async function loadHistorial() {
    try {
        const res  = await fetch('api/historial');
        const data = await res.json();
        const body = document.getElementById('historialBody');
        if (!data.historial.length) {
            body.innerHTML = '<p style="color:var(--text-muted);font-size:13px;text-align:center;padding-top:20px;">Sin campañas registradas.</p>';
            return;
        }
        body.innerHTML = data.historial.map(h => `
            <div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:10px;">
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                    <span style="font-size:12px;color:var(--text-muted);">${new Date(h.fecha).toLocaleString('es-CL')}</span>
                    <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;background:${h.modo==='PROD'?'rgba(59,130,246,.15)':'rgba(234,179,8,.15)'};color:${h.modo==='PROD'?'#93c5fd':'#fde047'};">${h.modo}</span>
                </div>
                <div style="font-size:13px;color:var(--text-secondary);margin-bottom:6px;">✉ ${h.enviados} enviados · ⚠ ${h.saltados} saltados</div>
                <div style="font-size:11px;color:var(--text-muted);">${(h.equipos||[]).join(', ')}</div>
            </div>
        `).join('');
    } catch {}
}

// ═══════════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════════
function getEquipmentIcon(tipo) {
    const t = (tipo || '').toLowerCase();
    if (t.includes('camion') || t.includes('camión') || t.includes('tolva')) return '🚛';
    if (t.includes('excavadora')) return '⛏️';
    if (t.includes('grúa') || t.includes('grua')) return '🏗️';
    if (t.includes('retroexcavadora')) return '🚜';
    if (t.includes('motoniveladora')) return '🚧';
    if (t.includes('bulldozer') || t.includes('topadora')) return '🚜';
    if (t.includes('cargador') || t.includes('frontal')) return '🏗️';
    if (t.includes('generador')) return '⚡';
    if (t.includes('compresor')) return '💨';
    if (t.includes('perforadora') || t.includes('jumbo')) return '🔩';
    return '🔧';
}

function show(id) { document.getElementById(id)?.classList.remove('hidden'); }
function hide(id) { document.getElementById(id)?.classList.add('hidden'); }

function toast(msg, type = 'info') {
    const el      = document.createElement('div');
    el.className  = `toast ${type}`;
    el.textContent = msg;
    document.getElementById('toastArea').appendChild(el);
    setTimeout(() => el.remove(), 5000);
}

// ═══════════════════════════════════════════════════════════════════
// ADMIN DE EQUIPOS — Gestión de Inventario desde BD
// ═══════════════════════════════════════════════════════════════════
const EDITABLE_FIELDS = ['tipoMaquinaria','numeroInterno','marca','modelo','anio','horometro','tarifa','detalle'];

async function showAdminEquipos() {
    show('adminEquiposOverlay');
    await loadAdminEquipos();
}

function closeAdminEquipos() {
    hide('adminEquiposOverlay');
}

function showNewEquipoForm() {
    const f = document.getElementById('new-equipo-form');
    f.style.display = f.style.display === 'none' ? 'block' : 'none';
    if (f.style.display !== 'none') document.getElementById('ne-tipo').focus();
}

async function loadAdminEquipos() {
    const tbody = document.getElementById('admin-equipos-table');
    const empty = document.getElementById('admin-equipos-empty');
    tbody.innerHTML = `<tr><td colspan="12" style="text-align:center;padding:24px;color:#94a3b8;">Cargando...</td></tr>`;

    try {
        const res  = await fetch('api/equipos/admin');
        const data = await res.json();
        if (!data.ok) throw new Error(data.error);

        const equipos = data.equipos;
        document.getElementById('admin-source-badge').textContent = `${equipos.length} equipo(s) en la base de datos`;
        document.getElementById('admin-filter-count').textContent  = `${equipos.filter(e=>e.activo).length} activos`;

        if (!equipos.length) {
            tbody.innerHTML = '';
            empty.style.display = 'block';
            return;
        }
        empty.style.display = 'none';
        renderAdminTable(equipos);
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="12" style="color:#dc2626;padding:16px;">${err.message}</td></tr>`;
    }
}

// ── Render de tabla editable ────────────────────────────────────────
function renderAdminTable(equipos) {
    const tbody = document.getElementById('admin-equipos-table');
    tbody.innerHTML = equipos.map(e => buildEquipoRow(e)).join('');
}

function buildEquipoRow(e) {
    const fotoHtml = e.imagenUrl
        ? `<img src="${e.imagenUrl}" style="width:38px;height:38px;object-fit:cover;border-radius:6px;display:block;margin:0 auto;">`
        : `<div style="width:38px;height:38px;background:#f1f5f9;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:18px;margin:0 auto;">📷</div>`;

    const inp = (field, val, placeholder='') =>
        `<input data-id="${e.id}" data-field="${field}"
            value="${(val||'').replace(/"/g,'&quot;')}"
            placeholder="${placeholder}"
            onblur="saveInlineField(this)"
            onkeydown="if(event.key==='Enter'){this.blur();}"
            style="width:100%;padding:4px 6px;border:1px solid transparent;border-radius:4px;font-size:12px;font-family:inherit;background:transparent;color:#1e293b;box-sizing:border-box;"
            onfocus="this.style.border='1px solid #2563eb';this.style.background='white';"
        >`;

    return `
    <tr id="eq-row-${e.id}" style="border-bottom:1px solid #f1f5f9;background:${e.activo ? 'white' : '#fff7f7'};" onmouseover="this.style.background='${e.activo ? '#f8fafc' : '#fff0f0'}'" onmouseout="this.style.background='${e.activo ? 'white' : '#fff7f7'}'">
        <td style="padding:6px 4px;text-align:center;">
            <label title="Subir foto" style="cursor:pointer;">
                ${fotoHtml}
                <input type="file" accept="image/*" style="display:none;" onchange="uploadEquipoFoto(${e.id}, this)">
            </label>
        </td>
        <td style="padding:4px 6px;">${inp('tipoMaquinaria', e.tipoMaquinaria, 'Tipo *')}</td>
        <td style="padding:4px 6px;">${inp('numeroInterno', e.numeroInterno, 'N°')}</td>
        <td style="padding:4px 6px;">${inp('marca', e.marca, 'Marca')}</td>
        <td style="padding:4px 6px;">${inp('modelo', e.modelo, 'Modelo')}</td>
        <td style="padding:4px 6px;">${inp('anio', e.anio, 'Año')}</td>
        <td style="padding:4px 6px;">${inp('horometro', e.horometro, 'Hrs')}</td>
        <td style="padding:4px 6px;">${inp('tarifa', e.tarifa, 'Tarifa')}</td>
        <td style="padding:4px 6px;">${inp('detalle', e.detalle, 'Detalle...')}</td>
        <td style="padding:4px;text-align:center;">
            <label style="cursor:pointer;font-size:11px;color:#6366f1;display:block;text-align:center;">
                📷
                <input type="file" accept="image/*" style="display:none;" onchange="uploadEquipoFoto(${e.id}, this)">
            </label>
        </td>
        <td style="padding:4px;text-align:center;">
            <input type="checkbox" ${e.activo ? 'checked' : ''} onchange="toggleEquipoActivo(${e.id}, this.checked)" style="accent-color:#2563eb;width:15px;height:15px;cursor:pointer;">
        </td>
        <td style="padding:4px;text-align:center;">
            <button onclick="deleteEquipo(${e.id})" style="background:#fee2e2;color:#dc2626;border:none;border-radius:4px;padding:4px 8px;cursor:pointer;font-size:11px;" title="Eliminar">✕</button>
        </td>
    </tr>`;
}

// ── Guardar campo editado inline ────────────────────────────────────
async function saveInlineField(input) {
    input.style.border = '1px solid transparent';
    input.style.background = 'transparent';
    const id    = parseInt(input.dataset.id);
    const field = input.dataset.field;
    const value = input.value.trim() || null;

    try {
        const res = await fetch(`api/equipos/db/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ [field]: value })
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error);
        input.style.border = '1px solid #86efac'; // verde flash
        setTimeout(() => { input.style.border = '1px solid transparent'; }, 1000);
        // Actualizar también la lista de equipos de la pantalla principal
        loadEquipos();
    } catch (err) {
        input.style.border = '1px solid #fca5a5';
        toast(`Error al guardar: ${err.message}`, 'error');
    }
}

// ── Subida de foto ────────────────────────�
// ── Eliminar equipo ─────────────────────────────────────────────────
async function deleteEquipo(id) {
    if (!confirm('¿Eliminar este equipo? Esta acción no se puede deshacer.')) return;
    try {
        await fetch(`api/equipos/db/${id}`, { method: 'DELETE' });
        toast('Equipo eliminado', 'success');
        await loadAdminEquipos();
        await loadEquipos();
    } catch (err) { toast(`Error: ${err.message}`, 'error'); }
}
td>
        </tr>
    `).join('');
}

async function saveNewEquipo() {
    const tipo = document.getElementById('ne-tipo').value.trim();
    if (!tipo) { toast('El tipo de maquinaria es obligatorio', 'error'); return; }

    const data = {
        tipoMaquinaria: tipo,
        marca:          document.getElementById('ne-marca').value.trim() || null,
        modelo:         document.getElementById('ne-modelo').value.trim() || null,
        anio:           document.getElementById('ne-anio').value.trim() || null,
        horometro:      document.getElementById('ne-horometro').value.trim() || null,
        tarifa:         document.getElementById('ne-tarifa').value.trim() || null,
        numeroInterno:  document.getElementById('ne-numero').value.trim() || null,
        imagenUrl:      document.getElementById('ne-imagen').value.trim() || null,
        detalle:        document.getElementById('ne-detalle').value.trim() || null,
    };

    try {
        const res = await fetch('api/equipos/db', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (!result.ok) throw new Error(result.error);
        toast('✅ Equipo creado correctamente', 'success');
        document.getElementById('new-equipo-form').style.display = 'none';
        // Limpiar form
        ['ne-tipo','ne-marca','ne-modelo','ne-anio','ne-horometro','ne-tarifa','ne-numero','ne-imagen','ne-detalle'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        await loadAdminEquipos();
        // Recargar equipos en el selector principal también
        await loadEquipos();
    } catch (err) {
        toast(`Error: ${err.message}`, 'error');
    }
}

async function toggleEquipoActivo(id, activo) {
    try {
        await fetch(`api/equipos/db/${id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activo })
        });
        toast(activo ? 'Equipo activado' : 'Equipo desactivado', 'success');
        await loadAdminEquipos();
        await loadEquipos();
    } catch (err) { toast(`Error: ${err.message}`, 'error'); }
}

async function deleteEquipo(id) {
    if (!confirm('¿Eliminar este equipo? Esta acción no se puede deshacer.')) return;
    try {
        await fetch(`api/equipos/db/${id}`, { method: 'DELETE' });
        toast('Equipo eliminado', 'success');
        await loadAdminEquipos();
        await loadEquipos();
    } catch (err) { toast(`Error: ${err.message}`, 'error'); }
}

async function importFromNotion() {
    const btn = event.target;
    btn.disabled = true;
    btn.textContent = '⏳ Importando...';

    try {
        const res  = await fetch('api/equipos/import-notion', { method: 'POST' });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error);
        toast(`✅ Importados ${data.creados} equipos nuevos (${data.existentes} ya existían)`, 'success');
        await loadAdminEquipos();
        await loadEquipos();
    } catch (err) {
        toast(`Error importando: ${err.message}`, 'error');
    }
    btn.disabled = false;
    btn.textContent = '⬇ Importar desde Notion';
}



function downloadPlantillaCSV() {
    const header = "Tipo Maquinaria,N° Interno,Marca,Modelo,Año,Horómetro,Tarifa,Detalle\n";
    const example = "Excavadora 20T,EX-01,Caterpillar,320GC,2022,1200,UF 200/mes,Balde roca\n";
    const blob = new Blob([header + example], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "plantilla_equipos.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function handleEquipoCSV(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        const text = e.target.result;
        const rows = parseCSV(text);
        if (rows.length === 0) {
            toast("CSV vacío o sin formato", "error");
            return;
        }

        try {
            const res = await fetch('api/equipos/import-csv', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rows })
            });
            const data = await res.json();
            if (!data.ok) throw new Error(data.error);

            toast(`CSV Importado: ${data.creados} creados, ${data.actualizados} actualizados, ${data.errores} omitidos`, 'success');
            await loadAdminEquipos();
            await loadEquipos();
        } catch(err) {
            toast('Error subiendo CSV: ' + err.message, 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
}

function parseCSV(str) {
    const lines = str.split(/\r\n|\n/);
    if (!lines.length) return [];
    
    // Split header ignoring quotes inside commas if needed, but simple split is ok for this
    const headers = lines[0].split(',').map(h => h.trim());
    const result = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const currentline = lines[i].split(',');
        const obj = {};
        for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = currentline[j] ? currentline[j].trim() : '';
        }
        result.push(obj);
    }
    return result;
}
