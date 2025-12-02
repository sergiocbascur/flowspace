# 🚀 Publicar Aplicación OAuth para Todos los Usuarios

Esta guía explica cómo cambiar tu aplicación OAuth de modo "Testing" a "In production" para que cualquier usuario pueda conectar su Google Calendar sin estar en la lista de prueba.

---

## ⚠️ Consideraciones Importantes

Antes de publicar, ten en cuenta:

1. **Verificación de Google**: Google puede requerir verificación si solicitas scopes sensibles o muchos usuarios
2. **Tiempo de revisión**: Puede tomar varios días para que Google revise y apruebe
3. **Límites temporales**: Mientras está en revisión, puedes seguir usando usuarios de prueba
4. **Scopes solicitados**: Los scopes que solicitas (`calendar` y `calendar.events`) son relativamente seguros y generalmente no requieren verificación estricta

---

## 📋 Pasos para Publicar la Aplicación

### Paso 1: Ir a OAuth Consent Screen

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto
3. En el menú lateral, ve a **APIs & Services** > **OAuth consent screen**

### Paso 2: Completar Información Requerida

Asegúrate de tener completada toda la información:

#### Información de la App:
- **App name**: FlowSpace (o el nombre que prefieras)
- **User support email**: Tu email de soporte
- **App logo**: (Opcional) Puedes subir un logo
- **App domain**: Tu dominio (ej: `flowspace.farmavet-bodega.cl`)
- **Application home page**: URL de tu aplicación
- **Application privacy policy link**: (Recomendado) URL a tu política de privacidad
- **Application terms of service link**: (Opcional) URL a tus términos de servicio
- **Authorized domains**: Agrega tu dominio (sin `http://` o `https://`)

#### Scopes:
- Verifica que tengas configurados:
  - `https://www.googleapis.com/auth/calendar`
  - `https://www.googleapis.com/auth/calendar.events`

#### Test users:
- Puedes mantener usuarios de prueba aquí si quieres, pero no serán necesarios una vez publicada

### Paso 3: Publicar la Aplicación

1. En la parte superior de la página de OAuth consent screen, verás el estado actual: **"Testing"**
2. Haz clic en el botón **"PUBLISH APP"** o **"Publish"**
3. Google mostrará una advertencia sobre los requisitos de verificación
4. Lee la advertencia cuidadosamente
5. Si estás de acuerdo, haz clic en **"CONFIRM"** o **"Publish"**

### Paso 4: Esperar Publicación

- La aplicación se publicará inmediatamente
- El estado cambiará a **"In production"**
- **Cualquier usuario** con cuenta de Google podrá conectarla

---

## 🔍 Verificación de Google (Si es Necesaria)

### ¿Cuándo requiere verificación?

Google puede requerir verificación si:

1. **Scopes sensibles**: Scopes que acceden a datos sensibles del usuario
2. **Muchos usuarios**: Si esperas más de 100 usuarios activos
3. **Scopes restringidos**: Algunos scopes específicos requieren verificación obligatoria

### Para nuestros scopes (`calendar` y `calendar.events`):

- ✅ Generalmente **NO requieren verificación** para uso básico
- ✅ Son scopes relativamente seguros
- ⚠️ Si Google lo solicita, deberás completar el proceso de verificación

### Proceso de Verificación (si es necesario):

1. Google te notificará si requiere verificación
2. Deberás completar un formulario explicando:
   - Qué hace tu aplicación
   - Cómo usas los datos del usuario
   - Política de privacidad
   - Términos de servicio
3. Google revisará tu solicitud (puede tomar varios días)
4. Una vez aprobada, la aplicación estará completamente publicada

---

## ✅ Verificar que Está Publicada

1. Ve a **OAuth consent screen**
2. Verifica que el estado diga **"In production"** (en lugar de "Testing")
3. Ya no verás la sección "Test users" como requerida
4. Cualquier usuario podrá autorizar la aplicación

---

## 🧪 Probar con Usuario Nuevo

Para verificar que funciona:

1. Usa una cuenta de Google diferente (o pide a alguien que pruebe)
2. Intenta conectar Google Calendar desde FlowSpace
3. Deberías poder autorizar sin problemas
4. No deberías ver el error "access_denied"

---

## 🔄 Volver a Modo Testing (Si es Necesario)

Si necesitas volver a modo Testing:

1. Ve a **OAuth consent screen**
2. Haz clic en **"BACK TO TESTING"** o similar
3. Confirma el cambio
4. Solo los usuarios en la lista de prueba podrán usar la aplicación

---

## 📝 Checklist Antes de Publicar

Antes de publicar, asegúrate de tener:

- [ ] App name configurado
- [ ] User support email configurado
- [ ] App domain configurado
- [ ] Application home page URL configurada
- [ ] Privacy policy link (recomendado)
- [ ] Authorized domains agregados
- [ ] Scopes correctos configurados (`calendar` y `calendar.events`)
- [ ] Redirect URIs correctos en las credenciales OAuth
- [ ] Variables de entorno configuradas en el backend

---

## 🚨 Problemas Comunes

### Error: "App verification required"

**Solución**: Completa el proceso de verificación de Google. Esto puede tomar varios días.

### Error: "Invalid domain"

**Solución**: Verifica que el dominio en "Authorized domains" sea correcto (sin protocolo, sin www).

### La aplicación sigue en modo Testing

**Solución**: 
- Verifica que hayas hecho clic en "PUBLISH APP" y confirmado
- Espera unos minutos para que los cambios se propaguen
- Refresca la página de Google Cloud Console

---

## 💡 Recomendaciones

1. **Desarrollo**: Mantén en modo "Testing" durante desarrollo
2. **Producción**: Publica solo cuando estés listo para usuarios reales
3. **Privacidad**: Asegúrate de tener una política de privacidad clara
4. **Monitoreo**: Revisa regularmente el uso de la API en Google Cloud Console

---

## 📚 Referencias

- [OAuth Consent Screen Documentation](https://support.google.com/cloud/answer/10311615)
- [App Verification Process](https://support.google.com/cloud/answer/9110914)
- [OAuth 2.0 Scopes](https://developers.google.com/identity/protocols/oauth2/scopes)

---

**Última actualización**: Diciembre 2024

