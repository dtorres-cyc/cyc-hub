// modules/flota/notion.js — Lógica de Notion para el módulo de flota
// Extraído desde server.js (Envío de flota disponible)

const { Client } = require('@notionhq/client');
const https      = require('https');

const notion = new Client({ auth: process.env.NOTION_TOKEN });

// ── Helpers ───────────────────────────────────────────────────────────────────
function getNotionText(property) {
  if (!property) return '';
  if (property.title?.length > 0)     return property.title[0].plain_text;
  if (property.rich_text?.length > 0) return property.rich_text[0].plain_text;
  if (property.email)                 return property.email;
  if (property.phone_number)          return property.phone_number;
  if (property.select)                return property.select?.name ?? '';
  if (property.number !== null && property.number !== undefined) return String(property.number);
  if (property.rollup?.type === 'array' && property.rollup.array.length > 0) {
    return getNotionText(property.rollup.array[0]);
  }
  if (property.relation?.length > 0) return '';
  return '';
}

function getNotionImage(property) {
  if (!property || !property.files || property.files.length === 0) return null;
  const file = property.files[0];
  return file.file?.url || file.external?.url || null;
}

function notionApiRequest(endpoint, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: 'api.notion.com',
      path:     `/v1/${endpoint}`,
      method:   'POST',
      headers: {
        'Authorization':  `Bearer ${process.env.NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data',  chunk => responseData += chunk);
      res.on('end',   () => {
        try { resolve(JSON.parse(responseData)); }
        catch (e) { reject(new Error('Error parseando respuesta Notion')); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ── Fetchers ──────────────────────────────────────────────────────────────────
async function fetchEquipos() {
  const response = await notion.databases.query({
    database_id: process.env.NOTION_EQUIPOS_DB_ID,
  });

  return response.results.map(page => {
    const p = page.properties;
    const tipoMaquinaria = getNotionText(p['Tipo Maquinaria'] || p['Tipo Maquina'] || p['Name']);
    const marca          = getNotionText(p['Marca']);
    const modelo         = getNotionText(p['Modelo']);
    const año            = getNotionText(p['Año']);
    const horometro      = getNotionText(p['Horómetro'] || p['Horometro']);
    const detalle        = getNotionText(p['Detalle']);
    const tarifa         = getNotionText(p['tarifa 180 hrs']);
    const imagenUrl      = getNotionImage(p['Imagen']);
    const numeroInterno  = getNotionText(
      p['N° Interno'] || p['Número Interno'] || p['Nro Interno'] ||
      p['N°'] || p['Número Equipo'] || p['Código'] || p['Codigo'] ||
      p['N° Equipo'] || p['Numero']
    );

    const especificacionesHtml = [
      marca     ? `<strong>Marca:</strong> ${marca}`           : '',
      modelo    ? `<strong>Modelo:</strong> ${modelo}`         : '',
      año       ? `<strong>Año:</strong> ${año}`               : '',
      horometro ? `<strong>Horómetro:</strong> ${horometro} hrs` : '',
      detalle   ? `<strong>Detalle:</strong> ${detalle}`       : '',
    ].filter(Boolean).join('<br>');

    const textoWpp = [tipoMaquinaria, marca, modelo, año ? `(${año})` : ''].filter(Boolean).join(' ');

    return {
      id: page.id, tipoMaquinaria, marca, modelo, año, horometro,
      detalle, tarifa, imagenUrl, numeroInterno,
      especificacionesHtml, textoWpp,
    };
  }).sort((a, b) => a.tipoMaquinaria.localeCompare(b.tipoMaquinaria, 'es'));
}

async function fetchContactos() {
  const dbIdClean = process.env.NOTION_CONTACTOS_DB_ID.replace(/-/g, '');
  const allPages  = [];
  let cursor      = undefined;

  do {
    const body = { filter: { value: 'page', property: 'object' }, page_size: 100 };
    if (cursor) body.start_cursor = cursor;

    const data = await notionApiRequest('search', body);
    if (data.object === 'error') throw new Error(`Error Notion Search: ${data.message}`);

    for (const page of (data.results || [])) {
      const parentId = (page.parent?.database_id || '').replace(/-/g, '');
      if (parentId === dbIdClean) allPages.push(page);
    }
    cursor = data.has_more ? data.next_cursor : null;
  } while (cursor);

  console.log(`   ✅ Contactos encontrados: ${allPages.length}`);

  return allPages
    .map(page => {
      const p = page.properties;
      return {
        id:       page.id,
        nombre:   getNotionText(p['Nombre']   || p['Contacto'] || p['Name']),
        empresa:  getNotionText(p['Empresa']  || p['Company']  || p['Razón Social']),
        correo:   getNotionText(p['Correo']   || p['Email']    || p['Mail']),
        telefono: getNotionText(p['Teléfono'] || p['Phone']    || p['Cel']),
      };
    })
    .filter(c => c.correo && c.correo.includes('@'))
    .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es'));
}

module.exports = { fetchEquipos, fetchContactos };
