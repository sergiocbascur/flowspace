// Generar código de verificación de 6 dígitos
export function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generar token de recuperación
export function generateResetToken() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15) + 
           Date.now().toString(36);
}






