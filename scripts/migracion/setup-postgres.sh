#!/bin/bash

# Script para configurar PostgreSQL para Genshiken
# Uso: sudo ./setup-postgres.sh [password] [db_name] [db_user]

set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Parámetros
DB_PASSWORD=${1:-"flowspace_password_$(date +%s)"}
DB_NAME=${2:-"flowspace"}
DB_USER=${3:-"flowspace_user"}

echo -e "${GREEN}🗄️  Configurando PostgreSQL para Genshiken...${NC}"
echo ""
echo "Base de datos: $DB_NAME"
echo "Usuario: $DB_USER"
echo "Password: $DB_PASSWORD"
echo ""

# Verificar que PostgreSQL está corriendo
if ! systemctl is-active --quiet postgresql; then
    echo -e "${YELLOW}⚠️  PostgreSQL no está corriendo. Iniciando...${NC}"
    systemctl start postgresql
    systemctl enable postgresql
fi

# Crear base de datos y usuario
echo -e "${GREEN}📝 Creando base de datos y usuario...${NC}"
sudo -u postgres psql <<EOF
-- Crear base de datos
CREATE DATABASE $DB_NAME;

-- Crear usuario
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';

-- Otorgar privilegios
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER DATABASE $DB_NAME OWNER TO $DB_USER;

-- Conectar a la base de datos y otorgar privilegios en el esquema público
\c $DB_NAME
GRANT ALL ON SCHEMA public TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;
EOF

echo ""
echo -e "${GREEN}✅ PostgreSQL configurado correctamente${NC}"
echo ""
echo -e "${YELLOW}📋 Credenciales guardadas:${NC}"
echo "DB_NAME=$DB_NAME"
echo "DB_USER=$DB_USER"
echo "DB_PASSWORD=$DB_PASSWORD"
echo ""
echo -e "${YELLOW}💡 Usa estas credenciales en backend/.env${NC}"




