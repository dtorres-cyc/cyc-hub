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
let isSyncing    = false;

// ── Init ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    syncAndLoad();
    loadHistorial();
});

// ═══════════════════════════════════════════════════════════════════
// SYNC DESDE GOOGLE SHEETS
// ═══════════════════════════════════════════════════════════════════

async function syncAndLoad() {
    if (isSyncing) return;
    isSyncing = true;

    // Mostrar estado de carga
    const loadingEl = document.getElementById('loadingState');
    const loadingText = loadingEl?.querySelector('.state-text');
    if (loadingText) loadingText.textContent = 'Sincronizando desde Google Sheets…';
    show('loadingState');
    hide('equipmentGrid');
    hide('equipmentTableWrap');

    try {
        // Sincronizar primero
        const syncRes = await fetch('api/sync', { method: 'POST' });
        const syncData = await syncRes.json();
        if (syncData.ok) {
            const badge = document.getElementById('syncBadge');
            if (badge) {
                badge.textContent = `↻ Actualizado (${syncData.creados || 0} nuevos, ${syncData.actualizados || 0} actualizados)`;
                badge.style.color = '#10b981';
                setTimeout(() => { badge.textContent = '↻ Sincronizar'; badge.style.color = ''; }, 4000);
            }
        }
    } catch (err) {
        console.warn('Sync de Sheets falló, usando datos locales:', err.message);
    } finally {
        isSyncing = false;
    }

    // Cargar equipos desde DB (ya sincronizada)
    await loadEquipos();
}

// ═══════════════════════════════════════════════════════════════════
// STEP 1 — EQUIPO SELECTION
// ═══════════════════════════════════════════════════════════════════

async function loadEquipos() {
    show('loadingState');
    hide('equipmentGrid');
    hide('equipmentTableWrap');

    try {
        const res  = await fetch('api/equipos/db');
        const data = await res.json();
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
    const tipos  = [...new Set(allEquipos.map(e => e.tipoMaquinaria).filter(Boolean))].sort();
    const marcas = [...new Set(allEquipos.map(e => e.marca).filter(Boolean))].sort();

    const tipoSel = document.getElementById('filterTipo');
    tipoSel.innerHTML = '<option value="">Todos los Tipos</option>';
    tipos.forEach(t => tipoSel.innerHTML += `<option value="${t}">${t}</option>`);

    const marcaSel = document.getElementById('filterMarca');
    marcaSel.innerHTML = '<option value="">Todas las Marcas</option>';
    marcas.forEach(m => marcaSel.innerHTML += `<option value="${m}">${m}</option>`);
}

function applyFilters() {
    const tipo    = document.getElementById('filterTipo').value;
    const marca   = document.getElementById('filterMarca').value;
    const sort    = document.getElementById('sortEquipos').value;
    const fuente  = document.getElementById('filterFuente')?.value || '';

    filteredEquipos = allEquipos.filter(e => {
        if (tipo  && e.tipoMaquinaria !== tipo)  return false;
        if (marca && e.marca           !== marca) return false;
        if (fuente === 'cyc'      &&  e.esExterno) return false;
        if (fuente === 'externos' && !e.esExterno) return false;
        return true;
    });

    if (sort === 'tipo_az')  filteredEquipos.sort((a,b) => a.tipoMaquinaria.localeCompare(b.tipoMaquinaria, 'es'));
    if (sort === 'tipo_za')  filteredEquipos.sort((a,b) => b.tipoMaquinaria.localeCompare(a.tipoMaquinaria, 'es'));
    if (sort === 'marca_az') filteredEquipos.sort((a,b) => (a.marca||'').localeCompare(b.marca||'', 'es'));

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
        card.className = `eq-card ${sel ? 'selected' : ''} ${eq.esExterno ? 'eq-externo' : ''}`;
        card.dataset.id = eq.id;
        card.onclick = (e) => {
            // Don't toggle if clicking photo button
            if (e.target.closest('.btn-foto-card')) return;
            toggleEquipo(eq.id);
        };

        const imgHtml = eq.imagenUrlRelativa
            ? `<img src="${eq.imagenUrlRelativa}" alt="foto" loading="lazy">`
            : getEquipmentIcon(eq.tipoMaquinaria);

        const numInternoHtml = eq.numeroInterno
            ? `<div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">N° ${eq.numeroInterno}</div>` : '';

        const externoBadge = eq.esExterno
            ? `<div style="display:inline-block;margin-bottom:4px;padding:2px 7px;background:#312e81;color:#a5b4fc;border-radius:10px;font-size:10px;font-weight:700;letter-spacing:0.5px;">EXTERNO</div>` : '';

        const tarifaHtml = (sel && tarifaOn)
            ? buildTarifaBoxHtml(eq.id, equipoTarifas[eq.id] || {})
            : '';

        card.innerHTML = `
            <div class="eq-checkbox">${sel ? '✓' : ''}</div>
            <div class="eq-img-box">${imgHtml}</div>
            ${externoBadge}
            <div class="eq-type">${eq.tipoMaquinaria || '—'}</div>
            ${numInternoHtml}
            <div class="eq-subtitle">${[eq.marca, eq.modelo].filter(Boolean).join(' · ') || '—'}</div>
            ${eq.tarifa ? `<div class="eq-price">💰 ${eq.tarifa}</div>` : ''}
            ${eq.horometro ? `<div style="font-size:12px;color:var(--text-muted);">⏱ ${eq.horometro} hrs · ${eq.año||'—'}</div>` : ''}
            ${tarifaHtml}
            <button class="btn-foto-card" onclick="openFotoModal('${eq.id}', '${(eq.tipoMaquinaria||'').replace(/'/g,"\\'")}', '${eq.imagenUrlRelativa||''}')" title="Subir o cambiar foto">📷</button>
        `;
        grid.appendChild(card);
    });
}

// ── Table ─────────────────────────────────────────────────────────
function renderTable() {
    const tbody = document.getElementById('equipmentTableBody');
    tbody.innerHTML = '';

    if (!filteredEquipos.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:30px;">Sin resultados.</td></tr>';
        return;
    }

    filteredEquipos.forEach(eq => {
        const sel = selectedEquipoIds.has(eq.id);
        const tr  = document.createElement('tr');
        tr.className = `${sel ? 'selected' : ''} ${eq.esExterno ? 'tr-externo' : ''}`;
        tr.dataset.id = eq.id;
        tr.onclick = (e) => {
            if (e.target.closest('.btn-foto-card')) return;
            toggleEquipo(eq.id);
        };

        const imgCell = eq.imagenUrlRelativa
            ? `<img src="${eq.imagenUrlRelativa}" class="table-img" loading="lazy">`
            : `<span style="font-size:24px;">${getEquipmentIcon(eq.tipoMaquinaria)}</span>`;

        const externoBadge = eq.esExterno
            ? `<span style="margin-left:6px;padding:1px 6px;background:#312e81;color:#a5b4fc;border-radius:8px;font-size:10px;font-weight:700;">EXT</span>` : '';

        tr.innerHTML = `
            <td><input type="checkbox" class="td-checkbox" ${sel ? 'checked' : ''} onclick="event.stopPropagation(); toggleEquipo('${eq.id}')"></td>
            <td>
                <div style="display:flex;align-items:center;gap:6px;">
                    ${imgCell}
                    <button class="btn-foto-card" onclick="event.stopPropagation(); openFotoModal('${eq.id}', '${(eq.tipoMaquinaria||'').replace(/'/g,"\\'")}', '${eq.imagenUrlRelativa||''}')" title="Subir foto" style="font-size:14px;padding:2px 6px;">📷</button>
                </div>
            </td>
            <td>
                <div style="font-weight:600;color:var(--text);margin-bottom:3px;">${eq.tipoMaquinaria||'—'}${externoBadge}</div>
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
    renderEquipos();
    updateStep1UI();
}

function onTarifaToggle() { renderEquipos(); }

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
// FOTO MODAL (sube/reemplaza foto de un equipo desde el Fleet Sender)
// ═══════════════════════════════════════════════════════════════════

let fotoModalEquipoId = null;

function openFotoModal(id, nombre, currentUrl) {
    fotoModalEquipoId = id;
    document.getElementById('fotoModalTitle').textContent = nombre || 'Equipo';
    const preview = document.getElementById('fotoModalPreview');
    preview.innerHTML = currentUrl
        ? `<img src="${currentUrl}" style="max-width:100%;max-height:160px;border-radius:8px;object-fit:contain;">`
        : '<span style="color:var(--text-muted);font-size:13px;">Sin foto actual</span>';
    document.getElementById('fotoModalInput').value = '';
    document.getElementById('fotoModalStatus').textContent = '';
    show('fotoModalOverlay');
}

function closeFotoModal() { hide('fotoModalOverlay'); }

async function submitFotoModal() {
    const input = document.getElementById('fotoModalInput');
    if (!input.files || !input.files[0]) {
        document.getElementById('fotoModalStatus').textContent = 'Selecciona una imagen primero.';
        return;
    }
    const fd = new FormData();
    fd.append('foto', input.files[0]);

    document.getElementById('fotoModalStatus').textContent = 'Subiendo…';
    try {
        const res  = await fetch(`api/equipos/db/${fotoModalEquipoId}/foto`, { method: 'POST', body: fd });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error);

        // Update local data
        const eq = allEquipos.find(e => e.id === fotoModalEquipoId);
        if (eq) {
            eq.imagenUrlRelativa = data.imagenUrl;
            eq.imagenUrl = data.imagenUrl; // will be made absolute by server on next load
        }
        renderEquipos();
        toast('Foto actualizada ✓', 'success');
        closeFotoModal();
    } catch (err) {
        document.getElementById('fotoModalStatus').textContent = `Error: ${err.message}`;
    }
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

    if (allContactos.length === 0) await loadContactos();
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
    allContactos = [];
    selectedContactoIds.clear();
    const searchEl = document.getElementById('contactSearch');
    if (searchEl) searchEl.value = '';

    const btn = document.getElementById('btnRefreshContactos');
    if (btn) { btn.textContent = '⏳'; btn.disabled = true; }

    await loadContactos();

    if (btn) { btn.textContent = '↻'; btn.disabled = false; }
    toast('Lista de contactos actualizada', 'success');
}

async function loadContactos() {
    document.getElementById('contactsList').innerHTML = '<p style="padding:16px;color:var(--text-muted);font-size:12px;">Cargando...</p>';
    try {
        const type = document.getElementById('contactDatabase')?.value || 'Normal';
        const res  = await fetch(`api/contactos?type=${type}`);
        const data = await res.json();
        if (!data.ok) throw new Error(data.error);

        allContactos = data.contactos;
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
            (c.empresa || '').toLowerCase().includes(q))
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

document.addEventListener('change', (e) => {
    if (currentStep === 2 && e.target.id === 'confPhotos') schedulePreview();
});
document.addEventListener('input', (e) => {
    if (currentStep === 2 && (e.target.id === 'confMessage' || e.target.id === 'confSubject')) schedulePreview();
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
        const d = document.createElement('div');
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

        log(`Enviando ${body.equipoIds.length} equipo(s) seleccionado(s)…`);

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
            const lines = buffer.split('\n');
            buffer = lines.pop(); // keep incomplete line
            lines.forEach(line => {
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
