// modules/flota/crm-contacts.js
// Trae contactos desde la BD del CRM (Prisma) con el formato que usa el módulo de flota
// { id, nombre, empresa, correo, telefono }

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fetchContactosCRM() {
    const contacts = await prisma.contact.findMany({
        where: { email: { not: null } },
        include: { company: true },
        orderBy: { firstName: 'asc' }
    });

    return contacts
        .filter(c => c.email && c.email.includes('@'))
        .map(c => ({
            id:       `crm-${c.id}`,
            nombre:   `${c.firstName} ${c.lastName || ''}`.trim(),
            empresa:  c.company?.name || '',
            correo:   c.email,
            telefono: c.phone || ''
        }));
}

module.exports = { fetchContactosCRM };
