# 🚀 Guía de Migración a Nuevo VPS

Esta guía te ayudará a migrar FlowSpace desde tu VPS actual al nuevo VPS con separación de dominios (Trabajo/Personal).

## 📋 Información Necesaria

Antes de comenzar, necesitamos la siguiente información:

### 1. Datos del Nuevo VPS
- [ ] **IP del nuevo VPS**: `_________________`
- [ ] **Usuario SSH**: `_________________` (ej: `deploy`, `ubuntu`, `root`)
- [ ] **Sistema Operativo**: Ubuntu 24.04 LTS (recomendado) o 22.04 LTS
- [ ] **Método de acceso SSH**: Clave privada o contraseña

### 2. Dominios
- [ ] **Dominio para TRABAJO** (frontend): `_________________` (ej: `flowspace.empresa.com`)
- [ ] **Dominio para API** (backend): `_________________` (ej: `api.empresa.com`)
- [ ] **Dominio para PERSONAL** (frontend): `_________________` (ej: `vida.tudominio.com`)
- [ ] **¿Comparten el mismo backend?**: Sí / No (recomendado: Sí)

### 3. Base de Datos
- [ ] **¿Migrar datos del VPS actual?**: Sí / No
- [ ] **Si SÍ**: ¿Tienes acceso SSH al VPS actual para hacer backup?
- [ ] **Si NO**: ¿Empezar desde cero?

### 4. Credenciales (a generar/definir)
- [ ] **Password PostgreSQL**: `_________________` (generar uno seguro)
- [ ] **JWT_SECRET**: `_________________` (generar con: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`)

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

### 1.2 Configurar Firewall

```bash
# Permitir SSH, HTTP y HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

### 1.3 Crear Usuario Dedicado (Opcional pero Recomendado)

```bash
# Crear usuario flowspace
sudo adduser flowspace
sudo usermod -aG sudo flowspace

# Cambiar al usuario
sudo su - flowspace
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
pg_dump -h localhost -U flowspace_user -d flowspace > backup_flowspace_$(date +%Y%m%d_%H%M%S).sql

# Transferir al nuevo VPS (desde tu máquina local)
scp backup_flowspace_*.sql usuario@nueva-ip-vps:/home/usuario/
```

**En el NUEVO VPS:**

```bash
# Restaurar backup
sudo -u postgres psql -d flowspace -f /home/usuario/backup_flowspace_*.sql
```

---

## 📦 Paso 3: Clonar y Configurar Proyecto

### 3.1 Clonar Repositorio

```bash
# Crear directorio
sudo mkdir -p /var/www
cd /var/www

# Clonar repositorio
sudo git clone https://github.com/sergiocbascur/flowspace.git
sudo chown -R $USER:$USER /var/www/flowspace
cd flowspace
```

### 3.2 Configurar Backend (.env)

```bash
cd backend
cp env.example .env
nano .env
```

**Configurar `.env` con:**

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flowspace
DB_USER=flowspace_user
DB_PASSWORD=TU_PASSWORD_SEGURO_AQUI
JWT_SECRET=TU_JWT_SECRET_GENERADO
CORS_ORIGIN=https://flowspace.empresa.com,https://vida.tudominio.com,https://api.empresa.com
```

**Generar JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3.3 Instalar Dependencias Backend

```bash
cd /var/www/flowspace/backend
npm install
```

### 3.4 Configurar Frontend (.env)

```bash
cd /var/www/flowspace
nano .env
```

**Configurar `.env` con:**

```env
VITE_API_URL=https://api.empresa.com/api
VITE_WS_URL=wss://api.empresa.com
```

### 3.5 Instalar Dependencias y Build Frontend

```bash
cd /var/www/flowspace
npm install
npm run build
```

---

## ⚙️ Paso 4: Configurar PM2

```bash
# Instalar PM2 globalmente
sudo npm install -g pm2

# Iniciar backend
cd /var/www/flowspace/backend
pm2 start server.js --name flowspace-backend
pm2 save
pm2 startup
# Seguir las instrucciones que aparezcan
```

---

## 🌐 Paso 5: Configurar Nginx

### 5.1 Crear Configuración

```bash
sudo nano /etc/nginx/sites-available/flowspace
```

**Contenido (reemplazar con tus dominios):**

```nginx
# Backend API - api.empresa.com
server {
    listen 80;
    server_name api.empresa.com;

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

# Frontend TRABAJO - flowspace.empresa.com
server {
    listen 80;
    server_name flowspace.empresa.com;

    root /var/www/flowspace/dist;
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

# Frontend PERSONAL - vida.tudominio.com
server {
    listen 80;
    server_name vida.tudominio.com;

    root /var/www/flowspace/dist;
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

### 5.2 Habilitar y Verificar

```bash
sudo ln -s /etc/nginx/sites-available/flowspace /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # Si existe
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔐 Paso 6: Configurar DNS

En tu panel de DNS (Cloudflare, Namecheap, etc.), crea estos registros A:

```
flowspace.empresa.com    A    IP_NUEVO_VPS
api.empresa.com          A    IP_NUEVO_VPS
vida.tudominio.com       A    IP_NUEVO_VPS
```

**Espera 5-15 minutos** para que los DNS se propaguen antes de continuar.

---

## 🔒 Paso 7: Configurar SSL con Let's Encrypt

```bash
# Obtener certificados SSL para todos los dominios
sudo certbot --nginx -d flowspace.empresa.com -d api.empresa.com -d vida.tudominio.com

# Certbot configurará automáticamente HTTPS y redirección
```

---

## ✅ Paso 8: Verificar Despliegue

1. **Frontend Trabajo**: Visita `https://flowspace.empresa.com` → Deberías ver la app
2. **Frontend Personal**: Visita `https://vida.tudominio.com` → Deberías ver la app
3. **API**: Visita `https://api.empresa.com/health` → Deberías ver `{"status":"ok"}`

---

## 🔄 Paso 9: Actualizar Variables de Entorno del Frontend (Post-SSL)

Después de obtener SSL, actualiza `.env` del frontend si es necesario:

```bash
cd /var/www/flowspace
nano .env
```

```env
VITE_API_URL=https://api.empresa.com/api
VITE_WS_URL=wss://api.empresa.com
```

**Reconstruir:**
```bash
npm run build
```

---

## 🎯 Paso 10: (Futuro) Separar Contextos por Dominio

**Nota**: Por ahora ambos dominios apuntan al mismo build. En el futuro podemos:

1. Crear builds separados con `VITE_DEFAULT_CONTEXT=work` y `VITE_DEFAULT_CONTEXT=personal`
2. Configurar Nginx para servir cada build según el dominio

Esto se implementará en una siguiente fase.

---

## 📝 Scripts de Actualización

### Actualización Manual

```bash
cd /var/www/flowspace
git pull
npm install
cd backend && npm install && cd ..
npm run build
cd backend
pm2 restart flowspace-backend
```

### Usar Script de Deploy

```bash
cd /var/www/flowspace
chmod +x scripts/deploy/deploy.sh
./scripts/deploy/deploy.sh
```

---

## 🐛 Troubleshooting

### Backend no inicia
```bash
cd /var/www/flowspace/backend
pm2 logs flowspace-backend
# Verificar .env está configurado correctamente
```

### Frontend no carga
```bash
# Verificar que dist/ existe
ls -la /var/www/flowspace/dist

# Verificar permisos
sudo chown -R www-data:www-data /var/www/flowspace/dist
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

## 📌 Checklist Final

- [ ] VPS nuevo configurado con Ubuntu 24.04 LTS
- [ ] PostgreSQL instalado y base de datos creada
- [ ] Datos migrados (si aplica)
- [ ] Proyecto clonado en `/var/www/flowspace`
- [ ] Backend `.env` configurado
- [ ] Frontend `.env` configurado
- [ ] Frontend construido (`npm run build`)
- [ ] PM2 corriendo backend
- [ ] Nginx configurado con 3 dominios
- [ ] DNS configurado y propagado
- [ ] SSL configurado con Let's Encrypt
- [ ] Todos los dominios accesibles vía HTTPS
- [ ] Login funciona en ambos dominios
- [ ] API responde correctamente

---

## 🔐 Seguridad

- [ ] Firewall (UFW) configurado
- [ ] Contraseñas seguras generadas
- [ ] `.env` no subido a GitHub
- [ ] Backups de PostgreSQL configurados
- [ ] Monitoreo con `pm2 monit`

---

**¿Listo para comenzar?** Completa la sección "Información Necesaria" al inicio de este documento y procede paso a paso.

