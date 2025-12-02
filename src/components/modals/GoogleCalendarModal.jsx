import React, { useState, useEffect } from 'react';
import { Calendar, X, CheckCircle2, AlertCircle, Loader } from 'lucide-react';
import { apiCalendar } from '../../apiService';

const GoogleCalendarModal = ({ isOpen, onClose, toast }) => {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadStatus();
        }
    }, [isOpen]);

    const loadStatus = async () => {
        setLoading(true);
        try {
            const result = await apiCalendar.getStatus();
            if (result.success) {
                setStatus(result);
            }
        } catch (error) {
            console.error('Error cargando estado:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async () => {
        setConnecting(true);
        try {
            const result = await apiCalendar.getAuthUrl();
            
            // Verificar si requiere configuración
            if (!result.success && result.requiresConfiguration) {
                toast.error('Google Calendar no está configurado. Contacta al administrador.');
                setConnecting(false);
                return;
            }
            
            if (result.success && result.authUrl) {
                // Abrir ventana de autorización
                const width = 500;
                const height = 600;
                const left = (window.screen.width - width) / 2;
                const top = (window.screen.height - height) / 2;

                const authWindow = window.open(
                    result.authUrl,
                    'Google Calendar Authorization',
                    `width=${width},height=${height},left=${left},top=${top}`
                );

                // Escuchar mensaje del callback HTML
                const messageListener = async (event) => {
                    // Verificar origen por seguridad
                    if (event.origin !== window.location.origin) {
                        return;
                    }

                    if (event.data.type === 'google-calendar-callback') {
                        window.removeEventListener('message', messageListener);
                        if (authWindow && !authWindow.closed) {
                            authWindow.close();
                        }

                        if (event.data.code) {
                            try {
                                const connectResult = await apiCalendar.connect(event.data.code);
                                if (connectResult.success) {
                                    toast.success('Google Calendar conectado exitosamente');
                                    await loadStatus();
                                } else {
                                    toast.error(connectResult.error || 'Error al conectar');
                                }
                            } catch (error) {
                                console.error('Error conectando:', error);
                                toast.error('Error al conectar Google Calendar');
                            }
                        }
                        setConnecting(false);
                    }
                };

                window.addEventListener('message', messageListener);

                // Verificar si la ventana se cerró manualmente
                const checkClosed = setInterval(() => {
                    if (authWindow.closed) {
                        clearInterval(checkClosed);
                        window.removeEventListener('message', messageListener);
                        setConnecting(false);
                    }
                }, 500);
            }
        } catch (error) {
            console.error('Error iniciando conexión:', error);
            toast.error('Error al iniciar conexión con Google Calendar');
        } finally {
            setConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm('¿Desconectar Google Calendar? Las tareas sincronizadas dejarán de actualizarse.')) {
            return;
        }

        try {
            const result = await apiCalendar.disconnect();
            if (result.success) {
                toast.success('Google Calendar desconectado');
                await loadStatus();
            } else {
                toast.error(result.error || 'Error al desconectar');
            }
        } catch (error) {
            toast.error('Error al desconectar Google Calendar');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Calendar className="text-blue-600" size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">Google Calendar</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader className="animate-spin text-blue-600" size={24} />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {status?.connected ? (
                            <>
                                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                                    <div className="flex items-start gap-3">
                                        <CheckCircle2 className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
                                        <div className="flex-1">
                                            <p className="font-semibold text-green-900 mb-1">
                                                Conectado
                                            </p>
                                            <p className="text-sm text-green-700">
                                                Tus tareas se sincronizarán automáticamente con Google Calendar.
                                            </p>
                                            {status.lastSyncAt && (
                                                <p className="text-xs text-green-600 mt-2">
                                                    Última sincronización: {new Date(status.lastSyncAt).toLocaleString('es-CL')}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={status.syncEnabled}
                                            onChange={async (e) => {
                                                // Aquí podrías agregar una función para toggle sync
                                                toast.info('Función próximamente disponible');
                                            }}
                                            className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-slate-700">
                                            Sincronización automática activada
                                        </span>
                                    </label>
                                </div>

                                <button
                                    onClick={handleDisconnect}
                                    className="w-full py-2.5 px-4 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition-colors"
                                >
                                    Desconectar
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
                                        <div className="flex-1">
                                            <p className="font-semibold text-blue-900 mb-1">
                                                No conectado
                                            </p>
                                            <p className="text-sm text-blue-700">
                                                Conecta tu cuenta de Google Calendar para sincronizar tus tareas automáticamente.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleConnect}
                                    disabled={connecting}
                                    className="w-full py-3 px-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                                >
                                    {connecting ? (
                                        <>
                                            <Loader className="animate-spin" size={18} />
                                            Conectando...
                                        </>
                                    ) : (
                                        <>
                                            <Calendar size={18} />
                                            Conectar Google Calendar
                                        </>
                                    )}
                                </button>

                                <p className="text-xs text-slate-500 text-center">
                                    Al conectar, autorizas a FlowSpace a crear y actualizar eventos en tu calendario de Google.
                                </p>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default GoogleCalendarModal;

