# Imagen base ligera
FROM node:20-alpine

# Directorio de trabajo
WORKDIR /usr/src/app

# Copiar dependencias primero (mejor cacheo)
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar el resto del código fuente
COPY . .

# Generar cliente Prisma (importante para que Prisma funcione dentro del contenedor)
RUN npx prisma generate

# Exponer puerto del servidor (Next.js o Express)
EXPOSE 3000

# Comando de inicio
CMD ["npm", "run", "dev"]
