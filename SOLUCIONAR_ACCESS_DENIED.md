# 🔧 Solución: Error 403 access_denied en Google Calendar

## 🎯 Problema

Al intentar conectar Google Calendar, aparece el error:
```
Error 403: access_denied
```

## ✅ Solución Rápida

Este error ocurre porque tu aplicación OAuth está en modo **"Testing"** y tu email no está en la lista de usuarios de prueba.

### Pasos para Solucionarlo:

#### 1. Ir a Google Cloud Console

1. Abre [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto (el que tiene las credenciales OAuth configuradas)

#### 2. Configurar Usuarios de Prueba

1. En el menú lateral, ve a **APIs & Services** > **OAuth consent screen**
2. Verás el estado de tu aplicación (probablemente "Testing")
3. Desplázate hasta la sección **"Test users"**
4. Haz clic en **"+ ADD USERS"**
5. Agrega tu email de Google (el que usas para iniciar sesión):
   ```
   sergiocabellob@gmail.com
   ```
6. Haz clic en **"ADD"**
7. Guarda los cambios si es necesario

#### 3. Esperar Propagación

- Espera 2-5 minutos para que los cambios se propaguen en los servidores de Google

#### 4. Intentar Nuevamente

1. Cierra cualquier ventana de autorización abierta
2. En FlowSpace, ve a Configuración > Google Calendar
3. Haz clic en "Conectar Google Calendar"
4. Deberías poder autorizar sin problemas

---

## 🔍 Verificación

### Verificar que estás en la lista:

1. Ve a **OAuth consent screen**
2. Busca la sección **"Test users"**
3. Verifica que tu email aparezca en la lista

### Verificar el email correcto:

- Asegúrate de usar el **mismo email** que aparece cuando inicias sesión en Google
- Si tienes múltiples cuentas de Google, usa la correcta

---

## 🚀 Alternativa: Publicar la Aplicación

Si quieres que **cualquier usuario** pueda conectar sin estar en la lista de prueba:

### ⚠️ Solo para Producción

1. Ve a **OAuth consent screen**
2. Haz clic en **"PUBLISH APP"** o cambia el modo a **"In production"**
3. Lee las advertencias de Google
4. Confirma la publicación

**Notas importantes**:
- Google puede requerir verificación si solicitas scopes sensibles
- Puede tomar varios días para que Google revise y apruebe
- Mientras tanto, puedes seguir usando usuarios de prueba

---

## 📋 Checklist de Configuración

Asegúrate de tener todo configurado:

- [ ] Proyecto creado en Google Cloud Console
- [ ] Google Calendar API habilitada
- [ ] OAuth 2.0 Client ID creado (tipo "Web application")
- [ ] Redirect URI configurado correctamente:
  ```
  http://localhost:5173/calendar-callback.html
  ```
- [ ] Pantalla de consentimiento configurada
- [ ] Tu email agregado como usuario de prueba (si está en modo Testing)
- [ ] Variables de entorno configuradas en `backend/.env`:
  ```env
  GOOGLE_CLIENT_ID=tu_client_id
  GOOGLE_CLIENT_SECRET=tu_client_secret
  GOOGLE_REDIRECT_URI=http://localhost:5173/calendar-callback.html
  ```

---

## 🐛 Otros Problemas Relacionados

### Error: "redirect_uri_mismatch"

**Solución**: Verifica que el redirect URI en Google Cloud Console coincida exactamente con el de `.env`

### Error: "invalid_client"

**Solución**: Verifica que el Client ID y Client Secret sean correctos en `.env`

### La ventana se cierra inmediatamente

**Solución**: 
- Verifica que `calendar-callback.html` exista en `public/`
- Revisa la consola del navegador para errores
- Verifica que el redirect URI esté correctamente configurado

---

## 📞 Ayuda Adicional

Si después de seguir estos pasos el problema persiste:

1. Verifica los logs del backend para ver errores específicos
2. Revisa la consola del navegador (F12) para errores de JavaScript
3. Asegúrate de que el servidor backend esté corriendo y tenga las variables de entorno correctas
4. Intenta en modo incógnito para descartar problemas de caché

---

**Última actualización**: Diciembre 2024

