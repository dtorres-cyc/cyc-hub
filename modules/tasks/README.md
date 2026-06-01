# CyC Tasks — Módulo de Gestión de Tareas y Proyectos
### Transportes CyC Limitada

Portal web interno para gestión de tareas y proyectos de la empresa de arriendo de maquinaria pesada para minería.

---

## 🚀 Instalación rápida

### Requisitos previos
- Node.js ≥ 18
- PostgreSQL 14+ (o Docker)
- npm ≥ 9

---

### 1. Clonar / descomprimir el proyecto

```bash
cd cyc-tasks
```

### 2. Instalar dependencias de todos los módulos

```bash
npm run install:all
```

### 3. Configurar variables de entorno

```bash
cp .env.example server/.env
```

Edita `server/.env` con tus credenciales de base de datos:

```env
DATABASE_URL="postgresql://cyc_user:cyc_password@localhost:5432/cyc_tasks"
JWT_SECRET="tu-clave-secreta-aqui"
JWT_REFRESH_SECRET="tu-clave-refresh-aqui"
PORT=3001
UPLOAD_DIR="./uploads"
```

### 4. Opción A — PostgreSQL con Docker

```bash
docker-compose up -d postgres
```

### 4. Opción B — PostgreSQL existente

Crea la base de datos manualmente:

```sql
CREATE USER cyc_user WITH PASSWORD 'cyc_password';
CREATE DATABASE cyc_tasks OWNER cyc_user;
```

### 5. Ejecutar migraciones de Prisma

```bash
cd server
npm run prisma:migrate
npm run prisma:generate
cd ..
```

### 6. Cargar datos semilla (recomendado)

```bash
npm run seed
```

Esto crea:
- 6 usuarios (Diego Torres, Carlos Muñoz, Patricia Lagos, etc.)
- 6 proyectos (Flota Calama, Comercial, Mantención, etc.)
- 6 áreas (Operaciones, Seguridad, Finanzas, etc.)
- 12 tareas de ejemplo del rubro minero

### 7. Iniciar el proyecto

```bash
npm run dev
```

Esto levanta concurrentemente:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

---

## 📁 Estructura del proyecto

```
cyc-tasks/
├── client/               # React + Vite + TypeScript
│   └── src/
│       ├── components/
│       │   ├── TaskModal/    # Modal completo de tarea
│       │   ├── views/        # Kanban, Tabla, Calendario, Gantt
│       │   ├── Toolbar.tsx
│       │   └── StatsBar.tsx
│       ├── store/            # Zustand
│       ├── api/              # Axios calls
│       └── types/
├── server/               # Express + TypeScript
│   └── src/
│       ├── routes/
│       ├── middleware/
│       └── prisma/
│           └── schema.prisma
├── docker-compose.yml
└── .env.example
```

---

## 🎨 Vistas disponibles

| Vista | Descripción |
|-------|-------------|
| **Kanban** | 5 columnas con drag & drop. Cambia estado arrastrando tarjetas |
| **Tabla** | Lista ordenable con todas las columnas. Click en fila = detalle |
| **Calendario** | Grid mensual con chips de tareas por fecha de término |
| **Gantt** | Línea de tiempo con barras proporcionales a la duración |

---

## 🔌 API Endpoints

```
GET    /api/tasks              # Lista con filtros
GET    /api/tasks/:id          # Detalle
POST   /api/tasks              # Crear
PUT    /api/tasks/:id          # Actualizar
PATCH  /api/tasks/:id/status   # Cambiar estado
PATCH  /api/tasks/:id/progress # Actualizar progreso
DELETE /api/tasks/:id          # Eliminar

POST   /api/tasks/:id/subtasks
PATCH  /api/subtasks/:id
DELETE /api/subtasks/:id

POST   /api/tasks/:id/attachments  (multipart/form-data)
DELETE /api/attachments/:id

POST   /api/tasks/:id/comments
DELETE /api/comments/:id

GET    /api/projects
GET    /api/areas
GET    /api/users
```

---

## 👤 Usuarios semilla

| Nombre | Email | Contraseña | Rol |
|--------|-------|-----------|-----|
| Diego Torres | dtorres@tcyc.cl | cyc2024 | ADMIN |
| Carlos Muñoz | cmunoz@tcyc.cl | cyc2024 | MANAGER |
| Patricia Lagos | plagos@tcyc.cl | cyc2024 | MANAGER |
| Rodrigo Vega | rvega@tcyc.cl | cyc2024 | OPERADOR |
| Valentina Ríos | vrios@tcyc.cl | cyc2024 | OPERADOR |
| Juan Pérez | jperez@tcyc.cl | cyc2024 | OPERADOR |

---

## 🛠 Scripts disponibles

```bash
npm run dev           # Inicia cliente + servidor concurrentemente
npm run dev:client    # Solo frontend (Vite)
npm run dev:server    # Solo backend (ts-node-dev)
npm run seed          # Carga datos de ejemplo
npm run build         # Build de producción

# Dentro de server/:
npm run prisma:migrate   # Aplicar migraciones
npm run prisma:generate  # Generar cliente Prisma
npm run prisma:studio    # Abrir Prisma Studio (GUI)
```

---

## 📦 Stack técnico

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **State**: Zustand
- **DnD**: @dnd-kit/core
- **Backend**: Node.js + Express + TypeScript
- **ORM**: Prisma + PostgreSQL
- **Auth**: JWT (preparado, sin pantalla de login en esta versión)
- **Uploads**: Multer (local) — max 20MB, tipos: PDF/XLSX/DOCX/JPG/PNG/CSV
