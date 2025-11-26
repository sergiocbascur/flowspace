# Scripts de Migración - Genshiken

Scripts para migrar Genshiken al nuevo VPS. El proceso está dividido en dos partes:

## 📋 Proceso de Migración

### Parte 1: Configuración General (como root)

Configura el VPS con todas las dependencias necesarias para todos los proyectos.

```bash
# Descargar/clonar el repositorio
git clone https://github.com/sergiocbascur/flowspace.git
cd flowspace/scripts/migracion

# Hacer ejecutable
chmod +x *.sh

# Ejecutar como root
sudo ./01-configuracion-root.sh
```

**Esto instala:**
- Node.js 20
- PostgreSQL
- Nginx
- PM2
- Git
- Certbot
- Firewall (UFW)

---

### Parte 2: Configuración del Proyecto (como usuario normal)

Configura el proyecto específico Genshiken.

#### 2.1 Crear usuario para el proyecto (opcional pero recomendado)

```bash
# Como root
sudo adduser genshiken
sudo usermod -aG sudo genshiken

# Cambiar al usuario
sudo su - genshiken
```

#### 2.2 Configurar PostgreSQL para el proyecto

```bash
# Como root
cd /ruta/a/flowspace/scripts/migracion
sudo ./setup-postgres-proyecto.sh genshiken "tu_password_seguro"

# Si no especificas password, se genera uno automático
sudo ./setup-postgres-proyecto.sh genshiken
```

#### 2.3 Configurar el proyecto

```bash
# Como usuario normal (NO root)
cd /ruta/a/flowspace/scripts/migracion
./02-configuracion-proyecto.sh
```

**Esto hace:**
- Clona el repositorio en `/var/www/genshiken`
- Instala dependencias del frontend y backend

#### 2.4 Configurar archivos .env

```bash
# Backend
cd /var/www/genshiken/backend
cp env.example .env
nano .env
```

Configurar con las credenciales que te mostró `setup-postgres-proyecto.sh`:
```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=genshiken
DB_USER=genshiken_user
DB_PASSWORD=tu_password_seguro
JWT_SECRET=genera_uno_con: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
CORS_ORIGIN=https://tu-dominio.com,https://api-tu-dominio.com
```

```bash
# Frontend
cd /var/www/genshiken
nano .env
```

```env
VITE_API_URL=https://api-tu-dominio.com/api
VITE_WS_URL=wss://api-tu-dominio.com
```

#### 2.5 Construir e iniciar

```bash
cd /var/www/genshiken

# Construir frontend
npm run build

# Iniciar backend con PM2
cd backend
pm2 start server.js --name genshiken-backend
pm2 save
```

---

## 🔄 Otros Scripts Útiles

### Backup de Base de Datos

```bash
./backup-db.sh [nombre_archivo]
```

### Verificar Migración

```bash
./verificar-migracion.sh
```

### Setup GitHub SSH (opcional)

```bash
./setup-github.sh tu_email@ejemplo.com
```

---

## 📝 Orden de Ejecución Completo

1. `sudo ./01-configuracion-root.sh` (una sola vez por VPS)
2. `sudo ./setup-postgres-proyecto.sh genshiken` (por cada proyecto)
3. `./02-configuracion-proyecto.sh` (como usuario normal, por cada proyecto)
4. Configurar `.env` manualmente
5. `npm run build` y `pm2 start`

---

## 🔐 Notas de Seguridad

- Cada proyecto puede tener su propio usuario del sistema
- Cada proyecto tiene su propia base de datos PostgreSQL
- Los archivos `.env` nunca se suben a Git
- Usa passwords fuertes para producción

