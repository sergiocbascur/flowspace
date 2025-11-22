#!/bin/bash

# Script de despliegue para FlowSpace en VPS
# Uso: ./deploy.sh

set -e

echo "🚀 Iniciando despliegue de FlowSpace..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: No se encontró package.json. Ejecuta este script desde la raíz del proyecto.${NC}"
    exit 1
fi

# Verificar que existe backend
if [ ! -d "backend" ]; then
    echo -e "${RED}❌ Error: No se encontró el directorio backend.${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Instalando dependencias del frontend...${NC}"
npm install

echo -e "${YELLOW}📦 Instalando dependencias del backend...${NC}"
cd backend
npm install
cd ..

echo -e "${YELLOW}🏗️  Construyendo frontend...${NC}"
npm run build

echo -e "${GREEN}✅ Build completado${NC}"

# Verificar si PM2 está instalado
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}📦 Instalando PM2...${NC}"
    npm install -g pm2
fi

# Reiniciar backend con PM2
echo -e "${YELLOW}🔄 Reiniciando backend...${NC}"
cd backend
pm2 restart flowspace-backend || pm2 start server.js --name flowspace-backend
pm2 save
cd ..

echo -e "${GREEN}✅ Despliegue completado${NC}"
echo -e "${GREEN}📊 Estado de PM2:${NC}"
pm2 status

echo -e "${YELLOW}💡 Recuerda:${NC}"
echo "   - Verificar que las variables de entorno estén configuradas"
echo "   - Verificar que Nginx esté configurado correctamente"
echo "   - Verificar que PostgreSQL esté corriendo"

