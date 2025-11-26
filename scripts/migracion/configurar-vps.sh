#!/bin/bash

# Script para configurar VPS nuevo: GitHub y PostgreSQL
# Uso: sudo ./configurar-vps.sh

set -e

echo "🚀 Configurando VPS para Genshiken..."

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Verificar que se ejecuta como root o con sudo
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  Este script requiere privilegios sudo."
    echo "Ejecuta: sudo ./configurar-vps.sh"
    exit 1
fi

echo -e "${GREEN}📦 Actualizando sistema...${NC}"
apt update && apt upgrade -y

echo -e "${GREEN}📦 Instalando dependencias base...${NC}"
apt install -y nodejs npm postgresql postgresql-contrib nginx git ufw certbot python3-certbot-nginx curl

echo -e "${GREEN}🔧 Verificando Node.js...${NC}"
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

echo -e "${GREEN}🗄️  Configurando PostgreSQL...${NC}"
systemctl start postgresql
systemctl enable postgresql

echo -e "${GREEN}✅ Configuración básica completada${NC}"
echo ""
echo -e "${YELLOW}📝 Próximos pasos:${NC}"
echo ""
echo "1. Configurar PostgreSQL (crear base de datos y usuario):"
echo "   sudo -u postgres psql"
echo "   CREATE DATABASE flowspace;"
echo "   CREATE USER flowspace_user WITH PASSWORD 'tu_password_seguro';"
echo "   GRANT ALL PRIVILEGES ON DATABASE flowspace TO flowspace_user;"
echo "   ALTER DATABASE flowspace OWNER TO flowspace_user;"
echo "   \\q"
echo ""
echo "2. Configurar GitHub SSH (si aún no lo tienes):"
echo "   ssh-keygen -t ed25519 -C 'tu_email@ejemplo.com'"
echo "   cat ~/.ssh/id_ed25519.pub"
echo "   # Copia la clave y agrégalo en GitHub: Settings > SSH Keys"
echo ""
echo "3. Clonar repositorio:"
echo "   sudo mkdir -p /var/www"
echo "   cd /var/www"
echo "   sudo git clone git@github.com:sergiocbascur/flowspace.git genshiken"
echo "   sudo chown -R \$USER:\$USER /var/www/genshiken"
echo ""
echo "4. Instalar PM2:"
echo "   sudo npm install -g pm2"
echo ""

