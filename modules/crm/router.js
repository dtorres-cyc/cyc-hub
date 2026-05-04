const express = require('express');
const router = express.Router();
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Servir la interfaz del CRM (asumiendo que estará en public/crm/index.html o similar)
// Puedes ajustar esto según donde pongamos la vista.
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/crm/index.html'));
});

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
        const { name, rut, industry, segment, owner } = req.body;
        const newCompany = await prisma.company.create({
            data: { name, rut, industry, segment, owner }
        });
        res.json(newCompany);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear empresa' });
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
        const { name, amount, stage, probability, businessType, companyId, contactId } = req.body;
        const newOpp = await prisma.opportunity.create({
            data: {
                name, 
                amount: amount ? parseFloat(amount) : 0, 
                stage, 
                probability: probability ? parseInt(probability) : 10, 
                businessType,
                companyId: companyId ? parseInt(companyId) : null,
                contactId: contactId ? parseInt(contactId) : null
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

module.exports = router;
