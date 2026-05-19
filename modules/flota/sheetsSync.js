const { getSheetData, ensureSheetExists } = require('../../shared/googleSheets');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SHEET_ID = '1Ry7QVd8jkzISDymg3CeLyL2iroYD4eO6eXIpjImdAXo';

async function syncEquiposFromSheets() {
  console.log('🔄 Iniciando sincronización de equipos desde Google Sheets...');
  
  // Asegurar que la hoja "Equipos Externos" exista (para que no de error si aún no la crea)
  try {
    await ensureSheetExists(SHEET_ID, 'Equipos Externos');
  } catch (err) {
    console.error('⚠️  No se pudo asegurar la existencia de "Equipos Externos":', err.message);
  }

  let dataNormal = [];
  let dataExternos = [];

  try {
    const rawNormal = await getSheetData(SHEET_ID, "'Estado Arriendo'!A:Z");
    dataNormal = rawNormal || [];
  } catch (err) {
    console.error('⚠️ Error leyendo Estado Arriendo:', err.message);
  }

  try {
    const rawExternos = await getSheetData(SHEET_ID, "'Equipos Externos'!A:Z");
    dataExternos = rawExternos || [];
  } catch (err) {
    console.error('⚠️ Error leyendo Equipos Externos:', err.message);
  }

  // Helper para procesar filas de una hoja
  const processRows = (rows, esExterno) => {
    if (!rows || rows.length < 2) return [];
    
    // Buscar índices de las columnas según el encabezado
    const headers = rows[0].map(h => h.trim().toLowerCase());
    
    const getIdx = (name) => headers.findIndex(h => h === name.toLowerCase());
    
    const idxId = getIdx('ID');
    const idxTipo = getIdx('Tipo Maquina');
    const idxAnio = getIdx('Año');
    const idxMarca = getIdx('Marca');
    const idxModelo = getIdx('Modelo');
    const idxDetalle = getIdx('Detalle');
    const idxHorometro = getIdx('Horometro');
    const idxPropietario = getIdx('Propietario');

    const result = [];
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      
      const numeroInterno = idxId >= 0 ? row[idxId] : null;
      if (!numeroInterno || numeroInterno.trim() === '') continue; // Es vital tener ID

      const tipoMaquinaria = idxTipo >= 0 ? row[idxTipo] : 'Desconocido';
      if (!tipoMaquinaria || tipoMaquinaria.trim() === '') continue; // También es requerido

      result.push({
        numeroInterno: numeroInterno.trim(),
        tipoMaquinaria: tipoMaquinaria.trim(),
        anio: idxAnio >= 0 && row[idxAnio] ? row[idxAnio].trim() : null,
        marca: idxMarca >= 0 && row[idxMarca] ? row[idxMarca].trim() : null,
        modelo: idxModelo >= 0 && row[idxModelo] ? row[idxModelo].trim() : null,
        detalle: idxDetalle >= 0 && row[idxDetalle] ? row[idxDetalle].trim() : null,
        horometro: idxHorometro >= 0 && row[idxHorometro] ? row[idxHorometro].trim() : null,
        propietario: idxPropietario >= 0 && row[idxPropietario] ? row[idxPropietario].trim() : null,
        esExterno: esExterno
      });
    }
    return result;
  };

  const parsedNormal = processRows(dataNormal, false);
  const parsedExternos = processRows(dataExternos, true);
  
  const allParsed = [...parsedNormal, ...parsedExternos];
  const allInternalIds = new Set(allParsed.map(e => e.numeroInterno));

  let creados = 0;
  let actualizados = 0;
  let inactivos = 0;

  // Actualizar o crear equipos leídos desde Google Sheets
  for (const item of allParsed) {
    const existing = await prisma.flotaEquipo.findUnique({
      where: { numeroInterno: item.numeroInterno }
    });

    if (existing) {
      // Actualizar, respetando campos locales como imagenUrl, tarifa
      await prisma.flotaEquipo.update({
        where: { id: existing.id },
        data: {
          tipoMaquinaria: item.tipoMaquinaria,
          anio: item.anio,
          marca: item.marca,
          modelo: item.modelo,
          detalle: item.detalle,
          horometro: item.horometro,
          propietario: item.propietario,
          esExterno: item.esExterno,
          activo: true // Lo volvemos a activar si estaba inactivo y reapareció en el sheet
        }
      });
      actualizados++;
    } else {
      // Crear
      await prisma.flotaEquipo.create({
        data: {
          numeroInterno: item.numeroInterno,
          tipoMaquinaria: item.tipoMaquinaria,
          anio: item.anio,
          marca: item.marca,
          modelo: item.modelo,
          detalle: item.detalle,
          horometro: item.horometro,
          propietario: item.propietario,
          esExterno: item.esExterno,
          activo: true
        }
      });
      creados++;
    }
  }

  // Ocultar equipos de la base de datos que ya no están en las hojas de Sheets
  // (solo desactivamos los que tienen un numeroInterno asignado y no están en el set)
  const dbEquipos = await prisma.flotaEquipo.findMany({ where: { activo: true } });
  for (const eq of dbEquipos) {
    if (eq.numeroInterno && !allInternalIds.has(eq.numeroInterno)) {
      await prisma.flotaEquipo.update({
        where: { id: eq.id },
        data: { activo: false }
      });
      inactivos++;
    }
  }

  console.log(`✅ Sincronización finalizada. Creados: ${creados}, Actualizados: ${actualizados}, Desactivados: ${inactivos}`);
  return { ok: true, creados, actualizados, inactivos };
}

module.exports = {
  syncEquiposFromSheets
};
