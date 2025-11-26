#!/bin/bash

# ============================================
# Configurar PostgreSQL para un proyecto específico
# ============================================
# Uso: sudo ./setup-postgres-proyecto.sh [nombre_proyecto] [password]
#
# Ejemplo: sudo ./setup-postgres-proyecto.sh genshiken "mi_password_seguro"

set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Verificar que se ejecuta como root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Este script debe ejecutarse como root${NC}"
    echo "Uso: sudo ./setup-postgres-proyecto.sh [nombre_proyecto] [password]"
    exit 1
fi

# Parámetros
PROJECT_NAME=${1:-"genshiken"}
DB_PASSWORD=${2:-""}

if [ -z "$DB_PASSWORD" ]; then
    # Generar password automático
    DB_PASSWORD="$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)"
    echo -e "${YELLOW}⚠️  No se proporcionó password. Generando uno automático...${NC}"
fi

DB_NAME="$PROJECT_NAME"
DB_USER="${PROJECT_NAME}_user"

echo -e "${GREEN}🗄️  Configurando PostgreSQL para: $PROJECT_NAME${NC}"
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
-- Eliminar si existe (útil para reinstalar)
DROP DATABASE IF EXISTS $DB_NAME;
DROP USER IF EXISTS $DB_USER;

-- Crear base de datos
CREATE DATABASE $DB_NAME;

-- Crear usuario
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';

-- Otorgar privilegios
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER DATABASE $DB_NAME OWNER TO $DB_USER;
EOF

# Conectar y otorgar privilegios en el esquema
sudo -u postgres psql -d "$DB_NAME" <<EOF
GRANT ALL ON SCHEMA public TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;
EOF

echo ""
echo -e "${GREEN}✅ PostgreSQL configurado correctamente${NC}"
echo ""
echo -e "${YELLOW}📋 Credenciales para $PROJECT_NAME:${NC}"
echo "─────────────────────────────────────────"
echo "DB_NAME=$DB_NAME"
echo "DB_USER=$DB_USER"
echo "DB_PASSWORD=$DB_PASSWORD"
echo "─────────────────────────────────────────"
echo ""
echo -e "${YELLOW}💡 Usa estas credenciales en:${NC}"
echo "   /var/www/$PROJECT_NAME/backend/.env"
echo ""

