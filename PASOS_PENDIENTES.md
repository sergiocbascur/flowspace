# ✅ PASOS COMPLETADOS Y PENDIENTES

## ✅ YA COMPLETADO (Automático)

### Frontend
- [x] Firebase SDK instalado
- [x] Archivos de configuración creados
- [x] Service Worker configurado
- [x] Servicios de notificaciones listos

### Backend
- [x] Archivo de migración SQL creado
- [x] Rutas de API creadas (`backend/routes/notifications.js`)
- [x] Configuración de Firebase Admin creada (`backend/config/firebase.js`)
- [x] `.gitignore` actualizado

---

## 🎯 PASOS PENDIENTES (Requieren tu acción)

### PASO 3: Base de Datos (2 minutos)

**Opción A: Desde Render Dashboard**
1. Ve a tu servicio PostgreSQL en Render
2. Click en "Shell" o "Connect"
3. Copia y pega el contenido de `backend/migrations/add_fcm_notifications.sql`
4. Ejecuta

**Opción B: Desde terminal local**
```bash
# Conéctate a tu base de datos
psql -h <tu-host-render> -U <tu-usuario> -d <tu-database>

# Ejecuta el archivo
\i backend/migrations/add_fcm_notifications.sql
```

---

### PASO 4: Backend - Firebase Admin (5 minutos)

#### 4.1 Instalar dependencia
```bash
cd backend
npm install firebase-admin
```

#### 4.2 Descargar Service Account Key
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto "Genshiken"
3. Click en ⚙️ **Project Settings**
4. Pestaña **"Service accounts"**
5. Click **"Generate new private key"**
6. Guarda el archivo JSON descargado como:
   ```
   backend/firebase-service-account.json
   ```

⚠️ **IMPORTANTE**: Este archivo contiene credenciales sensibles. Ya está en `.gitignore` para que no se suba a Git.

#### 4.3 Registrar rutas en server.js
Agrega esta línea en `backend/server.js` (después de las otras rutas):

```javascript
// Rutas de notificaciones
const notificationsRoutes = require('./routes/notifications');
app.use('/api/notifications', notificationsRoutes);
```

---

## 🚀 DESPUÉS DE COMPLETAR LOS PASOS ANTERIORES

Avísame y yo haré:

1. ✅ Integrar solicitud de permisos en la app
2. ✅ Conectar eventos con envío de notificaciones:
   - Menciones en comentarios
   - Tareas que requieren validación
   - Tareas vencidas
   - Nuevas asignaciones
3. ✅ Agregar panel de preferencias en Settings
4. ✅ Probar todo el flujo end-to-end

---

## 📋 CHECKLIST RÁPIDO

- [ ] Ejecutar SQL en base de datos
- [ ] `cd backend && npm install firebase-admin`
- [ ] Descargar Service Account Key de Firebase
- [ ] Guardar como `backend/firebase-service-account.json`
- [ ] Agregar rutas de notificaciones en `server.js`
- [ ] Avisar cuando esté listo

---

## 💡 NOTAS

- El archivo SQL usa `IF NOT EXISTS`, así que es seguro ejecutarlo múltiples veces
- El Service Account Key es como una "contraseña maestra" de Firebase
- Las notificaciones solo funcionarán en HTTPS (tu Render ya lo tiene)
- En desarrollo local también funcionan con `localhost`

---

¿Listo para continuar con los pasos 3 y 4?
