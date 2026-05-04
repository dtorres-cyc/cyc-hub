let currentTab = 'opportunities';
let globalCompanies = [];
let globalContacts = [];
let globalOpportunities = [];

const STAGES = ['Prospecto', 'Calificado', 'Cotización Enviada', 'Negociación', 'Ganado', 'Perdido'];

document.addEventListener('DOMContentLoaded', () => {
    fetchData();
    
    document.getElementById('btn-nuevo').addEventListener('click', openModal);
    document.getElementById('form-nuevo').addEventListener('submit', handleFormSubmit);
});

async function fetchData() {
    try {
        const [compRes, contRes, oppRes] = await Promise.all([
            fetch('/api/companies'),
            fetch('/api/contacts'),
            fetch('/api/opportunities')
        ]);
        
        globalCompanies = await compRes.json();
        globalContacts = await contRes.json();
        globalOpportunities = await oppRes.json();

        renderViews();
    } catch (err) {
        console.error("Error cargando datos:", err);
    }
}

function renderViews() {
    renderKanban();
    renderContacts();
    renderCompanies();
}

function switchTab(tab) {
    currentTab = tab;
    
    // UI Tabs
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    
    // UI Views
    document.getElementById('view-opportunities').style.display = 'none';
    document.getElementById('view-contacts').style.display = 'none';
    document.getElementById('view-companies').style.display = 'none';
    
    document.getElementById(`view-${tab}`).style.display = 'block';
}

// ==========================================
// KANBAN (Oportunidades)
// ==========================================
function renderKanban() {
    const board = document.getElementById('kanban-board');
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
        
        // Drag and drop events for column
        cardsContainer.addEventListener('dragover', e => {
            e.preventDefault();
            cardsContainer.style.background = 'rgba(0,0,0,0.05)';
        });
        cardsContainer.addEventListener('dragleave', e => {
            cardsContainer.style.background = 'transparent';
        });
        cardsContainer.addEventListener('drop', handleDrop);

        // Filter opps for this stage
        const opps = globalOpportunities.filter(o => o.stage === stage);
        opps.forEach(opp => {
            const card = document.createElement('div');
            card.className = 'kanban-card';
            card.draggable = true;
            card.dataset.id = opp.id;
            
            // Drag events for card
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
        renderKanban(); // Optimistic update
        
        try {
            await fetch(`/api/opportunities/${oppId}/stage`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stage: newStage })
            });
        } catch(err) {
            console.error("Error al actualizar etapa", err);
            fetchData(); // Rollback on error
        }
    }
}

// ==========================================
// TABLAS
// ==========================================
function renderContacts() {
    const tbody = document.getElementById('table-contacts');
    tbody.innerHTML = '';
    globalContacts.forEach(c => {
        tbody.innerHTML += `
            <tr>
                <td><strong>${c.firstName} ${c.lastName || ''}</strong></td>
                <td>${c.email || '-'}</td>
                <td>${c.phone || '-'}</td>
                <td>${c.company ? c.company.name : '-'}</td>
                <td>${c.status}</td>
            </tr>
        `;
    });
}

function renderCompanies() {
    const tbody = document.getElementById('table-companies');
    tbody.innerHTML = '';
    globalCompanies.forEach(c => {
        tbody.innerHTML += `
            <tr>
                <td><strong>${c.name}</strong></td>
                <td>${c.rut || '-'}</td>
                <td>${c.industry || '-'}</td>
                <td>${c.owner || '-'}</td>
            </tr>
        `;
    });
}

// ==========================================
// MODAL & FORMS
// ==========================================
function openModal() {
    const title = document.getElementById('modal-title');
    const fields = document.getElementById('modal-fields');
    fields.innerHTML = '';

    if (currentTab === 'companies') {
        title.textContent = 'Nueva Empresa';
        fields.innerHTML = `
            <div class="form-group"><label>Nombre</label><input type="text" name="name" required></div>
            <div class="form-group"><label>RUT</label><input type="text" name="rut"></div>
            <div class="form-group"><label>Industria</label><input type="text" name="industry"></div>
            <div class="form-group"><label>Propietario</label><input type="text" name="owner"></div>
        `;
    } else if (currentTab === 'contacts') {
        title.textContent = 'Nuevo Contacto';
        const compOptions = globalCompanies.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        fields.innerHTML = `
            <div class="form-group"><label>Nombre</label><input type="text" name="firstName" required></div>
            <div class="form-group"><label>Apellido</label><input type="text" name="lastName"></div>
            <div class="form-group"><label>Email</label><input type="email" name="email"></div>
            <div class="form-group"><label>Empresa</label>
                <select name="companyId"><option value="">Ninguna</option>${compOptions}</select>
            </div>
        `;
    } else if (currentTab === 'opportunities') {
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

    document.getElementById('modal-backdrop').style.display = 'block';
    if(currentTab === 'opportunities') {
        toggleNewCompany();
        toggleNewContact();
    }
}

function toggleNewCompany() {
    const select = document.getElementById('opp-comp-select');
    const newDiv = document.getElementById('opp-comp-new');
    if(select.value === '') {
        newDiv.style.display = 'block';
    } else {
        newDiv.style.display = 'none';
        document.querySelector('input[name="newCompanyName"]').value = '';
    }
}

function toggleNewContact() {
    const select = document.getElementById('opp-cont-select');
    const newDiv = document.getElementById('opp-cont-new');
    if(select.value === '') {
        newDiv.style.display = 'flex';
    } else {
        newDiv.style.display = 'none';
        document.querySelector('input[name="newContactFirstName"]').value = '';
        document.querySelector('input[name="newContactLastName"]').value = '';
    }
}

function closeModal() {
    document.getElementById('modal-backdrop').style.display = 'none';
    document.getElementById('form-nuevo').reset();
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    let endpoint = '';
    if (currentTab === 'companies') endpoint = '/api/companies';
    else if (currentTab === 'contacts') endpoint = '/api/contacts';
    else if (currentTab === 'opportunities') endpoint = '/api/opportunities';

    try {
        await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        closeModal();
        fetchData(); // Recargar datos
    } catch (err) {
        console.error("Error al guardar:", err);
        alert("Ocurrió un error al guardar.");
    }
}
