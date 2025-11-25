# 📱 Plan: Escáner QR Mejorado con Opciones

## 🎯 Problema Actual
Cuando escaneas un QR code, no hay forma de:
- Saber si el recurso existe o no
- Elegir qué hacer si no existe (crear nuevo recurso)
- Seleccionar el tipo de vista a mostrar (ficha técnica, manual, lista de compras, etc.)

## 💡 Solución Propuesta

### Flujo de Escaneo Mejorado:

```
Usuario abre escáner
    ↓
Escanea QR Code
    ↓
¿El recurso existe?
    ├─ SÍ → Mostrar opciones de vista
    │         ├─ Ficha Técnica / Detalles
    │         ├─ Manual
    │         ├─ Tareas Relacionadas
    │         ├─ Lista de Compras
    │         └─ Documentación
    │
    └─ NO → Mostrar opciones de creación
              ├─ Crear como Equipo
              ├─ Crear como Habitación
              ├─ Crear como Persona
              ├─ Crear como Casa
              └─ Cancelar
```

---

## 🎨 Diseño UI

### Opción 1: Modal de Selección Post-Escaneo

**Cuando el recurso EXISTE:**
```
┌─────────────────────────────────────┐
│  ✓ QR Code Encontrado              │
│  [ROOM-KITCHEN-123]                 │
│                                     │
│  Selecciona qué quieres ver:        │
│                                     │
│  [📋] Ficha Técnica                 │
│  [📄] Manual                        │
│  [✅] Tareas Relacionadas           │
│  [🛒] Lista de Compras              │
│  [📚] Documentación                 │
│                                     │
│  [Cancelar]                         │
└─────────────────────────────────────┘
```

**Cuando el recurso NO EXISTE:**
```
┌─────────────────────────────────────┐
│  ⚠️  Recurso No Encontrado          │
│  [ROOM-KITCHEN-123]                 │
│                                     │
│  ¿Qué quieres hacer?                │
│                                     │
│  [🔧] Crear como Equipo             │
│  [🏠] Crear como Habitación         │
│  [👤] Crear como Persona            │
│  [🏡] Crear como Casa               │
│  [📍] Crear como Ubicación          │
│                                     │
│  [Cancelar]                         │
└─────────────────────────────────────┘
```

### Opción 2: Selector Antes de Escanear (Recomendado)

```
┌─────────────────────────────────────┐
│  Escanear QR Code                   │
│                                     │
│  ¿Qué acción quieres realizar?      │
│                                     │
│  ○ Escanear recurso existente       │
│  ○ Crear nuevo recurso              │
│                                     │
│  [Continuar]  [Cancelar]            │
└─────────────────────────────────────┘

Si selecciona "Escanear":
    ↓
    Escanea QR → Busca recurso → Muestra opciones de vista

Si selecciona "Crear":
    ↓
    Selecciona tipo:
    [Equipo] [Habitación] [Persona] [Casa]
    ↓
    Escanea QR → Crea recurso con ese QR code
```

---

## 🔧 Implementación Técnica

### Componente: `QRScannerWithOptions.jsx`

```javascript
const QRScannerWithOptions = ({ onScan, onCancel }) => {
    const [mode, setMode] = useState(null); // 'scan' | 'create'
    const [resourceType, setResourceType] = useState(null);
    const [scannedCode, setScannedCode] = useState(null);
    const [resourceExists, setResourceExists] = useState(null);
    const [loading, setLoading] = useState(false);

    // Paso 1: Seleccionar modo
    if (!mode) {
        return (
            <ModeSelector 
                onSelectMode={(mode) => setMode(mode)}
                onCancel={onCancel}
            />
        );
    }

    // Paso 2: Si es "crear", seleccionar tipo
    if (mode === 'create' && !resourceType) {
        return (
            <ResourceTypeSelector
                onSelectType={(type) => setResourceType(type)}
                onBack={() => setMode(null)}
            />
        );
    }

    // Paso 3: Escanear QR
    if (!scannedCode) {
        return (
            <QRScanner
                onScan={(code) => {
                    setScannedCode(code);
                    checkIfResourceExists(code);
                }}
                onCancel={() => {
                    setMode(null);
                    setResourceType(null);
                }}
            />
        );
    }

    // Paso 4a: Si existe, mostrar opciones de vista
    if (resourceExists === true) {
        return (
            <ViewOptionsSelector
                qrCode={scannedCode}
                onSelectView={(viewType) => {
                    handleViewSelection(scannedCode, viewType);
                }}
                onCancel={() => {
                    setScannedCode(null);
                    setResourceExists(null);
                }}
            />
        );
    }

    // Paso 4b: Si no existe y es modo crear, mostrar formulario
    if (resourceExists === false && mode === 'create') {
        return (
            <CreateResourceForm
                qrCode={scannedCode}
                resourceType={resourceType}
                onSuccess={(resource) => {
                    onScan(resource);
                }}
                onCancel={() => {
                    setScannedCode(null);
                    setResourceExists(null);
                    setMode(null);
                    setResourceType(null);
                }}
            />
        );
    }

    // Paso 4c: Si no existe y es modo escanear, preguntar si crear
    if (resourceExists === false && mode === 'scan') {
        return (
            <ResourceNotFoundDialog
                qrCode={scannedCode}
                onCreateNew={() => setMode('create')}
                onCancel={() => {
                    setScannedCode(null);
                    setResourceExists(null);
                    setMode(null);
                }}
            />
        );
    }
};
```

---

## 📋 Funcionalidades

### 1. Modo "Escanear"
- Escanea QR code
- Verifica si el recurso existe
- Si existe: muestra opciones de vista
- Si no existe: pregunta si quieres crearlo

### 2. Modo "Crear"
- Selecciona tipo de recurso primero
- Escanea QR code
- Verifica si ya existe (evitar duplicados)
- Si no existe: muestra formulario de creación
- Si existe: pregunta si quieres verlo o usar otro QR

### 3. Opciones de Vista (cuando recurso existe)
- **Ficha Técnica**: Vista completa del recurso
- **Manual**: Solo documentos/manuales
- **Tareas**: Tareas relacionadas
- **Lista de Compras**: Si es tipo casa/habitación
- **Documentación**: Todos los documentos

---

## 🎨 Componentes Nuevos Necesarios

1. **`ModeSelector.jsx`** - Elegir entre Escanear/Crear
2. **`ResourceTypeSelector.jsx`** - Elegir tipo de recurso
3. **`ViewOptionsSelector.jsx`** - Elegir vista del recurso existente
4. **`CreateResourceForm.jsx`** - Formulario de creación rápida
5. **`ResourceNotFoundDialog.jsx`** - Diálogo cuando no existe

---

## 💾 Estado y Navegación

### Flujo de Estados:
```
initial → mode_selected → type_selected (solo crear) → scanned → exists_check → view_selection / creation
```

### Guardar preferencias:
- Guardar último modo usado
- Guardar último tipo de recurso creado
- Para uso más rápido

---

## 🚀 Ventajas

1. **Claridad**: El usuario siempre sabe qué está haciendo
2. **Flexibilidad**: Puede escanear existentes o crear nuevos
3. **Prevención de errores**: No intenta crear recursos duplicados
4. **UX mejorada**: Flujo guiado paso a paso
5. **Escalable**: Fácil agregar nuevos tipos de recursos/vistas

---

## 📱 Integración en la App

### En LabSync.jsx:
```javascript
// Botón de escanear abre modal mejorado
<button onClick={() => setShowQRScanner(true)}>
    Escanear QR
</button>

{showQRScanner && (
    <QRScannerWithOptions
        onScan={(resource) => {
            // Navegar a la vista seleccionada
            handleResourceScanned(resource);
            setShowQRScanner(false);
        }}
        onCancel={() => setShowQRScanner(false)}
    />
)}
```

---

## 🔄 Próximos Pasos

1. ✅ Diseñar componentes de selección
2. ✅ Implementar flujo de estados
3. ✅ Integrar con escáner existente (Html5Qrcode)
4. ✅ Crear formulario rápido de creación
5. ✅ Agregar validaciones (evitar duplicados)
6. ✅ Guardar preferencias del usuario

¿Empezamos con la implementación?

