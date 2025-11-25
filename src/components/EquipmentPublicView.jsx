import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Clock, Calendar, User, QrCode } from 'lucide-react';
import logger from '../utils/logger';

const EquipmentPublicView = ({ qrCode, onClose }) => {
    const [equipment, setEquipment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchEquipment = async () => {
            try {
                setLoading(true);
                // Detectar URL del API según el entorno
                let apiUrl;
                if (import.meta.env.VITE_API_URL) {
                    // VITE_API_URL puede incluir /api o no
                    apiUrl = import.meta.env.VITE_API_URL.endsWith('/api') 
                        ? import.meta.env.VITE_API_URL 
                        : `${import.meta.env.VITE_API_URL}/api`;
                } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                    apiUrl = 'http://localhost:3000/api';
                } else {
                    // En producción, usar el mismo dominio pero con /api
                    // Si el frontend está en Vercel y el backend en otro servidor, necesitamos la URL completa
                    apiUrl = 'https://api.flowspace.farmavet-bodega.cl/api';
                }
                
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

        if (qrCode) {
            fetchEquipment();
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

                        {equipment.creator_name && (
                            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                                <User className="w-5 h-5 text-slate-500 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Creado por</p>
                                    <p className="text-sm text-slate-800">{equipment.creator_name}</p>
                                </div>
                            </div>
                        )}

                        <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                            <QrCode className="w-5 h-5 text-slate-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Código QR</p>
                                <p className="text-sm font-mono text-slate-800">{equipment.qr_code}</p>
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
            </div>
        </div>
    );
};

export default EquipmentPublicView;

