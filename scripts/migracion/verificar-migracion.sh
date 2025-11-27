#!/bin/bash

# Script para verificar que la migración fue exitosa
# Uso: ./verificar-migracion.sh

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔍 Verificando migración de FlowSpace..."
echo ""

# Verificar PostgreSQL
echo -e "${YELLOW}🗄️  Verificando PostgreSQL...${NC}"
if systemctl is-active --quiet postgresql; then
    echo -e "${GREEN}✅ PostgreSQL está corriendo${NC}"
else
    echo -e "${RED}❌ PostgreSQL NO está corriendo${NC}"
fi

# Verificar PM2
echo -e "${YELLOW}⚙️  Verificando PM2...${NC}"
if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q "flowspace-backend"; then
        STATUS=$(pm2 jlist | jq -r '.[] | select(.name=="flowspace-backend") | .pm2_env.status')
        if [ "$STATUS" == "online" ]; then
            echo -e "${GREEN}✅ Backend está corriendo${NC}"
        else
            echo -e "${RED}❌ Backend NO está corriendo (status: $STATUS)${NC}"
        fi
    else
        echo -e "${RED}❌ Backend NO está en PM2${NC}"
    fi
else
    echo -e "${RED}❌ PM2 NO está instalado${NC}"
fi

# Verificar Nginx
echo -e "${YELLOW}🌐 Verificando Nginx...${NC}"
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✅ Nginx está corriendo${NC}"
    if sudo nginx -t &> /dev/null; then
        echo -e "${GREEN}✅ Configuración de Nginx es válida${NC}"
    else
        echo -e "${RED}❌ Configuración de Nginx tiene errores${NC}"
    fi
else
    echo -e "${RED}❌ Nginx NO está corriendo${NC}"
fi

# Verificar directorio del proyecto
echo -e "${YELLOW}📁 Verificando proyecto...${NC}"
if [ -d "/var/www/flowspace" ]; then
    echo -e "${GREEN}✅ Directorio /var/www/flowspace existe${NC}"
    if [ -d "/var/www/flowspace/dist" ]; then
        echo -e "${GREEN}✅ Directorio dist/ existe${NC}"
        FILE_COUNT=$(find /var/www/flowspace/dist -type f | wc -l)
        echo "   Archivos en dist/: $FILE_COUNT"
    else
        echo -e "${RED}❌ Directorio dist/ NO existe (necesitas hacer npm run build)${NC}"
    fi
else
    echo -e "${RED}❌ Directorio /var/www/flowspace NO existe${NC}"
fi

# Verificar archivos .env
echo -e "${YELLOW}📝 Verificando configuración...${NC}"
if [ -f "/var/www/flowspace/backend/.env" ]; then
    echo -e "${GREEN}✅ backend/.env existe${NC}"
else
    echo -e "${RED}❌ backend/.env NO existe${NC}"
fi

if [ -f "/var/www/flowspace/.env" ]; then
    echo -e "${GREEN}✅ frontend/.env existe${NC}"
else
    echo -e "${YELLOW}⚠️  frontend/.env NO existe (puede ser opcional)${NC}"
fi

# Verificar conexión a base de datos
echo -e "${YELLOW}🔌 Verificando conexión a base de datos...${NC}"
if [ -f "/var/www/flowspace/backend/.env" ]; then
    source <(grep -E '^DB_' /var/www/flowspace/backend/.env | sed 's/^/export /')
    if PGPASSWORD="${DB_PASSWORD}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &> /dev/null; then
        echo -e "${GREEN}✅ Conexión a base de datos exitosa${NC}"
    else
        echo -e "${RED}❌ No se pudo conectar a la base de datos${NC}"
    fi
fi

# Verificar endpoints
echo -e "${YELLOW}🌐 Verificando endpoints...${NC}"
if curl -s http://localhost:3000/health | grep -q "ok"; then
    echo -e "${GREEN}✅ Backend responde en localhost:3000/health${NC}"
else
    echo -e "${RED}❌ Backend NO responde en localhost:3000/health${NC}"
fi

echo ""
echo -e "${GREEN}✅ Verificación completada${NC}"
echo ""
echo -e "${YELLOW}💡 Próximos pasos:${NC}"
echo "1. Verificar que los DNS estén configurados"
echo "2. Obtener certificados SSL con certbot"
echo "3. Probar acceso desde los dominios configurados"




