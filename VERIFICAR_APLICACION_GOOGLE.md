# ✅ Verificar Aplicación OAuth con Google

Esta guía explica cómo verificar tu aplicación OAuth con Google para eliminar la advertencia "Esta aplicación no está verificada" que aparece cuando los usuarios intentan conectar su Google Calendar.

---

## ⚠️ ¿Por qué aparece la advertencia?

Cuando una aplicación OAuth está publicada pero **no verificada**, Google muestra una advertencia de seguridad:

```
Esta aplicación no está verificada
Google no ha verificado esta aplicación. Puede que no sea segura.
```

Esto es normal y ocurre porque:
- La aplicación está en modo "In production" pero no ha pasado por el proceso de verificación de Google
- Google quiere proteger a los usuarios de aplicaciones potencialmente maliciosas
- Es parte del proceso de seguridad de Google

---

## 🎯 ¿Es necesario verificar?

### Para scopes de Calendar (`calendar` y `calendar.events`):

**Respuesta corta**: No es estrictamente necesario, pero es recomendable.

**Detalles**:
- Los usuarios pueden hacer clic en "Avanzado" > "Ir a [tu app] (no seguro)" y continuar
- La aplicación funcionará normalmente
- Pero la advertencia puede asustar a algunos usuarios y reducir la confianza

### ¿Cuándo SÍ es necesario verificar?

Google **requiere** verificación si:
1. Solicitas scopes sensibles (Gmail, Drive completo, etc.)
2. Esperas más de 100 usuarios activos
3. Solicitas scopes restringidos específicos

Para Calendar, generalmente es **opcional pero recomendado**.

---

## 📋 Proceso de Verificación

### Paso 1: Preparar Documentación

Antes de solicitar verificación, necesitas tener:

#### 1. Política de Privacidad
- Debe estar accesible públicamente
- Debe explicar qué datos recopilas y cómo los usas
- Debe incluir información de contacto
- Ejemplo de URL: `https://tu-dominio.com/privacy-policy`

#### 2. Términos de Servicio (Recomendado)
- Explica las condiciones de uso
- Ejemplo de URL: `https://tu-dominio.com/terms-of-service`

#### 3. Información de la Aplicación
- Descripción clara de qué hace tu aplicación
- Cómo usas los datos del usuario
- Qué permisos solicitas y por qué

### Paso 2: Completar OAuth Consent Screen

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto
3. Ve a **APIs & Services** > **OAuth consent screen**

Asegúrate de tener completado:
- ✅ App name
- ✅ User support email
- ✅ App domain
- ✅ Application home page
- ✅ **Privacy policy link** (REQUERIDO para verificación)
- ✅ Terms of service link (Recomendado)
- ✅ Authorized domains

### Paso 3: Solicitar Verificación

1. En la página de **OAuth consent screen**, busca la sección de verificación
2. Si ves un botón **"Submit for verification"** o **"Request verification"**, haz clic
3. Si no ves el botón, puede que Google aún no lo requiera para tus scopes

### Paso 4: Completar Formulario de Verificación

Google te pedirá información sobre:

#### Información Básica:
- **App name**: FlowSpace
- **App homepage**: URL de tu aplicación
- **App logo**: Logo de tu aplicación (opcional pero recomendado)

#### Descripción de la App:
```
FlowSpace es una aplicación de gestión de tareas y productividad que permite 
a los usuarios sincronizar sus tareas con Google Calendar. La aplicación 
crea eventos en el calendario del usuario cuando completa tareas, ayudándolos 
a mantener un registro de su productividad.
```

#### Uso de Datos:
Explica cómo usas los datos:
```
FlowSpace solicita acceso al calendario de Google para:
- Crear eventos cuando el usuario completa tareas
- Actualizar eventos cuando las tareas cambian
- Eliminar eventos cuando las tareas se eliminan

No almacenamos el contenido de los eventos del calendario, solo creamos y 
gestionamos eventos relacionados con las tareas del usuario.
```

#### Scopes Solicitados:
Para cada scope, explica por qué lo necesitas:

**`https://www.googleapis.com/auth/calendar`**:
```
Necesitamos acceso al calendario para crear eventos cuando el usuario 
completa una tarea. Esto permite al usuario ver sus logros de productividad 
directamente en su calendario de Google.
```

**`https://www.googleapis.com/auth/calendar.events`**:
```
Necesitamos acceso a eventos específicos para actualizar o eliminar eventos 
cuando las tareas correspondientes cambian o se eliminan en FlowSpace.
```

#### Video de Demostración (Recomendado):
- Crea un video corto (2-5 minutos) mostrando cómo funciona la integración
- Muestra el flujo completo: conectar calendario → crear tarea → evento aparece en Google Calendar
- Sube el video a YouTube (puede ser privado) y comparte el enlace

### Paso 5: Enviar Solicitud

1. Revisa toda la información
2. Asegúrate de que los enlaces funcionen
3. Haz clic en **"Submit"** o **"Send for review"**

---

## ⏱️ Tiempo de Revisión

- **Tiempo estimado**: 1-7 días hábiles
- Google revisará tu solicitud manualmente
- Pueden pedirte información adicional
- Te notificarán por email cuando se complete la revisión

---

## ✅ Después de la Verificación

Una vez verificada:
- ✅ La advertencia desaparecerá
- ✅ Los usuarios verán: "Verificado por Google"
- ✅ Mayor confianza de los usuarios
- ✅ Mejor experiencia de usuario

---

## 🔄 Si Google Rechaza la Solicitud

Si Google rechaza tu solicitud:

1. Revisa el email de Google con los motivos
2. Corrige los problemas mencionados
3. Actualiza la información en OAuth consent screen
4. Vuelve a enviar la solicitud

Problemas comunes:
- Política de privacidad incompleta o inaccesible
- Descripción poco clara del uso de datos
- Scopes solicitados sin justificación adecuada
- Información de contacto incorrecta

---

## 📝 Checklist para Verificación

Antes de solicitar verificación, asegúrate de tener:

- [ ] Política de privacidad pública y accesible
- [ ] Términos de servicio (recomendado)
- [ ] OAuth consent screen completamente configurado
- [ ] Descripción clara de qué hace la aplicación
- [ ] Explicación de por qué necesitas cada scope
- [ ] Video de demostración (recomendado)
- [ ] Información de contacto correcta
- [ ] App logo (recomendado)
- [ ] App domain configurado correctamente

---

## 💡 Alternativa: Reducir la Advertencia

Si no quieres pasar por el proceso de verificación completo, puedes:

### Opción 1: Mensaje Personalizado
En OAuth consent screen, puedes agregar un mensaje personalizado que aparecerá antes de la advertencia, explicando que es una aplicación legítima.

### Opción 2: Mantener en Testing
Si solo tienes pocos usuarios, puedes mantener la aplicación en modo "Testing" y agregar usuarios manualmente. No aparecerá la advertencia para usuarios de prueba.

### Opción 3: Aceptar la Advertencia
Los usuarios pueden hacer clic en "Avanzado" > "Ir a [tu app]" y continuar. La aplicación funcionará normalmente.

---

## 🎬 Crear Video de Demostración

Un buen video de demostración debe mostrar:

1. **Inicio**: Explicar qué es FlowSpace
2. **Conectar Calendario**: Mostrar el proceso de conexión
3. **Crear Tarea**: Crear una tarea con fecha límite
4. **Ver Evento**: Mostrar que el evento aparece en Google Calendar
5. **Actualizar Tarea**: Cambiar la tarea y mostrar que el evento se actualiza
6. **Conclusión**: Resumir la funcionalidad

**Duración recomendada**: 2-5 minutos
**Calidad**: Puede ser grabación de pantalla simple
**Visibilidad**: Puede ser privado en YouTube, solo comparte el enlace con Google

---

## 📚 Referencias

- [OAuth Verification Process](https://support.google.com/cloud/answer/9110914)
- [OAuth Consent Screen](https://support.google.com/cloud/answer/10311615)
- [App Verification FAQ](https://support.google.com/cloud/answer/7454865)

---

## 🆘 Ayuda Adicional

Si tienes problemas con la verificación:

1. Revisa los emails de Google cuidadosamente
2. Asegúrate de que todos los enlaces funcionen
3. Proporciona información detallada sobre el uso de datos
4. Considera contactar al soporte de Google Cloud si es necesario

---

**Última actualización**: Diciembre 2024

