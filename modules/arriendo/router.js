// modules/arriendo/router.js — Gestión de Arriendo, EDPs y Daños/Mermas
const express = require('express');
const router  = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ─── CONTRATOS ────────────────────────────────────────────────────────────────

// GET todos los contratos con equipos y EDPs
router.get('/contratos', async (req, res) => {
  try {
    const contratos = await prisma.contrato.findMany({
      orderBy: { fechaInicio: 'desc' },
      include: {
        contratoEquipos: { orderBy: { createdAt: 'asc' } },
        edps: { orderBy: { createdAt: 'desc' } }
      }
    });
    res.json(contratos);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error obteniendo contratos' });
  }
});

// GET un contrato específico
router.get('/contratos/:id', async (req, res) => {
  try {
    const contrato = await prisma.contrato.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        contratoEquipos: { orderBy: { createdAt: 'asc' } },
        edps: { orderBy: { createdAt: 'desc' } },
        danosMermas: { orderBy: { createdAt: 'desc' } }
      }
    });
    if (!contrato) return res.status(404).json({ error: 'Contrato no encontrado' });
    res.json(contrato);
  } catch (e) {
    res.status(500).json({ error: 'Error obteniendo contrato' });
  }
});

// POST crear contrato + sus equipos
router.post('/contratos', async (req, res) => {
  try {
    const { numeroContrato, cliente, fechaInicio, fechaTermino,
            docOC, docContrato, docActaEntrega, notas, contratoEquipos } = req.body;

    const contrato = await prisma.contrato.create({
      data: {
        numeroContrato,
        cliente,
        fechaInicio: new Date(fechaInicio),
        fechaTermino: new Date(fechaTermino),
        docOC: !!docOC,
        docContrato: !!docContrato,
        docActaEntrega: !!docActaEntrega,
        notas: notas || null,
        contratoEquipos: {
          create: (contratoEquipos || []).map(eq => ({
            equipoId:         eq.equipoId,
            equipoTipo:       eq.equipoTipo || null,
            fechaEntrega:     eq.fechaEntrega ? new Date(eq.fechaEntrega) : null,
            horometroEntrega: eq.horometroEntrega ? parseFloat(eq.horometroEntrega) : null,
            tipoCobro:        eq.tipoCobro || 'fijo',
            moneda:           eq.moneda || 'CLP',
            valorFijo:        eq.valorFijo ? parseFloat(eq.valorFijo) : null,
            tarifaHora:       eq.tarifaHora ? parseFloat(eq.tarifaHora) : null,
            horasMinimas:     eq.horasMinimas ? parseFloat(eq.horasMinimas) : null,
            valorHoraExtra:   eq.valorHoraExtra ? parseFloat(eq.valorHoraExtra) : null,
          }))
        }
      },
      include: { contratoEquipos: true, edps: true }
    });
    res.json(contrato);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error creando contrato' });
  }
});

// PUT actualizar contrato
router.put('/contratos/:id', async (req, res) => {
  try {
    const { numeroContrato, cliente, fechaInicio, fechaTermino,
            activo, docOC, docContrato, docActaEntrega, notas, contratoEquipos } = req.body;
    const data = {};
    if (numeroContrato !== undefined) data.numeroContrato = numeroContrato;
    if (cliente !== undefined) data.cliente = cliente;
    if (fechaInicio !== undefined) data.fechaInicio = new Date(fechaInicio);
    if (fechaTermino !== undefined) data.fechaTermino = new Date(fechaTermino);
    if (activo !== undefined) data.activo = !!activo;
    if (docOC !== undefined) data.docOC = !!docOC;
    if (docContrato !== undefined) data.docContrato = !!docContrato;
    if (docActaEntrega !== undefined) data.docActaEntrega = !!docActaEntrega;
    if (notas !== undefined) data.notas = notas;

    // Si se envían equipos, sincronizar: upsert por equipoId
    if (contratoEquipos !== undefined) {
      const cid = parseInt(req.params.id);
      // Eliminar los que ya no están en la lista
      const newIds = contratoEquipos.map(eq => eq.equipoId);
      await prisma.contratoEquipo.deleteMany({
        where: { contratoId: cid, equipoId: { notIn: newIds } }
      });
      // Upsert cada equipo
      for (const eq of contratoEquipos) {
        const eqData = {
          equipoTipo:       eq.equipoTipo || null,
          fechaEntrega:     eq.fechaEntrega ? new Date(eq.fechaEntrega) : null,
          horometroEntrega: eq.horometroEntrega ? parseFloat(eq.horometroEntrega) : null,
          tipoCobro:        eq.tipoCobro || 'fijo',
          moneda:           eq.moneda || 'CLP',
          valorFijo:        eq.valorFijo ? parseFloat(eq.valorFijo) : null,
          tarifaHora:       eq.tarifaHora ? parseFloat(eq.tarifaHora) : null,
          horasMinimas:     eq.horasMinimas ? parseFloat(eq.horasMinimas) : null,
          valorHoraExtra:   eq.valorHoraExtra ? parseFloat(eq.valorHoraExtra) : null,
        };
        const existing = await prisma.contratoEquipo.findFirst({ where: { contratoId: cid, equipoId: eq.equipoId } });
        if (existing) {
          await prisma.contratoEquipo.update({ where: { id: existing.id }, data: eqData });
        } else {
          await prisma.contratoEquipo.create({ data: { contratoId: cid, equipoId: eq.equipoId, ...eqData } });
        }
      }
    }

    const contrato = await prisma.contrato.update({
      where: { id: parseInt(req.params.id) },
      data,
      include: { contratoEquipos: true, edps: true }
    });
    res.json(contrato);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error actualizando contrato' });
  }
});

// DELETE contrato
router.delete('/contratos/:id', async (req, res) => {
  try {
    await prisma.contratoEquipo.deleteMany({ where: { contratoId: parseInt(req.params.id) } });
    await prisma.contrato.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Error eliminando contrato' });
  }
});

// PUT dar de baja un equipo individual dentro del contrato
router.put('/contratos/equipos/:id/baja', async (req, res) => {
  try {
    const { motivoBaja } = req.body;
    const ceId = parseInt(req.params.id);
    const ce = await prisma.contratoEquipo.findUnique({
      where: { id: ceId },
      include: { contrato: true }
    });
    if (!ce) return res.status(404).json({ error: 'Equipo no encontrado en contrato' });

    // Marcar equipo como inactivo
    await prisma.contratoEquipo.update({
      where: { id: ceId },
      data: { activo: false, fechaBaja: new Date(), motivoBaja: motivoBaja || null }
    });

    // Crear caso en Daños & Mermas automáticamente
    await prisma.danosMerma.create({
      data: {
        contratoId:       ce.contratoId,
        contratoEquipoId: ceId,
        equipoId:         ce.equipoId,
        equipoDesc:       ce.equipoTipo || null,
        cliente:          ce.contrato.cliente,
        etapa:            1,
        observaciones: `Baja de contrato ${ce.contrato.numeroContrato}${motivoBaja ? ': ' + motivoBaja : ''}`
      }
    });

    // Si todos los equipos del contrato están dados de baja, cerrar el contrato
    const activos = await prisma.contratoEquipo.count({
      where: { contratoId: ce.contratoId, activo: true }
    });
    if (activos === 0) {
      await prisma.contrato.update({ where: { id: ce.contratoId }, data: { activo: false } });
    }

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error dando de baja equipo' });
  }
});

// ─── EDP ──────────────────────────────────────────────────────────────────────

// GET EDPs de un contrato
router.get('/contratos/:id/edps', async (req, res) => {
  try {
    const edps = await prisma.eDP.findMany({
      where: { contratoId: parseInt(req.params.id) },
      orderBy: [{ anio: 'desc' }, { mes: 'desc' }]
    });
    res.json(edps);
  } catch (e) {
    res.status(500).json({ error: 'Error obteniendo EDPs' });
  }
});

// GET todos los EDPs (para vista global)
router.get('/edps', async (req, res) => {
  try {
    const edps = await prisma.eDP.findMany({
      orderBy: [{ anio: 'desc' }, { mes: 'desc' }],
      include: { contrato: { select: { cliente: true, numeroContrato: true } } }
    });
    res.json(edps);
  } catch (e) {
    res.status(500).json({ error: 'Error obteniendo EDPs' });
  }
});

// POST crear EDP manualmente
router.post('/edps', async (req, res) => {
  try {
    const { contratoId, mes, anio, periodo, mesConsumo, estado, valorUfCierre, subtotal, iva, total, montoEdp, observaciones, detalles, adicionales } = req.body;
    const edp = await prisma.eDP.create({
      data: {
        contratoId: parseInt(contratoId),
        mes: mes ? parseInt(mes) : null,
        anio: anio ? parseInt(anio) : null,
        periodo: periodo || null,
        mesConsumo: mesConsumo || '',
        estado: estado || 'Solicitud',
        valorUfCierre: valorUfCierre ? parseFloat(valorUfCierre) : null,
        subtotal: subtotal ? parseFloat(subtotal) : 0,
        iva: iva ? parseFloat(iva) : 0,
        total: total ? parseFloat(total) : 0,
        etapa: 1,
        montoEdp: montoEdp ? parseFloat(montoEdp) : null,
        observaciones: observaciones || null,
        detalles: detalles ? { create: detalles } : undefined,
        adicionales: adicionales ? { create: adicionales } : undefined
      }
    });
    res.json(edp);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error creando EDP' });
  }
});

// PUT avanzar etapa EDP o actualizar datos
router.put('/edps/:id', async (req, res) => {
  try {
    const { etapa, estado, mesConsumo, valorUfCierre, subtotal, iva, total, montoEdp, observaciones, horometroSolicitado, horometroRecibido, edpEnviado, negociacionInicio, facturado, detalles, adicionales } = req.body;
    const data = {};
    if (etapa !== undefined) data.etapa = parseInt(etapa);
    if (estado !== undefined) data.estado = estado;
    if (mesConsumo !== undefined) data.mesConsumo = mesConsumo;
    if (valorUfCierre !== undefined) data.valorUfCierre = valorUfCierre !== null ? parseFloat(valorUfCierre) : null;
    if (subtotal !== undefined) data.subtotal = parseFloat(subtotal);
    if (iva !== undefined) data.iva = parseFloat(iva);
    if (total !== undefined) data.total = parseFloat(total);
    if (montoEdp !== undefined) data.montoEdp = montoEdp !== null ? parseFloat(montoEdp) : null;
    if (observaciones !== undefined) data.observaciones = observaciones;
    if (horometroSolicitado !== undefined) data.horometroSolicitado = horometroSolicitado ? new Date(horometroSolicitado) : null;
    if (horometroRecibido !== undefined) data.horometroRecibido = horometroRecibido ? new Date(horometroRecibido) : null;
    if (edpEnviado !== undefined) data.edpEnviado = edpEnviado ? new Date(edpEnviado) : null;
    if (negociacionInicio !== undefined) data.negociacionInicio = negociacionInicio ? new Date(negociacionInicio) : null;
    if (facturado !== undefined) data.facturado = facturado ? new Date(facturado) : null;

    if (detalles) {
      await prisma.eDPDetalleEquipo.deleteMany({ where: { edpId: parseInt(req.params.id) } });
      data.detalles = { create: detalles };
    }
    if (adicionales) {
      await prisma.eDPAdicional.deleteMany({ where: { edpId: parseInt(req.params.id) } });
      data.adicionales = { create: adicionales };
    }

    const edp = await prisma.eDP.update({
      where: { id: parseInt(req.params.id) },
      data
    });
    res.json(edp);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error actualizando EDP' });
  }
});

// DELETE EDP
router.delete('/edps/:id', async (req, res) => {
  try {
    await prisma.eDP.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Error eliminando EDP' });
  }
});

// POST Auto-generar EDPs del mes actual para todos los contratos activos
router.post('/edps/generar-mes', async (req, res) => {
  try {
    const now = new Date();
    const mes = now.getMonth() + 1;
    const anio = now.getFullYear();
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const periodo = `${meses[mes - 1]} ${anio}`;

    const contratosActivos = await prisma.contrato.findMany({ where: { activo: true } });
    const creados = [];

    for (const contrato of contratosActivos) {
      // No duplicar si ya existe EDP para este mes/año/contrato
      const existe = await prisma.eDP.findFirst({
        where: { contratoId: contrato.id, mes, anio }
      });
      if (!existe) {
        const edp = await prisma.eDP.create({
          data: { contratoId: contrato.id, mes, anio, periodo, etapa: 1 }
        });
        creados.push(edp);
      }
    }

    res.json({ creados: creados.length, periodo });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error generando EDPs' });
  }
});

// ─── DAÑOS Y MERMAS ───────────────────────────────────────────────────────────

// GET todos los casos activos
router.get('/danos', async (req, res) => {
  try {
    const danos = await prisma.danosMerma.findMany({
      where: { activo: true },
      orderBy: { createdAt: 'desc' },
      include: { contrato: { select: { cliente: true, numeroContrato: true } } }
    });
    res.json(danos);
  } catch (e) {
    res.status(500).json({ error: 'Error obteniendo daños/mermas' });
  }
});

// POST crear caso de daños/mermas (manual o automático desde dar de baja)
router.post('/danos', async (req, res) => {
  try {
    const { contratoId, equipoId, equipoDesc, cliente, observaciones, pdfLink } = req.body;
    const dano = await prisma.danosMerma.create({
      data: {
        contratoId: contratoId ? parseInt(contratoId) : null,
        equipoId,
        equipoDesc: equipoDesc || null,
        cliente: cliente || null,
        etapa: 1,
        observaciones: observaciones || null,
        pdfLink: pdfLink || null
      }
    });
    res.json(dano);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error creando caso de daños' });
  }
});

// PUT avanzar etapa / actualizar datos de daños
router.put('/danos/:id', async (req, res) => {
  try {
    const { etapa, montoDano, montoFacturado, observaciones, pdfLink, recepcionFecha, levantamientoFecha,
            informeEnviado, negociacionInicio, facturadoFecha, pagadoFecha, activo } = req.body;
    const data = {};
    if (etapa !== undefined) data.etapa = parseInt(etapa);
    if (montoDano !== undefined) data.montoDano = parseFloat(montoDano);
    if (montoFacturado !== undefined) data.montoFacturado = parseFloat(montoFacturado);
    if (observaciones !== undefined) data.observaciones = observaciones;
    if (pdfLink !== undefined) data.pdfLink = pdfLink;
    if (activo !== undefined) data.activo = !!activo;
    if (recepcionFecha !== undefined) data.recepcionFecha = recepcionFecha ? new Date(recepcionFecha) : null;
    if (levantamientoFecha !== undefined) data.levantamientoFecha = levantamientoFecha ? new Date(levantamientoFecha) : null;
    if (informeEnviado !== undefined) data.informeEnviado = informeEnviado ? new Date(informeEnviado) : null;
    if (negociacionInicio !== undefined) data.negociacionInicio = negociacionInicio ? new Date(negociacionInicio) : null;
    if (facturadoFecha !== undefined) data.facturadoFecha = facturadoFecha ? new Date(facturadoFecha) : null;
    if (pagadoFecha !== undefined) data.pagadoFecha = pagadoFecha ? new Date(pagadoFecha) : null;

    const dano = await prisma.danosMerma.update({
      where: { id: parseInt(req.params.id) },
      data
    });
    res.json(dano);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error actualizando caso de daños' });
  }
});

// DELETE daño
router.delete('/danos/:id', async (req, res) => {
  try {
    await prisma.danosMerma.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Error eliminando caso' });
  }
});

// Exponer función para uso interno (cron)
router.generarEDPsMes = async () => {
  const now = new Date();
  const mes = now.getMonth() + 1;
  const anio = now.getFullYear();
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const periodo = `${meses[mes - 1]} ${anio}`;
  const contratosActivos = await prisma.contrato.findMany({ where: { activo: true } });
  let count = 0;
  for (const c of contratosActivos) {
    const existe = await prisma.eDP.findFirst({ where: { contratoId: c.id, mes, anio } });
    if (!existe) {
      await prisma.eDP.create({ data: { contratoId: c.id, mes, anio, periodo, etapa: 1 } });
      count++;
    }
  }
  return { creados: count, periodo };
};

module.exports = router;
