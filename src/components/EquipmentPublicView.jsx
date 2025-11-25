import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Clock, Calendar } from 'lucide-react';
import logger from '../utils/logger';

const EquipmentPublicView = ({ qrCode, onClose }) => {
    const [equipment, setEquipment] = useState(null);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [verifyingLocation, setVerifyingLocation] = useState(true);
    const [locationError, setLocationError] = useState(null);
    const [error, setError] = useState(null);
    const [showTempCodeInput, setShowTempCodeInput] = useState(false);
    const [tempCode, setTempCode] = useState('');
    const [verifyingCode, setVerifyingCode] = useState(false);
    const [sessionExpiresAt, setSessionExpiresAt] = useState(null);

    useEffect(() => {
        const getApiUrl = () => {
            if (import.meta.env.VITE_API_URL) {
                return import.meta.env.VITE_API_URL.endsWith('/api') 
                    ? import.meta.env.VITE_API_URL 
                    : `${import.meta.env.VITE_API_URL}/api`;
            } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                return 'http://localhost:3000/api';
            } else {
                return 'https://api.flowspace.farmavet-bodega.cl/api';
            }
        };

        const verifyLocationAndFetch = async () => {
            try {
                setVerifyingLocation(true);
                setLocationError(null);

                // Solicitar ubicación del usuario
                if (!navigator.geolocation) {
                    setLocationError('Tu navegador no soporta geolocalización');
                    setVerifyingLocation(false);
                    return;
                }

                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 0
                    });
                });

                const { latitude, longitude } = position.coords;
                logger.debug('Ubicación obtenida:', { latitude, longitude });

                // Verificar ubicación con el backend
                const apiUrl = getApiUrl();
                const verifyUrl = `${apiUrl}/equipment/public/${qrCode}/verify-location`;
                
                const verifyResponse = await fetch(verifyUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ latitude, longitude })
                });

                const verifyData = await verifyResponse.json();

                // El backend retorna authorized: true/false, no success
                if (!verifyData.authorized) {
                    const distance = verifyData.distance ? ` (Estás a ${verifyData.distance} metros)` : '';
                    setLocationError(verifyData.message || `No estás cerca del equipo. Debes estar frente al equipo para ver su información.${distance}`);
                    setVerifyingLocation(false);
                    return;
                }

                // Si la verificación es exitosa, obtener los datos del equipo
                if (verifyData.equipment) {
                    setEquipment(verifyData.equipment);
                }
                if (verifyData.logs) {
                    setLogs(verifyData.logs);
                }
                setVerifyingLocation(false);
                setLoading(false);
            } catch (err) {
                logger.error('Error verificando ubicación:', err);
                if (err.code === 1) {
                    setLocationError('Permiso de ubicación denegado. Necesitas permitir el acceso a tu ubicación para ver esta información.');
                } else if (err.code === 2) {
                    setLocationError('No se pudo obtener tu ubicación. Verifica que el GPS esté activado.');
                } else if (err.code === 3) {
                    setLocationError('Tiempo de espera agotado al obtener tu ubicación.');
                } else {
                    setLocationError('Error al verificar tu ubicación. Intenta de nuevo.');
                }
                setVerifyingLocation(false);
            }
        };

        const fetchEquipment = async () => {
            try {
                setLoading(true);
                const apiUrl = getApiUrl();
                
                const url = `${apiUrl}/equipment/public/${qrCode}`;
                logger.debug('Buscando equipo público en:', url);
                
                const response = await fetch(url);
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: `Error ${response.status}: ${response.statusText}` }));
                    logger.error('Error en respuesta del servidor:', errorData);
                    setError(errorData.error || `Error ${response.status}: ${response.statusText}`);
                    return;
                }
                
                const data = await response.json();
                logger.debug('Respuesta del servidor:', data);

                if (data.success && data.equipment) {
                    setEquipment(data.equipment);
                    // Cargar logs después de obtener el equipo
                    fetchLogs(data.equipment.qr_code, apiUrl);
                } else {
                    setError(data.error || 'Equipo no encontrado');
                }
            } catch (err) {
                logger.error('Error cargando equipo público:', err);
                setError(`Error al cargar la información del equipo: ${err.message || 'Error de conexión'}`);
            } finally {
                setLoading(false);
            }
        };

        const fetchLogs = async (equipmentQrCode, apiUrl) => {
            try {
                setLoadingLogs(true);
                const url = `${apiUrl}/equipment/public/${equipmentQrCode}/logs`;
                const response = await fetch(url);
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.logs) {
                        setLogs(data.logs);
                    }
                }
            } catch (err) {
                logger.error('Error cargando logs públicos:', err);
                // No mostrar error si falla cargar logs, solo no mostrarlos
            } finally {
                setLoadingLogs(false);
            }
        };

        if (qrCode) {
            verifyLocationAndFetch();
        }
    }, [qrCode]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'operational':
                return 'bg-green-100 text-green-700 border-green-200';
            case 'maintenance':
                return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'out_of_service':
                return 'bg-red-100 text-red-700 border-red-200';
            default:
                return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'operational':
                return 'Operativo';
            case 'maintenance':
                return 'En Mantención';
            case 'out_of_service':
                return 'Fuera de Servicio';
            default:
                return status;
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'No registrada';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    };

    if (verifyingLocation) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Verificando ubicación</h2>
                    <p className="text-slate-600 mb-4">Necesitamos verificar que estás cerca del equipo para mostrar su información.</p>
                    <p className="text-sm text-slate-500">Por favor, permite el acceso a tu ubicación cuando se solicite.</p>
                </div>
            </div>
        );
    }

    // Verificar si la sesión temporal ha expirado
    useEffect(() => {
        if (sessionExpiresAt) {
            const checkExpiration = setInterval(() => {
                if (new Date() > new Date(sessionExpiresAt)) {
                    setSessionExpiresAt(null);
                    setEquipment(null);
                    setLogs([]);
                    setVerifyingLocation(true);
                    setLocationError('Tu sesión temporal ha expirado. Por favor, verifica tu ubicación nuevamente o ingresa un nuevo código.');
                }
            }, 1000);
            return () => clearInterval(checkExpiration);
        }
    }, [sessionExpiresAt]);

    if (locationError && !showTempCodeInput) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 max-w-md w-full text-center">
                    <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Ubicación requerida</h2>
                    <p className="text-slate-600 mb-6">{locationError}</p>
                    <div className="space-y-3">
                        <button
                            onClick={() => setShowTempCodeInput(true)}
                            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                            Ingresar código temporal
                        </button>
                        <button
                            onClick={() => {
                                setLocationError(null);
                                setVerifyingLocation(true);
                                const getApiUrl = () => {
                                    if (import.meta.env.VITE_API_URL) {
                                        return import.meta.env.VITE_API_URL.endsWith('/api') 
                                            ? import.meta.env.VITE_API_URL 
                                            : `${import.meta.env.VITE_API_URL}/api`;
                                    } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                                        return 'http://localhost:3000/api';
                                    } else {
                                        return 'https://api.flowspace.farmavet-bodega.cl/api';
                                    }
                                };
                                const verifyLocationAndFetch = async () => {
                                    try {
                                        setVerifyingLocation(true);
                                        setLocationError(null);
                                        const position = await new Promise((resolve, reject) => {
                                            navigator.geolocation.getCurrentPosition(resolve, reject, {
                                                enableHighAccuracy: true,
                                                timeout: 10000,
                                                maximumAge: 0
                                            });
                                        });
                                        const { latitude, longitude } = position.coords;
                                        const apiUrl = getApiUrl();
                                        const verifyResponse = await fetch(`${apiUrl}/equipment/public/${qrCode}/verify-location`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ latitude, longitude })
                                        });
                                        const verifyData = await verifyResponse.json();
                                        if (verifyData.success && verifyData.authorized) {
                                            if (verifyData.equipment) {
                                                setEquipment(verifyData.equipment);
                                            }
                                            if (verifyData.logs) {
                                                setLogs(verifyData.logs);
                                            }
                                            setVerifyingLocation(false);
                                            setLoading(false);
                                        } else {
                                            const distance = verifyData.distance ? ` (Estás a ${verifyData.distance} metros)` : '';
                                            setLocationError(verifyData.message || `No estás cerca del equipo.${distance}`);
                                            setVerifyingLocation(false);
                                        }
                                    } catch (err) {
                                        logger.error('Error:', err);
                                        if (err.code === 1) {
                                            setLocationError('Permiso de ubicación denegado.');
                                        } else {
                                            setLocationError('Error al verificar ubicación.');
                                        }
                                        setVerifyingLocation(false);
                                    }
                                };
                                verifyLocationAndFetch();
                            }}
                            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                            Intentar de nuevo
                        </button>
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="w-full px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                Cerrar
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (showTempCodeInput) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 max-w-md w-full">
                    <h2 className="text-xl font-bold text-slate-800 mb-2 text-center">Código Temporal</h2>
                    <p className="text-sm text-slate-600 mb-6 text-center">
                        Ingresa el código temporal generado desde FlowSpace. El código es válido por 30 segundos.
                    </p>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Código</label>
                            <input
                                type="text"
                                value={tempCode}
                                onChange={(e) => setTempCode(e.target.value.toUpperCase())}
                                placeholder="ABCD1234"
                                maxLength={8}
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl font-mono tracking-widest uppercase"
                                autoFocus
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowTempCodeInput(false);
                                    setTempCode('');
                                }}
                                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={async () => {
                                    if (!tempCode || tempCode.length !== 8) {
                                        setLocationError('El código debe tener 8 caracteres');
                                        setShowTempCodeInput(false);
                                        return;
                                    }
                                    try {
                                        setVerifyingCode(true);
                                        const getApiUrl = () => {
                                            if (import.meta.env.VITE_API_URL) {
                                                return import.meta.env.VITE_API_URL.endsWith('/api') 
                                                    ? import.meta.env.VITE_API_URL 
                                                    : `${import.meta.env.VITE_API_URL}/api`;
                                            } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                                                return 'http://localhost:3000/api';
                                            } else {
                                                return 'https://api.flowspace.farmavet-bodega.cl/api';
                                            }
                                        };
                                        const apiUrl = getApiUrl();
                                        const response = await fetch(`${apiUrl}/equipment/public/verify-temp-code`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ qrCode, code: tempCode })
                                        });
                                        const data = await response.json();
                                        if (data.success && data.authorized) {
                                            setEquipment(data.equipment);
                                            setLogs(data.logs || []);
                                            setSessionExpiresAt(data.sessionExpiresAt);
                                            setShowTempCodeInput(false);
                                            setVerifyingLocation(false);
                                            setLoading(false);
                                        } else {
                                            setLocationError(data.error || 'Código inválido o expirado');
                                            setShowTempCodeInput(false);
                                        }
                                    } catch (err) {
                                        logger.error('Error verificando código:', err);
                                        setLocationError('Error al verificar el código. Intenta de nuevo.');
                                        setShowTempCodeInput(false);
                                    } finally {
                                        setVerifyingCode(false);
                                    }
                                }}
                                disabled={verifyingCode || !tempCode || tempCode.length !== 8}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {verifyingCode ? 'Verificando...' : 'Verificar'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600">Cargando información del equipo...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 max-w-md w-full text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Equipo no encontrado</h2>
                    <p className="text-slate-600 mb-6">{error}</p>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Cerrar
                        </button>
                    )}
                </div>
            </div>
        );
    }

    if (!equipment) {
        return null;
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                            Cerrar
                        </button>
                    )}
                    <h1 className="text-lg font-bold text-slate-800 flex-1 text-center">Ficha Técnica</h1>
                    <div className="w-16"></div> {/* Spacer para centrar */}
                </div>
            </div>

            {/* Content */}
            <div className="max-w-2xl mx-auto p-4 pb-8">
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8">
                    {/* Nombre del Equipo */}
                    <h2 className="text-3xl font-bold text-slate-800 mb-2">{equipment.name}</h2>
                    <p className="text-sm text-slate-500 mb-6">ID: {equipment.qr_code}</p>

                    {/* QR Code */}
                    <div className="mb-6 p-4 bg-slate-50 rounded-xl">
                        <p className="text-xs text-slate-600 mb-3 font-medium text-center">Escanea para ver en modo lectura</p>
                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.href)}`}
                            alt="QR Code"
                            className="w-32 h-32 mx-auto rounded-lg"
                        />
                        <p className="text-xs text-slate-500 mt-2 text-center">Sin necesidad de login</p>
                        <p className="text-xs text-slate-400 mt-1 text-center">Requiere estar cerca del equipo</p>
                    </div>

                    {/* Estado */}
                    <div className="mb-6">
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border ${getStatusColor(equipment.status)}`}>
                            <CheckCircle2 size={18} />
                            <span className="font-semibold">{getStatusLabel(equipment.status)}</span>
                        </div>
                    </div>

                    {/* Información del Equipo */}
                    <div className="space-y-4">
                        <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                            <Calendar className="w-5 h-5 text-slate-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Última Mantención</p>
                                <p className="text-sm text-slate-800">{formatDate(equipment.last_maintenance)}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                            <Clock className="w-5 h-5 text-slate-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Próxima Mantención</p>
                                <p className="text-sm text-slate-800">{formatDate(equipment.next_maintenance)}</p>
                            </div>
                        </div>

                    </div>

                    {/* Nota de solo lectura */}
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs text-blue-700 text-center">
                            <strong>Modo Solo Lectura:</strong> Esta información es de solo lectura. Para editar o agregar registros, inicia sesión en FlowSpace.
                        </p>
                    </div>
                </div>

                {/* Bitácora de Eventos */}
                {equipment && (
                    <div className="mt-6 bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8">
                        <h3 className="text-xl font-bold text-slate-800 mb-6">Bitácora de Eventos</h3>
                        
                        {loadingLogs ? (
                            <div className="text-center py-8">
                                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                <p className="text-sm text-slate-500">Cargando registros...</p>
                            </div>
                        ) : logs.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-slate-400 text-sm">No hay registros de actividad</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {logs.map((log, index) => (
                                    <div key={log.id || index} className="relative pl-10">
                                        {/* Dot */}
                                        <div className={`absolute left-1.5 top-1 w-3 h-3 rounded-full border-2 border-white shadow-sm z-10 ${index === 0 ? 'bg-blue-500' : 'bg-slate-300'}`}></div>

                                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                            <p className="text-sm font-semibold text-slate-900 mb-2 leading-snug">
                                                {log.content}
                                            </p>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[10px]">
                                                        {log.avatar || '👤'}
                                                    </div>
                                                    <span className="text-xs text-slate-500 font-medium">{log.username || 'Usuario'}</span>
                                                </div>
                                                <span className="text-xs text-slate-400">
                                                    {new Date(log.created_at).toLocaleString('es-CL', {
                                                        year: 'numeric',
                                                        month: 'numeric',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EquipmentPublicView;

