#!/bin/bash

echo "🔍 Diagnóstico del Backend FlowSpace"
echo "===================================="
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Verificar si PM2 está instalado
echo -e "${YELLOW}1. Verificando PM2...${NC}"
if command -v pm2 &> /dev/null; then
    echo -e "${GREEN}✅ PM2 está instalado${NC}"
    pm2 --version
else
    echo -e "${RED}❌ PM2 NO está instalado${NC}"
fi
echo ""

# 2. Verificar procesos PM2
echo -e "${YELLOW}2. Procesos PM2 corriendo:${NC}"
pm2 list
echo ""

# 3. Verificar logs del backend
echo -e "${YELLOW}3. Últimas 30 líneas de logs del backend:${NC}"
pm2 logs flowspace-backend --lines 30 --nostream 2>/dev/null || pm2 logs genshiken-backend --lines 30 --nostream 2>/dev/null || echo -e "${RED}No se encontraron logs${NC}"
echo ""

# 4. Verificar si el puerto está en uso
echo -e "${YELLOW}4. Verificando puerto 3000:${NC}"
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${GREEN}✅ Puerto 3000 está en uso${NC}"
    lsof -Pi :3000 -sTCP:LISTEN
else
    echo -e "${RED}❌ Puerto 3000 NO está en uso${NC}"
fi
echo ""

# 5. Verificar archivo .env
echo -e "${YELLOW}5. Verificando archivo .env:${NC}"
if [ -f "backend/.env" ]; then
    echo -e "${GREEN}✅ Archivo .env existe${NC}"
    echo "Variables importantes:"
    grep -E "^(PORT|DB_|JWT_SECRET|CORS_ORIGIN)=" backend/.env | sed 's/=.*/=***/' || echo "No se encontraron variables importantes"
else
    echo -e "${RED}❌ Archivo .env NO existe${NC}"
fi
echo ""

# 6. Verificar dependencias
echo -e "${YELLOW}6. Verificando node_modules:${NC}"
if [ -d "backend/node_modules" ]; then
    echo -e "${GREEN}✅ node_modules existe${NC}"
    echo "Tamaño: $(du -sh backend/node_modules | cut -f1)"
else
    echo -e "${RED}❌ node_modules NO existe${NC}"
fi
echo ""

# 7. Verificar Node.js
echo -e "${YELLOW}7. Verificando Node.js:${NC}"
if command -v node &> /dev/null; then
    echo -e "${GREEN}✅ Node.js está instalado${NC}"
    node --version
    npm --version
else
    echo -e "${RED}❌ Node.js NO está instalado${NC}"
fi
echo ""

# 8. Intentar iniciar manualmente (solo mostrar errores)
echo -e "${YELLOW}8. Intentando validar sintaxis del código:${NC}"
cd backend
if node -c server.js 2>&1; then
    echo -e "${GREEN}✅ Sintaxis del código válida${NC}"
else
    echo -e "${RED}❌ Error de sintaxis en server.js${NC}"
fi
cd ..
echo ""

# 9. Verificar base de datos
echo -e "${YELLOW}9. Verificando conexión a PostgreSQL:${NC}"
if command -v psql &> /dev/null; then
    DB_NAME=$(grep DB_NAME backend/.env 2>/dev/null | cut -d '=' -f2 | tr -d ' ')
    DB_USER=$(grep DB_USER backend/.env 2>/dev/null | cut -d '=' -f2 | tr -d ' ')
    if [ ! -z "$DB_NAME" ] && [ ! -z "$DB_USER" ]; then
        if PGPASSWORD=$(grep DB_PASSWORD backend/.env 2>/dev/null | cut -d '=' -f2 | tr -d ' ') psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Conexión a PostgreSQL exitosa${NC}"
        else
            echo -e "${RED}❌ No se pudo conectar a PostgreSQL${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️ No se pudieron leer credenciales de BD${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ psql no está disponible${NC}"
fi
echo ""

echo "===================================="
echo "📋 Resumen:"
echo "- Revisa los logs arriba para ver errores específicos"
echo "- Si PM2 no está corriendo, ejecuta: cd backend && pm2 start server.js --name flowspace-backend"
echo "- Si hay errores de sintaxis, revisa el código"
echo "- Si la BD no conecta, verifica las credenciales en .env"

