# 📝 Notas Técnicas - FlowSpace

Este archivo contiene notas técnicas importantes para facilitar el mantenimiento futuro del proyecto.

## 🎯 Información Rápida

**Última actualización**: Diciembre 2024  
**Versión**: 0.0.0  
**Estado**: Funcional y en producción

---

## 📁 Archivos Críticos

### Frontend

#### `src/LabSync.jsx` (5371 líneas)
- **Componente principal** de la aplicación
- **Tiene índice detallado** al inicio del archivo (líneas 1-60)
- **Dos renders**: móvil (línea 2278) y desktop (línea 4111)
- **No dividir** sin análisis profundo - muchas interdependencias

#### `src/apiService.js`
- **Cliente API** para comunicación con backend
- Funciones organizadas por sección: `apiAuth`, `apiGroups`, `apiTasks`, `apiEquipment`
- Maneja tokens JWT automáticamente
- WebSocket connection incluida

#### `src/App.jsx`
- **Componente raíz**
- Maneja autenticación y carga inicial
- Decide mostrar `Login` o `FlowSpace`

### Backend

#### `backend/server.js`
- **Servidor principal** Express
- Configura WebSocket
- Inicializa Firebase y cron jobs

#### `backend/routes/auth.js`
- **Rutas de autenticación**
- JWT tokens con 30 días de expiración
- Endpoint `/api/auth/users` para obtener todos los usuarios

---

## 🔑 Conceptos Clave

### Contextos
- **'work'**: Espacio de trabajo profesional
- **'personal'**: Espacio personal/familiar
- Se guarda en localStorage por usuario
- Primer acceso va a 'personal' para ver ejemplos

### Grupos
- Cada grupo tiene un `code` único para unirse
- Los grupos pueden ser 'work' o 'personal'
- Los usuarios pueden ser miembros de múltiples grupos
- El creador puede eliminar el grupo

### Tareas
- Estados: 'pending', 'completed', 'blocked', 'upcoming'
- Prioridades: 'low', 'medium', 'high'
- Se asignan a usuarios (assignees)
- Tienen categorías predefinidas
- Sistema de scoring al completar

### WebSocket
- Sincroniza cambios en tiempo real
- Se reconecta automáticamente si se desconecta
- Envía token JWT en la conexión
- Notifica cambios de tareas y grupos

---

## 🐛 Problemas Conocidos y Soluciones

### Problema: Tareas no se sincronizan
**Solución**: Verificar conexión WebSocket en consola. Revisar `backend/websocket/websocket.js`

### Problema: Token JWT expirado
**Solución**: El token expira a los 30 días. El usuario debe hacer login nuevamente.

### Problema: Build falla
**Solución**: Verificar que todas las dependencias estén instaladas. Ejecutar `npm install` en raíz y `backend/`

---

## 🔧 Comandos Útiles

### Desarrollo
```bash
# Frontend
npm run dev

# Backend
cd backend
npm run dev
```

### Producción
```bash
# Build frontend
npm run build

# Iniciar backend con PM2
cd backend
pm2 start server.js --name flowspace-backend
pm2 save
```

### Base de datos
```bash
# Conectar a PostgreSQL
psql -U usuario -d flowspace

# Ver tablas
\dt

# Ver estructura de tabla
\d nombre_tabla
```

---

## 📊 Estructura de Base de Datos

### Tablas principales:
- `users`: Usuarios del sistema
- `groups`: Grupos de trabajo
- `group_members`: Relación usuarios-grupos
- `tasks`: Tareas
- `fcm_tokens`: Tokens para notificaciones push
- `notification_preferences`: Preferencias de notificaciones
- `equipment`: Equipos con QR
- `equipment_logs`: Logs de equipos

---

## 🚨 Cambios Importantes Recientes

### Diciembre 2024
- ✅ Eliminado `authService.js` (localStorage legacy)
- ✅ Migrado todo a `apiService.js` (backend)
- ✅ Agregado endpoint `GET /api/auth/users`
- ✅ Extraídos componentes pequeños: `QRCodeDisplay`, `EmojiButton`
- ✅ Creada utilidad `localStorage.js` para funciones básicas
- ✅ Reorganizada documentación

---

## 💡 Tips para Mantenimiento

1. **Antes de modificar LabSync.jsx**: Revisa el índice al inicio del archivo
2. **Para agregar nueva funcionalidad**: Busca la sección relacionada usando el índice
3. **Para debug**: Usa los comentarios `// DEBUG:` en el código
4. **Para entender flujo**: Revisa `GUIA_FUNCIONES.md`
5. **Para deploy**: Ver `DEPLOYMENT.md` o `DEPLOY-VERCEL.md`

---

## 🔍 Búsqueda Rápida

### ¿Dónde está la lógica de...?

- **Autenticación**: `src/apiService.js` → `apiAuth`
- **Tareas**: `src/LabSync.jsx` → líneas 490-700, 1336-1524
- **Grupos**: `src/LabSync.jsx` → líneas 1955-2068
- **Equipos**: `src/LabSync.jsx` → líneas 1757-1954
- **IA/Resúmenes**: `src/LabSync.jsx` → líneas 877-1435
- **WebSocket**: `src/apiService.js` → `createWebSocketConnection`
- **Backend API**: `backend/routes/`

---

## 📞 Referencias Rápidas

- **Guía completa**: `GUIA_FUNCIONES.md`
- **Deploy VPS**: `DEPLOYMENT.md`
- **Deploy Vercel**: `DEPLOY-VERCEL.md`
- **Setup rápido**: `QUICK_START.md`
- **Config usuario**: `SETUP_USER.md`

---

**Mantén este archivo actualizado cuando hagas cambios importantes.**




