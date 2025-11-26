#!/bin/bash

# ============================================
# CONFIGURACIÓN GENERAL DEL VPS (como root)
# ============================================
# Instala todas las dependencias del sistema necesarias
# para todos los proyectos (PostgreSQL, Node.js, Nginx, etc.)
# 
# Uso: sudo ./01-configuracion-root.sh

set -e

echo "🚀 Configuración General del VPS (root)"
echo "========================================"

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Verificar que se ejecuta como root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Este script debe ejecutarse como root${NC}"
    echo "Uso: sudo ./01-configuracion-root.sh"
    exit 1
fi

echo -e "${GREEN}📦 Actualizando sistema...${NC}"
apt update && apt upgrade -y

echo -e "${GREEN}📦 Instalando dependencias base...${NC}"
apt install -y \
    nodejs \
    npm \
    postgresql \
    postgresql-contrib \
    nginx \
    git \
    ufw \
    certbot \
    python3-certbot-nginx \
    curl \
    build-essential

echo -e "${GREEN}🔧 Verificando Node.js...${NC}"
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${YELLOW}⚠️  Node.js < 18 detectado. Instalando Node.js 20...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

echo -e "${GREEN}⚙️  Instalando PM2 globalmente...${NC}"
npm install -g pm2

echo -e "${GREEN}🔒 Configurando firewall...${NC}"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status

echo -e "${GREEN}🗄️  Configurando PostgreSQL...${NC}"
systemctl start postgresql
systemctl enable postgresql

echo ""
echo -e "${GREEN}✅ Configuración general completada${NC}"
echo ""
echo -e "${YELLOW}📝 Siguiente paso:${NC}"
echo "   Ahora puedes crear usuarios para cada proyecto y ejecutar:"
echo "   ./02-configuracion-proyecto.sh"
echo ""

