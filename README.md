# FlowSpace

Aplicación web progresiva (PWA) para gestión operativa y personal, diseñada como un "Segundo Cerebro" para equipos y usuarios individuales.

## 🎯 Características

- **Gestión de Tareas Colaborativa**: Crea y gestiona tareas en grupos compartidos
- **Sistema de Puntuación**: Ranking de miembros basado en completitud de tareas
- **Contextos Duales**: Separación entre trabajo y vida personal
- **Inteligencia Artificial**: Resúmenes inteligentes y sugerencias contextuales
- **Sincronización en Tiempo Real**: WebSocket para actualizaciones instantáneas
- **Diseño Minimalista**: Inspirado en Apple Reminders y Calendar

## 🛠️ Tech Stack

### Frontend
- React 18
- Vite
- Tailwind CSS
- Lucide React (iconos)

### Backend
- Node.js + Express
- PostgreSQL
- WebSocket (ws)
- JWT Authentication

## 📦 Instalación

### Requisitos Previos
- Node.js 18+
- PostgreSQL 14+
- npm o yarn

### Desarrollo Local

1. **Clonar el repositorio:**
```bash
git clone https://github.com/tu-usuario/flowspace.git
cd flowspace
```

2. **Instalar dependencias del frontend:**
```bash
npm install
```

3. **Instalar dependencias del backend:**
```bash
cd backend
npm install
```

4. **Configurar base de datos:**
```bash
# Crear base de datos PostgreSQL
createdb flowspace
# O usando psql:
psql -U postgres
CREATE DATABASE flowspace;
CREATE USER flowspace_user WITH PASSWORD 'tu_password';
GRANT ALL PRIVILEGES ON DATABASE flowspace TO flowspace_user;
```

5. **Configurar variables de entorno:**

Backend (`backend/.env`):
```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flowspace
DB_USER=flowspace_user
DB_PASSWORD=tu_password
JWT_SECRET=genera_un_secret_seguro
CORS_ORIGIN=http://localhost:5173
```

Frontend (`.env`):
```env
VITE_API_URL=http://localhost:3000/api
VITE_WS_URL=ws://localhost:3000
```

6. **Iniciar servidores:**

Terminal 1 (Backend):
```bash
cd backend
npm run dev
```

Terminal 2 (Frontend):
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## 🚀 Despliegue en VPS

> **💡 Recomendación**: Crea un usuario dedicado para FlowSpace para mejor seguridad y organización.
> Ver [SETUP_USER.md](./SETUP_USER.md) para configuración detallada o [QUICK_START.md](./QUICK_START.md) para guía rápida.

### Opción 1: Despliegue Manual

1. **Conectar al VPS:**
```bash
ssh usuario@tu-vps-ip
```

2. **Instalar dependencias del sistema:**
```bash
sudo apt update
sudo apt install -y nodejs npm postgresql postgresql-contrib nginx
```

3. **Configurar PostgreSQL:**
```bash
sudo -u postgres psql
CREATE DATABASE flowspace;
CREATE USER flowspace_user WITH PASSWORD 'tu_password_seguro';
GRANT ALL PRIVILEGES ON DATABASE flowspace TO flowspace_user;
\q
```

4. **Clonar repositorio:**
```bash
cd /var/www
git clone https://github.com/tu-usuario/flowspace.git
cd flowspace
```

5. **Instalar dependencias:**
```bash
npm install
cd backend && npm install && cd ..
```

6. **Configurar variables de entorno:**
```bash
# Backend
cp backend/env.example backend/.env
nano backend/.env  # Editar con tus valores

# Frontend
echo "VITE_API_URL=https://api.tu-subdominio.com/api" > .env
echo "VITE_WS_URL=wss://api.tu-subdominio.com" >> .env
```

7. **Construir frontend:**
```bash
npm run build
```

8. **Iniciar backend con PM2:**
```bash
npm install -g pm2
cd backend
pm2 start server.js --name flowspace-backend
pm2 save
pm2 startup
```

9. **Configurar Nginx:**

Crear `/etc/nginx/sites-available/flowspace`:
```nginx
# Backend API
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
    }
}

# Frontend
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
}
```

10. **Habilitar sitio y reiniciar Nginx:**
```bash
sudo ln -s /etc/nginx/sites-available/flowspace /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

11. **Configurar SSL con Let's Encrypt:**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d tu-subdominio.com -d api.tu-subdominio.com
```

### Opción 2: Script de Despliegue Automático

Ver `deploy.sh` para un script automatizado (crear si es necesario).

## 📁 Estructura del Proyecto

```
flowspace/
├── backend/              # Backend API
│   ├── db/              # Configuración de base de datos
│   ├── routes/          # Rutas API
│   ├── websocket/       # WebSocket server
│   └── server.js        # Servidor principal
├── src/                 # Frontend React
│   ├── apiService.js    # Cliente API
│   ├── App.jsx          # Componente principal
│   ├── LabSync.jsx      # Componente principal (ver índice al inicio)
│   ├── Login.jsx        # Componente de login
│   ├── components/      # Componentes reutilizables
│   └── utils/           # Utilidades
├── scripts/             # Scripts de utilidad
│   ├── deploy/          # Scripts de despliegue
│   └── vps/             # Scripts de VPS
├── dist/                # Build de producción
└── package.json         # Dependencias frontend
```

## 📚 Documentación

- **[GUIA_FUNCIONES.md](./GUIA_FUNCIONES.md)**: Guía completa de funciones y estructura
- **[NOTAS_TECNICAS.md](./NOTAS_TECNICAS.md)**: Notas técnicas para mantenimiento rápido
- **[DEPLOYMENT.md](./DEPLOYMENT.md)**: Guía de despliegue en VPS
- **[DEPLOY-VERCEL.md](./DEPLOY-VERCEL.md)**: Guía de despliegue en Vercel
- **[QUICK_START.md](./QUICK_START.md)**: Inicio rápido

## 🔐 Seguridad

- Las contraseñas se hashean con bcrypt
- Autenticación JWT con tokens de 30 días
- CORS configurado para dominios específicos
- Validación de entrada en todas las rutas
- SQL injection prevenido con parámetros preparados

## 📝 Variables de Entorno

### Backend
- `PORT`: Puerto del servidor (default: 3000)
- `DB_HOST`: Host de PostgreSQL
- `DB_PORT`: Puerto de PostgreSQL (default: 5432)
- `DB_NAME`: Nombre de la base de datos
- `DB_USER`: Usuario de PostgreSQL
- `DB_PASSWORD`: Contraseña de PostgreSQL
- `JWT_SECRET`: Secret para firmar JWT (¡muy importante!)
- `CORS_ORIGIN`: URLs permitidas para CORS

### Frontend
- `VITE_API_URL`: URL del backend API
- `VITE_WS_URL`: URL del WebSocket

## 🧪 Testing

```bash
# Frontend
npm run lint

# Backend
cd backend
npm test  # (cuando se implementen tests)
```

## 📄 Licencia

MIT

## 👥 Contribuir

Las contribuciones son bienvenidas. Por favor:
1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📧 Contacto

Tu nombre - [@tu-twitter](https://twitter.com/tu-twitter)

Project Link: [https://github.com/tu-usuario/flowspace](https://github.com/tu-usuario/flowspace)

