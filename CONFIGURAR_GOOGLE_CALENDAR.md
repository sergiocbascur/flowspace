# 🔧 Configurar Google Calendar API

Este documento explica cómo configurar las credenciales de Google Calendar API para FlowSpace.

## ⚠️ Error Común

Si ves el error:
```
Missing required parameter: client_id
Error 400: invalid_request
```

Significa que las credenciales de Google Calendar no están configuradas correctamente en el backend.

---

## 📋 Pasos para Configurar

### 1. Crear Proyecto en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la **Google Calendar API**:
   - Ve a "APIs & Services" > "Library"
   - Busca "Google Calendar API"
   - Haz clic en "Enable"

### 2. Crear Credenciales OAuth 2.0

1. Ve a "APIs & Services" > "Credentials"
2. Haz clic en "Create Credentials" > "OAuth client ID"
3. Si es la primera vez, configura la pantalla de consentimiento:
   - Tipo: "External" (o "Internal" si usas Google Workspace)
   - Completa la información requerida
   - Agrega tu email como usuario de prueba
4. Crea el OAuth client ID:
   - Tipo de aplicación: "Web application"
   - Nombre: "FlowSpace Calendar Integration"
   - **Authorized redirect URIs**: Agrega:
     ```
     http://localhost:5173/calendar-callback.html
     https://tu-dominio.com/calendar-callback.html
     ```
     (Reemplaza con tu dominio de producción)

### 3. Obtener Credenciales

Después de crear el OAuth client ID, verás:
- **Client ID**: Algo como `123456789-abcdefghijklmnop.apps.googleusercontent.com`
- **Client Secret**: Una cadena secreta

### 4. Configurar Variables de Entorno

En el archivo `backend/.env`, agrega:

```env
# Google Calendar API
GOOGLE_CLIENT_ID=tu_client_id_aqui.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu_client_secret_aqui
GOOGLE_REDIRECT_URI=http://localhost:5173/calendar-callback.html
```

**Para producción**, usa:
```env
GOOGLE_REDIRECT_URI=https://tu-dominio.com/calendar-callback.html
```

### 5. Reiniciar el Servidor

Después de configurar las variables de entorno:

```bash
# Si usas PM2
pm2 restart flowspace-backend

# O si ejecutas directamente
# Detén el servidor (Ctrl+C) y vuelve a iniciarlo
cd backend
npm run dev
```

---

## ✅ Verificar Configuración

1. Abre FlowSpace en tu navegador
2. Ve a Configuración > Google Calendar
3. Haz clic en "Conectar Google Calendar"
4. Deberías ver la pantalla de autorización de Google
5. Autoriza la aplicación
6. Deberías ver "Conectado" en verde

---

## 🔒 Seguridad

- **NUNCA** subas el archivo `.env` a Git
- El archivo `.env` ya está en `.gitignore`
- Mantén el Client Secret seguro
- Si comprometes las credenciales, revócalas en Google Cloud Console y crea nuevas

---

## 🐛 Solución de Problemas

### Error: "Missing required parameter: client_id"

**Causa**: Las variables de entorno no están configuradas o el servidor no se reinició.

**Solución**:
1. Verifica que `backend/.env` tenga `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`
2. Reinicia el servidor backend
3. Verifica que las variables no tengan espacios extra

### Error: "redirect_uri_mismatch"

**Causa**: El redirect URI en Google Cloud Console no coincide con el configurado.

**Solución**:
1. Ve a Google Cloud Console > Credentials
2. Edita tu OAuth 2.0 Client ID
3. Agrega el redirect URI exacto que aparece en el error
4. Guarda los cambios

### Error: "access_denied" (403)

**Causa más común**: La aplicación OAuth está en modo "Testing" y el usuario no está en la lista de usuarios de prueba.

**Solución paso a paso**:

1. **Ve a Google Cloud Console**:
   - [Google Cloud Console](https://console.cloud.google.com/)
   - Selecciona tu proyecto

2. **Configura la pantalla de consentimiento**:
   - Ve a **APIs & Services** > **OAuth consent screen**
   - Si está en modo "Testing", verás una sección **Test users**
   - Haz clic en **+ ADD USERS**
   - Agrega el email que estás usando para probar (ej: `sergiocabellob@gmail.com`)
   - Guarda los cambios

3. **Espera unos minutos** para que los cambios se propaguen

4. **Vuelve a intentar** conectar Google Calendar

**Alternativa: Publicar la aplicación** (solo para producción):
- En la pantalla de consentimiento, cambia de "Testing" a "In production"
- Esto permite que cualquier usuario con cuenta de Google pueda conectar
- **Nota**: Google requiere verificación si solicitas scopes sensibles o muchos usuarios

**Si el problema persiste**:
- Verifica que el email que agregaste sea exactamente el mismo que usas en Google
- Asegúrate de que la aplicación tenga los scopes correctos configurados
- Revisa que no haya restricciones de dominio en la configuración OAuth

---

## 📚 Referencias

- [Google Calendar API Documentation](https://developers.google.com/calendar/api)
- [OAuth 2.0 Setup Guide](https://developers.google.com/identity/protocols/oauth2)

---

**Última actualización**: Diciembre 2024

