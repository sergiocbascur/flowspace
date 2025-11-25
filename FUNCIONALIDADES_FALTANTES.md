# Funcionalidades Faltantes para Features Avanzadas

## 📊 Análisis de Requisitos

### 1. Knowledge Graph / Conexiones Bidireccionales

#### **Componentes Necesarios:**

**A. Base de Datos:**
- [ ] **Tabla `task_links`**: Almacenar relaciones entre tareas y recursos
  ```sql
  CREATE TABLE task_links (
      id SERIAL PRIMARY KEY,
      task_id VARCHAR(255) REFERENCES tasks(id) ON DELETE CASCADE,
      link_type VARCHAR(50), -- 'document', 'person', 'task', 'equipment', 'note'
      linked_id VARCHAR(255), -- ID del recurso vinculado
      linked_type VARCHAR(50), -- Tipo específico del recurso
      metadata JSONB, -- Info adicional (ej: fecha del regalo, monto gastado)
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  ```

- [ ] **Tabla `documents`**: Para PDFs, archivos adjuntos
  ```sql
  CREATE TABLE documents (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      file_path TEXT,
      file_type VARCHAR(50),
      uploaded_by VARCHAR(255) REFERENCES users(id),
      metadata JSONB, -- Tamaño, tipo MIME, etc.
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  ```

- [ ] **Tabla `notes`**: Para notas rápidas y captura de información
  ```sql
  CREATE TABLE notes (
      id VARCHAR(255) PRIMARY KEY,
      content TEXT NOT NULL,
      user_id VARCHAR(255) REFERENCES users(id),
      group_id VARCHAR(255) REFERENCES groups(id),
      context JSONB, -- Contexto automático (reunión, lugar, etc.)
      tags JSONB DEFAULT '[]',
      linked_tasks JSONB DEFAULT '[]',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  ```

**B. Backend:**
- [ ] **Endpoint POST `/api/tasks/:taskId/links`**: Crear enlaces bidireccionales
- [ ] **Endpoint GET `/api/tasks/:taskId/links`**: Obtener todos los backlinks
- [ ] **Endpoint POST `/api/documents`**: Subir documentos
- [ ] **Endpoint GET `/api/documents`**: Listar documentos con búsqueda
- [ ] **Sistema de indexación**: Para búsqueda rápida de relaciones

**C. Frontend:**
- [ ] **Componente `TaskBacklinks`**: Mostrar conexiones en detalle de tarea
- [ ] **Componente `DocumentUploader`**: Subir y vincular documentos
- [ ] **Quick Capture Widget**: Barra flotante para captura rápida
- [ ] **Sistema de sugerencias**: IA sugiere enlaces basados en contenido

---

### 2. Búsqueda Semántica

#### **Componentes Necesarios:**

**A. Infraestructura IA:**
- [ ] **Ollama o servicio de embeddings**: Para generar vectores semánticos
  - Opciones: Ollama (local), OpenAI Embeddings, Hugging Face
- [ ] **Base de datos vectorial**: 
  - Opción 1: PostgreSQL con extensión `pgvector`
  - Opción 2: Vector DB dedicada (Qdrant, Pinecone, Weaviate)
- [ ] **Modelo de embeddings**: Para convertir texto a vectores
  - Recomendado: `all-MiniLM-L6-v2` (ligero, rápido) o `text-embedding-3-small` (OpenAI)

**B. Base de Datos:**
- [ ] **Tabla `task_embeddings`**: Almacenar vectores de tareas
  ```sql
  CREATE TABLE task_embeddings (
      task_id VARCHAR(255) PRIMARY KEY REFERENCES tasks(id),
      embedding vector(384), -- Dimensión según modelo
      content_text TEXT, -- Texto indexado (título + comentarios)
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  ```

- [ ] **Tabla `document_embeddings`**: Vectores de documentos
- [ ] **Tabla `note_embeddings`**: Vectores de notas
- [ ] **Instalar extensión pgvector**:
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  ```

**C. Backend:**
- [ ] **Servicio `embeddingService.js`**: Generar embeddings
- [ ] **Endpoint POST `/api/search/semantic`**: Búsqueda semántica
- [ ] **Proceso de indexación**: Generar embeddings para tareas/documentos existentes
- [ ] **Cron job**: Re-indexar cuando cambian tareas

**D. Frontend:**
- [ ] **Componente `SemanticSearch`**: Búsqueda con IA
- [ ] **Integración con búsqueda actual**: Mejorar búsqueda existente
- [ ] **Sugerencias contextuales**: Respuestas directas a preguntas

---

### 3. Automatización Proactiva

#### **Componentes Necesarios:**

**A. Base de Datos:**
- [ ] **Tabla `user_patterns`**: Analizar comportamiento
  ```sql
  CREATE TABLE user_patterns (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255) REFERENCES users(id),
      pattern_type VARCHAR(50), -- 'task_completion_time', 'postpone_day', 'category_preference'
      pattern_data JSONB, -- Datos del patrón detectado
      detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  ```

- [ ] **Tabla `routines`**: Rutinas/templates inteligentes
  ```sql
  CREATE TABLE routines (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) REFERENCES users(id),
      name VARCHAR(255) NOT NULL,
      trigger_type VARCHAR(50), -- 'time', 'event', 'manual'
      trigger_data JSONB, -- Configuración del trigger
      tasks_template JSONB, -- Template de tareas a crear
      enabled BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  ```

- [ ] **Tabla `user_achievements`**: Logros y resúmenes
  ```sql
  CREATE TABLE user_achievements (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255) REFERENCES users(id),
      period_type VARCHAR(20), -- 'week', 'month', 'year'
      period_start DATE,
      period_end DATE,
      metrics JSONB, -- tareas_completadas, puntos, etc.
      highlights JSONB, -- Logros destacados
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  ```

**B. Backend:**
- [ ] **Servicio `patternDetection.js`**: Analizar patrones de uso
- [ ] **Servicio `routineEngine.js`: Ejecutar rutinas automáticas
- [ ] **Endpoint POST `/api/routines`**: Crear/editar rutinas
- [ ] **Endpoint GET `/api/routines`**: Listar rutinas del usuario
- [ ] **Endpoint GET `/api/achievements/:period`**: Resúmenes de logros
- [ ] **Cron jobs**: 
  - Detección de patrones (diario)
  - Ejecución de rutinas (cada hora)
  - Generación de resúmenes (semanal/mensual)

**C. Frontend:**
- [ ] **Componente `RoutineBuilder`**: Crear rutinas visualmente
- [ ] **Componente `PatternInsights`**: Mostrar patrones detectados
- [ ] **Componente `AchievementSummary`**: Resúmenes de logros
- [ ] **Notificaciones inteligentes**: Sugerencias basadas en patrones

---

### 4. Captura Sin Fricción

#### **Componentes Necesarios:**

**A. Base de Datos:**
- [ ] **Tabla `notes`** (ya mencionada arriba)
- [ ] **Tabla `quick_capture`**: Capturas rápidas temporales
  ```sql
  CREATE TABLE quick_capture (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) REFERENCES users(id),
      content TEXT NOT NULL,
      context JSONB, -- Ubicación GPS, app activa, etc.
      auto_categorized BOOLEAN DEFAULT false,
      category_suggested VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      processed_at TIMESTAMP -- Cuando se procesó por IA
  );
  ```

**B. Backend:**
- [ ] **Endpoint POST `/api/notes/quick`**: Captura rápida
- [ ] **Servicio `contextDetection.js`**: Detectar contexto automático
- [ ] **Servicio `autoCategorization.js`**: Categorizar con IA
- [ ] **Integración GPS**: Para contexto de ubicación

**C. Frontend:**
- [ ] **Widget flotante `QuickCapture`**: Accesible desde cualquier lugar
- [ ] **Atajo de teclado global**: Ej: Cmd+K o Ctrl+K
- [ ] **Integración móvil**: Widget en pantalla de inicio
- [ ] **Autocompletado inteligente**: Sugerir categorías/grupos

---

## 🔧 Infraestructura Adicional Necesaria

### Servicios Externos:
- [ ] **Ollama** (para embeddings y búsqueda semántica)
  - Instalación local o servidor dedicado
  - Modelos: `llama3`, `mistral`, o `all-MiniLM-L6-v2` (embedding)
- [ ] **Servicio de almacenamiento de archivos**:
  - Opción 1: Sistema de archivos local
  - Opción 2: Cloud Storage (S3, Azure Blob, etc.)

### Librerías NPM:
```json
{
  "pgvector": "^0.2.0", // Para PostgreSQL vectorial
  "ollama": "^0.5.0", // Cliente Ollama
  "natural": "^6.10.0", // Procesamiento de lenguaje natural
  "multer": "^1.4.5", // Upload de archivos
  "pdf-parse": "^1.1.1", // Extraer texto de PDFs
  "mammoth": "^1.6.0" // Extraer texto de Word
}
```

---

## 📋 Priorización Recomendada

### **Fase 1 (Fundación):**
1. Sistema de documentos y adjuntos básico
2. Tabla `notes` y captura rápida simple
3. Enlaces bidireccionales básicos (task -> document, task -> task)

### **Fase 2 (IA Básica):**
1. Integración con Ollama
2. Instalación de pgvector
3. Sistema de embeddings básico
4. Búsqueda semántica simple

### **Fase 3 (Automatización):**
1. Detección de patrones básicos
2. Sistema de rutinas simples
3. Resúmenes de logros

### **Fase 4 (Avanzado):**
1. Sugerencias inteligentes de enlaces
2. Categorización automática avanzada
3. Análisis predictivo

---

## 💡 Recomendaciones Técnicas

1. **Empezar simple**: Implementar primero las funcionalidades básicas sin IA, luego agregar IA progresivamente
2. **PostgreSQL + pgvector**: Usar tu base de datos actual con extensión vectorial (más simple que agregar otra DB)
3. **Ollama local**: Para desarrollo/pruebas, luego considerar servicio dedicado en producción
4. **Indexación incremental**: No re-indexar todo de golpe, hacerlo progresivamente

¿Quieres que empecemos con alguna fase específica?

