# Plan de Implementación: Fase 1 - Sistema QR Extendido + Documentos

## 🎯 Objetivo
Extender el sistema de QR codes para múltiples propósitos y contextos:

### Contexto Laboral:
- 📄 Manuales de equipos
- ✅ Listas de tareas relacionadas
- 📋 Instrucciones y documentación
- 🔗 Enlaces bidireccionales entre recursos

### Contexto Personal/Hogar:
- 🏠 Habitaciones (QR en la puerta → lista de tareas de la habitación)
- 👤 Personas (QR personal → lista de compras, tareas, recordatorios)
- 🏡 Casa completa (QR principal → vista general)
- 🛒 Lista de compras compartida (QR en la cocina)
- 📝 Notas familiares (QR en el refrigerador)

## 📊 Arquitectura de Vistas Públicas

### Sistema de Rutas Extendido (Genérico):
```
/resource/:qrCode            → Vista principal del recurso
/resource/:qrCode/manual     → Manual/documentación
/resource/:qrCode/tasks      → Tareas relacionadas
/resource/:qrCode/docs       → Documentación/instrucciones
/resource/:qrCode/shopping   → Lista de compras (solo personal)
/resource/:qrCode/notes      → Notas compartidas
```

### Compatibilidad hacia atrás:
```
/equipment/:qrCode           → Redirige a /resource/:qrCode
/equipment/:qrCode/manual    → Redirige a /resource/:qrCode/manual
```

### Códigos QR Generados:

**Laboral:**
```
Equipo: https://flowspace.farmavet-bodega.cl/resource/DX-001
Manual: https://flowspace.farmavet-bodega.cl/resource/DX-001/manual
Tareas: https://flowspace.farmavet-bodega.cl/resource/DX-001/tasks
```

**Personal/Hogar:**
```
Habitación: https://flowspace.farmavet-bodega.cl/resource/ROOM-001
Compras:    https://flowspace.farmavet-bodega.cl/resource/HOUSE-001/shopping
Persona:    https://flowspace.farmavet-bodega.cl/resource/PERSON-001
```

---

## 🗄️ Base de Datos

### 1. Tabla `resources` (Recursos Genéricos)
```sql
CREATE TABLE resources (
    id VARCHAR(255) PRIMARY KEY,
    qr_code VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    resource_type VARCHAR(50) NOT NULL, 
        -- 'equipment', 'room', 'person', 'house', 'location', 'custom'
    group_id VARCHAR(255) REFERENCES groups(id),
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    creator_id VARCHAR(255) REFERENCES users(id),
    
    -- Campos específicos por tipo (JSONB flexible)
    metadata JSONB DEFAULT '{}', 
        -- Para equipment: status, maintenance dates
        -- Para room: floor, area, purpose
        -- Para person: birthday, preferences
        -- Para house: address, members
    
    -- Ubicación (para verificación GPS)
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    geofence_radius INTEGER DEFAULT 50,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_resources_type ON resources(resource_type);
CREATE INDEX idx_resources_qr ON resources(qr_code);
```

### 2. Tabla `documents`
```sql
CREATE TABLE documents (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    file_path TEXT NOT NULL,
    file_type VARCHAR(50), -- 'pdf', 'docx', 'txt', 'md'
    file_size INTEGER, -- bytes
    uploaded_by VARCHAR(255) REFERENCES users(id),
    linked_to_type VARCHAR(50), -- 'resource', 'task', 'group'
    linked_to_id VARCHAR(255), -- ID del recurso vinculado
    metadata JSONB DEFAULT '{}', -- Info adicional
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_documents_linked ON documents(linked_to_type, linked_to_id);
```

### 3. Tabla `task_links` (Enlaces Bidireccionales)
```sql
CREATE TABLE task_links (
    id SERIAL PRIMARY KEY,
    source_type VARCHAR(50) NOT NULL, -- 'resource', 'task', 'document', 'note'
    source_id VARCHAR(255) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id VARCHAR(255) NOT NULL,
    link_type VARCHAR(50), 
        -- 'manual', 'related_task', 'instruction', 'reference'
        -- 'shopping_list', 'room_task', 'person_reminder'
    metadata JSONB DEFAULT '{}', 
        -- Info adicional (ej: "último regalo", "monto gastado", "última compra")
    created_by VARCHAR(255) REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_type, source_id, target_type, target_id, link_type)
);

CREATE INDEX idx_task_links_source ON task_links(source_type, source_id);
CREATE INDEX idx_task_links_target ON task_links(target_type, target_id);
```

### 4. Tabla `notes` (Notas Rápidas)
```sql
CREATE TABLE notes (
    id VARCHAR(255) PRIMARY KEY,
    content TEXT NOT NULL,
    user_id VARCHAR(255) REFERENCES users(id),
    group_id VARCHAR(255) REFERENCES groups(id),
    linked_to_type VARCHAR(50), -- 'resource', 'task', 'room', 'person'
    linked_to_id VARCHAR(255),
    context JSONB DEFAULT '{}', -- Contexto automático
    tags JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notes_linked ON notes(linked_to_type, linked_to_id);
```

### 5. Tabla `shopping_lists` (Listas de Compras)
```sql
CREATE TABLE shopping_lists (
    id VARCHAR(255) PRIMARY KEY,
    resource_id VARCHAR(255) REFERENCES resources(id),
    name VARCHAR(255) NOT NULL,
    items JSONB DEFAULT '[]', 
        -- [{name: "Leche", quantity: 2, checked: false, added_by: "user_id"}]
    shared_with JSONB DEFAULT '[]', -- Usuarios con acceso
    created_by VARCHAR(255) REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shopping_lists_resource ON shopping_lists(resource_id);
```

---

## 🔧 Backend

### Endpoints Nuevos:

#### **Documentos:**
- `POST /api/documents` - Subir documento
- `GET /api/documents` - Listar documentos (con filtros)
- `GET /api/documents/:id` - Obtener documento
- `GET /api/documents/:id/download` - Descargar archivo
- `DELETE /api/documents/:id` - Eliminar documento
- `PATCH /api/documents/:id` - Actualizar metadatos

#### **Enlaces:**
- `POST /api/links` - Crear enlace bidireccional
- `GET /api/links` - Obtener enlaces (con filtros)
- `GET /api/links/from/:type/:id` - Enlaces desde un recurso
- `GET /api/links/to/:type/:id` - Enlaces hacia un recurso
- `DELETE /api/links/:id` - Eliminar enlace

#### **Vistas Públicas (Genéricas):**
- `GET /api/resources/public/:qrCode` - Vista principal del recurso
- `GET /api/resources/public/:qrCode/manual` - Manual/documentación
- `GET /api/resources/public/:qrCode/tasks` - Tareas relacionadas
- `GET /api/resources/public/:qrCode/docs` - Documentación
- `GET /api/resources/public/:qrCode/shopping` - Lista de compras (solo personal)
- `GET /api/resources/public/:qrCode/notes` - Notas compartidas

#### **Listas de Compras:**
- `GET /api/shopping-lists/:resourceId` - Obtener lista
- `POST /api/shopping-lists/:resourceId/items` - Agregar item
- `PATCH /api/shopping-lists/:resourceId/items/:itemId` - Actualizar item (marcar como comprado)
- `DELETE /api/shopping-lists/:resourceId/items/:itemId` - Eliminar item

---

## 🎨 Frontend

### Componentes Nuevos:

1. **`DocumentUploader.jsx`**
   - Drag & drop para subir archivos
   - Vista previa de PDFs
   - Vinculación a equipos/tareas

2. **`DocumentViewer.jsx`**
   - Visualizador de PDFs en el navegador
   - Navegación por páginas
   - Zoom y descarga

3. **`EquipmentManualView.jsx`**
   - Vista pública del manual
   - Requiere verificación de ubicación
   - Visualización inline del PDF

4. **`EquipmentTasksView.jsx`**
   - Lista de tareas relacionadas al equipo
   - Filtradas por estado
   - Solo lectura (sin login)

5. **`QRCodeGenerator.jsx`** (Mejorado)
   - Generar múltiples QR codes:
     - Ficha técnica
     - Manual
     - Tareas
     - Documentación

6. **`LinkManager.jsx`**
   - Gestión de enlaces bidireccionales
   - Crear/eliminar conexiones
   - Ver backlinks

---

## 📱 Flujo de Uso

### Escenario 1: Manual de Equipo (Laboral)
1. Usuario sube PDF del manual → se vincula al recurso
2. Se genera QR específico para el manual
3. Técnico escanea QR → ve solo el manual (sin login, con verificación GPS)

### Escenario 2: Lista de Tareas (Laboral)
1. Usuario crea tareas relacionadas al equipo
2. Sistema las vincula automáticamente
3. QR de "tareas" muestra lista filtrada
4. Útil para checklist de mantenimiento

### Escenario 3: Lista de Compras (Personal/Hogar)
1. Usuario crea recurso tipo "house" o "room"
2. Crea lista de compras vinculada
3. QR en la cocina → acceso a lista compartida
4. Familia puede agregar/marcar items sin login (con código temporal)

### Escenario 4: Habitación (Personal)
1. Usuario crea recurso tipo "room" (ej: "Cocina")
2. Vincula tareas de limpieza/mantenimiento
3. QR en la puerta → muestra tareas pendientes de esa habitación
4. Útil para organización del hogar

### Escenario 5: Persona (Personal)
1. Usuario crea recurso tipo "person" (ej: "Mamá")
2. Vincula recordatorios, regalos anteriores, preferencias
3. QR personal → acceso a información relevante
4. Útil para no repetir regalos, recordar fechas importantes

---

## 🔒 Seguridad

- Todas las vistas públicas requieren verificación GPS (igual que ahora)
- Documentos sensibles pueden tener restricción adicional
- Códigos temporales también aplican para vistas extendidas

---

## 📦 Estructura de Archivos

```
backend/
  routes/
    resources.js      ← Nuevo (genérico, reemplaza equipment.js parcialmente)
    documents.js      ← Nuevo
    links.js          ← Nuevo
    shoppingLists.js  ← Nuevo
  utils/
    fileUpload.js     ← Nuevo
    fileStorage.js    ← Nuevo
  uploads/            ← Nuevo (archivos subidos)

src/
  components/
    documents/
      DocumentUploader.jsx
      DocumentViewer.jsx
      DocumentList.jsx
    public/
      ResourcePublicView.jsx     ← Genérico (reemplaza EquipmentPublicView)
      ResourceManualView.jsx     ← Nuevo
      ResourceTasksView.jsx      ← Nuevo
      ResourceDocsView.jsx       ← Nuevo
      ResourceShoppingView.jsx   ← Nuevo (lista de compras)
    resources/
      ResourceManager.jsx        ← Gestión de recursos (equipos, habitaciones, etc.)
      ResourceCreator.jsx        ← Crear nuevos recursos
      ShoppingList.jsx           ← Componente de lista de compras
    QRCodeGenerator.jsx          ← Mejorado (múltiples tipos)
```

---

## ⚙️ Configuración Ollama

Ya tienes Ollama en: `https://ollama.farmavet-bodega.cl/`

Para Fase 1 usaremos:
- **Modelo de embeddings**: `all-MiniLM-L6-v2` (ligero, rápido)
- **Uso inicial**: Categorización automática de documentos
- **Futuro (Fase 2)**: Búsqueda semántica completa

---

## 🚀 Orden de Implementación

### Fase 1.1: Base de Datos y Recursos Genéricos
1. ✅ Crear tabla `resources` (genérica)
2. ✅ Migrar datos de `equipment` a `resources` (mantener compatibilidad)
3. ✅ Crear tablas: `documents`, `task_links`, `notes`, `shopping_lists`
4. ✅ Endpoints básicos de recursos genéricos

### Fase 1.2: Documentos y Upload
5. ✅ Sistema de upload de archivos
6. ✅ Endpoints de documentos
7. ✅ Vincular documentos a recursos
8. ✅ Vista pública de manual

### Fase 1.3: Vistas Públicas Extendidas
9. ✅ Vista pública de tareas relacionadas
10. ✅ Vista pública de documentación
11. ✅ Sistema de rutas genérico `/resource/:qrCode/*`

### Fase 1.4: Listas de Compras (Personal)
12. ✅ Backend de shopping lists
13. ✅ Vista pública de lista de compras
14. ✅ UI para gestionar lista (agregar/marcar items)

### Fase 1.5: UI y Generadores
15. ✅ ResourceManager (crear/editar recursos: equipos, habitaciones, personas)
16. ✅ Generador de múltiples QR codes
17. ✅ UI para gestionar enlaces bidireccionales
18. ✅ Migración completa de equipment a resources (opcional)

¿Empezamos?

