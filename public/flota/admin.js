let adminEquiposCache = [];
let pendingInlineSaves = 0;

function toast(msg, type='success') {
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = msg;
    const area = document.getElementById('toastArea');
    area.appendChild(t);
    setTimeout(() => {
        t.style.opacity = '0';
        setTimeout(() => t.remove(), 300);
    }, 4000);
}

function showNewEquipoForm() {
    document.getElementById('new-equipo-form').style.display = 'block';
    document.getElementById('ne-tipo').focus();
}

async function loadAdminEquipos() {
    try {
        const res = await fetch('api/equipos/admin');
        const data = await res.json();
        if (!data.ok) throw new Error(data.error);
        adminEquiposCache = data.equipos;
        
        document.getElementById('admin-source-badge').innerHTML = `Base de Datos Local (${data.equipos.length} equipos)`;
        document.getElementById('admin-filter-count').innerText = `${data.equipos.length} equipos`;
        
        if (data.equipos.length === 0) {
            document.getElementById('admin-equipos-table').innerHTML = '';
            document.getElementById('admin-equipos-empty').style.display = 'block';
        } else {
            document.getElementById('admin-equipos-empty').style.display = 'none';
            renderAdminTable(data.equipos);
        }
        document.getElementById('selectAllAdmin').checked = false;
        toggleMassDeleteBtn();
    } catch (err) {
        toast(`Error cargando equipos: ${err.message}`, 'error');
    }
}

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
            <input type="checkbox" class="admin-eq-cb" value="${e.id}" onchange="toggleMassDeleteBtn()" style="margin-bottom:8px;accent-color:#2563eb;cursor:pointer;"><br>
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

async function saveInlineField(input) {
    const id = input.getAttribute('data-id');
    const field = input.getAttribute('data-field');
    let val = input.value.trim();

    const eq = adminEquiposCache.find(e => String(e.id) === String(id));
    if (!eq) return;

    if (String(eq[field] || '') === val) return;

    pendingInlineSaves++;
    document.getElementById('admin-pending-badge').style.display = 'inline-block';
    
    input.style.opacity = '0.5';
    try {
        const payload = {};
        payload[field] = val || null;
        
        const res = await fetch(`api/equipos/db/${id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (!result.ok) throw new Error(result.error);
        
        eq[field] = result.equipo[field];
        input.value = result.equipo[field] || '';
        input.style.border = '1px solid #4ade80';
        setTimeout(() => input.style.border = '1px solid transparent', 1500);
    } catch (err) {
        toast(`Error guardando ${field}: ${err.message}`, 'error');
        input.style.border = '1px solid #ef4444';
    } finally {
        input.style.opacity = '1';
        pendingInlineSaves--;
        if (pendingInlineSaves <= 0) {
            pendingInlineSaves = 0;
            document.getElementById('admin-pending-badge').style.display = 'none';
        }
    }
}

async function deleteEquipo(id) {
    if (!confirm('¿Eliminar este equipo? Esta acción no se puede deshacer.')) return;
    try {
        await fetch(`api/equipos/db/${id}`, { method: 'DELETE' });
        toast('Equipo eliminado', 'success');
        await loadAdminEquipos();
    } catch (err) { toast(`Error: ${err.message}`, 'error'); }
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
        
        ['ne-tipo','ne-marca','ne-modelo','ne-anio','ne-horometro','ne-tarifa','ne-numero','ne-detalle'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        await loadAdminEquipos();
    } catch (err) {
        toast(`Error: ${err.message}`, 'error');
    }
}

async function toggleEquipoActivo(id, activo) {
    try {
        const res = await fetch(`api/equipos/db/${id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activo })
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error);
        
        const row = document.getElementById(`eq-row-${id}`);
        if (row) {
            row.style.background = activo ? 'white' : '#fff7f7';
        }
        toast(activo ? 'Equipo activado' : 'Equipo desactivado', 'success');
        
        const eq = adminEquiposCache.find(e => String(e.id) === String(id));
        if (eq) eq.activo = activo;
        
    } catch (err) {
        toast(`Error: ${err.message}`, 'error');
        await loadAdminEquipos();
    }
}

async function importFromNotion(btn) {
    if (!confirm('¿Importar equipos desde Notion a la BD Local?\nEsto no borrará lo que ya existe, solo añadirá los nuevos.')) return;
    const oldText = btn.innerText;
    btn.innerText = '⏳ Importando...';
    btn.disabled = true;
    try {
        const res = await fetch('api/equipos/import-notion', { method: 'POST' });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error);
        toast(`✅ Importación completada.<br>Creados: ${data.creados}<br>Ignorados (ya existen): ${data.existentes}`, 'success');
        await loadAdminEquipos();
    } catch (err) {
        toast(`Error al importar: ${err.message}`, 'error');
    } finally {
        btn.innerText = oldText;
        btn.disabled = false;
    }
}

async function uploadEquipoFoto(id, input) {
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    
    if (file.size > 10 * 1024 * 1024) {
        toast('La foto es muy grande (máximo 10MB)', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('foto', file);

    const oldColor = input.parentElement.style.color;
    input.parentElement.style.color = '#f59e0b'; // Naranja cargando
    input.parentElement.title = "Subiendo...";

    try {
        const res = await fetch(`api/equipos/db/${id}/foto`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error);
        
        toast('Foto subida correctamente', 'success');
        await loadAdminEquipos();
    } catch (err) {
        toast(`Error al subir foto: ${err.message}`, 'error');
        input.parentElement.style.color = oldColor;
    }
}

function handleEquipoCSV(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        const text = e.target.result;
        const lines = text.split('\n').filter(l => l.trim() !== '');
        if (lines.length < 2) {
            toast('El archivo CSV parece estar vacío', 'error');
            return;
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const rows = [];
        
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const obj = {};
            headers.forEach((h, idx) => { obj[h] = values[idx] || ''; });
            rows.push(obj);
        }

        if (!confirm(`Se encontraron ${rows.length} equipos en el CSV.\n¿Deseas importarlos a la base de datos?`)) {
            event.target.value = '';
            return;
        }

        try {
            const res = await fetch('api/equipos/import-csv', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rows })
            });
            const data = await res.json();
            if (!data.ok) throw new Error(data.error);

            toast(`✅ Importación finalizada.<br>Creados: ${data.creados}<br>Actualizados: ${data.actualizados}<br>Errores: ${data.errores}`, 'success');
            await loadAdminEquipos();
        } catch (err) {
            toast(`Error en importación CSV: ${err.message}`, 'error');
        }
        event.target.value = '';
    };
    reader.readAsText(file);
}

function toggleAllAdminEquipos(checked) {
    const cbs = document.querySelectorAll('.admin-eq-cb');
    cbs.forEach(cb => cb.checked = checked);
    toggleMassDeleteBtn();
}

function toggleMassDeleteBtn() {
    const cbs = document.querySelectorAll('.admin-eq-cb:checked');
    const btn = document.getElementById('btn-mass-delete');
    if (cbs.length > 0) {
        btn.style.display = 'inline-block';
        btn.innerText = `🗑️ Eliminar ${cbs.length} equipos`;
    } else {
        btn.style.display = 'none';
    }
}

async function deleteSelectedEquipos() {
    const cbs = document.querySelectorAll('.admin-eq-cb:checked');
    if (cbs.length === 0) return;
    
    if (!confirm(`¿Eliminar permanentemente ${cbs.length} equipos seleccionados?`)) return;
    
    const ids = Array.from(cbs).map(cb => parseInt(cb.value));
    
    let eliminados = 0;
    let errores = 0;
    
    // Mostramos estado en el botón
    const btn = document.getElementById('btn-mass-delete');
    btn.disabled = true;
    btn.innerText = '⏳ Eliminando...';
    
    for (const id of ids) {
        try {
            await fetch(`api/equipos/db/${id}`, { method: 'DELETE' });
            eliminados++;
        } catch (e) {
            errores++;
        }
    }
    
    toast(`Eliminación completada: ${eliminados} eliminados, ${errores} errores.`, errores > 0 ? 'error' : 'success');
    btn.disabled = false;
    document.getElementById('selectAllAdmin').checked = false;
    toggleMassDeleteBtn();
    
    await loadAdminEquipos();
}

function downloadPlantillaCSV() {
    const headers = "Tipo Maquinaria,Marca,Modelo,Año,Horometro,Tarifa 180H,N° Interno,Detalle\n";
    const example1 = "Excavadora,CAT,320,2021,4500,2.5 UF/hr,EX-01,Balde 1m3\n";
    const example2 = "Cargador Frontal,Volvo,L120,2019,6200,2.8 UF/hr,CF-02,\n";
    
    const csvContent = "data:text/csv;charset=utf-8," + headers + example1 + example2;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "plantilla_importacion_equipos.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

document.addEventListener('DOMContentLoaded', loadAdminEquipos);
