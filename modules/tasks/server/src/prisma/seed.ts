import dotenv from 'dotenv';
dotenv.config();
import { PrismaClient, TaskStatus, TaskPriority, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Limpiar datos existentes
  await prisma.activityLog.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.subtask.deleteMany();
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();
  await prisma.project.deleteMany();
  await prisma.area.deleteMany();

  const hash = await bcrypt.hash('cyc2024', 10);

  // Usuarios
  const users = await Promise.all([
    prisma.user.create({ data: { nombre: 'Diego Torres', email: 'dtorres@tcyc.cl', password: hash, rol: UserRole.ADMIN, avatar: 'DT' } }),
    prisma.user.create({ data: { nombre: 'Carlos Muñoz', email: 'cmunoz@tcyc.cl', password: hash, rol: UserRole.MANAGER, avatar: 'CM' } }),
    prisma.user.create({ data: { nombre: 'Patricia Lagos', email: 'plagos@tcyc.cl', password: hash, rol: UserRole.MANAGER, avatar: 'PL' } }),
    prisma.user.create({ data: { nombre: 'Rodrigo Vega', email: 'rvega@tcyc.cl', password: hash, rol: UserRole.OPERADOR, avatar: 'RV' } }),
    prisma.user.create({ data: { nombre: 'Valentina Ríos', email: 'vrios@tcyc.cl', password: hash, rol: UserRole.OPERADOR, avatar: 'VR' } }),
    prisma.user.create({ data: { nombre: 'Juan Pérez', email: 'jperez@tcyc.cl', password: hash, rol: UserRole.OPERADOR, avatar: 'JP' } }),
  ]);
  const [diego, carlos, patricia, rodrigo, valentina, juan] = users;

  // Proyectos
  const projects = await Promise.all([
    prisma.project.create({ data: { nombre: 'Flota Calama', descripcion: 'Gestión flota norte', color: '#f59e0b' } }),
    prisma.project.create({ data: { nombre: 'Flota Copiapó', descripcion: 'Gestión flota centro-norte', color: '#3b82f6' } }),
    prisma.project.create({ data: { nombre: 'Comercial', descripcion: 'Proyectos área comercial', color: '#10b981' } }),
    prisma.project.create({ data: { nombre: 'Operaciones', descripcion: 'Proyectos operacionales', color: '#8b5cf6' } }),
    prisma.project.create({ data: { nombre: 'Mantención', descripcion: 'Mantenimiento de equipos', color: '#ef4444' } }),
    prisma.project.create({ data: { nombre: 'Administración', descripcion: 'Gestión administrativa', color: '#6366f1' } }),
  ]);
  const [flCalama, flCopiapo, comercial, operaciones, mantencion, administracion] = projects;

  // Áreas
  const areas = await Promise.all([
    prisma.area.create({ data: { nombre: 'Operaciones', color: '#f59e0b' } }),
    prisma.area.create({ data: { nombre: 'Comercial', color: '#3b82f6' } }),
    prisma.area.create({ data: { nombre: 'Mantención', color: '#ef4444' } }),
    prisma.area.create({ data: { nombre: 'RRHH', color: '#10b981' } }),
    prisma.area.create({ data: { nombre: 'Finanzas', color: '#8b5cf6' } }),
    prisma.area.create({ data: { nombre: 'Seguridad', color: '#f97316' } }),
  ]);
  const [aOps, aComercial, aMant, aRRHH, aFinanzas, aSeguridad] = areas;

  // Tareas de ejemplo
  const tasksData = [
    {
      titulo: 'Renovación certificado ISO 9001 - Flota Calama',
      descripcion: 'Gestionar la renovación del certificado de calidad ISO 9001 para los equipos de la flota norte. Coordinar con auditor externo y preparar documentación.',
      estado: TaskStatus.IN_PROGRESS,
      prioridad: TaskPriority.ALTA,
      progreso: 45,
      proyectoId: flCalama.id,
      areaId: aSeguridad.id,
      responsableId: carlos.id,
      fechaInicio: new Date('2026-05-15'),
      fechaFin: new Date('2026-06-30'),
      tags: ['certificación', 'iso', 'calidad'],
    },
    {
      titulo: 'Mantención preventiva Cat 793F - Faena Sierra Gorda',
      descripcion: 'Mantención preventiva de los 3 camiones Cat 793F asignados a faena Sierra Gorda. Cambio de aceite motor, revisión frenos, inspección estructura.',
      estado: TaskStatus.TODO,
      prioridad: TaskPriority.ALTA,
      progreso: 0,
      proyectoId: flCalama.id,
      areaId: aMant.id,
      responsableId: juan.id,
      fechaInicio: new Date('2026-06-05'),
      fechaFin: new Date('2026-06-15'),
      tags: ['mantencion', 'cat793f', 'sierra-gorda'],
    },
    {
      titulo: 'Propuesta comercial Minera Escondida - Ampliación contrato',
      descripcion: 'Preparar propuesta para ampliación de contrato con Minera Escondida: 4 palas CAT 6020B adicionales por 24 meses. Incluir análisis de costos y condiciones.',
      estado: TaskStatus.IN_REVIEW,
      prioridad: TaskPriority.ALTA,
      progreso: 80,
      proyectoId: comercial.id,
      areaId: aComercial.id,
      responsableId: diego.id,
      fechaInicio: new Date('2026-05-20'),
      fechaFin: new Date('2026-06-10'),
      tags: ['contrato', 'escondida', 'propuesta'],
    },
    {
      titulo: 'Implementación sistema GPS flota Copiapó',
      descripcion: 'Instalar y configurar sistema GPS en 12 equipos de la flota Copiapó. Contratar servicio Trimble, instalar hardware, capacitar operadores.',
      estado: TaskStatus.IN_PROGRESS,
      prioridad: TaskPriority.MEDIA,
      progreso: 60,
      proyectoId: flCopiapo.id,
      areaId: aOps.id,
      responsableId: rodrigo.id,
      fechaInicio: new Date('2026-05-01'),
      fechaFin: new Date('2026-06-20'),
      tags: ['gps', 'tecnología', 'flota'],
    },
    {
      titulo: 'Proceso selección operadores Komatsu PC8000',
      descripcion: 'Abrir proceso de selección para 6 operadores de pala Komatsu PC8000 para nueva faena en Atacama. Coordinar con empresa outsourcing RRHH.',
      estado: TaskStatus.BACKLOG,
      prioridad: TaskPriority.MEDIA,
      progreso: 0,
      proyectoId: operaciones.id,
      areaId: aRRHH.id,
      responsableId: patricia.id,
      fechaInicio: new Date('2026-07-01'),
      fechaFin: new Date('2026-07-31'),
      tags: ['rrhh', 'selección', 'komatsu'],
    },
    {
      titulo: 'Revisión contratos arrendamiento Q3 2026',
      descripcion: 'Revisar y actualizar todos los contratos de arrendamiento que vencen en Q3 2026. 8 contratos con Codelco, 3 con Kinross, 2 con Pan American Silver.',
      estado: TaskStatus.TODO,
      prioridad: TaskPriority.ALTA,
      progreso: 10,
      proyectoId: administracion.id,
      areaId: aFinanzas.id,
      responsableId: diego.id,
      fechaInicio: new Date('2026-06-01'),
      fechaFin: new Date('2026-06-25'),
      tags: ['contratos', 'codelco', 'renovación'],
    },
    {
      titulo: 'Capacitación RIMPE 2026 - Todo el personal',
      descripcion: 'Organizar capacitación obligatoria RIMPE (Reglamento Interno de Manejo de Peligros y Emergencias) para todo el personal operativo en las tres bases.',
      estado: TaskStatus.DONE,
      prioridad: TaskPriority.ALTA,
      progreso: 100,
      proyectoId: operaciones.id,
      areaId: aSeguridad.id,
      responsableId: valentina.id,
      fechaInicio: new Date('2026-04-01'),
      fechaFin: new Date('2026-05-30'),
      tags: ['capacitacion', 'seguridad', 'rimpe'],
    },
    {
      titulo: 'Informe mensual KPIs operacionales - Mayo 2026',
      descripcion: 'Preparar informe mensual de KPIs: disponibilidad mecánica, utilización de equipos, MTTR, MTBF por tipo de máquina y faena.',
      estado: TaskStatus.IN_PROGRESS,
      prioridad: TaskPriority.MEDIA,
      progreso: 35,
      proyectoId: operaciones.id,
      areaId: aOps.id,
      responsableId: carlos.id,
      fechaInicio: new Date('2026-06-01'),
      fechaFin: new Date('2026-06-05'),
      tags: ['kpi', 'informe', 'métricas'],
    },
    {
      titulo: 'Reparación mayor Bulldozer D11T - Taller Santiago',
      descripcion: 'Reparación mayor de motor y tren de rodaje del D11T matrícula CYC-2318. Cotizar repuestos Cat, tiempo estimado 3 semanas en taller.',
      estado: TaskStatus.IN_PROGRESS,
      prioridad: TaskPriority.ALTA,
      progreso: 25,
      proyectoId: mantencion.id,
      areaId: aMant.id,
      responsableId: juan.id,
      fechaInicio: new Date('2026-05-28'),
      fechaFin: new Date('2026-06-18'),
      tags: ['reparacion', 'd11t', 'taller'],
    },
    {
      titulo: 'Licitación arriendo excavadoras - Proyecto Chuquicamata',
      descripcion: 'Preparar propuesta técnica y económica para licitación de 2 excavadoras hidráulicas 400T para proyecto subterráneo Chuquicamata. Plazo bases: 20 junio.',
      estado: TaskStatus.TODO,
      prioridad: TaskPriority.ALTA,
      progreso: 5,
      proyectoId: comercial.id,
      areaId: aComercial.id,
      responsableId: diego.id,
      fechaInicio: new Date('2026-06-02'),
      fechaFin: new Date('2026-06-19'),
      tags: ['licitación', 'chuquicamata', 'excavadoras'],
    },
    {
      titulo: 'Actualización inventario repuestos críticos',
      descripcion: 'Actualizar inventario de repuestos críticos en bodegas de Calama y Copiapó. Identificar stock mínimo, repuestos en tránsito y órdenes de compra pendientes.',
      estado: TaskStatus.BACKLOG,
      prioridad: TaskPriority.BAJA,
      progreso: 0,
      proyectoId: mantencion.id,
      areaId: aMant.id,
      responsableId: rodrigo.id,
      fechaInicio: new Date('2026-07-15'),
      fechaFin: new Date('2026-07-25'),
      tags: ['inventario', 'repuestos', 'bodega'],
    },
    {
      titulo: 'Cierre contable Mayo 2026',
      descripcion: 'Cierre contable mensual: conciliación bancaria, facturas por pagar/cobrar, provisiones, informe financiero para gerencia.',
      estado: TaskStatus.IN_REVIEW,
      prioridad: TaskPriority.ALTA,
      progreso: 90,
      proyectoId: administracion.id,
      areaId: aFinanzas.id,
      responsableId: patricia.id,
      fechaInicio: new Date('2026-06-01'),
      fechaFin: new Date('2026-06-07'),
      tags: ['contabilidad', 'cierre', 'financiero'],
    },
  ];

  for (const taskData of tasksData) {
    const task = await prisma.task.create({ data: taskData });

    // Agregar subtareas a las primeras 3 tareas
    if (task.titulo.includes('ISO 9001')) {
      await prisma.subtask.createMany({
        data: [
          { tareaId: task.id, texto: 'Solicitar auditor externo certificado', completada: true, orden: 1 },
          { tareaId: task.id, texto: 'Preparar documentación del sistema de calidad', completada: true, orden: 2 },
          { tareaId: task.id, texto: 'Auditoría interna previa', completada: false, orden: 3 },
          { tareaId: task.id, texto: 'Auditoría externa certificadora', completada: false, orden: 4 },
          { tareaId: task.id, texto: 'Recepción y distribución certificado', completada: false, orden: 5 },
        ],
      });
    }

    if (task.titulo.includes('Cat 793F')) {
      await prisma.subtask.createMany({
        data: [
          { tareaId: task.id, texto: 'Programar parada de equipos con operador', completada: false, orden: 1 },
          { tareaId: task.id, texto: 'Solicitar repuestos a bodega Calama', completada: false, orden: 2 },
          { tareaId: task.id, texto: 'Ejecutar mantención unidad CYC-1401', completada: false, orden: 3 },
          { tareaId: task.id, texto: 'Ejecutar mantención unidad CYC-1402', completada: false, orden: 4 },
          { tareaId: task.id, texto: 'Ejecutar mantención unidad CYC-1403', completada: false, orden: 5 },
        ],
      });
    }

    if (task.titulo.includes('Escondida')) {
      await prisma.subtask.createMany({
        data: [
          { tareaId: task.id, texto: 'Análisis de costos operacionales', completada: true, orden: 1 },
          { tareaId: task.id, texto: 'Definir condiciones contractuales', completada: true, orden: 2 },
          { tareaId: task.id, texto: 'Revisión legal del contrato', completada: true, orden: 3 },
          { tareaId: task.id, texto: 'Presentación a gerencia Escondida', completada: false, orden: 4 },
        ],
      });
    }

    // Agregar comentario a algunas tareas
    await prisma.comment.create({
      data: {
        tareaId: task.id,
        autorId: diego.id,
        texto: 'Tarea creada y asignada. Favor confirmar recepción.',
      },
    });

    // Log de actividad inicial
    await prisma.activityLog.create({
      data: {
        tareaId: task.id,
        usuarioId: diego.id,
        accion: 'CREATED',
        detalle: 'Tarea creada',
      },
    });
  }

  console.log('✅ Seed completado exitosamente');
  console.log(`   - ${users.length} usuarios`);
  console.log(`   - ${projects.length} proyectos`);
  console.log(`   - ${areas.length} áreas`);
  console.log(`   - ${tasksData.length} tareas`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
