#!/bin/bash

# Script para hacer backup de la base de datos PostgreSQL
# Uso: ./backup-db.sh [nombre_archivo_backup]

set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Nombre del archivo de backup
if [ -z "$1" ]; then
    BACKUP_FILE="backup_flowspace_$(date +%Y%m%d_%H%M%S).sql"
else
    BACKUP_FILE="$1"
fi

echo -e "${GREEN}📦 Creando backup de la base de datos...${NC}"

# Leer variables de entorno si existen
if [ -f "backend/.env" ]; then
    source <(grep -E '^DB_' backend/.env | sed 's/^/export /')
fi

# Valores por defecto
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-flowspace}
DB_USER=${DB_USER:-flowspace_user}

echo "Base de datos: $DB_NAME"
echo "Usuario: $DB_USER"
echo "Host: $DB_HOST:$DB_PORT"
echo "Archivo: $BACKUP_FILE"
echo ""

# Hacer backup
PGPASSWORD="${DB_PASSWORD}" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backup creado exitosamente: $BACKUP_FILE${NC}"
    echo -e "${YELLOW}📊 Tamaño del archivo:$(du -h "$BACKUP_FILE" | cut -f1)${NC}"
    echo ""
    echo "Para transferir al nuevo VPS:"
    echo "  scp $BACKUP_FILE usuario@nueva-ip-vps:/home/usuario/"
else
    echo -e "${RED}❌ Error al crear backup${NC}"
    exit 1
fi

