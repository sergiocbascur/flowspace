# 🚀 Despliegue en Vercel - FlowSpace Frontend

Esta guía te ayudará a desplegar el frontend de FlowSpace en Vercel (gratis) mientras mantienes el backend en tu VPS.

## ✅ Ventajas de Vercel

- ✅ **Gratis** para proyectos personales
- ✅ **Despliegue automático** desde GitHub
- ✅ **CDN global** (carga rápida desde cualquier lugar)
- ✅ **HTTPS automático**
- ✅ **No consume recursos de tu VPS**
- ✅ **No necesitas mantener tu PC encendido**

## 📋 Pasos para Desplegar

### 1. Crear cuenta en Vercel

1. Ve a https://vercel.com
2. Haz clic en "Sign Up"
3. Conecta tu cuenta de GitHub (recomendado)

### 2. Importar Proyecto

1. En el dashboard de Vercel, haz clic en "Add New..." → "Project"
2. Selecciona tu repositorio `flowspace` de GitHub
3. Vercel detectará automáticamente que es un proyecto Vite

### 3. Configurar Variables de Entorno

En la sección "Environment Variables", agrega:

```
VITE_API_URL=https://api.flowspace.farmavet-bodega.cl/api
VITE_WS_URL=wss://api.flowspace.farmavet-bodega.cl
```

**Importante:** Asegúrate de que el backend en el VPS permita CORS desde el dominio de Vercel.

### 4. Configuración del Proyecto

Vercel detectará automáticamente:
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

Si no lo detecta, configura manualmente:
- **Framework Preset:** Vite
- **Root Directory:** `./` (o la carpeta donde está el frontend si está en un subdirectorio)

### 5. Desplegar

1. Haz clic en "Deploy"
2. Espera 2-3 minutos mientras Vercel construye y despliega
3. Obtendrás una URL como: `https://flowspace-xxxxx.vercel.app`

### 6. Configurar Dominio Personalizado (Opcional)

Si quieres usar tu dominio `flowspace.farmavet-bodega.cl`:

1. En el proyecto de Vercel, ve a "Settings" → "Domains"
2. Agrega `flowspace.farmavet-bodega.cl`
3. Sigue las instrucciones para configurar los DNS

**Nota:** Si usas el dominio personalizado, necesitarás actualizar la configuración de Nginx en el VPS para que apunte a Vercel en lugar de servir archivos estáticos.

## 🔧 Configuración del Backend (VPS)

Asegúrate de que el backend permita CORS desde el dominio de Vercel:

```javascript
// En tu backend (Express/Node.js)
const cors = require('cors');

app.use(cors({
  origin: [
    'https://flowspace.farmavet-bodega.cl',
    'https://flowspace-xxxxx.vercel.app', // Tu URL de Vercel
    'https://*.vercel.app' // O permitir todos los subdominios de Vercel
  ],
  credentials: true
}));
```

## 🔄 Despliegue Automático

Una vez configurado, cada vez que hagas `git push` a la rama `main`:
1. Vercel detectará el cambio automáticamente
2. Construirá el proyecto
3. Desplegará la nueva versión
4. Te notificará por email (opcional)

## 📝 Notas Importantes

- **Backend sigue en VPS:** Solo el frontend se despliega en Vercel
- **Variables de entorno:** Se configuran en el dashboard de Vercel, no en archivos `.env`
- **Build local:** Puedes seguir haciendo builds locales para probar antes de hacer push
- **Costo:** Gratis hasta cierto límite de tráfico (más que suficiente para proyectos personales)

## 🆘 Solución de Problemas

### Error de CORS
- Verifica que el backend permita el origen de Vercel
- Revisa los headers CORS en el backend

### Variables de entorno no funcionan
- Asegúrate de que las variables empiecen con `VITE_`
- Reinicia el deployment después de agregar variables

### Build falla
- Revisa los logs en Vercel
- Asegúrate de que `package.json` tenga el script `build`

## 🔗 Enlaces Útiles

- [Documentación de Vercel](https://vercel.com/docs)
- [Guía de Vite en Vercel](https://vercel.com/guides/deploying-vite-to-vercel)






