# 📱 Guía de Implementación de Notificaciones Push - Genshiken

## ✅ PASO 1: Configuración de Firebase (MANUAL - 5 minutos)

### 1.1 Crear Proyecto Firebase
1. Ve a https://console.firebase.google.com/
2. Click "Agregar proyecto" / "Add project"
3. Nombre: **Genshiken**
4. Desactiva Google Analytics
5. Click "Crear proyecto"

### 1.2 Obtener Configuración Web
1. En el proyecto, click en el ícono **Web** (`</>`)
2. Nombre de la app: **Genshiken Web**
3. NO marques "Firebase Hosting"
4. Click "Registrar app"
5. **COPIA** el objeto `firebaseConfig` que aparece

### 1.3 Generar VAPID Key
1. Ve a **Project Settings** (⚙️ arriba izquierda)
2. Pestaña **"Cloud Messaging"**
3. Sección "Web Push certificates"
4. Click **"Generate key pair"**
5. **COPIA** el VAPID key que aparece

---

## ✅ PASO 2: Configurar Credenciales (MANUAL - 2 minutos)

### 2.1 Actualizar `src/firebase/config.js`
Reemplaza los valores de ejemplo con tus credenciales de Firebase:

```javascript
export const firebaseConfig = {
    apiKey: "TU_API_KEY_REAL",
    authDomain: "tu-project-id.firebaseapp.com",
    projectId: "tu-project-id",
    storageBucket: "tu-project-id.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123def456"
};

export const vapidKey = "TU_VAPID_KEY_REAL";
```

### 2.2 Actualizar `public/firebase-messaging-sw.js`
Reemplaza el objeto `firebaseConfig` (líneas 10-16) con los MISMOS valores del paso anterior.

---

## ✅ PASO 3: Backend - Crear Tabla de Tokens (SQL)

Ejecuta este SQL en tu base de datos PostgreSQL:

```sql
-- Tabla para almacenar tokens FCM de usuarios
CREATE TABLE IF NOT EXISTS fcm_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    platform VARCHAR(20) DEFAULT 'web',
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_fcm_tokens_user_id ON fcm_tokens(user_id);
CREATE INDEX idx_fcm_tokens_token ON fcm_tokens(token);

-- Tabla para preferencias de notificaciones
CREATE TABLE IF NOT EXISTS notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    mentions BOOLEAN DEFAULT true,
    validations BOOLEAN DEFAULT true,
    overdue BOOLEAN DEFAULT true,
    assignments BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);
```

---

## ✅ PASO 4: Backend - Instalar Dependencias

```bash
cd backend
npm install firebase-admin
```

---

## ✅ PASO 5: Backend - Configurar Firebase Admin SDK

### 5.1 Generar Service Account Key
1. En Firebase Console, ve a **Project Settings** > **Service accounts**
2. Click **"Generate new private key"**
3. Guarda el archivo JSON descargado como `backend/firebase-service-account.json`

### 5.2 Agregar a `.gitignore`
```
firebase-service-account.json
```

---

## 📊 Estado Actual

### ✅ Completado (Frontend)
- [x] Instalación de Firebase SDK
- [x] Servicio de mensajería (`src/firebase/messaging.js`)
- [x] Service Worker para notificaciones en segundo plano
- [x] API service para comunicación con backend
- [x] Archivos de configuración creados

### ⏳ Pendiente (Requiere tu acción)
- [ ] Configurar proyecto Firebase
- [ ] Copiar credenciales a archivos de configuración
- [ ] Crear tablas en base de datos
- [ ] Instalar firebase-admin en backend
- [ ] Configurar Service Account Key

### 🔜 Siguiente (Yo lo haré después de que completes lo anterior)
- [ ] Integrar solicitud de permisos en LabSync
- [ ] Crear rutas de backend para tokens
- [ ] Implementar envío de notificaciones desde eventos
- [ ] Agregar configuración de preferencias en Settings

---

## 🎯 Próximos Pasos

**AHORA MISMO:**
1. Crea el proyecto en Firebase Console
2. Copia las credenciales a los archivos
3. Ejecuta el SQL en tu base de datos
4. Avísame cuando termines

**DESPUÉS (yo lo haré):**
- Integraré todo en la app
- Crearé las rutas del backend
- Implementaré el envío automático de notificaciones

---

## 💡 Notas Importantes

- Las notificaciones solo funcionan en **HTTPS** (tu Render ya lo tiene)
- En desarrollo local, usa `localhost` (también funciona)
- Los tokens FCM expiran, pero se renuevan automáticamente
- Un usuario puede tener múltiples tokens (diferentes dispositivos)

---

¿Listo para continuar? Avísame cuando hayas completado los pasos manuales.
