import React, { useState, useEffect } from 'react';
import { User, Plus, ArrowRight, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { apiAuth } from './apiService';
import { getLastUser } from './authService';

const Login = ({ onLogin }) => {
    const [mode, setMode] = useState('login'); // 'login' | 'register' | 'verify' | 'forgot' | 'reset'
    const [username, setUsername] = useState(() => {
        // Cargar último usuario al inicializar
        return getLastUser();
    });
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [codeSent, setCodeSent] = useState(false);
    const [emailVerified, setEmailVerified] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [resetCodeSent, setResetCodeSent] = useState(false);

    // Limpiar errores cuando cambia el modo
    useEffect(() => {
        setError('');
        setSuccess('');
        
        // Solo resetear emailVerified si NO estamos cambiando de verify a register
        // (es decir, si cambiamos a cualquier otro modo o si cambiamos a register sin haber verificado)
        if (mode === 'login' || (mode !== 'register' && mode !== 'verify')) {
            setEmailVerified(false);
        }
        
        if (mode !== 'verify' && mode !== 'login' && mode !== 'register') {
            // Limpiar todo cuando se cambia a otros modos (forgot, reset)
            setUsername('');
            setEmail('');
            setPassword('');
            setConfirmPassword('');
        } else if (mode === 'login') {
            // Solo limpiar contraseña en modo login, mantener username
            setPassword('');
        }
        // No limpiar username, email cuando se cambia a register (después de verificar)
        
        setVerificationCode('');
        setCodeSent(false);
        setResetEmail('');
        setResetToken('');
        setNewPassword('');
        setConfirmNewPassword('');
        setResetCodeSent(false);
    }, [mode]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        
        if (!username.trim() || !password.trim()) {
            setError('Por favor completa todos los campos');
            return;
        }

        setLoading(true);
        try {
            const result = await apiAuth.login(username.trim(), password);
            if (result.success) {
                setSuccess('¡Bienvenido de vuelta!');
                setTimeout(() => {
                    onLogin(result.user);
                }, 500);
            } else {
                // Mostrar el error específico que viene del servidor
                const errorMsg = result.error || 'Error al iniciar sesión';
                setError(errorMsg);
                
                // Si el error sugiere registrarse, mostrar un botón o link
                if (errorMsg.includes('Regístrate') || errorMsg.includes('no encontrado')) {
                    // El mensaje ya incluye la sugerencia, no necesitamos hacer nada más
                }
            }
        } catch (err) {
            // Extraer el mensaje del error del backend
            const errorMessage = err.message || err.error || 'Error al iniciar sesión. Intenta nuevamente.';
            setError(errorMessage);
            console.error('Login error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSendVerificationCode = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Validaciones
        if (!username.trim()) {
            setError('El nombre de usuario es requerido');
            return;
        }

        if (username.length < 3) {
            setError('El nombre de usuario debe tener al menos 3 caracteres');
            return;
        }

        if (!email.trim()) {
            setError('El email es obligatorio');
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError('Por favor ingresa un email válido');
            return;
        }

        setLoading(true);
        try {
            const result = await apiAuth.sendVerificationCode(email.trim(), username.trim());
            if (result.success) {
                setCodeSent(true);
                setSuccess(`Código de verificación enviado a ${result.email || email}`);
                setMode('verify');
            } else {
                setError(result.error || 'Error al enviar código de verificación');
            }
        } catch (err) {
            setError('Error al enviar código. Intenta nuevamente.');
            console.error('Send code error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyCode = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!verificationCode.trim() || verificationCode.length !== 6) {
            setError('Por favor ingresa el código de 6 dígitos');
            return;
        }

        setLoading(true);
        try {
            const result = await apiAuth.verifyCode(email.trim(), verificationCode.trim());
            if (result.success) {
                setEmailVerified(true);
                setSuccess('¡Email verificado exitosamente!');
                // Continuar al paso de contraseña
                setTimeout(() => {
                    setMode('register');
                }, 1000);
            } else {
                setError(result.error || 'Código inválido');
            }
        } catch (err) {
            setError('Error al verificar código. Intenta nuevamente.');
            console.error('Verify code error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!emailVerified) {
            setError('Debes verificar tu email primero');
            return;
        }

        if (!password.trim()) {
            setError('La contraseña es requerida');
            return;
        }

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        setLoading(true);
        try {
            const result = await apiAuth.register(username.trim(), email.trim(), password);
            if (result.success) {
                setSuccess('¡Cuenta creada exitosamente!');
                setTimeout(() => {
                    onLogin(result.user);
                }, 1000);
            } else {
                setError(result.error || 'Error al crear la cuenta');
            }
        } catch (err) {
            setError('Error al registrar usuario. Intenta nuevamente.');
            console.error('Register error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRequestReset = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!resetEmail.trim()) {
            setError('Por favor ingresa tu email');
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail)) {
            setError('Por favor ingresa un email válido');
            return;
        }

        setLoading(true);
        try {
            const result = await apiAuth.requestPasswordReset(resetEmail.trim());
            if (result.success) {
                setResetCodeSent(true);
                setSuccess(result.message || 'Código de recuperación enviado a tu email');
            } else {
                setError(result.error || 'Error al solicitar recuperación');
            }
        } catch (err) {
            setError('Error al solicitar recuperación. Intenta nuevamente.');
            console.error('Reset request error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!resetToken.trim()) {
            setError('Por favor ingresa el código de recuperación');
            return;
        }

        if (!newPassword.trim()) {
            setError('La nueva contraseña es requerida');
            return;
        }

        if (newPassword.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        if (newPassword !== confirmNewPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        setLoading(true);
        try {
            const result = await apiAuth.resetPassword(resetToken.trim(), newPassword);
            if (result.success) {
                setSuccess('¡Contraseña actualizada exitosamente!');
                setTimeout(() => {
                    setMode('login');
                }, 1500);
            } else {
                setError(result.error || 'Error al actualizar la contraseña');
            }
        } catch (err) {
            setError('Error al actualizar contraseña. Intenta nuevamente.');
            console.error('Reset password error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-8 animate-in fade-in zoom-in-95">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-blue-600/30">
                        <span className="font-black text-2xl">L</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">FlowSpace</h1>
                    <p className="text-slate-500 mt-2">
                        {mode === 'login' ? 'Inicia sesión para continuar' : 
                         mode === 'register' ? (emailVerified ? 'Completa tu registro' : 'Crea tu cuenta para comenzar') :
                         mode === 'verify' ? 'Verifica tu email' :
                         mode === 'forgot' ? 'Recupera tu contraseña' :
                         'Restablece tu contraseña'}
                    </p>
                </div>

                {/* Mensajes de error/éxito */}
                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                        {error.includes('Olvidaste tu contraseña') && mode === 'login' && (
                            <button
                                onClick={() => setMode('forgot')}
                                className="text-xs text-red-600 hover:text-red-800 underline mt-1"
                            >
                                Recuperar contraseña
                            </button>
                        )}
                    </div>
                )}

                {success && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 text-green-700 text-sm animate-in fade-in slide-in-from-top-2">
                        <CheckCircle2 size={16} />
                        <span>{success}</span>
                    </div>
                )}

                {mode === 'login' ? (
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Usuario o Email
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    placeholder="Tu usuario o email"
                                    autoFocus
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Contraseña
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    placeholder="Tu contraseña"
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex={-1}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !username.trim() || !password.trim()}
                            className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Iniciando sesión...</span>
                                </>
                            ) : (
                                <>
                                    <span>Iniciar Sesión</span>
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>

                        <div className="text-center pt-2 space-y-2">
                            <button
                                type="button"
                                onClick={() => setMode('forgot')}
                                className="block text-sm text-slate-500 hover:text-blue-600 transition-colors"
                            >
                                ¿Olvidaste tu contraseña?
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode('register')}
                                className="block text-sm text-slate-500 hover:text-blue-600 transition-colors"
                            >
                                ¿No tienes cuenta? <span className="font-semibold">Regístrate</span>
                            </button>
                        </div>
                    </form>
                ) : mode === 'forgot' ? (
                    <form onSubmit={handleRequestReset} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Email de recuperación
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="email"
                                    value={resetEmail}
                                    onChange={(e) => setResetEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    placeholder="tu@email.com"
                                    autoFocus
                                    disabled={loading || resetCodeSent}
                                />
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                                Te enviaremos un código para recuperar tu contraseña
                            </p>
                        </div>

                        {resetCodeSent && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700 whitespace-pre-line">
                                {success}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setMode('login')}
                                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                                disabled={loading}
                            >
                                Volver
                            </button>
                            {!resetCodeSent ? (
                                <button
                                    type="submit"
                                    disabled={loading || !resetEmail.trim()}
                                    className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <span>Enviando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Mail size={18} />
                                            <span>Enviar Código</span>
                                        </>
                                    )}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setMode('reset')}
                                    className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <span>Continuar</span>
                                    <ArrowRight size={18} />
                                </button>
                            )}
                        </div>
                    </form>
                ) : mode === 'reset' ? (
                    <form onSubmit={handleResetPassword} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Código de recuperación
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    value={resetToken}
                                    onChange={(e) => setResetToken(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono text-sm"
                                    placeholder="Ingresa el código recibido"
                                    autoFocus
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Nueva Contraseña
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type={showNewPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    placeholder="Mínimo 6 caracteres"
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    tabIndex={-1}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Confirmar Nueva Contraseña
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type={showConfirmNewPassword ? 'text' : 'password'}
                                    value={confirmNewPassword}
                                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                                    className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    placeholder="Repite la nueva contraseña"
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                                    tabIndex={-1}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showConfirmNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !resetToken.trim() || !newPassword.trim() || newPassword !== confirmNewPassword}
                            className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Actualizando...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 size={18} />
                                    <span>Actualizar Contraseña</span>
                                </>
                            )}
                        </button>

                        <div className="text-center pt-2">
                            <button
                                type="button"
                                onClick={() => setMode('login')}
                                className="text-sm text-slate-500 hover:text-blue-600 transition-colors"
                            >
                                Volver al inicio de sesión
                            </button>
                        </div>
                    </form>
                ) : mode === 'verify' ? (
                    <form onSubmit={handleVerifyCode} className="space-y-4">
                        <div className="text-center mb-4">
                            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Mail size={32} className="text-blue-600" />
                            </div>
                            <h3 className="font-bold text-lg text-slate-800">Verifica tu email</h3>
                            <p className="text-sm text-slate-500 mt-1">
                                Hemos enviado un código a <span className="font-semibold">{email}</span>
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Código de verificación
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    value={verificationCode}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                                        setVerificationCode(value);
                                    }}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono text-center text-lg tracking-widest"
                                    placeholder="000000"
                                    maxLength={6}
                                    autoFocus
                                    disabled={loading}
                                />
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Ingresa el código de 6 dígitos</p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || verificationCode.length !== 6}
                            className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Verificando...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 size={18} />
                                    <span>Verificar Código</span>
                                </>
                            )}
                        </button>

                        <div className="text-center pt-2 space-y-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setMode('register');
                                    setVerificationCode('');
                                }}
                                className="block text-sm text-slate-500 hover:text-blue-600 transition-colors"
                            >
                                Volver
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    setError('');
                                    setSuccess('');
                                    setLoading(true);
                                    try {
                                        const result = await apiAuth.sendVerificationCode(email.trim(), username.trim());
                                        if (result.success) {
                                            setSuccess(`Código reenviado a ${result.email || email}`);
                                        } else {
                                            setError(result.error || 'Error al reenviar código');
                                        }
                                    } catch (err) {
                                        setError('Error al reenviar código. Intenta nuevamente.');
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                                disabled={loading}
                                className="block text-xs text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                            >
                                Reenviar código
                            </button>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={emailVerified ? handleRegister : handleSendVerificationCode} className="space-y-4">
                        {!emailVerified ? (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Nombre de Usuario <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                            placeholder="Ej. Dra. Vallejo"
                                            autoFocus
                                            disabled={loading}
                                        />
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">Mínimo 3 caracteres</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Email <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                            placeholder="tu@email.com"
                                            disabled={loading}
                                        />
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">Necesario para recuperar tu contraseña</p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || !username.trim() || !email.trim()}
                                    className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <span>Enviando código...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Mail size={18} />
                                            <span>Enviar Código de Verificación</span>
                                        </>
                                    )}
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 text-green-700 text-sm">
                                    <CheckCircle2 size={16} />
                                    <span>Email verificado: {email}</span>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Contraseña <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                            placeholder="Mínimo 6 caracteres"
                                            autoFocus
                                            disabled={loading}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            tabIndex={-1}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">Mínimo 6 caracteres</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Confirmar Contraseña <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                            placeholder="Repite tu contraseña"
                                            disabled={loading}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            tabIndex={-1}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || !password.trim() || password !== confirmPassword}
                                    className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <span>Creando cuenta...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Plus size={18} />
                                            <span>Crear Cuenta</span>
                                        </>
                                    )}
                                </button>
                            </>
                        )}

                        <div className="text-center pt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setMode('login');
                                    setEmailVerified(false);
                                    setCodeSent(false);
                                }}
                                className="text-sm text-slate-500 hover:text-blue-600 transition-colors"
                            >
                                ¿Ya tienes cuenta? <span className="font-semibold">Inicia sesión</span>
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default Login;
