# 📚 Guía de Funciones y Estructura del Proyecto FlowSpace

Esta guía documenta la estructura del proyecto, las funciones principales y dónde se encuentran.

## 📁 Estructura del Proyecto

```
Genshiken/
├── src/                          # Código fuente del frontend
│   ├── App.jsx                   # Componente raíz de la aplicación
│   ├── Login.jsx                 # Componente de autenticación
│   ├── LabSync.jsx               # Componente principal de la aplicación (gestión de tareas)
│   ├── apiService.js             # Servicio para comunicación con el backend
│   ├── utils/                    # Utilidades
│   │   ├── localStorage.js       # Funciones para manejar localStorage
│   │   └── emojiMart.js          # Inicialización de Emoji Mart
│   ├── components/               # Componentes reutilizables
│   │   ├── Header.jsx            # Encabezado de la aplicación
│   │   ├── Sidebar.jsx           # Barra lateral de navegación
│   │   ├── TaskCard.jsx          # Tarjeta de tarea individual
│   │   ├── TaskList.jsx          # Lista de tareas
│   │   ├── MobileTaskCard.jsx    # Tarjeta de tarea para móvil
│   │   ├── CalendarView.jsx      # Vista de calendario
│   │   ├── QRCodeDisplay.jsx     # Componente para mostrar códigos QR
│   │   ├── EmojiButton.jsx       # Botón para mostrar emojis
│   │   └── modals/               # Modales de la aplicación
│   │       ├── GroupModal.jsx    # Modal para crear/unirse a grupos
│   │       ├── DeleteAccountModal.jsx
│   │       ├── LeaveGroupModal.jsx
│   │       ├── SettingsModal.jsx
│   │       ├── QRScannerModal.jsx
│   │       └── EquipmentSearchModal.jsx
│   └── services/                 # Servicios
│       └── notificationService.js
├── backend/                      # Código del servidor
│   ├── server.js                 # Servidor principal Express
│   ├── routes/                   # Rutas de la API
│   │   ├── auth.js               # Rutas de autenticación
│   │   ├── groups.js             # Rutas de grupos
│   │   ├── tasks.js              # Rutas de tareas
│   │   ├── equipment.js          # Rutas de equipos
│   │   └── notifications.js      # Rutas de notificaciones
│   ├── db/                       # Configuración de base de datos
│   │   └── connection.js          # Conexión a PostgreSQL
│   ├── middleware/               # Middlewares
│   │   └── auth.js               # Middleware de autenticación JWT
│   ├── websocket/                # WebSocket
│   │   └── websocket.js          # Configuración de WebSocket
│   ├── utils/                    # Utilidades del backend
│   │   ├── emailService.js      # Servicio de envío de emails
│   │   ├── geolocation.js        # Utilidades de geolocalización
│   │   ├── helpers.js            # Funciones auxiliares
│   │   └── notificationService.js # Servicio de notificaciones push
│   ├── config/                   # Configuraciones
│   │   └── firebase.js           # Configuración de Firebase
│   └── cron/                     # Tareas programadas
│       └── scheduler.js          # Planificador de tareas
└── public/                       # Archivos estáticos
```

---

## 🔐 Autenticación y Usuarios

### Frontend

#### `src/utils/localStorage.js`
Funciones para manejar el almacenamiento local del navegador.

- **`saveLastUser(username)`**: Guarda el último usuario que inició sesión
- **`getLastUser()`**: Obtiene el último usuario guardado
- **`clearLastUser()`**: Elimina el último usuario guardado

#### `src/apiService.js` - Sección `apiAuth`

Funciones para autenticación y gestión de usuarios:

- **`sendVerificationCode(email, username)`**: Envía código de verificación por email
- **`verifyCode(email, code)`**: Verifica código de verificación
- **`register(username, email, password, avatar)`**: Registra un nuevo usuario
- **`login(username, password)`**: Inicia sesión
- **`getCurrentUser()`**: Obtiene información del usuario actual
- **`getAllUsers()`**: Obtiene lista de todos los usuarios (sin información sensible)
- **`logout()`**: Cierra sesión
- **`deleteAccount()`**: Elimina la cuenta del usuario
- **`requestPasswordReset(email)`**: Solicita recuperación de contraseña
- **`resetPassword(token, newPassword)`**: Restablece la contraseña con token
- **`updateProfile(avatar)`**: Actualiza el avatar del usuario

#### `src/Login.jsx`
Componente de autenticación que maneja:
- Login
- Registro (con verificación de email)
- Recuperación de contraseña
- Restablecimiento de contraseña

**Funciones principales:**
- `handleLogin()`: Maneja el inicio de sesión
- `handleSendVerificationCode()`: Envía código de verificación
- `handleVerifyCode()`: Verifica código
- `handleRegister()`: Registra nuevo usuario
- `handleRequestReset()`: Solicita recuperación
- `handleResetPassword()`: Restablece contraseña

#### `src/App.jsx`
Componente raíz que:
- Verifica sesión activa al cargar
- Maneja el estado de autenticación
- Carga lista de usuarios
- Renderiza `Login` o `FlowSpace` según el estado

**Funciones principales:**
- `checkSession()`: Verifica si hay sesión activa
- `handleLogin(user)`: Maneja login exitoso
- `handleLogout()`: Maneja cierre de sesión
- `handleUserUpdate(updatedUser)`: Actualiza información del usuario

### Backend

#### `backend/routes/auth.js`
Rutas de autenticación:

- **`POST /api/auth/send-verification-code`**: Envía código de verificación
- **`POST /api/auth/verify-code`**: Verifica código
- **`POST /api/auth/register`**: Registra usuario
- **`POST /api/auth/login`**: Inicia sesión
- **`GET /api/auth/me`**: Obtiene usuario actual (requiere autenticación)
- **`GET /api/auth/users`**: Obtiene todos los usuarios (requiere autenticación)
- **`PATCH /api/auth/profile`**: Actualiza perfil (avatar)
- **`POST /api/auth/forgot-password`**: Solicita recuperación
- **`POST /api/auth/reset-password`**: Restablece contraseña
- **`DELETE /api/auth/account`**: Elimina cuenta

**Middleware:**
- `authenticateToken`: Verifica token JWT en requests protegidos

---

## 👥 Grupos

### Frontend

#### `src/apiService.js` - Sección `apiGroups`

- **`getAll()`**: Obtiene todos los grupos del usuario
- **`create(name, type)`**: Crea un nuevo grupo
- **`join(code)`**: Se une a un grupo con código
- **`leave(groupId)`**: Abandona un grupo
- **`delete(groupId)`**: Elimina un grupo
- **`updateScores(groupId, userId, points)`**: Actualiza puntajes

### Backend

#### `backend/routes/groups.js`
Rutas para gestión de grupos (ver archivo para detalles completos).

---

## ✅ Tareas

### Frontend

#### `src/apiService.js` - Sección `apiTasks`

- **`getByGroup(groupId)`**: Obtiene tareas de un grupo
- **`create(taskData)`**: Crea una nueva tarea
- **`update(taskId, updates)`**: Actualiza una tarea
- **`delete(taskId)`**: Elimina una tarea

#### `src/LabSync.jsx` (5371 líneas - Componente Principal)

**⚠️ IMPORTANTE**: Este es el componente más grande y complejo. Tiene un índice detallado al inicio del archivo.

**Estructura del componente:**
- **Líneas 1-32**: Imports y documentación
- **Líneas 34-300**: Estados y configuración inicial
- **Líneas 300-490**: Cálculos y memoizaciones
- **Líneas 490-700**: Handlers de tareas y carga de datos
- **Líneas 700-1955**: Handlers de grupos, equipos e IA
- **Líneas 2278-4110**: Render móvil (iOS-style)
- **Líneas 4111-5366**: Render desktop

**Funciones principales de tareas:**
- `handleAddTask()` (línea ~1336): Agrega nueva tarea al backend
- `handleDeleteTask(taskId)` (línea ~490): Elimina tarea
- `handleTaskMainAction(task)` (línea ~1524): Maneja acción principal (completar, posponer, bloquear)
- `addComment(id, txt)` (línea ~1698): Agrega comentario a tarea
- `calculateTaskScore(task)` (línea ~935): Calcula puntaje de tarea para IA
- `calculateTaskPoints(task, completedBy)` (línea ~1435): Calcula puntos al completar
- `updateGroupScores(groupId, userId, points)` (línea ~1505): Actualiza puntajes del grupo

**Funciones principales de grupos:**
- `handleCreateGroup()` (línea ~1955): Crea nuevo grupo
- `handleDeleteGroup(groupId)` (línea ~1974): Elimina grupo
- `handleLeaveGroup(groupId)` (línea ~2001): Abandona grupo
- `handleJoinGroup()` (línea ~2068): Se une a grupo con código

**Funciones principales de equipos:**
- `handleScanQR()` (línea ~1757): Inicia escaneo QR
- `handleEquipmentQRScanned(code)` (línea ~1763): Procesa código QR escaneado
- `handleEquipmentFound(code)` (línea ~1827): Maneja equipo encontrado
- `handleAddLog()` (línea ~1869): Agrega log a equipo

**Funciones de Inteligencia Artificial:**
- `generateIntelligentSummary()` (línea ~877): Genera resumen inteligente
- `generateWeeklyReport()` (línea ~1076): Genera reporte semanal
- `detectDateFromText(text)` (línea ~1270): Detecta fechas en español
- `handleProcessSuggestion(suggestionId)` (línea ~1406): Procesa sugerencia de IA

**Efectos importantes:**
- **Línea ~508**: Carga inicial de grupos y tareas desde backend
- **Línea ~566**: Conexión WebSocket para sincronización en tiempo real
- **Línea ~668**: Detección automática de tareas vencidas

**Estados críticos:**
- `tasks`: Array de todas las tareas
- `groups`: Array de todos los grupos
- `currentContext`: 'work' | 'personal'
- `activeGroupId`: ID del grupo activo o 'all'
- `isMobile`: Detecta si es dispositivo móvil
- `mobileView`: Estado de navegación móvil ('dashboard' | 'list')

**Notas importantes:**
- El componente renderiza dos versiones: móvil (línea 2278) y desktop (línea 4111)
- Los estados se comparten entre ambas versiones
- Las tareas se guardan en PostgreSQL, no en localStorage
- WebSocket sincroniza cambios en tiempo real entre usuarios

### Backend

#### `backend/routes/tasks.js`
Rutas para gestión de tareas (ver archivo para detalles completos).

---

## 🔧 Equipos

### Frontend

#### `src/apiService.js` - Sección `apiEquipment`

- **`getByQR(qrCode)`**: Obtiene equipo por código QR
- **`create(equipmentData)`**: Crea nuevo equipo
- **`update(qrCode, updates)`**: Actualiza equipo
- **`getLogs(qrCode)`**: Obtiene logs de un equipo
- **`addLog(qrCode, content)`**: Agrega log a un equipo

#### `src/LabSync.jsx` - Sección de Equipos

**Funciones principales:**
- `handleScanQR()`: Inicia escaneo de QR
- `handleEquipmentQRScanned(code)`: Maneja código QR escaneado
- `handleEquipmentFound(code)`: Maneja cuando se encuentra equipo
- `handleEquipmentNotFound(code)`: Maneja cuando no se encuentra
- `handleAddLog()`: Agrega log a equipo
- `handleConfirmCreateEquipment()`: Confirma creación de equipo

### Backend

#### `backend/routes/equipment.js`
Rutas para gestión de equipos (ver archivo para detalles completos).

---

## 🔔 Notificaciones

### Frontend

#### `src/services/notificationService.js`
Servicio para manejar notificaciones push.

### Backend

#### `backend/routes/notifications.js`
Rutas para gestión de notificaciones.

#### `backend/utils/notificationService.js`
Servicio de notificaciones push con Firebase Cloud Messaging.

---

## 🌐 WebSocket

### Frontend

#### `src/apiService.js` - Función `createWebSocketConnection`

- **`createWebSocketConnection(onMessage)`**: Crea conexión WebSocket
  - Se reconecta automáticamente si se desconecta
  - Envía token de autenticación
  - Llama a `onMessage` cuando recibe datos

### Backend

#### `backend/websocket/websocket.js`
Configuración del servidor WebSocket para sincronización en tiempo real.

---

## 🧠 Inteligencia Artificial

### Frontend

#### `src/LabSync.jsx` - Sección de Inteligencia

**Funciones principales:**
- `generateIntelligentSummary()`: Genera resumen inteligente de tareas
- `generateWeeklyReport()`: Genera reporte semanal
- `handleGenerateSummary()`: Maneja generación de resumen
- `handleProcessSuggestion(suggestionId)`: Procesa sugerencia de IA
- `detectDateFromText(text)`: Detecta fechas en texto en español

---

## 📅 Calendario

### Frontend

#### `src/LabSync.jsx` - Sección de Calendario

**Funciones principales:**
- `getDaysInMonth(month, year)`: Obtiene días del mes
- `getFirstDayOfMonth(month, year)`: Obtiene primer día del mes
- `formatDateForDisplay(dateStr)`: Formatea fecha para mostrar
- `handleDateSelect(day)`: Maneja selección de fecha
- `handlePrevMonth()`: Cambia al mes anterior
- `handleNextMonth()`: Cambia al mes siguiente

#### `src/components/CalendarView.jsx`
Componente de vista de calendario.

---

## 🎨 Componentes UI

### `src/components/Header.jsx`
Encabezado con:
- Búsqueda
- Selector de contexto (trabajo/personal)
- Notificaciones
- Configuración

### `src/components/Sidebar.jsx`
Barra lateral con:
- Lista de grupos
- Navegación
- Acciones rápidas

### `src/components/TaskCard.jsx`
Tarjeta de tarea individual con:
- Información de la tarea
- Asignados
- Comentarios
- Acciones

### `src/components/TaskList.jsx`
Lista de tareas con filtros.

### `src/components/MobileTaskCard.jsx`
Versión móvil de la tarjeta de tarea.

### `src/components/QRCodeDisplay.jsx`
Componente para mostrar códigos QR de grupos.
- Recibe `code` como prop
- Genera URL del QR usando api.qrserver.com

### `src/components/EmojiButton.jsx`
Botón para renderizar emojis de forma consistente.
- Props: `emoji`, `size`, `className`, `onClick`
- Usa fuentes nativas de emoji para mejor renderizado

### `src/utils/emojiMart.js`
Utilidad para inicializar Emoji Mart.
- `initializeEmojiMart()`: Inicializa la librería de forma asíncrona
- Se inicializa automáticamente al importar el módulo

---

## 🔄 Flujo de Datos

1. **Autenticación**: Usuario inicia sesión → Token JWT guardado
2. **Carga inicial**: App carga grupos y tareas desde backend
3. **WebSocket**: Conexión establecida para sincronización en tiempo real
4. **Acciones**: Usuario realiza acciones → Llamadas API → Actualización local → WebSocket notifica a otros usuarios
5. **Persistencia**: Cambios se guardan en PostgreSQL (backend) y se sincronizan vía WebSocket

---

## 📝 Notas Importantes

### Migración Completada
- ✅ `authService.js` (localStorage) fue eliminado
- ✅ Todas las funciones ahora usan `apiService.js` (backend)
- ✅ `getAllUsers()` ahora viene del backend
- ✅ `getLastUser()` ahora usa utilidad `localStorage.js`
- ✅ `deleteUser()` ahora usa `apiAuth.deleteAccount()`

### Archivos Grandes
- `LabSync.jsx` tiene ~5300 líneas - Es el componente principal que gestiona toda la lógica de la aplicación
  - Se han extraído componentes pequeños: `QRCodeDisplay`, `EmojiButton`, y utilidades de `emojiMart`
  - Considerar dividir en hooks personalizados en el futuro si crece más
  - Actualmente está bien organizado con secciones claras

### Variables de Entorno

**Frontend** (`.env`):
- `VITE_API_URL`: URL del backend API
- `VITE_WS_URL`: URL del WebSocket

**Backend** (`backend/.env`):
- `PORT`: Puerto del servidor
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`: Configuración de PostgreSQL
- `JWT_SECRET`: Secret para firmar JWT
- `CORS_ORIGIN`: Orígenes permitidos para CORS

---

## 🚀 Próximos Pasos Sugeridos

1. Considerar dividir `LabSync.jsx` en hooks personalizados:
   - `useTasks.js`
   - `useGroups.js`
   - `useIntelligence.js`
   - `useEquipment.js`

2. Agregar más tests unitarios

3. Documentar mejor las funciones de IA

---

**Última actualización**: Diciembre 2024
**Versión del proyecto**: 0.0.0

