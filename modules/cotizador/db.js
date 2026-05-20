// modules/cotizador/db.js — Cotizador usando Prisma (unificado con BD principal)
const { PrismaClient } = require('@prisma/client');
const { QUOTE_START_NUMBER } = require('../../shared/config');

const prisma = new PrismaClient();

async function initDb() {
  // Poblar productos por defecto si la tabla está vacía
  const count = await prisma.productoCotizador.count();
  if (count === 0) {
    await prisma.productoCotizador.createMany({
      data: [
        {
          nombre:      'Camión Tolva Mercedes Benz Arocs 4848 22m³ (2021-2022)',
          descripcion: 'Horas mínimas: 180 hrs/mes. Periodo: 3 meses extendible. Incluye inclinómetro.',
        },
        {
          nombre:      'Camión Aljibe',
          descripcion: 'Capacidad según disponibilidad. Consultar especificaciones técnicas.',
        },
      ],
    });
  }
  console.log('📦 Módulo cotizador listo (Prisma)');
}

async function nextQuoteNumber() {
  const last = await prisma.cotizacion.aggregate({ _max: { numero: true } });
  return (last._max.numero ?? (QUOTE_START_NUMBER - 1)) + 1;
}

async function saveQuote(data) {
  const record = await prisma.cotizacion.create({
    data: {
      numero:         data.numero,
      fecha:          data.fecha,
      clienteNombre:  data.cliente_nombre,
      clienteRut:     data.cliente_rut     || '',
      clienteEmpresa: data.cliente_empresa || '',
      clienteEmail:   data.cliente_email   || '',
      clienteFono:    data.cliente_fono    || '',
      clienteDir:     data.cliente_dir     || '',
      clienteCargo:   data.cliente_cargo   || '',
      itemsJson:      JSON.stringify(data.items || []),
      subtotal:       data.subtotal,
      iva:            data.iva,
      total:          data.total,
      validezDias:    data.validez_dias ?? 30,
      notas:          data.notas || '',
    },
  });
  return record.id;
}

async function updateDriveInfo(id, fileId, url) {
  await prisma.cotizacion.update({
    where: { id },
    data: { driveFileId: fileId, driveUrl: url },
  });
}

async function updateEmailSent(id) {
  await prisma.cotizacion.update({
    where: { id },
    data: { emailEnviado: true },
  });
}

async function getAllQuotes() {
  const quotes = await prisma.cotizacion.findMany({ orderBy: { numero: 'desc' } });
  return quotes.map(q => ({
    ...q,
    // Alias snake_case para compatibilidad con el frontend existente
    items_json:      q.itemsJson,
    cliente_nombre:  q.clienteNombre,
    cliente_rut:     q.clienteRut,
    cliente_empresa: q.clienteEmpresa,
    cliente_email:   q.clienteEmail,
    cliente_fono:    q.clienteFono,
    drive_file_id:   q.driveFileId,
    drive_url:       q.driveUrl,
    email_enviado:   q.emailEnviado ? 1 : 0,
    creado_en:       q.createdAt?.toISOString(),
  }));
}

async function getProducts() {
  return prisma.productoCotizador.findMany({
    where:   { activo: true },
    orderBy: { nombre: 'asc' },
  });
}

async function addProduct(nombre, descripcion = '', precioHora = null, precioMes = null) {
  const p = await prisma.productoCotizador.create({
    data: { nombre, descripcion, precioHora, precioMes },
  });
  return p.id;
}

async function deleteProduct(id) {
  await prisma.productoCotizador.update({
    where: { id },
    data:  { activo: false },
  });
}

module.exports = {
  initDb,
  nextQuoteNumber,
  saveQuote,
  updateDriveInfo,
  updateEmailSent,
  getAllQuotes,
  getProducts,
  addProduct,
  deleteProduct,
};
