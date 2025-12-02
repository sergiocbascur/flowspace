# 📅 Guía de Configuración de Google Calendar

## 🔐 Cómo Funciona OAuth2 con Múltiples Usuarios

**IMPORTANTE:** Las credenciales OAuth2 (Client ID y Client Secret) son de **la aplicación**, no personales. Cada usuario autentica su **propia cuenta de Google** cuando conecta su calendario.

### Flujo de Autenticación:

1. **Usuario A** hace clic en "Conectar Google Calendar"
   - Se abre ventana de Google para que **Usuario A** inicie sesión con su cuenta
   - Google genera tokens únicos para **Usuario A**
   - Los tokens se guardan en BD asociados al `user_id` de **Usuario A**

2. **Usuario B** hace clic en "Conectar Google Calendar"
   - Se abre ventana de Google para que **Usuario B** inicie sesión con su cuenta
   - Google genera tokens únicos para **Usuario B**
   - Los tokens se guardan en BD asociados al `user_id` de **Usuario B**

3. Cada usuario sincroniza sus tareas con **su propio calendario de Google**

## 🛠️ Configuración en Google Cloud Console

### Paso 1: Crear Proyecto

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Nombra el proyecto (ej: "FlowSpace Calendar Integration")

### Paso 2: Habilitar Google Calendar API

1. En el menú lateral, ve a **APIs & Services** > **Library**
2. Busca "Google Calendar API"
3. Haz clic en **Enable**

### Paso 3: Crear Credenciales OAuth2

1. Ve a **APIs & Services** > **Credentials**
2. Haz clic en **+ CREATE CREDENTIALS** > **OAuth client ID**
3. Si es la primera vez, configura la pantalla de consentimiento:
   - **User Type**: External (para usuarios fuera de tu organización)
   - Completa la información requerida
   - Agrega tu dominio en **Authorized domains**
   - Guarda y continúa

4. Configura el OAuth Client:
   - **Application type**: Web application
   - **Name**: FlowSpace Calendar (o el nombre que prefieras)
   - **Authorized JavaScript origins**:
     ```
     http://localhost:5173
     https://tu-dominio.com
     ```
   - **Authorized redirect URIs**:
     ```
     http://localhost:5173/calendar-callback.html
     https://tu-dominio.com/calendar-callback.html
     ```

5. Haz clic en **Create**
6. **IMPORTANTE**: Copia el **Client ID** y **Client Secret** (solo se muestran una vez)

### Paso 4: Configurar Variables de Entorno

En tu archivo `.env` del backend:

```env
# Google Calendar API (Credenciales de la aplicación)
GOOGLE_CLIENT_ID=tu_client_id_aqui.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu_client_secret_aqui
GOOGLE_REDIRECT_URI=http://localhost:5173/calendar-callback.html
```

**Para producción**, actualiza `GOOGLE_REDIRECT_URI` con tu dominio real:
```env
GOOGLE_REDIRECT_URI=https://tu-dominio.com/calendar-callback.html
```

### Paso 5: Instalar Dependencias

```bash
cd backend
npm install
```

Esto instalará `googleapis` que es necesario para la integración.

## 🔒 Seguridad y Privacidad

### ¿Qué ven los usuarios?

Cuando un usuario conecta su Google Calendar:
- Ve una pantalla de Google pidiendo permiso para acceder a su calendario
- El mensaje muestra: "FlowSpace quiere acceder a tu Google Calendar"
- El usuario puede ver exactamente qué permisos se solicitan
- Puede revocar el acceso en cualquier momento desde su cuenta de Google

### ¿Qué datos se almacenan?

En la base de datos se guardan:
- `user_id`: ID del usuario en FlowSpace
- `access_token`: Token de acceso (temporal, expira en ~1 hora)
- `refresh_token`: Token para renovar el access_token (permanente hasta que el usuario revoque)
- `token_expiry`: Fecha de expiración del access_token
- `calendar_id`: ID del calendario (generalmente "primary")

**NO se almacenan:**
- Contraseñas
- Información personal del usuario de Google
- Contenido de eventos del calendario (solo se crean/actualizan eventos)

### Tokens por Usuario

Cada usuario tiene sus propios tokens almacenados en la tabla `google_calendar_tokens`:

```sql
-- Ejemplo de cómo se almacenan los tokens
user_id          | access_token | refresh_token | ...
-----------------|--------------|--------------|-----
user-123         | token-A      | refresh-A    | ...
user-456         | token-B      | refresh-B    | ...
```

Cuando un usuario sincroniza una tarea:
1. El sistema busca los tokens de **ese usuario específico**
2. Usa esos tokens para crear eventos en **su calendario de Google**
3. Otros usuarios no pueden ver ni modificar eventos de otros

## 🧪 Pruebas

### Probar con múltiples usuarios:

1. **Usuario 1**: Conecta su Google Calendar
   - Verifica que las tareas se sincronicen con el calendario de Usuario 1

2. **Usuario 2**: Conecta su Google Calendar (diferente cuenta)
   - Verifica que las tareas se sincronicen con el calendario de Usuario 2
   - Verifica que Usuario 2 NO ve eventos de Usuario 1

3. **Usuario 1**: Desconecta su Google Calendar
   - Verifica que solo afecta a Usuario 1
   - Usuario 2 sigue conectado

## 📝 Notas Importantes

1. **Las credenciales OAuth2 son públicas**: El Client ID puede estar en el código frontend sin problema. El Client Secret debe estar solo en el backend.

2. **Límites de Google Calendar API**: 
   - 1,000,000 requests por día (suficiente para la mayoría de aplicaciones)
   - 10 requests por segundo por usuario

3. **Refresh Tokens**: 
   - Se renuevan automáticamente cuando expiran
   - Si un usuario revoca el acceso desde Google, el refresh token deja de funcionar
   - El usuario necesitará reconectar su cuenta

4. **Producción**: 
   - Asegúrate de agregar tu dominio de producción en Google Cloud Console
   - Usa HTTPS en producción (requerido por Google)
   - Considera usar variables de entorno diferentes para desarrollo/producción

## 🆘 Troubleshooting

### Error: "redirect_uri_mismatch"
- Verifica que el redirect URI en `.env` coincida exactamente con el configurado en Google Cloud Console
- Incluye el protocolo (`http://` o `https://`)
- No incluyas trailing slash

### Error: "invalid_client"
- Verifica que el Client ID y Client Secret sean correctos
- Asegúrate de que las credenciales sean de tipo "Web application"

### Los tokens no se renuevan
- Verifica que el refresh_token se esté guardando correctamente
- Revisa los logs del backend para ver errores de renovación

### Usuario no puede conectar
- Verifica que Google Calendar API esté habilitada en el proyecto
- Revisa que la pantalla de consentimiento esté configurada correctamente
- Verifica que el usuario tenga una cuenta de Google válida

