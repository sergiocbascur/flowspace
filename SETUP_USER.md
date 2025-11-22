# Configuración de Usuario Dedicado para FlowSpace

Es **altamente recomendable** crear un usuario dedicado en el VPS para FlowSpace. Esto proporciona:

- ✅ **Aislamiento**: Cada proyecto tiene su propio usuario y permisos
- ✅ **Seguridad**: Si un proyecto es comprometido, otros no se ven afectados
- ✅ **Organización**: Más fácil de gestionar y mantener
- ✅ **Logs**: Separación clara de logs por proyecto
- ✅ **Backups**: Más fácil hacer backups específicos por proyecto

## 🚀 Pasos para Configurar Usuario Dedicado

### 1. Crear Usuario y Grupo

```bash
# Conectarse al VPS como root o usuario con sudo
ssh usuario@tu-vps-ip

# Crear grupo para FlowSpace (opcional, pero recomendado)
sudo groupadd flowspace

# Crear usuario dedicado
sudo useradd -m -s /bin/bash -g flowspace flowspace

# O si quieres agregar al usuario a grupos adicionales (como www-data para Nginx):
sudo useradd -m -s /bin/bash -g flowspace -G www-data flowspace
```

### 2. Configurar SSH para el Nuevo Usuario

```bash
# Crear directorio .ssh
sudo mkdir -p /home/flowspace/.ssh
sudo chmod 700 /home/flowspace/.ssh

# Copiar tu clave pública SSH (desde tu máquina local)
# En tu máquina local:
cat ~/.ssh/id_rsa.pub
# Copia el output

# En el VPS, crear authorized_keys
sudo nano /home/flowspace/.ssh/authorized_keys
# Pega tu clave pública aquí

# Configurar permisos correctos
sudo chmod 600 /home/flowspace/.ssh/authorized_keys
sudo chown -R flowspace:flowspace /home/flowspace/.ssh
```

### 3. Instalar Node.js

```bash
# Instalar Node.js 18 LTS (recomendado)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalación
node --version  # Debería mostrar v18.x.x
npm --version   # Debería mostrar 9.x.x

# O usar NVM para gestión de versiones (ver INSTALL_NODE.md)
```

### 4. Configurar Directorio del Proyecto

```bash
# Crear directorio para el proyecto
sudo mkdir -p /var/www/flowspace
sudo chown flowspace:flowspace /var/www/flowspace

# O si prefieres en el home del usuario:
sudo mkdir -p /home/flowspace/apps/flowspace
sudo chown flowspace:flowspace /home/flowspace/apps/flowspace
```

### 5. Configurar Permisos para PostgreSQL

```bash
# El usuario flowspace necesita acceso a PostgreSQL
# Opción 1: Crear usuario PostgreSQL con el mismo nombre
sudo -u postgres psql
CREATE USER flowspace WITH PASSWORD 'tu_password_seguro';
GRANT ALL PRIVILEGES ON DATABASE flowspace TO flowspace;
\q

# Opción 2: Usar un usuario PostgreSQL separado (recomendado)
# Ya deberías tener flowspace_user creado
# Solo asegúrate de que la contraseña esté en el .env
```

### 6. Configurar Sudo (Opcional)

Si necesitas que el usuario ejecute ciertos comandos con sudo:

```bash
# Crear archivo de configuración sudo
sudo visudo -f /etc/sudoers.d/flowspace

# Agregar líneas (ajusta según necesidades):
flowspace ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart nginx
flowspace ALL=(ALL) NOPASSWD: /usr/bin/systemctl reload nginx
flowspace ALL=(ALL) NOPASSWD: /usr/bin/certbot
```

### 7. Configurar PM2 para el Usuario

```bash
# Cambiar al usuario flowspace
sudo su - flowspace

# Instalar PM2 globalmente para este usuario
npm install -g pm2

# Configurar PM2 para iniciar al boot
pm2 startup systemd -u flowspace --hp /home/flowspace
# Copia y ejecuta el comando que PM2 te da (necesitará sudo)
```

### 8. Clonar y Configurar el Proyecto

```bash
# Como usuario flowspace
cd /var/www/flowspace
# o
cd /home/flowspace/apps/flowspace

# Clonar repositorio
git clone https://github.com/tu-usuario/flowspace.git .

# Instalar dependencias
npm install
cd backend && npm install && cd ..

# Configurar .env (ver DEPLOYMENT.md)
cp backend/env.example backend/.env
nano backend/.env

# Construir frontend
npm run build
```

### 9. Configurar Nginx con Permisos Correctos

```bash
# Como root o con sudo
sudo nano /etc/nginx/sites-available/flowspace
```

Asegúrate de que el `root` en la configuración de Nginx apunte al directorio correcto:

```nginx
server {
    listen 80;
    server_name tu-subdominio.com;

    root /var/www/flowspace/dist;  # o /home/flowspace/apps/flowspace/dist
    index index.html;
    
    # Asegurar que Nginx puede leer los archivos
    # Los archivos deben ser propiedad de flowspace pero legibles por www-data
    # Esto ya está configurado si usaste chown flowspace:flowspace
}
```

### 10. Configurar Permisos de Archivos

```bash
# Asegurar que el usuario flowspace es dueño de todo
sudo chown -R flowspace:flowspace /var/www/flowspace

# Pero Nginx necesita leer los archivos estáticos
# Opción 1: Agregar flowspace al grupo www-data
sudo usermod -a -G www-data flowspace
sudo chmod -R g+r /var/www/flowspace/dist

# Opción 2: Permisos más abiertos solo para dist (menos seguro)
sudo chmod -R 755 /var/www/flowspace/dist
```

### 11. Iniciar Backend con PM2

```bash
# Como usuario flowspace
cd /var/www/flowspace/backend
pm2 start server.js --name flowspace-backend
pm2 save
```

## 🔐 Mejores Prácticas de Seguridad

### 1. Limitar Acceso SSH

Editar `/etc/ssh/sshd_config`:
```
# Permitir solo al usuario flowspace (opcional)
AllowUsers flowspace

# O mejor, usar claves SSH solamente
PasswordAuthentication no
PubkeyAuthentication yes
```

### 2. Configurar Firewall

```bash
# Permitir solo puertos necesarios
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 3. Configurar Logs

```bash
# Los logs de PM2 estarán en:
/home/flowspace/.pm2/logs/

# Configurar rotación de logs
sudo nano /etc/logrotate.d/flowspace
```

Contenido:
```
/home/flowspace/.pm2/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    missingok
    create 0640 flowspace flowspace
}
```

## 📝 Verificación

### Verificar que todo funciona:

```bash
# Cambiar al usuario flowspace
sudo su - flowspace

# Verificar que puede acceder al directorio
cd /var/www/flowspace
ls -la

# Verificar PM2
pm2 status
pm2 logs flowspace-backend

# Verificar permisos
ls -la /var/www/flowspace/dist
```

### Verificar desde fuera:

1. `https://tu-subdominio.com` - Frontend
2. `https://api.tu-subdominio.com/health` - Backend API

## 🔄 Actualizaciones Futuras

Cuando necesites actualizar el proyecto:

```bash
# Cambiar al usuario flowspace
sudo su - flowspace

# Ir al directorio del proyecto
cd /var/www/flowspace

# Actualizar código
git pull

# Reinstalar dependencias si es necesario
npm install
cd backend && npm install && cd ..

# Reconstruir frontend
npm run build

# Reiniciar backend
cd backend
pm2 restart flowspace-backend
```

## 🆘 Troubleshooting

### Problema: "Permission denied"
```bash
# Verificar propietario
ls -la /var/www/flowspace

# Corregir propietario
sudo chown -R flowspace:flowspace /var/www/flowspace
```

### Problema: Nginx no puede leer archivos
```bash
# Agregar flowspace al grupo www-data
sudo usermod -a -G www-data flowspace

# Dar permisos de lectura
sudo chmod -R g+r /var/www/flowspace/dist
```

### Problema: PM2 no inicia al boot
```bash
# Como usuario flowspace
pm2 startup systemd -u flowspace --hp /home/flowspace
# Ejecutar el comando que te da (con sudo)
pm2 save
```

## 📋 Checklist de Configuración

- [ ] Usuario `flowspace` creado
- [ ] Grupo `flowspace` creado (opcional)
- [ ] SSH configurado para el usuario
- [ ] Directorio del proyecto creado con permisos correctos
- [ ] PostgreSQL configurado con usuario/permisos
- [ ] Proyecto clonado y dependencias instaladas
- [ ] Variables de entorno configuradas (.env)
- [ ] Frontend construido (npm run build)
- [ ] PM2 configurado y backend corriendo
- [ ] Nginx configurado y funcionando
- [ ] SSL configurado (Let's Encrypt)
- [ ] Firewall configurado
- [ ] Logs configurados

## 🎯 Resumen de Comandos Rápidos

```bash
# Crear usuario
sudo useradd -m -s /bin/bash -g flowspace flowspace

# Configurar directorio
sudo mkdir -p /var/www/flowspace
sudo chown flowspace:flowspace /var/www/flowspace

# Cambiar al usuario
sudo su - flowspace

# Clonar proyecto
cd /var/www/flowspace
git clone https://github.com/tu-usuario/flowspace.git .

# Instalar y configurar
npm install
cd backend && npm install && cd ..
npm run build
cd backend
pm2 start server.js --name flowspace-backend
pm2 save
```

