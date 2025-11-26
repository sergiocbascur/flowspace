# 🚀 Migración de Genshiken (FlowSpace) al Nuevo VPS

Guía paso a paso para migrar **solo Genshiken** al nuevo VPS.

## 📋 Información Necesaria

Antes de comenzar, completa esta información:

- [ ] **IP del nuevo VPS**: `_________________`
- [ ] **Usuario SSH**: `_________________` (ej: `deploy`, `ubuntu`)
- [ ] **Dominio/Subdominio para Genshiken**: `_________________` (ej: `flowspace.tudominio.com`)
- [ ] **Subdominio para API**: `_________________` (ej: `api-flowspace.tudominio.com` o `flowspace-api.tudominio.com`)
- [ ] **¿Migrar base de datos del VPS actual?**: Sí / No
- [ ] **Password PostgreSQL** (nuevo o existente): `_________________`
- [ ] **JWT_SECRET** (generar uno nuevo): `_________________`

---

## 🔧 Paso 1: Preparar el Nuevo VPS

### 1.1 Conectar y Actualizar

```bash
# Conectar al nuevo VPS
ssh usuario@nueva-ip-vps

# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependencias base
sudo apt install -y nodejs npm postgresql postgresql-contrib nginx git ufw certbot python3-certbot-nginx
```

### 1.2 Verificar/Actualizar Node.js

```bash
# Verificar versión de Node.js
node -v

# Si es menor a 18, instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
sudo apt install -y nodejs
```

### 1.3 Configurar Firewall

```bash
# Permitir SSH, HTTP y HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

---

## 🗄️ Paso 2: Configurar PostgreSQL

### 2.1 Crear Base de Datos y Usuario

```bash
# Acceder a PostgreSQL
sudo -u postgres psql

# Crear base de datos y usuario
CREATE DATABASE flowspace;
CREATE USER flowspace_user WITH PASSWORD 'TU_PASSWORD_SEGURO_AQUI';
GRANT ALL PRIVILEGES ON DATABASE flowspace TO flowspace_user;
ALTER DATABASE flowspace OWNER TO flowspace_user;
\q
```

### 2.2 (Opcional) Migrar Datos del VPS Actual

**En el VPS ACTUAL:**

```bash
# Hacer backup completo
pg_dump -h localhost -U flowspace_user -d flowspace > backup_genshiken_$(date +%Y%m%d_%H%M%S).sql

# Transferir al nuevo VPS (desde tu máquina local)
scp backup_genshiken_*.sql usuario@nueva-ip-vps:/home/usuario/
```

**En el NUEVO VPS:**

```bash
# Restaurar backup
sudo -u postgres psql -d flowspace -f /home/usuario/backup_genshiken_*.sql
```

---

## 📦 Paso 3: Clonar Repositorio

```bash
# Crear directorio
sudo mkdir -p /var/www
cd /var/www

# Clonar repositorio de Genshiken
sudo git clone https://github.com/sergiocbascur/flowspace.git genshiken
sudo chown -R $USER:$USER /var/www/genshiken
cd genshiken
```

---

## ⚙️ Paso 4: Configurar Backend

### 4.1 Crear archivo .env

```bash
cd backend
cp env.example .env
nano .env
```

### 4.2 Configurar variables de entorno

**Reemplaza con tus valores reales:**

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flowspace
DB_USER=flowspace_user
DB_PASSWORD=TU_PASSWORD_SEGURO_AQUI
JWT_SECRET=TU_JWT_SECRET_GENERADO
CORS_ORIGIN=https://flowspace.tudominio.com,https://api-flowspace.tudominio.com
```

**Generar JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4.3 Instalar Dependencias Backend

```bash
cd /var/www/genshiken/backend
npm install
```

---

## 🎨 Paso 5: Configurar Frontend

### 5.1 Crear archivo .env

```bash
cd /var/www/genshiken
nano .env
```

### 5.2 Configurar variables de entorno

**Reemplaza con tus dominios reales:**

```env
VITE_API_URL=https://api-flowspace.tudominio.com/api
VITE_WS_URL=wss://api-flowspace.tudominio.com
```

### 5.3 Instalar Dependencias y Build

```bash
cd /var/www/genshiken
npm install
npm run build
```

---

## ⚙️ Paso 6: Configurar PM2

```bash
# Instalar PM2 globalmente
sudo npm install -g pm2

# Iniciar backend
cd /var/www/genshiken/backend
pm2 start server.js --name genshiken-backend
pm2 save
pm2 startup
# Seguir las instrucciones que aparezcan para habilitar PM2 en el arranque
```

**Verificar que el backend está corriendo:**
```bash
pm2 status
pm2 logs genshiken-backend
```

---

## 🌐 Paso 7: Configurar Nginx

### 7.1 Crear Configuración

```bash
sudo nano /etc/nginx/sites-available/genshiken
```

### 7.2 Contenido (reemplazar con tus dominios):

```nginx
# Backend API - api-flowspace.tudominio.com
server {
    listen 80;
    server_name api-flowspace.tudominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout para WebSocket
        proxy_read_timeout 86400;
    }
}

# Frontend - flowspace.tudominio.com
server {
    listen 80;
    server_name flowspace.tudominio.com;

    root /var/www/genshiken/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
}
```

### 7.3 Habilitar y Verificar

```bash
sudo ln -s /etc/nginx/sites-available/genshiken /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # Si existe
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔐 Paso 8: Configurar DNS

En tu panel de DNS (Cloudflare, Namecheap, etc.), crea estos registros A:

```
flowspace.tudominio.com        A    IP_NUEVO_VPS
api-flowspace.tudominio.com     A    IP_NUEVO_VPS
```

**Espera 5-15 minutos** para que los DNS se propaguen antes de continuar.

**Verificar propagación:**
```bash
nslookup flowspace.tudominio.com
nslookup api-flowspace.tudominio.com
```

---

## 🔒 Paso 9: Configurar SSL con Let's Encrypt

```bash
# Obtener certificados SSL para ambos dominios
sudo certbot --nginx -d flowspace.tudominio.com -d api-flowspace.tudominio.com

# Certbot configurará automáticamente HTTPS y redirección
```

---

## ✅ Paso 10: Verificar Despliegue

1. **Frontend**: Visita `https://flowspace.tudominio.com` → Deberías ver la app
2. **API**: Visita `https://api-flowspace.tudominio.com/health` → Deberías ver `{"status":"ok"}`
3. **Login**: Prueba hacer login en la aplicación
4. **Funcionalidades**: Verifica que QR Scanner, notas, recursos, etc. funcionen

---

## 🔄 Actualizaciones Futuras

### Opción 1: Manual

```bash
cd /var/www/genshiken
git pull
npm install
cd backend && npm install && cd ..
npm run build
cd backend
pm2 restart genshiken-backend
```

### Opción 2: Usar Script de Deploy

```bash
cd /var/www/genshiken
chmod +x scripts/deploy/deploy.sh
./scripts/deploy/deploy.sh
```

---

## 🐛 Troubleshooting

### Backend no inicia
```bash
cd /var/www/genshiken/backend
pm2 logs genshiken-backend
# Verificar .env está configurado correctamente
cat .env
```

### Frontend no carga
```bash
# Verificar que dist/ existe
ls -la /var/www/genshiken/dist

# Verificar permisos
sudo chown -R www-data:www-data /var/www/genshiken/dist
```

### Nginx error
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

### Base de datos no conecta
```bash
sudo systemctl status postgresql
psql -U flowspace_user -d flowspace -h localhost
```

---

## 📝 Checklist Final

- [ ] VPS nuevo configurado con Ubuntu 24.04 LTS
- [ ] PostgreSQL instalado y base de datos creada
- [ ] Datos migrados (si aplica)
- [ ] Repositorio clonado en `/var/www/genshiken`
- [ ] Backend `.env` configurado
- [ ] Frontend `.env` configurado
- [ ] Frontend construido (`npm run build`)
- [ ] PM2 corriendo backend (`genshiken-backend`)
- [ ] Nginx configurado con 2 dominios
- [ ] DNS configurado y propagado
- [ ] SSL configurado con Let's Encrypt
- [ ] Ambos dominios accesibles vía HTTPS
- [ ] Login funciona
- [ ] API responde correctamente

---

## 📌 Notas Importantes

- **Seguridad**: Nunca subas `.env` a GitHub
- **Backups**: Configura backups regulares de PostgreSQL
- **Monitoreo**: Usa `pm2 monit` para monitorear el backend
- **Logs**: Revisa logs regularmente con `pm2 logs genshiken-backend`

---

**¿Listo?** Completa la sección "Información Necesaria" al inicio y procede paso a paso.

