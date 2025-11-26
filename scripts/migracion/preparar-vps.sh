#!/bin/bash

# Script de preparación inicial del VPS para FlowSpace
# Uso: ./preparar-vps.sh

set -e

echo "🚀 Preparando VPS para FlowSpace..."

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Verificar que se ejecuta como root o con sudo
if [ "$EUID" -ne 0 ]; then 
    echo -e "${YELLOW}⚠️  Este script requiere privilegios sudo.${NC}"
    echo "Ejecuta: sudo ./preparar-vps.sh"
    exit 1
fi

echo -e "${GREEN}📦 Actualizando sistema...${NC}"
apt update && apt upgrade -y

echo -e "${GREEN}📦 Instalando dependencias base...${NC}"
apt install -y nodejs npm postgresql postgresql-contrib nginx git ufw certbot python3-certbot-nginx

echo -e "${GREEN}🔧 Configurando Node.js...${NC}"
# Verificar versión de Node.js
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${YELLOW}⚠️  Node.js < 18 detectado. Instalando Node.js 20...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

echo -e "${GREEN}🔒 Configurando firewall...${NC}"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status

echo -e "${GREEN}🗄️  Configurando PostgreSQL...${NC}"
systemctl start postgresql
systemctl enable postgresql

echo -e "${GREEN}✅ Preparación básica completada${NC}"
echo ""
echo -e "${YELLOW}📝 Próximos pasos:${NC}"
echo "1. Crear base de datos y usuario PostgreSQL"
echo "2. Clonar repositorio en /var/www/flowspace"
echo "3. Configurar archivos .env (backend y frontend)"
echo "4. Instalar dependencias y construir frontend"
echo "5. Configurar PM2"
echo "6. Configurar Nginx"
echo "7. Configurar DNS"
echo "8. Obtener certificados SSL"
echo ""
echo -e "${GREEN}Ver MIGRACION_VPS.md para instrucciones detalladas.${NC}"

