#!/bin/bash

# Script de migración completa de Genshiken al nuevo VPS
# Uso: ./migrar-genshiken.sh
# 
# IMPORTANTE: Este script asume que ya tienes:
# - PostgreSQL instalado y corriendo
# - Base de datos 'flowspace' y usuario 'flowspace_user' creados
# - DNS configurados y propagados
# - Archivos .env configurados (backend/.env y .env en raíz)

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 Iniciando migración de Genshiken...${NC}"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ] || [ ! -d "backend" ]; then
    echo -e "${RED}❌ Error: Este script debe ejecutarse desde la raíz del proyecto Genshiken${NC}"
    exit 1
fi

# Verificar que existe backend/.env
if [ ! -f "backend/.env" ]; then
    echo -e "${RED}❌ Error: backend/.env no existe. Configúralo primero.${NC}"
    exit 1
fi

# Verificar que existe .env en raíz
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Advertencia: .env en raíz no existe. Se creará uno básico.${NC}"
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
    sudo npm install -g pm2
fi

# Iniciar o reiniciar backend con PM2
echo -e "${YELLOW}🔄 Iniciando/reiniciando backend...${NC}"
cd backend
pm2 restart genshiken-backend || pm2 start server.js --name genshiken-backend
pm2 save
cd ..

echo -e "${GREEN}✅ Backend iniciado con PM2${NC}"

# Verificar que Nginx está configurado
if [ -f "/etc/nginx/sites-available/genshiken" ]; then
    echo -e "${GREEN}✅ Configuración de Nginx encontrada${NC}"
    echo -e "${YELLOW}💡 Verifica que Nginx esté corriendo: sudo systemctl status nginx${NC}"
else
    echo -e "${YELLOW}⚠️  Advertencia: Configuración de Nginx no encontrada en /etc/nginx/sites-available/genshiken${NC}"
    echo "   Configura Nginx manualmente siguiendo MIGRACION_GENSHIKEN.md"
fi

echo ""
echo -e "${GREEN}✅ Migración completada${NC}"
echo ""
echo -e "${YELLOW}📊 Estado de PM2:${NC}"
pm2 status

echo ""
echo -e "${YELLOW}💡 Próximos pasos:${NC}"
echo "1. Verificar que PM2 está corriendo: pm2 status"
echo "2. Verificar logs: pm2 logs genshiken-backend"
echo "3. Verificar Nginx: sudo systemctl status nginx"
echo "4. Obtener certificados SSL: sudo certbot --nginx -d tu-dominio.com"
echo "5. Probar acceso desde el navegador"

