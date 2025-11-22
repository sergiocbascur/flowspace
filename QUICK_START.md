# Quick Start - Configuración Rápida

Guía rápida para configurar FlowSpace en un VPS con usuario dedicado.

## 🚀 Setup Rápido (5 minutos)

### 1. Instalar Node.js

```bash
# En el VPS (como root o con sudo)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar
node --version
npm --version
```

### 2. Crear Usuario y Configurar

```bash
# En el VPS (como root o con sudo)
sudo groupadd flowspace
sudo useradd -m -s /bin/bash -g flowspace flowspace
sudo mkdir -p /var/www/flowspace
sudo chown flowspace:flowspace /var/www/flowspace

# Configurar SSH (copiar tu clave pública)
sudo mkdir -p /home/flowspace/.ssh
sudo chmod 700 /home/flowspace/.ssh
# Pega tu clave pública en:
sudo nano /home/flowspace/.ssh/authorized_keys
sudo chmod 600 /home/flowspace/.ssh/authorized_keys
sudo chown -R flowspace:flowspace /home/flowspace/.ssh
```

### 3. Configurar PostgreSQL

```bash
sudo -u postgres psql
CREATE DATABASE flowspace;
CREATE USER flowspace_user WITH PASSWORD 'tu_password_seguro';
GRANT ALL PRIVILEGES ON DATABASE flowspace TO flowspace_user;
\q
```

### 4. Clonar y Configurar Proyecto

```bash
# Cambiar al usuario flowspace
sudo su - flowspace

# Clonar proyecto
cd /var/www/flowspace
git clone https://github.com/tu-usuario/flowspace.git .

# Instalar dependencias
npm install
cd backend && npm install && cd ..

# Configurar backend
cp backend/env.example backend/.env
nano backend/.env
# Editar: DB_PASSWORD, JWT_SECRET, CORS_ORIGIN

# Configurar frontend
echo "VITE_API_URL=https://api.tu-subdominio.com/api" > .env
echo "VITE_WS_URL=wss://api.tu-subdominio.com" >> .env

# Construir
npm run build
```

### 5. Iniciar Backend

```bash
# Como usuario flowspace
cd /var/www/flowspace/backend
npm install -g pm2
pm2 start server.js --name flowspace-backend
pm2 save
pm2 startup systemd -u flowspace --hp /home/flowspace
# Ejecutar el comando que PM2 muestra (necesita sudo)
```

### 6. Configurar Nginx

```bash
# Como root
sudo nano /etc/nginx/sites-available/flowspace
```

Pegar configuración (ver DEPLOYMENT.md)

```bash
sudo ln -s /etc/nginx/sites-available/flowspace /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 7. SSL y DNS

```bash
# Configurar DNS (en tu panel):
# tu-subdominio.com → A → tu-vps-ip
# api.tu-subdominio.com → A → tu-vps-ip

# SSL
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d tu-subdominio.com -d api.tu-subdominio.com
```

### 8. Actualizar Frontend con HTTPS

```bash
# Como usuario flowspace
cd /var/www/flowspace
nano .env
# Actualizar URLs a https://
npm run build
```

## ✅ Verificación

- Frontend: `https://tu-subdominio.com`
- Backend: `https://api.tu-subdominio.com/health`

## 📚 Documentación Completa

- [SETUP_USER.md](./SETUP_USER.md) - Configuración detallada de usuario
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Guía completa de despliegue
- [backend/README.md](./backend/README.md) - Documentación del backend

