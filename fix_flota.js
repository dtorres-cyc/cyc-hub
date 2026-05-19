const fs = require('fs');
let html = fs.readFileSync('public/flota/index.html', 'utf8');

// 1. Add Mass Delete button next to Import Notion button
if (!html.includes('id="btn-mass-delete"')) {
    html = html.replace(
        '<button onclick="importFromNotion(this)"',
        '<button onclick="deleteSelectedEquipos()" id="btn-mass-delete" style="display:none; padding:8px 14px; background:#ef4444; color:white; border:none; border-radius:6px; font-weight:600; cursor:pointer; font-size:12px; font-family:inherit;">🗑️ Eliminar Seleccionados</button>\n                <button onclick="importFromNotion(this)"'
    );
    // Add check-all checkbox to the table header. Wait, there's no table header defined in HTML, it's defined in JS?
    // Wait, the table header is in HTML! Let's check index.html for admin-equipos-table
}

fs.writeFileSync('public/flota/index.html', html, 'utf8');
