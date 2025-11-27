#!/bin/bash

# Script para configurar GitHub SSH
# Uso: ./setup-github.sh [email]

set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

EMAIL=${1:-""}

if [ -z "$EMAIL" ]; then
    echo "⚠️  Necesitas proporcionar tu email de GitHub"
    echo "Uso: ./setup-github.sh tu_email@ejemplo.com"
    exit 1
fi

echo -e "${GREEN}🔑 Configurando SSH para GitHub...${NC}"

# Verificar si ya existe una clave SSH
if [ -f ~/.ssh/id_ed25519 ]; then
    echo -e "${YELLOW}⚠️  Ya existe una clave SSH. ¿Quieres generar una nueva? (s/n)${NC}"
    read -r response
    if [[ "$response" =~ ^([sS][iI][mM]|[sS])$ ]]; then
        ssh-keygen -t ed25519 -C "$EMAIL" -f ~/.ssh/id_ed25519 -N ""
    else
        echo "Usando clave existente..."
    fi
else
    ssh-keygen -t ed25519 -C "$EMAIL" -f ~/.ssh/id_ed25519 -N ""
fi

echo ""
echo -e "${GREEN}✅ Clave SSH generada${NC}"
echo ""
echo -e "${YELLOW}📋 Copia esta clave pública y agrégalo en GitHub:${NC}"
echo "   https://github.com/settings/keys"
echo ""
echo "---"
cat ~/.ssh/id_ed25519.pub
echo "---"
echo ""
echo -e "${YELLOW}💡 Después de agregar la clave, prueba la conexión:${NC}"
echo "   ssh -T git@github.com"




