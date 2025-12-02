import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'flowspace',
    user: process.env.DB_USER || 'flowspace_user',
    password: process.env.DB_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Test de conexión
export async function initDatabase() {
    try {
        const result = await pool.query('SELECT NOW()');
        console.log('✅ Conectado a PostgreSQL:', result.rows[0].now);

        // Crear tablas si no existen
        await createTables();

        return true;
    } catch (error) {
        console.error('❌ Error conectando a PostgreSQL:', error.message);
        throw error;
    }
}

// Crear tablas
async function createTables() {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Tabla de usuarios
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(255) PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                avatar TEXT DEFAULT '👤',
                email_verified BOOLEAN DEFAULT false,
                config JSONB DEFAULT '{}'::jsonb,
                last_name_change TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Agregar columna last_name_change si no existe (migración)
        await client.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='users' AND column_name='last_name_change'
                ) THEN
                    ALTER TABLE users ADD COLUMN last_name_change TIMESTAMP;
                END IF;
            END $$;
        `);

        // Tabla de grupos
        await client.query(`
            CREATE TABLE IF NOT EXISTS groups (
                id VARCHAR(255) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                type VARCHAR(50) NOT NULL CHECK (type IN ('work', 'personal')),
                code VARCHAR(50) UNIQUE NOT NULL,
                creator_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                scores JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tabla de rankings globales (puntos totales por usuario)
        await client.query(`
            CREATE TABLE IF NOT EXISTS user_rankings (
                user_id VARCHAR(255) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                total_points INTEGER DEFAULT 0,
                tasks_completed INTEGER DEFAULT 0,
                tasks_completed_on_time INTEGER DEFAULT 0,
                tasks_completed_early INTEGER DEFAULT 0,
                tasks_completed_late INTEGER DEFAULT 0,
                current_streak INTEGER DEFAULT 0,
                longest_streak INTEGER DEFAULT 0,
                last_completed_task_at TIMESTAMP,
                badges JSONB DEFAULT '[]',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_user_rankings_points ON user_rankings(total_points DESC)
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_user_rankings_streak ON user_rankings(current_streak DESC)
        `);

        // Tabla de relaciones de amigos/contactos
        await client.query(`
            CREATE TABLE IF NOT EXISTS user_contacts (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                contact_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
                requested_by VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, contact_id)
            )
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_user_contacts_user ON user_contacts(user_id)
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_user_contacts_contact ON user_contacts(contact_id)
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_user_contacts_status ON user_contacts(status)
        `);

        // Tabla de miembros de grupos (relación muchos a muchos)
        await client.query(`
            CREATE TABLE IF NOT EXISTS group_members (
                id SERIAL PRIMARY KEY,
                group_id VARCHAR(255) NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
                user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(group_id, user_id)
            )
        `);

        // Tabla de tareas
        await client.query(`
            CREATE TABLE IF NOT EXISTS tasks (
                id VARCHAR(255) PRIMARY KEY,
                group_id VARCHAR(255) NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                creator_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                category VARCHAR(100),
                due VARCHAR(100),
                time VARCHAR(50),
                status VARCHAR(50) NOT NULL DEFAULT 'pending' 
                    CHECK (status IN ('pending', 'completed', 'blocked', 'waiting_validation', 'overdue', 'upcoming')),
                priority VARCHAR(20) DEFAULT 'medium' 
                    CHECK (priority IN ('low', 'medium', 'high')),
                postpone_count INTEGER DEFAULT 0,
                blocked_by VARCHAR(255) REFERENCES users(id),
                block_reason TEXT,
                completed_at TIMESTAMP,
                completed_by VARCHAR(255) REFERENCES users(id),
                points_awarded INTEGER,
                assignees JSONB DEFAULT '[]',
                comments JSONB DEFAULT '[]',
                unread_comments INTEGER DEFAULT 0,
                last_notification_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tabla de equipos
        await client.query(`
            CREATE TABLE IF NOT EXISTS equipment (
                id SERIAL PRIMARY KEY,
                qr_code VARCHAR(255) UNIQUE NOT NULL,
                name VARCHAR(255) NOT NULL,
                group_id VARCHAR(255) NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
                status VARCHAR(50) DEFAULT 'operational' 
                    CHECK (status IN ('operational', 'maintenance', 'out_of_service')),
                last_maintenance DATE,
                next_maintenance DATE,
                creator_id VARCHAR(255) NOT NULL REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tabla de bitácora de equipos
        await client.query(`
            CREATE TABLE IF NOT EXISTS equipment_logs (
                id SERIAL PRIMARY KEY,
                equipment_id INTEGER NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
                user_id VARCHAR(255) NOT NULL REFERENCES users(id),
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tabla de códigos temporales de acceso
        await client.query(`
            CREATE TABLE IF NOT EXISTS equipment_temp_codes (
                id SERIAL PRIMARY KEY,
                equipment_id INTEGER NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
                code VARCHAR(8) UNIQUE NOT NULL,
                created_by VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                expires_at TIMESTAMP NOT NULL,
                used_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Índices para códigos temporales
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_temp_codes_code ON equipment_temp_codes(code)
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_temp_codes_expires ON equipment_temp_codes(expires_at)
        `);

        // Tabla de recursos genéricos (equipos, habitaciones, personas, etc.)
        await client.query(`
            CREATE TABLE IF NOT EXISTS resources (
                id VARCHAR(255) PRIMARY KEY,
                qr_code VARCHAR(255) UNIQUE NOT NULL,
                identifier VARCHAR(255) UNIQUE,
                name VARCHAR(255) NOT NULL,
                resource_type VARCHAR(50) NOT NULL 
                    CHECK (resource_type IN ('equipment', 'room', 'person', 'house', 'location', 'custom')),
                group_id VARCHAR(255) REFERENCES groups(id) ON DELETE SET NULL,
                description TEXT,
                status VARCHAR(50) DEFAULT 'active',
                creator_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                metadata JSONB DEFAULT '{}',
                latitude DECIMAL(10, 8),
                longitude DECIMAL(11, 8),
                geofence_radius INTEGER DEFAULT 50,
                last_maintenance DATE,
                next_maintenance DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Agregar columna identifier si no existe (migración)
        await client.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='resources' AND column_name='identifier'
                ) THEN
                    ALTER TABLE resources ADD COLUMN identifier VARCHAR(255) UNIQUE;
                    CREATE INDEX IF NOT EXISTS idx_resources_identifier ON resources(identifier);
                    -- Migrar equipment_id a identifier si existe
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name='resources' AND column_name='equipment_id'
                    ) THEN
                        UPDATE resources SET identifier = equipment_id WHERE equipment_id IS NOT NULL;
                        ALTER TABLE resources DROP COLUMN IF EXISTS equipment_id;
                    END IF;
                END IF;
            END $$;
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(resource_type)
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_resources_qr ON resources(qr_code)
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_resources_group ON resources(group_id)
        `);

        // Agregar columnas last_maintenance y next_maintenance si no existen (migración)
        await client.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='resources' AND column_name='last_maintenance'
                ) THEN
                    ALTER TABLE resources ADD COLUMN last_maintenance DATE;
                END IF;
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='resources' AND column_name='next_maintenance'
                ) THEN
                    ALTER TABLE resources ADD COLUMN next_maintenance DATE;
                END IF;
            END $$;
        `);

        // Tabla de logs/bitácora para recursos
        await client.query(`
            CREATE TABLE IF NOT EXISTS resource_logs (
                id SERIAL PRIMARY KEY,
                resource_id VARCHAR(255) NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
                user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_resource_logs_resource ON resource_logs(resource_id)
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_resource_logs_user ON resource_logs(user_id)
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_resource_logs_created ON resource_logs(created_at DESC)
        `);

        // Tabla de documentos (manuales, PDFs, etc.)
        await client.query(`
            CREATE TABLE IF NOT EXISTS documents (
                id VARCHAR(255) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                file_path TEXT NOT NULL,
                file_type VARCHAR(50),
                file_size INTEGER,
                uploaded_by VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                linked_to_type VARCHAR(50),
                linked_to_id VARCHAR(255),
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_documents_linked ON documents(linked_to_type, linked_to_id)
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_documents_uploader ON documents(uploaded_by)
        `);

        // Tabla de enlaces bidireccionales
        await client.query(`
            CREATE TABLE IF NOT EXISTS task_links (
                id SERIAL PRIMARY KEY,
                source_type VARCHAR(50) NOT NULL,
                source_id VARCHAR(255) NOT NULL,
                target_type VARCHAR(50) NOT NULL,
                target_id VARCHAR(255) NOT NULL,
                link_type VARCHAR(50),
                metadata JSONB DEFAULT '{}',
                created_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(source_type, source_id, target_type, target_id, link_type)
            )
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_task_links_source ON task_links(source_type, source_id)
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_task_links_target ON task_links(target_type, target_id)
        `);

        // Tabla de notas
        await client.query(`
            CREATE TABLE IF NOT EXISTS notes (
                id VARCHAR(255) PRIMARY KEY,
                content TEXT NOT NULL,
                user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                group_id VARCHAR(255) REFERENCES groups(id) ON DELETE SET NULL,
                linked_to_type VARCHAR(50),
                linked_to_id VARCHAR(255),
                context JSONB DEFAULT '{}',
                tags JSONB DEFAULT '[]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_notes_linked ON notes(linked_to_type, linked_to_id)
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id)
        `);

        // Tabla de listas de compras
        await client.query(`
            CREATE TABLE IF NOT EXISTS shopping_lists (
                id VARCHAR(255) PRIMARY KEY,
                resource_id VARCHAR(255) REFERENCES resources(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                items JSONB DEFAULT '[]',
                shared_with JSONB DEFAULT '[]',
                created_by VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_shopping_lists_resource ON shopping_lists(resource_id)
        `);

        // Tabla unificada de checklists (To-Do y Shopping)
        await client.query(`
            CREATE TABLE IF NOT EXISTS resource_checklists (
                id VARCHAR(255) PRIMARY KEY,
                resource_id VARCHAR(255) NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
                checklist_type VARCHAR(50) NOT NULL CHECK (checklist_type IN ('todo', 'shopping')),
                name VARCHAR(255) NOT NULL,
                items JSONB DEFAULT '[]',
                created_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(resource_id, checklist_type)
            )
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_resource_checklists_resource ON resource_checklists(resource_id)
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_resource_checklists_type ON resource_checklists(checklist_type)
        `);

        // Migrar shopping_lists existentes a resource_checklists
        await client.query(`
            INSERT INTO resource_checklists (id, resource_id, checklist_type, name, items, created_by, created_at, updated_at)
            SELECT 
                'CL-' || id::text,
                resource_id,
                'shopping',
                name,
                items,
                created_by,
                created_at,
                updated_at
            FROM shopping_lists
            WHERE NOT EXISTS (
                SELECT 1 FROM resource_checklists 
                WHERE resource_id = shopping_lists.resource_id 
                AND checklist_type = 'shopping'
            )
        `);

        // Migrar datos de equipment a resources (si existen equipos pero no recursos)
        await client.query(`
            INSERT INTO resources (id, qr_code, name, resource_type, group_id, description, status, creator_id, metadata, latitude, longitude, geofence_radius, created_at, updated_at)
            SELECT 
                'EQ-' || e.id::text,
                e.qr_code,
                e.name,
                'equipment',
                e.group_id,
                NULL,
                CASE 
                    WHEN e.status = 'operational' THEN 'active'
                    WHEN e.status = 'maintenance' THEN 'active'
                    ELSE 'inactive'
                END,
                e.creator_id,
                jsonb_build_object(
                    'equipment_status', e.status,
                    'last_maintenance', e.last_maintenance,
                    'next_maintenance', e.next_maintenance
                ),
                e.latitude,
                e.longitude,
                e.geofence_radius,
                e.created_at,
                e.updated_at
            FROM equipment e
            WHERE NOT EXISTS (
                SELECT 1 FROM resources r WHERE r.qr_code = e.qr_code
            )
        `);

        // Tabla de códigos de verificación
        await client.query(`
            CREATE TABLE IF NOT EXISTS verification_codes (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) NOT NULL,
                username VARCHAR(100) NOT NULL,
                code VARCHAR(6) NOT NULL,
                verified BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '10 minutes')
            )
        `);

        // Tabla de tokens de recuperación
        await client.query(`
            CREATE TABLE IF NOT EXISTS reset_tokens (
                id SERIAL PRIMARY KEY,
                token VARCHAR(255) UNIQUE NOT NULL,
                user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                email VARCHAR(255) NOT NULL,
                used BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 hour')
            )
        `);

        // Índices para mejorar rendimiento
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_tasks_group_id ON tasks(group_id);
            CREATE INDEX IF NOT EXISTS idx_tasks_creator_id ON tasks(creator_id);
            CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
            CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
            CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
            CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email);
            CREATE INDEX IF NOT EXISTS idx_reset_tokens_token ON reset_tokens(token);
        `);

        // Tablas para notificaciones push (FCM)
        await client.query(`
            CREATE TABLE IF NOT EXISTS fcm_tokens (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token TEXT NOT NULL UNIQUE,
                platform VARCHAR(20) DEFAULT 'web',
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON fcm_tokens(user_id);
            CREATE INDEX IF NOT EXISTS idx_fcm_tokens_token ON fcm_tokens(token);

            CREATE TABLE IF NOT EXISTS notification_preferences (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
                mentions BOOLEAN DEFAULT true,
                validations BOOLEAN DEFAULT true,
                overdue BOOLEAN DEFAULT true,
                assignments BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
        `);

        // Migración: Agregar columna config si no existe
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='users' AND column_name='config'
                ) THEN
                    ALTER TABLE users ADD COLUMN config JSONB DEFAULT '{}'::jsonb;
                END IF;
            END $$;
        `);

        // Migración: Agregar columna last_notification_at a tasks si no existe
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='tasks' AND column_name='last_notification_at'
                ) THEN
                    ALTER TABLE tasks ADD COLUMN last_notification_at TIMESTAMP;
                END IF;
            END $$;
        `);

        // Migración: Agregar columnas de geocerca a equipment si no existen
        await client.query(`
            DO $$ 
            BEGIN 
                -- Agregar latitude
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='equipment' AND column_name='latitude'
                ) THEN
                    ALTER TABLE equipment ADD COLUMN latitude DECIMAL(10, 6);
                END IF;

                -- Agregar longitude
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='equipment' AND column_name='longitude'
                ) THEN
                    ALTER TABLE equipment ADD COLUMN longitude DECIMAL(10, 6);
                END IF;

                -- Agregar geofence_radius
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='equipment' AND column_name='geofence_radius'
                ) THEN
                    ALTER TABLE equipment ADD COLUMN geofence_radius INTEGER DEFAULT 50;
                END IF;

                -- Eliminar public_secret si existe (ya no se usa)
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='equipment' AND column_name='public_secret'
                ) THEN
                    ALTER TABLE equipment DROP COLUMN public_secret;
                END IF;
            END $$;
        `);

        // Tabla para tokens de Google Calendar
        await client.query(`
            CREATE TABLE IF NOT EXISTS google_calendar_tokens (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
                access_token TEXT NOT NULL,
                refresh_token TEXT,
                token_expiry TIMESTAMP,
                calendar_id VARCHAR(255) DEFAULT 'primary',
                sync_enabled BOOLEAN DEFAULT true,
                last_sync_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_google_calendar_tokens_user_id ON google_calendar_tokens(user_id)
        `);

        // Tabla para eventos sincronizados con Google Calendar
        await client.query(`
            CREATE TABLE IF NOT EXISTS google_calendar_events (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                task_id VARCHAR(255) REFERENCES tasks(id) ON DELETE CASCADE,
                google_event_id VARCHAR(255) NOT NULL,
                calendar_id VARCHAR(255) DEFAULT 'primary',
                synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, google_event_id)
            )
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_google_calendar_events_user_id ON google_calendar_events(user_id)
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_google_calendar_events_task_id ON google_calendar_events(task_id)
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_google_calendar_events_google_event_id ON google_calendar_events(google_event_id)
        `);

        await client.query('COMMIT');
        console.log('✅ Tablas creadas/verificadas correctamente (incluyendo FCM y Geocerca)');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error creando tablas:', error);
        throw error;
    } finally {
        client.release();
    }
}

export { pool };




