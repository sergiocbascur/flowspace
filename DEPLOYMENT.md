# Guía de Despliegue - FlowSpace

Esta guía te ayudará a desplegar FlowSpace en tu VPS con un subdominio.

## 📋 Requisitos Previos

- VPS con Ubuntu 20.04+ (o similar)
- Acceso SSH al VPS
- Dominio con acceso a DNS para crear subdominios
- PostgreSQL instalado o acceso para instalarlo

## 🚀 Pasos de Despliegue

### 1. Preparar el VPS

```bash
# Conectar al VPS
ssh usuario@tu-vps-ip

# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependencias
sudo apt install -y nodejs npm postgresql postgresql-contrib nginx git
```

### 2. Configurar PostgreSQL

```bash
# Acceder a PostgreSQL
sudo -u postgres psql

# Crear base de datos y usuario
CREATE DATABASE flowspace;
CREATE USER flowspace_user WITH PASSWORD 'tu_password_muy_seguro';
GRANT ALL PRIVILEGES ON DATABASE flowspace TO flowspace_user;
\q
```

### 3. Clonar Repositorio

```bash
# Crear directorio para la aplicación
sudo mkdir -p /var/www
cd /var/www

# Clonar repositorio (reemplaza con tu URL de GitHub)
sudo git clone https://github.com/tu-usuario/flowspace.git
sudo chown -R $USER:$USER /var/www/flowspace
cd flowspace
```

### 4. Configurar Backend

```bash
cd backend

# Instalar dependencias
npm install

# Crear archivo .env
cp env.example .env
nano .env
```

Configura `.env` con:
```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flowspace
DB_USER=flowspace_user
DB_PASSWORD=tu_password_muy_seguro
JWT_SECRET=genera_un_secret_muy_seguro_aqui
CORS_ORIGIN=https://tu-subdominio.com,https://api.tu-subdominio.com
```

**Generar JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 5. Configurar Frontend

```bash
cd /var/www/flowspace

# Crear archivo .env
nano .env
```

Configura `.env` con:
```env
VITE_API_URL=https://api.tu-subdominio.com/api
VITE_WS_URL=wss://api.tu-subdominio.com
```

### 6. Construir Frontend

```bash
npm install
npm run build
```

### 7. Configurar PM2 para Backend

```bash
# Instalar PM2 globalmente
sudo npm install -g pm2

# Iniciar backend
cd backend
pm2 start server.js --name flowspace-backend
pm2 save
pm2 startup
```

### 8. Configurar Nginx

Crear archivo de configuración:
```bash
sudo nano /etc/nginx/sites-available/flowspace
```

Contenido:
```nginx
# Backend API - api.tu-subdominio.com
server {
    listen 80;
    server_name api.tu-subdominio.com;

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

# Frontend - tu-subdominio.com
server {
    listen 80;
    server_name tu-subdominio.com;

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

Habilitar sitio:
```bash
sudo ln -s /etc/nginx/sites-available/flowspace /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 9. Configurar DNS

En tu panel de DNS, crea dos registros A:

```
tu-subdominio.com        A    tu-vps-ip
api.tu-subdominio.com    A    tu-vps-ip
```

O si usas Cloudflare o similar, crea los subdominios apuntando a tu IP del VPS.

### 10. Configurar SSL con Let's Encrypt

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obtener certificados SSL
sudo certbot --nginx -d tu-subdominio.com -d api.tu-subdominio.com

# Certbot configurará automáticamente HTTPS y redirección
```

### 11. Verificar Despliegue

1. Visita `https://tu-subdominio.com` - Deberías ver la aplicación
2. Visita `https://api.tu-subdominio.com/health` - Deberías ver `{"status":"ok"}`

### 12. Actualizar Variables de Entorno del Frontend

Después de obtener SSL, actualiza `.env` del frontend:
```env
VITE_API_URL=https://api.tu-subdominio.com/api
VITE_WS_URL=wss://api.tu-subdominio.com
```

Y reconstruye:
```bash
npm run build
```

## 🔄 Actualizaciones Futuras

### Opción 1: Manual
```bash
cd /var/www/flowspace
git pull
npm install
cd backend && npm install && cd ..
npm run build
pm2 restart flowspace-backend
```

### Opción 2: Usar Script
```bash
cd /var/www/flowspace
chmod +x deploy.sh
./deploy.sh
```

### Opción 3: GitHub Actions (Recomendado)

1. Configura secrets en GitHub:
   - `VPS_HOST`: IP de tu VPS
   - `VPS_USER`: Usuario SSH
   - `VPS_SSH_KEY`: Clave privada SSH
   - `VITE_API_URL`: URL de tu API
   - `VITE_WS_URL`: URL de WebSocket

2. Push a `main` o `master` activará el despliegue automático

## 🐛 Troubleshooting

### Backend no inicia
```bash
cd /var/www/flowspace/backend
pm2 logs flowspace-backend
# Verificar .env está configurado correctamente
```

### Frontend no carga
```bash
# Verificar que dist/ existe y tiene archivos
ls -la /var/www/flowspace/dist

# Verificar permisos
sudo chown -R www-data:www-data /var/www/flowspace/dist
```

### Nginx error
```bash
# Verificar configuración
sudo nginx -t

# Ver logs
sudo tail -f /var/log/nginx/error.log
```

### Base de datos no conecta
```bash
# Verificar PostgreSQL está corriendo
sudo systemctl status postgresql

# Probar conexión
psql -U flowspace_user -d flowspace -h localhost
```

## 📝 Notas Importantes

- **Seguridad**: Nunca subas `.env` a GitHub
- **Backups**: Configura backups regulares de PostgreSQL
- **Monitoreo**: Usa `pm2 monit` para monitorear el backend
- **Logs**: Revisa logs regularmente con `pm2 logs`

## 🔐 Mejores Prácticas

1. Usa contraseñas fuertes para JWT_SECRET y DB_PASSWORD
2. Configura firewall (UFW) para permitir solo puertos necesarios
3. Mantén Node.js y dependencias actualizadas
4. Configura backups automáticos de la base de datos
5. Monitorea el uso de recursos del servidor

