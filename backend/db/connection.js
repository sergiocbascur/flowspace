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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
        
        await client.query('COMMIT');
        console.log('✅ Tablas creadas/verificadas correctamente');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error creando tablas:', error);
        throw error;
    } finally {
        client.release();
    }
}

export { pool };

