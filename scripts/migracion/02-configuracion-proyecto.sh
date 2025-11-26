#!/bin/bash

# ============================================
# CONFIGURACIÓN DEL PROYECTO GENSHIKEN
# ============================================
# Ejecutar como usuario normal (NO root)
# Configura el proyecto específico: clona repo, configura .env, etc.
#
# Uso: ./02-configuracion-proyecto.sh

set -e

echo "🚀 Configuración del Proyecto Genshiken"
echo "========================================"

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Verificar que NO se ejecuta como root
if [ "$EUID" -eq 0 ]; then 
    echo -e "${RED}❌ Este script NO debe ejecutarse como root${NC}"
    echo "Crea un usuario para el proyecto y ejecuta como ese usuario"
    exit 1
fi

PROJECT_NAME="genshiken"
PROJECT_DIR="/var/www/$PROJECT_NAME"
REPO_URL="https://github.com/sergiocbascur/flowspace.git"

# Crear directorio si no existe
echo -e "${GREEN}📁 Preparando directorio del proyecto...${NC}"
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www

# Clonar repositorio
if [ -d "$PROJECT_DIR" ]; then
    echo -e "${YELLOW}⚠️  El directorio $PROJECT_DIR ya existe${NC}"
    read -p "¿Deseas actualizarlo? (s/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        cd "$PROJECT_DIR"
        git pull
    else
        echo "Saliendo..."
        exit 1
    fi
else
    echo -e "${GREEN}📦 Clonando repositorio...${NC}"
    cd /var/www
    git clone "$REPO_URL" "$PROJECT_NAME"
    cd "$PROJECT_NAME"
fi

echo -e "${GREEN}📦 Instalando dependencias del frontend...${NC}"
npm install

echo -e "${GREEN}📦 Instalando dependencias del backend...${NC}"
cd backend
npm install
cd ..

echo ""
echo -e "${GREEN}✅ Instalación de dependencias completada${NC}"
echo ""
echo -e "${YELLOW}📝 Próximos pasos manuales:${NC}"
echo ""
echo "1. Configurar backend/.env:"
echo "   cd $PROJECT_DIR/backend"
echo "   cp env.example .env"
echo "   nano .env"
echo ""
echo "2. Configurar .env en raíz (para frontend):"
echo "   cd $PROJECT_DIR"
echo "   nano .env"
echo ""
echo "3. Construir frontend:"
echo "   cd $PROJECT_DIR"
echo "   npm run build"
echo ""
echo "4. Iniciar backend con PM2:"
echo "   cd $PROJECT_DIR/backend"
echo "   pm2 start server.js --name $PROJECT_NAME-backend"
echo "   pm2 save"
echo ""

