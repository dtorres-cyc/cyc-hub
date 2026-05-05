const express = require('express');
const router = express.Router();
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// CRM API Router

// ==========================================
// COMPANIES (Empresas)
// ==========================================

// Obtener todas las empresas
router.get('/api/companies', async (req, res) => {
    try {
        const companies = await prisma.company.findMany({
            include: { contacts: true, opportunities: true }
        });
        res.json(companies);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener empresas' });
    }
});

// Crear una empresa
router.post('/api/companies', async (req, res) => {
    try {
        const { name, rut, industry, segment, size, owner } = req.body;
        const newCompany = await prisma.company.create({
            data: { name, rut, industry, segment, size, owner }
        });
        res.json(newCompany);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear empresa' });
    }
});

// Carga masiva de empresas
router.post('/api/companies/bulk', async (req, res) => {
    try {
        const companies = req.body.map(c => ({
            name: c.name || c.Nombre || 'Sin Nombre',
            rut: c.rut || c.RUT || null,
            size: c.size || c.Tamaño || c.Tamano || null,
            industry: c.industry || c.Industria || null,
            owner: c.owner || c.Propietario || null
        }));
        const result = await prisma.company.createMany({ data: companies });
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en carga masiva de empresas' });
    }
});

// Actualizar una empresa
router.put('/api/companies/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { name, rut, industry, segment, size, owner } = req.body;
        const updatedCompany = await prisma.company.update({
            where: { id },
            data: { name, rut, industry, segment, size, owner }
        });
        res.json(updatedCompany);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar empresa' });
    }
});

// Eliminar empresas masivamente
router.post('/api/companies/bulk-delete', async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !ids.length) return res.status(400).json({ error: 'No IDs provided' });
        const result = await prisma.company.deleteMany({
            where: { id: { in: ids } }
        });
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar empresas' });
    }
});

// ==========================================
// CONTACTS (Contactos)
// ==========================================

// Obtener todos los contactos
router.get('/api/contacts', async (req, res) => {
    try {
        const contacts = await prisma.contact.findMany({
            include: { company: true }
        });
        res.json(contacts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener contactos' });
    }
});

// Crear un contacto
router.post('/api/contacts', async (req, res) => {
    try {
        const { firstName, lastName, email, phone, role, status, companyId } = req.body;
        const newContact = await prisma.contact.create({
            data: {
                firstName, lastName, email, phone, role, status,
                companyId: companyId ? parseInt(companyId) : null
            }
        });
        res.json(newContact);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear contacto' });
    }
});

// Carga masiva de contactos
router.post('/api/contacts/bulk', async (req, res) => {
    try {
        const contacts = req.body.map(c => ({
            firstName: c.firstName || c.Nombre || 'Sin Nombre',
            lastName: c.lastName || c.Apellido || null,
            role: c.role || c.Cargo || null,
            email: c.email || c.Email || c.Correo || null,
            phone: c.phone || c.Telefono || c.Teléfono || null
        }));
        const result = await prisma.contact.createMany({ data: contacts });
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en carga masiva de contactos' });
    }
});

// Actualizar un contacto
router.put('/api/contacts/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { firstName, lastName, email, phone, role, status, companyId } = req.body;
        const updatedContact = await prisma.contact.update({
            where: { id },
            data: {
                firstName, lastName, email, phone, role, status,
                companyId: companyId ? parseInt(companyId) : null
            }
        });
        res.json(updatedContact);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar contacto' });
    }
});

// Eliminar contactos masivamente
router.post('/api/contacts/bulk-delete', async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !ids.length) return res.status(400).json({ error: 'No IDs provided' });
        const result = await prisma.contact.deleteMany({
            where: { id: { in: ids } }
        });
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar contactos' });
    }
});

// ==========================================
// OPPORTUNITIES (Oportunidades)
// ==========================================

// Obtener todas las oportunidades
router.get('/api/opportunities', async (req, res) => {
    try {
        const opportunities = await prisma.opportunity.findMany({
            include: { company: true, contact: true }
        });
        res.json(opportunities);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener oportunidades' });
    }
});

// Crear una oportunidad
router.post('/api/opportunities', async (req, res) => {
    try {
        const { 
            name, amount, stage, probability, businessType, 
            priority, expectedClose, 
            companyId, newCompanyName, 
            contactId, newContactFirstName, newContactLastName 
        } = req.body;

        let finalCompanyId = companyId ? parseInt(companyId) : null;
        
        // Creación rápida de empresa si se solicita
        if (newCompanyName && (!finalCompanyId || isNaN(finalCompanyId))) {
            const newComp = await prisma.company.create({
                data: { name: newCompanyName }
            });
            finalCompanyId = newComp.id;
        }

        let finalContactId = contactId ? parseInt(contactId) : null;

        // Creación rápida de contacto si se solicita
        if (newContactFirstName && (!finalContactId || isNaN(finalContactId))) {
            const newCont = await prisma.contact.create({
                data: { 
                    firstName: newContactFirstName, 
                    lastName: newContactLastName || '',
                    companyId: finalCompanyId 
                }
            });
            finalContactId = newCont.id;
        }

        const newOpp = await prisma.opportunity.create({
            data: {
                name, 
                amount: amount ? parseFloat(amount) : 0, 
                stage, 
                probability: probability ? parseInt(probability) : 10, 
                priority: priority || 'Media',
                expectedClose: expectedClose ? new Date(expectedClose) : null,
                businessType,
                companyId: finalCompanyId,
                contactId: finalContactId
            }
        });
        res.json(newOpp);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear oportunidad' });
    }
});

// Actualizar etapa de oportunidad (Drag & Drop)
router.patch('/api/opportunities/:id/stage', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { stage } = req.body;
        const updatedOpp = await prisma.opportunity.update({
            where: { id },
            data: { stage }
        });
        res.json(updatedOpp);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar etapa' });
    }
});

// ==========================================
// WEEKLY REPORTS (Informes)
// ==========================================
router.get('/api/reports', async (req, res) => {
    try {
        const reports = await prisma.weeklyReport.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(reports);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener informes' });
    }
});

router.post('/api/reports', async (req, res) => {
    try {
        const { 
            rentedEquipments, workshopEquipments, monthlyBilled, 
            pipelineValue, pipelineClosedValue,
            analysisRental, analysisWorkshop, analysisBilling, analysisPipeline
        } = req.body;
        
        const newReport = await prisma.weeklyReport.create({
            data: {
                rentedEquipments: parseInt(rentedEquipments || 0),
                workshopEquipments: parseInt(workshopEquipments || 0),
                monthlyBilled: parseFloat(monthlyBilled || 0),
                pipelineValue: parseFloat(pipelineValue || 0),
                pipelineClosedValue: parseFloat(pipelineClosedValue || 0),
                analysisRental,
                analysisWorkshop,
                analysisBilling,
                analysisPipeline
            }
        });
        res.json(newReport);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al guardar informe' });
    }
});

module.exports = router;
