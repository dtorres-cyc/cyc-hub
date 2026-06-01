FROM node:20-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependencias
RUN npm ci --only=production
RUN npm install -D typescript ts-node @types/node

# Generar Prisma Client
RUN npx prisma generate

# Copiar código fuente
COPY src ./src
COPY tsconfig.json ./

# Compilar TypeScript
RUN npx tsc

# Crear directorio de uploads
RUN mkdir -p uploads

EXPOSE 3001

# Ejecutar migraciones y arrancar servidor
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
