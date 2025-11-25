# 📦 Plan: Sistema Completo de Recursos con QR Codes por Vista

## 🎯 Estructura Propuesta

### Flujo de Creación:
```
Crear Recurso
    ↓
Elegir Tipo: [Equipo] o [Área]
    ↓
Formulario básico (nombre, descripción, etc.)
    ↓
Recurso creado → Abre vista de gestión
```

### Vista de Gestión del Recurso:

```
┌─────────────────────────────────────────────┐
│  [QR Code Principal]                        │
│  📱 Ficha Técnica                           │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ [Pestañas o Secciones]              │   │
│  │ [Ficha] [Manual] [Tareas] [Docs]    │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [Contenido de la sección activa]          │
│  - En cada sección, QR code arriba         │
│  - Botones para agregar contenido          │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 📱 QR Codes por Vista

Cada recurso tiene múltiples QR codes, uno por vista:

```
/resource/ROOM-001              → Ficha técnica (vista principal)
/resource/ROOM-001/manual       → Solo manuales/documentos
/resource/ROOM-001/tasks        → Solo tareas relacionadas
/resource/ROOM-001/docs         → Solo documentación
/resource/ROOM-001/shopping     → Solo lista de compras (si aplica)
```

En cada vista dentro de la app, mostrar el QR code correspondiente arriba.

---

## 🎨 Componente Principal: ResourceManager

### Estructura:

```javascript
const ResourceManager = ({ resource, mode = 'edit' }) => {
    const [activeTab, setActiveTab] = useState('details');
    
    return (
        <div className="resource-manager">
            {/* QR Code según la pestaña activa */}
            <QRCodeForView 
                resource={resource} 
                viewType={activeTab} 
            />
            
            {/* Tabs */}
            <Tabs>
                <Tab id="details" label="Ficha Técnica" icon={FileText}>
                    <ResourceDetails resource={resource} />
                </Tab>
                
                <Tab id="manual" label="Manual" icon={Book}>
                    <DocumentSection 
                        resource={resource}
                        documentType="manual"
                        onAddDocument={handleAddManual}
                    />
                </Tab>
                
                <Tab id="tasks" label="To-Do / Tareas" icon={CheckSquare}>
                    <TodoListSection 
                        resource={resource}
                        onAddItem={handleAddTask}
                    />
                </Tab>
                
                {/* Solo para áreas/habitaciones/casas personales */}
                {(resource.type === 'room' || resource.type === 'house') && resource.groupType === 'personal' && (
                    <Tab id="shopping" label="Lista de Compras" icon={ShoppingCart}>
                        <ShoppingListSection 
                            resource={resource}
                            onAddItem={handleAddShoppingItem}
                        />
                    </Tab>
                )}
                
                <Tab id="docs" label="Documentación" icon={Folder}>
                    <DocumentSection 
                        resource={resource}
                        documentType="documentation"
                        onAddDocument={handleAddDoc}
                    />
                </Tab>
            </Tabs>
        </div>
    );
};
```

---

## 🔧 Componente QRCodeForView

Muestra el QR code específico para la vista actual:

```javascript
const QRCodeForView = ({ resource, viewType }) => {
    const getQRUrl = () => {
        const baseUrl = window.location.origin;
        const qrCode = resource.qr_code;
        
        const viewPaths = {
            'details': `/resource/${qrCode}`,
            'manual': `/resource/${qrCode}/manual`,
            'tasks': `/resource/${qrCode}/tasks`,      // To-Do list
            'shopping': `/resource/${qrCode}/shopping`, // Solo personal
            'docs': `/resource/${qrCode}/docs`
        };
        
        return `${baseUrl}${viewPaths[viewType] || viewPaths['details']}`;
    };
    
    return (
        <div className="qr-display-section">
            <div className="qr-header">
                <h3>QR Code - {getViewLabel(viewType)}</h3>
                <button onClick={downloadQR}>Descargar</button>
            </div>
            <QRCodeDisplay 
                url={getQRUrl()}
                size={200}
            />
            <p className="qr-instructions">
                Escanea para ver {getViewLabel(viewType)} en modo lectura
            </p>
            <p className="qr-note">
                Sin necesidad de login • Requiere estar cerca (si aplica)
            </p>
        </div>
    );
};
```

---

## 📋 Creación de Recurso - Modal Mejorado

```javascript
const CreateResourceModal = ({ onClose, currentContext }) => {
    const [step, setStep] = useState('type'); // 'type' | 'form'
    const [resourceType, setResourceType] = useState(null);
    
    // Paso 1: Elegir tipo
    if (step === 'type') {
        return (
            <Modal>
                <h2>Crear Nuevo Recurso</h2>
                <p>¿Qué tipo de recurso quieres crear?</p>
                
                <div className="resource-type-selector">
                    <button onClick={() => {
                        setResourceType('equipment');
                        setStep('form');
                    }}>
                        <Wrench size={32} />
                        <span>Equipo</span>
                        <p>Equipos, instrumentos, dispositivos</p>
                    </button>
                    
                    <button onClick={() => {
                        setResourceType('room');
                        setStep('form');
                    }}>
                        <Home size={32} />
                        <span>Área / Habitación</span>
                        <p>Espacios físicos, áreas de trabajo</p>
                    </button>
                </div>
            </Modal>
        );
    }
    
    // Paso 2: Formulario
    return (
        <ResourceForm
            resourceType={resourceType}
            context={currentContext} // 'work' o 'personal'
            onSuccess={(resource) => {
                // Abrir vista de gestión del recurso
                openResourceManager(resource);
                onClose();
            }}
            onCancel={() => setStep('type')}
        />
    );
};
```

---

## 🗂️ Secciones Dentro del Recurso

### 1. Ficha Técnica (Details)
- Información básica del recurso
- QR code: `/resource/{qrCode}`
- Campos: nombre, descripción, ubicación, estado, etc.

### 2. Manual
- Lista de documentos tipo "manual"
- Subir PDFs, Word, etc.
- QR code: `/resource/{qrCode}/manual`
- Botón: "Agregar Manual"

### 3. To-Do / Tareas
- Lista de tareas por hacer relacionadas al recurso
- Estructura: items checkeables (similar a lista de compras)
- Ejemplos:
  - Equipo: "Cambiar filtro", "Revisar calibración", "Limpiar sensor"
  - Área: "Limpiar ventanas", "Revisar iluminación", "Organizar estantes"
- QR code: `/resource/{qrCode}/tasks`
- Botón: "Agregar Tarea"

### 4. Lista de Compras (solo áreas/habitaciones personales)
- Lista de compras compartida
- Misma estructura que To-Do pero para compras
- QR code: `/resource/{qrCode}/shopping`
- Visible solo si: `resource.type === 'room' && groupType === 'personal'`
- O si es tipo "house" en personal

### 5. Documentación
- Documentos varios (no manuales)
- QR code: `/resource/{qrCode}/docs`
- Botón: "Agregar Documento"

---

## 🔗 Vinculación de Contenido

### Manuales y Documentos:
```javascript
// Al subir documento, vincularlo al recurso
const handleAddManual = async (file) => {
    await apiDocuments.upload(file, {
        name: file.name,
        linkedToType: 'resource',
        linkedToId: resource.id,
        metadata: { documentType: 'manual' }
    });
};
```

### To-Do / Tareas:
Las tareas de un recurso son una lista simple de items checkeables (como lista de compras).

**Opción 1: Usar tabla dedicada (recomendado)**
```javascript
// Tabla resource_todo_items similar a shopping_lists
const handleAddTask = async (item) => {
    await apiResources.addTodoItem(resource.id, {
        name: item.name,
        checked: false,
        createdBy: currentUser.id
    });
};

const handleToggleTask = async (itemId, checked) => {
    await apiResources.updateTodoItem(resource.id, itemId, { checked });
};
```

**Opción 2: Usar shopping_lists con tipo diferente**
```javascript
// Reutilizar shopping_lists pero con metadata.type = 'todo'
const handleAddTask = async (item) => {
    await apiShoppingLists.addItem(listId, {
        name: item.name,
        type: 'todo', // vs 'shopping'
        checked: false
    });
};
```

---

## 🎨 UI: Estilo Apple/iOS

### Diseño del ResourceManager:

```jsx
<div className="resource-manager-container">
    {/* Header con QR Code */}
    <div className="resource-qr-section">
        <QRCodeForView resource={resource} viewType={activeTab} />
    </div>
    
    {/* Tabs iOS-style */}
    <div className="resource-tabs">
        <TabButton 
            active={activeTab === 'details'}
            icon={FileText}
            label="Ficha"
            onClick={() => setActiveTab('details')}
        />
        <TabButton 
            active={activeTab === 'manual'}
            icon={Book}
            label="Manual"
            onClick={() => setActiveTab('manual')}
        />
        <TabButton 
            active={activeTab === 'tasks'}
            icon={CheckSquare}
            label="Tareas"
            onClick={() => setActiveTab('tasks')}
        />
        <TabButton 
            active={activeTab === 'docs'}
            icon={Folder}
            label="Docs"
            onClick={() => setActiveTab('docs')}
        />
        {showShopping && (
            <TabButton 
                active={activeTab === 'shopping'}
                icon={ShoppingCart}
                label="Compras"
                onClick={() => setActiveTab('shopping')}
            />
        )}
    </div>
    
    {/* Contenido de la pestaña */}
    <div className="resource-content">
        {activeTab === 'details' && <ResourceDetailsView />}
        {activeTab === 'manual' && <ManualView />}
        {activeTab === 'tasks' && <TasksView />}
        {activeTab === 'docs' && <DocsView />}
        {activeTab === 'shopping' && <ShoppingView />}
    </div>
</div>
```

---

## 📦 Componentes Necesarios

1. **`CreateResourceModal.jsx`** - Modal para crear recurso (tipo + formulario)
2. **`ResourceManager.jsx`** - Componente principal de gestión
3. **`QRCodeForView.jsx`** - QR code dinámico según vista
4. **`ResourceDetailsView.jsx`** - Vista de ficha técnica
5. **`ManualView.jsx`** - Vista de manuales
6. **`TodoListView.jsx`** - Vista de To-Do/Tareas (items checkeables)
7. **`ShoppingListView.jsx`** - Vista de lista de compras (similar a To-Do)
8. **`DocsView.jsx`** - Vista de documentación

### Nota sobre To-Do y Shopping:
Ambos son listas de items checkeables, pueden compartir:
- Mismo componente base: `CheckableList.jsx`
- Misma estructura de datos
- Solo cambia el propósito y el contexto

---

## 🔄 Flujo Completo

### Crear Recurso:
1. Usuario hace clic en "Crear Recurso"
2. Selecciona "Equipo" o "Área"
3. Completa formulario básico
4. Recurso creado → Abre `ResourceManager`

### Gestionar Recurso:
1. Usuario ve QR code de la vista actual (arriba)
2. Navega entre pestañas
3. Cada pestaña muestra su QR code específico
4. Puede agregar contenido desde cada sección

### Escanear QR:
1. Desde app: Valida contexto y muestra opciones
2. Desde público: Muestra la vista específica del QR

---

## 🚀 Orden de Implementación

1. ✅ **Modal de creación** (Elegir Equipo/Área)
2. ✅ **ResourceManager básico** (Tabs y estructura)
3. ✅ **QRCodeForView** (QR dinámico por vista)
4. ✅ **Vista Ficha Técnica** (Detalles del recurso)
5. ✅ **Vista Manual** (Subir y ver manuales)
6. ✅ **Vista Tareas** (Tareas vinculadas)
7. ✅ **Vista Documentación**
8. ✅ **Vista Lista de Compras** (solo personal)

---

¿Empezamos con el modal de creación y la estructura básica del ResourceManager?

