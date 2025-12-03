# 📅 Google Calendar - Configuración Simplificada (Sin Verificación)

Esta guía explica cómo configurar Google Calendar sin necesidad de verificar la aplicación con Google. La aplicación funcionará en modo "Testing" que permite hasta 100 usuarios verificados.

---

## ⚠️ Limitaciones del Modo Testing

- **Máximo 100 usuarios**: Solo usuarios agregados como "test users" pueden conectar su calendario
- **Advertencia de seguridad**: Los usuarios verán un mensaje indicando que la app no está verificada
- **Funcionalidad completa**: Todas las funciones de sincronización funcionan normalmente

---

## 🚀 Configuración Rápida

### Paso 1: Crear Proyecto en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Nombra el proyecto (ej: "FlowSpace Calendar")

### Paso 2: Habilitar Google Calendar API

1. En el menú lateral, ve a **APIs & Services** > **Library**
2. Busca "Google Calendar API"
3. Haz clic en **Enable**

### Paso 3: Configurar OAuth Consent Screen

1. Ve a **APIs & Services** > **OAuth consent screen**
2. Selecciona **External** (para usuarios fuera de tu organización)
3. Completa los campos mínimos:
   - **App name**: FlowSpace
   - **User support email**: Tu email
   - **Developer contact email**: Tu email
4. Haz clic en **Save and Continue**
5. En **Scopes**, agrega:
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`
6. Haz clic en **Save and Continue**
7. En **Test users**, agrega los emails de los usuarios que quieres que puedan conectar su calendario
8. Haz clic en **Save and Continue**

### Paso 4: Crear Credenciales OAuth 2.0

1. Ve a **APIs & Services** > **Credentials**
2. Haz clic en **Create Credentials** > **OAuth client ID**
3. Selecciona **Web application**
4. Configura:
   - **Name**: FlowSpace Web Client
   - **Authorized redirect URIs**: 
     - `http://localhost:5173/calendar-callback.html` (desarrollo)
     - `https://tu-dominio.com/calendar-callback.html` (producción)
5. Haz clic en **Create**
6. Copia el **Client ID** y **Client Secret**

### Paso 5: Configurar Variables de Entorno

En tu archivo `.env` del backend:

```env
GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5173/calendar-callback.html
```

### Paso 6: Agregar Usuarios de Prueba

Cada usuario que quiera conectar su calendario debe ser agregado como "Test User":

1. Ve a **APIs & Services** > **OAuth consent screen**
2. En la sección **Test users**, haz clic en **Add Users**
3. Agrega el email del usuario
4. El usuario recibirá un email de invitación (opcional)

---

## ✅ Verificación Rápida

1. Inicia el servidor backend
2. Inicia el frontend
3. Ve a Configuración > Google Calendar
4. Haz clic en "Conectar Calendario"
5. Inicia sesión con una cuenta que esté en la lista de "Test users"
6. Autoriza los permisos
7. ¡Listo! Tu calendario está conectado

---

## 🔧 Solución de Problemas

### Error: "access_denied"
- **Causa**: El email del usuario no está en la lista de "Test users"
- **Solución**: Agrega el email en OAuth consent screen > Test users

### Error: "redirect_uri_mismatch"
- **Causa**: La URI de redirección no coincide
- **Solución**: Verifica que `GOOGLE_REDIRECT_URI` coincida exactamente con la configurada en Google Cloud Console

### Error: "invalid_client"
- **Causa**: Client ID o Secret incorrectos
- **Solución**: Verifica las variables de entorno en `.env`

---

## 📝 Notas Importantes

- **Modo Testing es suficiente** para desarrollo y aplicaciones pequeñas (< 100 usuarios)
- **No necesitas verificar** la aplicación a menos que quieras más de 100 usuarios
- **Los usuarios verán una advertencia** pero pueden hacer clic en "Advanced" > "Go to FlowSpace (unsafe)" para continuar
- **La funcionalidad es idéntica** a una app verificada

---

## 🚀 Cuando Necesites Más de 100 Usuarios

Si tu aplicación crece y necesitas más usuarios, entonces sí necesitarás verificar la aplicación. Consulta `VERIFICAR_APLICACION_GOOGLE.md` para el proceso completo.

---

**Última actualización**: Diciembre 2024

