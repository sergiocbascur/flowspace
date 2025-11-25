# Plan de Implementación: Fase 1 - Sistema QR Extendido + Documentos

## 🎯 Objetivo
Extender el sistema de QR codes para múltiples propósitos:
- 📄 Manuales de equipos
- ✅ Listas de tareas relacionadas
- 📋 Instrucciones y documentación
- 🔗 Enlaces bidireccionales entre recursos

## 📊 Arquitectura de Vistas Públicas

### Sistema de Rutas Extendido:
```
/equipment/:qrCode           → Vista actual (ficha técnica)
/equipment/:qrCode/manual    → Manual del equipo
/equipment/:qrCode/tasks     → Tareas relacionadas
/equipment/:qrCode/docs      → Documentación/instrucciones
```

### Códigos QR Generados:
```
Equipo: https://flowspace.farmavet-bodega.cl/equipment/DX-001
Manual: https://flowspace.farmavet-bodega.cl/equipment/DX-001/manual
Tareas: https://flowspace.farmavet-bodega.cl/equipment/DX-001/tasks
Docs:   https://flowspace.farmavet-bodega.cl/equipment/DX-001/docs
```

---

## 🗄️ Base de Datos

### 1. Tabla `documents`
```sql
CREATE TABLE documents (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    file_path TEXT NOT NULL,
    file_type VARCHAR(50), -- 'pdf', 'docx', 'txt', 'md'
    file_size INTEGER, -- bytes
    uploaded_by VARCHAR(255) REFERENCES users(id),
    linked_to_type VARCHAR(50), -- 'equipment', 'task', 'group'
    linked_to_id VARCHAR(255), -- ID del recurso vinculado
    metadata JSONB DEFAULT '{}', -- Info adicional
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_documents_linked ON documents(linked_to_type, linked_to_id);
```

### 2. Tabla `task_links` (Enlaces Bidireccionales)
```sql
CREATE TABLE task_links (
    id SERIAL PRIMARY KEY,
    source_type VARCHAR(50) NOT NULL, -- 'equipment', 'task', 'document', 'note'
    source_id VARCHAR(255) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id VARCHAR(255) NOT NULL,
    link_type VARCHAR(50), -- 'manual', 'related_task', 'instruction', 'reference'
    metadata JSONB DEFAULT '{}', -- Info adicional (ej: "último regalo", "monto gastado")
    created_by VARCHAR(255) REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_type, source_id, target_type, target_id, link_type)
);

CREATE INDEX idx_task_links_source ON task_links(source_type, source_id);
CREATE INDEX idx_task_links_target ON task_links(target_type, target_id);
```

### 3. Tabla `notes` (Notas Rápidas)
```sql
CREATE TABLE notes (
    id VARCHAR(255) PRIMARY KEY,
    content TEXT NOT NULL,
    user_id VARCHAR(255) REFERENCES users(id),
    group_id VARCHAR(255) REFERENCES groups(id),
    linked_to_type VARCHAR(50), -- 'equipment', 'task'
    linked_to_id VARCHAR(255),
    context JSONB DEFAULT '{}', -- Contexto automático
    tags JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notes_linked ON notes(linked_to_type, linked_to_id);
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

#### **Vistas Públicas:**
- `GET /api/equipment/public/:qrCode/manual` - Manual del equipo
- `GET /api/equipment/public/:qrCode/tasks` - Tareas relacionadas
- `GET /api/equipment/public/:qrCode/docs` - Documentación

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

### Escenario 1: Manual de Equipo
1. Usuario sube PDF del manual → se vincula al equipo
2. Se genera QR específico para el manual
3. Técnico escanea QR → ve solo el manual (sin login, con verificación GPS)

### Escenario 2: Lista de Tareas
1. Usuario crea tareas relacionadas al equipo
2. Sistema las vincula automáticamente
3. QR de "tareas" muestra lista filtrada
4. Útil para checklist de mantenimiento

### Escenario 3: Instrucciones
1. Usuario crea documento de instrucciones
2. Lo vincula al equipo
3. QR de "docs" muestra todas las instrucciones
4. Acceso rápido en campo

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
    documents.js      ← Nuevo
    links.js          ← Nuevo
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
      EquipmentManualView.jsx    ← Nuevo
      EquipmentTasksView.jsx     ← Nuevo
      EquipmentDocsView.jsx      ← Nuevo
    QRCodeGenerator.jsx          ← Mejorado
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

1. ✅ Crear tablas de BD (documents, task_links, notes)
2. ✅ Sistema de upload de archivos
3. ✅ Endpoints básicos de documentos
4. ✅ Vincular documentos a equipos
5. ✅ Vista pública de manual
6. ✅ Generar QR para manual
7. ✅ Vista pública de tareas relacionadas
8. ✅ Sistema de enlaces bidireccionales
9. ✅ UI para gestionar enlaces
10. ✅ Mejorar generador de QR (múltiples tipos)

¿Empezamos?

