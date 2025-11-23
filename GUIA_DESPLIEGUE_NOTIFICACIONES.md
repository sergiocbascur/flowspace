# 🚀 GUÍA DE DESPLIEGUE - NOTIFICACIONES PUSH

## 📋 PASO A PASO (Copia y pega cada comando)

### ✅ PASO 1: Verificar que el archivo secreto NO se suba a Git

```powershell
# Ver qué archivos se van a subir
git status

# Si ves "firebase-service-account.json" en la lista, DETENTE
# Ese archivo NO debe aparecer (ya está en .gitignore)
```

**✅ Resultado esperado**: NO debe aparecer `firebase-service-account.json`

---

### ✅ PASO 2: Subir cambios a GitHub

```powershell
# Agregar todos los cambios
git add .

# Hacer commit
git commit -m "feat: Implementar notificaciones push Firebase"

# Subir a GitHub
git push origin main
```

**✅ Resultado esperado**: Mensaje "Everything up-to-date" o confirmación de push

---

### ✅ PASO 3: Conectarte a tu VPS

```powershell
# Reemplaza con tus datos reales
ssh usuario@tu-vps-ip

# Ejemplo:
# ssh root@123.456.789.0
# o
# ssh ubuntu@mi-servidor.com
```

**✅ Resultado esperado**: Estás dentro del VPS (el prompt cambia)

---

### ✅ PASO 4: Actualizar el código en el VPS

```bash
# Ir a la carpeta del proyecto
cd /ruta/a/tu/proyecto

# Ejemplo común:
# cd /var/www/genshiken
# o
# cd ~/genshiken

# Hacer pull de los cambios
git pull origin main
```

**✅ Resultado esperado**: Mensaje de archivos actualizados

---

### ✅ PASO 5: Instalar nueva dependencia (Firebase Admin)

```bash
# Ir a la carpeta del backend
cd backend

# Instalar firebase-admin
npm install

# Verificar que se instaló
npm list firebase-admin
```

**✅ Resultado esperado**: Muestra `firebase-admin@X.X.X`

---

### ✅ PASO 6: Crear el archivo de credenciales en el VPS

**Opción A - Usando nano (más fácil)**:

```bash
# Crear el archivo
nano firebase-service-account.json
```

Ahora:
1. **Abre** el archivo `backend/firebase-service-account.json` en tu PC
2. **Copia** TODO el contenido (Ctrl+A, Ctrl+C)
3. **Pega** en la terminal del VPS (Click derecho)
4. **Guarda**: Ctrl+O, Enter, Ctrl+X

**Opción B - Usando echo (más rápido)**:

```bash
# Copia el contenido del JSON de tu PC
# Luego ejecuta esto (reemplaza con tu JSON real):

cat > firebase-service-account.json << 'EOF'
{
  "type": "service_account",
  "project_id": "genshiken-1d5b3",
  "private_key_id": "...",
  "private_key": "...",
  "client_email": "...",
  "client_id": "...",
  "auth_uri": "...",
  "token_uri": "...",
  "auth_provider_x509_cert_url": "...",
  "client_x509_cert_url": "..."
}
EOF
```

**✅ Resultado esperado**: Archivo creado correctamente

---

### ✅ PASO 7: Verificar que el archivo se creó bien

```bash
# Ver que existe
ls -la firebase-service-account.json

# Ver las primeras líneas (sin mostrar la clave privada completa)
head -n 5 firebase-service-account.json
```

**✅ Resultado esperado**: Muestra el inicio del JSON

---

### ✅ PASO 8: Reiniciar el backend

**Si usas PM2**:
```bash
pm2 restart backend
# o
pm2 restart all

# Ver logs
pm2 logs backend --lines 50
```

**Si usas systemd**:
```bash
sudo systemctl restart genshiken-backend
# o el nombre de tu servicio

# Ver logs
sudo journalctl -u genshiken-backend -n 50 -f
```

**Si usas Docker**:
```bash
docker-compose restart backend
# o
docker restart nombre-contenedor-backend
```

**✅ Resultado esperado**: 
- Mensaje: `✅ Conectado a PostgreSQL`
- Mensaje: `✅ Tablas creadas/verificadas correctamente (incluyendo FCM)`
- Mensaje: `✅ Firebase Admin SDK inicializado correctamente`
- Servidor corriendo sin errores

---

### ✅ PASO 9: Verificar que las tablas se crearon

```bash
# Conectarte a tu base de datos
# (El comando depende de dónde esté tu DB)

# Si es local en el VPS:
psql -U tu_usuario -d tu_database

# Si es Neon o remota, usa el connection string que tengas
```

Luego ejecuta:
```sql
-- Ver las nuevas tablas
\dt

-- Deberías ver:
-- fcm_tokens
-- notification_preferences

-- Salir
\q
```

**✅ Resultado esperado**: Las tablas existen

---

### ✅ PASO 10: Construir y desplegar el frontend

**Vuelve a tu PC** (sal del VPS con `exit`):

```powershell
# En tu PC, en la carpeta del proyecto
npm run build

# Desplegar
.\deploy-local-simple.ps1
```

**✅ Resultado esperado**: Build exitoso y desplegado

---

## 🎯 VERIFICACIÓN FINAL

### En el navegador:

1. **Abre** tu app desplegada
2. **Inicia sesión**
3. **Acepta** el permiso de notificaciones cuando aparezca
4. **Abre la consola** del navegador (F12)
5. **Busca** estos mensajes:
   - `✅ Notificaciones push configuradas`
   - `📱 Token FCM obtenido: ...`

### En el VPS:

```bash
# Ver logs del backend
pm2 logs backend --lines 20

# Deberías ver:
# ✅ Firebase Admin SDK inicializado correctamente
# ✅ Token FCM guardado en el backend
```

---

## ⚠️ TROUBLESHOOTING

### Si el backend no arranca:

```bash
# Ver logs detallados
pm2 logs backend --err --lines 100

# Verificar que el archivo existe
ls -la backend/firebase-service-account.json

# Verificar permisos
chmod 600 backend/firebase-service-account.json
```

### Si no aparece el popup de permisos:

1. Verifica que estés en **HTTPS** (no HTTP)
2. Revisa la consola del navegador por errores
3. Intenta en modo incógnito

### Si las tablas no se crean:

```bash
# Ver logs de la base de datos en el backend
pm2 logs backend | grep -i "tabla\|table\|error"
```

---

## 📝 NOTAS IMPORTANTES

- ✅ El archivo `firebase-service-account.json` está en `.gitignore`
- ✅ Las tablas se crean automáticamente al arrancar el backend
- ✅ No importa si tu DB está en Neon, Render, o local
- ✅ El frontend solicita permisos automáticamente al login
- ✅ Los tokens se guardan en la base de datos

---

## 🆘 SI ALGO FALLA

Envíame:
1. Los logs del backend: `pm2 logs backend --lines 50`
2. Errores de la consola del navegador
3. El paso donde te quedaste

---

¿Listo para empezar? Comienza por el **PASO 1** y avísame cuando llegues al PASO 6 (crear el archivo en el VPS) si necesitas ayuda.
