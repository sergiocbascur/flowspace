// Servicio de Autenticación usando localStorage como base de datos
// Usa Web Crypto API para hashear contraseñas (sin dependencias externas)

const STORAGE_KEY = 'flowspace_users';
const SESSION_KEY = 'flowspace_session';
const RESET_TOKENS_KEY = 'flowspace_reset_tokens';
const VERIFICATION_CODES_KEY = 'flowspace_verification_codes';
const LAST_USER_KEY = 'flowspace_last_user';

// Función para hashear contraseñas usando Web Crypto API
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

// Función para verificar contraseña
async function verifyPassword(password, hashedPassword) {
    const passwordHash = await hashPassword(password);
    return passwordHash === hashedPassword;
}

// Obtener todos los usuarios de la "base de datos"
export function getUsers() {
    try {
        const usersJson = localStorage.getItem(STORAGE_KEY);
        return usersJson ? JSON.parse(usersJson) : [];
    } catch (error) {
        console.error('Error al leer usuarios:', error);
        return [];
    }
}

// Guardar usuarios en la "base de datos"
function saveUsers(users) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
        return true;
    } catch (error) {
        console.error('Error al guardar usuarios:', error);
        return false;
    }
}

// Generar código de verificación (6 dígitos)
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Obtener códigos de verificación
function getVerificationCodes() {
    try {
        const codesJson = localStorage.getItem(VERIFICATION_CODES_KEY);
        return codesJson ? JSON.parse(codesJson) : [];
    } catch (error) {
        console.error('Error al leer códigos de verificación:', error);
        return [];
    }
}

// Guardar códigos de verificación
function saveVerificationCodes(codes) {
    try {
        // Limpiar códigos expirados (más de 10 minutos)
        const now = Date.now();
        const validCodes = codes.filter(c => (now - c.createdAt) < 600000); // 10 minutos
        localStorage.setItem(VERIFICATION_CODES_KEY, JSON.stringify(validCodes));
        return true;
    } catch (error) {
        console.error('Error al guardar códigos:', error);
        return false;
    }
}

// Enviar código de verificación por email
export function sendVerificationCode(email, username) {
    const users = getUsers();
    
    // Validar formato de email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { success: false, error: 'Email inválido' };
    }
    
    // Validar que el email no esté registrado
    const emailLower = email.toLowerCase().trim();
    if (users.some(u => u.email && u.email.toLowerCase() === emailLower)) {
        return { success: false, error: 'Este email ya está registrado' };
    }
    
    // Validar que el username no exista
    const usernameLower = username.toLowerCase().trim();
    if (users.some(u => u.username && u.username.toLowerCase() === usernameLower)) {
        return { success: false, error: 'El nombre de usuario ya existe' };
    }
    
    // Generar código
    const code = generateVerificationCode();
    const verificationCode = {
        email: emailLower,
        username: usernameLower,
        code,
        createdAt: Date.now(),
        verified: false
    };
    
    // Guardar código
    const codes = getVerificationCodes();
    // Eliminar códigos anteriores para este email
    const filteredCodes = codes.filter(c => c.email !== emailLower);
    filteredCodes.push(verificationCode);
    saveVerificationCodes(filteredCodes);
    
    // En producción, aquí se enviaría el código por email
    // Por ahora, retornamos el código para mostrarlo en la UI (solo para desarrollo)
    return { 
        success: true, 
        code: code, // Solo para desarrollo - en producción no se retorna
        message: 'Código de verificación enviado a tu email',
        email: email
    };
}

// Verificar código de verificación
export function verifyEmailCode(email, code) {
    const codes = getVerificationCodes();
    const emailLower = email.toLowerCase().trim();
    const verification = codes.find(c => c.email === emailLower && c.code === code && !c.verified);
    
    if (!verification) {
        return { success: false, error: 'Código inválido o expirado' };
    }
    
    // Verificar que no haya expirado (10 minutos)
    const now = Date.now();
    if (now - verification.createdAt > 600000) {
        return { success: false, error: 'El código ha expirado. Solicita uno nuevo.' };
    }
    
    // Marcar como verificado
    verification.verified = true;
    saveVerificationCodes(codes);
    
    return { 
        success: true, 
        email: verification.email,
        username: verification.username
    };
}

// Registrar nuevo usuario (después de verificar email)
export async function registerUser(username, email, password, avatar = '👤') {
    const users = getUsers();
    
    // Validar que el email esté verificado
    const codes = getVerificationCodes();
    const emailLower = email.toLowerCase().trim();
    const verification = codes.find(c => c.email === emailLower && c.verified);
    
    if (!verification) {
        return { success: false, error: 'El email debe ser verificado primero' };
    }
    
    // Validar que el username coincida con el verificado
    const usernameLower = username.toLowerCase().trim();
    if (verification.username !== usernameLower) {
        return { success: false, error: 'El nombre de usuario no coincide con el verificado' };
    }
    
    // Validar contraseña (mínimo 6 caracteres)
    if (password.length < 6) {
        return { success: false, error: 'La contraseña debe tener al menos 6 caracteres' };
    }
    
    // Hashear contraseña
    const hashedPassword = await hashPassword(password);
    
    // Crear nuevo usuario
    const newUser = {
        id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        username: username.trim(),
        email: email.trim(),
        passwordHash: hashedPassword,
        name: username.trim(),
        avatar,
        createdAt: new Date().toISOString(),
        emailVerified: true
    };
    
    // Guardar usuario
    users.push(newUser);
    if (saveUsers(users)) {
        // Eliminar código de verificación usado
        const filteredCodes = codes.filter(c => c.email !== emailLower);
        saveVerificationCodes(filteredCodes);
        
        return { success: true, user: { id: newUser.id, username: newUser.username, name: newUser.name, avatar: newUser.avatar, email: newUser.email } };
    } else {
        return { success: false, error: 'Error al guardar el usuario' };
    }
}

// Iniciar sesión
export async function loginUser(username, password) {
    try {
        const users = getUsers();
        
        if (!username || !password) {
            return { success: false, error: 'Por favor completa todos los campos' };
        }
        
        // Buscar usuario por username o email (case-insensitive)
        const searchTerm = username.toLowerCase().trim();
        const user = users.find(u => 
            (u.username && u.username.toLowerCase() === searchTerm) || 
            (u.email && u.email.toLowerCase() === searchTerm)
        );
        
        if (!user) {
            return { success: false, error: 'Usuario o contraseña incorrectos' };
        }
        
        // Verificar que el usuario tenga passwordHash
        if (!user.passwordHash) {
            return { success: false, error: 'Error: Usuario sin contraseña configurada. Por favor regístrate nuevamente.' };
        }
        
        // Verificar contraseña
        const isValid = await verifyPassword(password, user.passwordHash);
        
        if (!isValid) {
            return { success: false, error: 'Usuario o contraseña incorrectos' };
        }
        
        // Crear sesión
        const session = {
            userId: user.id,
            username: user.username,
            loginTime: new Date().toISOString()
        };
        
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        
        // Guardar último usuario para recordarlo
        localStorage.setItem(LAST_USER_KEY, user.username);
        
        return { 
            success: true, 
            user: { 
                id: user.id, 
                username: user.username, 
                name: user.name, 
                avatar: user.avatar,
                email: user.email
            } 
        };
    } catch (error) {
        console.error('Error en loginUser:', error);
        return { success: false, error: 'Error al iniciar sesión. Por favor intenta nuevamente.' };
    }
}

// Cerrar sesión
export function logout() {
    localStorage.removeItem(SESSION_KEY);
    // No eliminamos LAST_USER_KEY para que recuerde el usuario
}

// Obtener último usuario que inició sesión
export function getLastUser() {
    try {
        return localStorage.getItem(LAST_USER_KEY) || '';
    } catch (error) {
        return '';
    }
}

// Verificar si hay una sesión activa
export function getCurrentSession() {
    try {
        const sessionJson = localStorage.getItem(SESSION_KEY);
        if (!sessionJson) return null;
        
        const session = JSON.parse(sessionJson);
        const users = getUsers();
        const user = users.find(u => u.id === session.userId);
        
        if (!user) {
            logout();
            return null;
        }
        
        return {
            id: user.id,
            username: user.username,
            name: user.name,
            avatar: user.avatar,
            email: user.email
        };
    } catch (error) {
        console.error('Error al leer sesión:', error);
        logout();
        return null;
    }
}

// Obtener todos los usuarios (sin contraseñas) para mostrar en la app
export function getAllUsers() {
    const users = getUsers();
    return users.map(u => ({
        id: u.id,
        username: u.username,
        name: u.name,
        avatar: u.avatar,
        email: u.email
    }));
}

// Eliminar cuenta de usuario
export function deleteUser(userId) {
    try {
        const users = getUsers();
        const filteredUsers = users.filter(u => u.id !== userId);
        
        if (saveUsers(filteredUsers)) {
            // Eliminar sesión si es el usuario actual
            const session = getCurrentSession();
            if (session && session.id === userId) {
                logout();
            }
            return { success: true, message: 'Cuenta eliminada exitosamente' };
        } else {
            return { success: false, error: 'Error al eliminar cuenta' };
        }
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        return { success: false, error: 'Error al eliminar cuenta' };
    }
}

// Función de utilidad para verificar si un usuario existe (para debugging)
export function checkUserExists(usernameOrEmail) {
    const users = getUsers();
    const searchTerm = usernameOrEmail.toLowerCase().trim();
    const user = users.find(u => 
        (u.username && u.username.toLowerCase() === searchTerm) || 
        (u.email && u.email.toLowerCase() === searchTerm)
    );
    return {
        exists: !!user,
        hasEmail: user && !!user.email,
        username: user ? user.username : null,
        hasPasswordHash: user && !!user.passwordHash,
        userId: user ? user.id : null
    };
}

// Función de debugging para ver todos los usuarios (solo para desarrollo)
export function debugUsers() {
    const users = getUsers();
    return users.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        hasPasswordHash: !!u.passwordHash,
        passwordHashLength: u.passwordHash ? u.passwordHash.length : 0
    }));
}

// Generar token de recuperación
function generateResetToken() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

// Obtener tokens de recuperación
function getResetTokens() {
    try {
        const tokensJson = localStorage.getItem(RESET_TOKENS_KEY);
        return tokensJson ? JSON.parse(tokensJson) : [];
    } catch (error) {
        console.error('Error al leer tokens:', error);
        return [];
    }
}

// Guardar tokens de recuperación
function saveResetTokens(tokens) {
    try {
        // Limpiar tokens expirados (más de 1 hora)
        const now = Date.now();
        const validTokens = tokens.filter(t => (now - t.createdAt) < 3600000); // 1 hora
        localStorage.setItem(RESET_TOKENS_KEY, JSON.stringify(validTokens));
        return true;
    } catch (error) {
        console.error('Error al guardar tokens:', error);
        return false;
    }
}

// Solicitar recuperación de contraseña
export function requestPasswordReset(email) {
    const users = getUsers();
    
    // Buscar usuario por email (case-insensitive)
    const emailLower = email.toLowerCase().trim();
    const user = users.find(u => u.email && u.email.toLowerCase() === emailLower);
    
    if (!user) {
        // Por seguridad, no revelamos si el email existe o no
        return { success: true, message: 'Si el email existe, recibirás un código de recuperación.' };
    }
    
    // Generar token
    const token = generateResetToken();
    const resetToken = {
        token,
        userId: user.id,
        email: user.email,
        createdAt: Date.now(),
        used: false
    };
    
    // Guardar token
    const tokens = getResetTokens();
    tokens.push(resetToken);
    saveResetTokens(tokens);
    
    // En producción, aquí se enviaría el token por email
    // Por ahora, retornamos el token para mostrarlo en la UI (solo para desarrollo/demo)
    return { 
        success: true, 
        token: token, // Solo para desarrollo - en producción no se retorna
        message: 'Código de recuperación generado. Revisa tu email.',
        email: user.email
    };
}

// Verificar token de recuperación
export function verifyResetToken(token) {
    const tokens = getResetTokens();
    const resetToken = tokens.find(t => t.token === token && !t.used);
    
    if (!resetToken) {
        return { success: false, error: 'Código inválido o expirado' };
    }
    
    // Verificar que no haya expirado (1 hora)
    const now = Date.now();
    if (now - resetToken.createdAt > 3600000) {
        return { success: false, error: 'El código ha expirado. Solicita uno nuevo.' };
    }
    
    return { success: true, userId: resetToken.userId, email: resetToken.email };
}

// Resetear contraseña con token
export async function resetPassword(token, newPassword) {
    // Validar contraseña
    if (newPassword.length < 6) {
        return { success: false, error: 'La contraseña debe tener al menos 6 caracteres' };
    }
    
    // Verificar token
    const tokenVerification = verifyResetToken(token);
    if (!tokenVerification.success) {
        return tokenVerification;
    }
    
    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === tokenVerification.userId);
    
    if (userIndex === -1) {
        return { success: false, error: 'Usuario no encontrado' };
    }
    
    // Hashear nueva contraseña
    const hashedPassword = await hashPassword(newPassword);
    
    // Actualizar contraseña
    users[userIndex].passwordHash = hashedPassword;
    
    if (!saveUsers(users)) {
        return { success: false, error: 'Error al actualizar la contraseña' };
    }
    
    // Marcar token como usado
    const tokens = getResetTokens();
    const tokenIndex = tokens.findIndex(t => t.token === token);
    if (tokenIndex !== -1) {
        tokens[tokenIndex].used = true;
        saveResetTokens(tokens);
    }
    
    return { success: true, message: 'Contraseña actualizada exitosamente' };
}

