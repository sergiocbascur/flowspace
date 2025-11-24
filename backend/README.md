# FlowSpace Backend

Backend API para FlowSpace con Node.js, Express y PostgreSQL.

## Requisitos

- Node.js 18+ 
- PostgreSQL 14+
- npm o yarn

## Instalación

1. **Instalar dependencias:**
```bash
cd backend
npm install
```

2. **Configurar base de datos PostgreSQL:**

Crea una base de datos:
```sql
CREATE DATABASE flowspace;
CREATE USER flowspace_user WITH PASSWORD 'tu_password_seguro';
GRANT ALL PRIVILEGES ON DATABASE flowspace TO flowspace_user;
```

3. **Configurar variables de entorno:**

Copia `env.example` a `.env`:
```bash
cp env.example .env
```

Edita `.env` con tus credenciales:
```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flowspace
DB_USER=flowspace_user
DB_PASSWORD=tu_password_seguro
JWT_SECRET=genera_un_secret_muy_seguro_aqui
CORS_ORIGIN=http://localhost:5173,http://tu-ip-local:5173
```

**Generar JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

4. **Iniciar servidor:**

Desarrollo (con nodemon):
```bash
npm run dev
```

Producción:
```bash
npm start
```

El servidor estará disponible en `http://localhost:3000`

## API Endpoints

### Autenticación
- `POST /api/auth/send-verification-code` - Enviar código de verificación
- `POST /api/auth/verify-code` - Verificar código
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/me` - Obtener usuario actual

### Grupos
- `GET /api/groups` - Obtener grupos del usuario
- `POST /api/groups` - Crear grupo
- `POST /api/groups/join` - Unirse a grupo por código
- `POST /api/groups/:groupId/leave` - Dejar grupo
- `DELETE /api/groups/:groupId` - Eliminar grupo
- `PATCH /api/groups/:groupId/scores` - Actualizar puntajes

### Tareas
- `GET /api/tasks/group/:groupId` - Obtener tareas de un grupo
- `POST /api/tasks` - Crear tarea
- `PATCH /api/tasks/:taskId` - Actualizar tarea
- `DELETE /api/tasks/:taskId` - Eliminar tarea

## WebSocket

El servidor también expone WebSocket en el mismo puerto para sincronización en tiempo real.

Conectar con:
```
ws://localhost:3000?token=JWT_TOKEN
```

## Despliegue en VPS

1. **Instalar PostgreSQL:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

2. **Configurar PostgreSQL:**
```bash
sudo -u postgres psql
CREATE DATABASE flowspace;
CREATE USER flowspace_user WITH PASSWORD 'tu_password';
GRANT ALL PRIVILEGES ON DATABASE flowspace TO flowspace_user;
\q
```

3. **Usar PM2 para mantener el servidor corriendo:**
```bash
npm install -g pm2
pm2 start server.js --name flowspace-backend
pm2 save
pm2 startup
```

4. **Configurar Nginx como reverse proxy (opcional):**
```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Notas

- En desarrollo, los códigos de verificación se retornan en la respuesta (solo para testing)
- En producción, deberías implementar un servicio de email real
- El JWT_SECRET debe ser único y seguro
- Configura CORS_ORIGIN con las URLs de tu frontend






