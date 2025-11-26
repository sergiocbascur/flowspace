import React, { useState, useEffect } from 'react';
import { X, Wrench, Home, Sparkles } from 'lucide-react';
import { apiResources } from '../../apiService';
import logger from '../../utils/logger';

const CreateResourceModal = ({ isOpen, onClose, currentGroup, currentContext, toast, onResourceCreated, initialQrCode }) => {
    const [step, setStep] = useState('type'); // 'type' | 'form'
    const [resourceType, setResourceType] = useState(null); // 'equipment' | 'room'
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        identifier: '' // ID personalizado (ej: DX-001)
    });
    const [isCreating, setIsCreating] = useState(false);

    // Prellenar identifier si viene desde escáner
    useEffect(() => {
        if (isOpen && initialQrCode) {
            setFormData(prev => ({ ...prev, identifier: initialQrCode }));
            // Si viene un código, asumimos que es un equipo y saltamos directamente al formulario
            setResourceType('equipment');
            setStep('form');
        } else if (isOpen && !initialQrCode) {
            // Reset cuando se abre sin código
            setFormData({ name: '', description: '', identifier: '' });
            setStep('type');
            setResourceType(null);
        }
    }, [isOpen, initialQrCode]);

    if (!isOpen) return null;

    const handleTypeSelect = (type) => {
        setResourceType(type);
        setStep('form');
    };

    const handleCreate = async () => {
        if (!formData.name.trim()) {
            toast?.showError('El nombre es requerido');
            return;
        }

        if (!currentGroup?.id) {
            toast?.showError('Debes seleccionar un grupo primero');
            return;
        }

        try {
            setIsCreating(true);

            const result = await apiResources.create({
                name: formData.name.trim(),
                resourceType: resourceType,
                description: formData.description.trim() || null,
                groupId: currentGroup.id,
                identifier: formData.identifier.trim() || null
            });

            if (result.success) {
                toast?.showSuccess(`${resourceType === 'equipment' ? 'Equipo' : 'Área'} creado correctamente`);
                if (onResourceCreated) {
                    onResourceCreated(result.resource);
                }
                // Reset form
                setStep('type');
                setResourceType(null);
                setFormData({ name: '', description: '', identifier: '' });
                onClose();
            } else {
                toast?.showError(result.error || 'Error al crear recurso');
            }
        } catch (error) {
            logger.error('Error creando recurso:', error);
            toast?.showError('Error al crear recurso');
        } finally {
            setIsCreating(false);
        }
    };

    // Paso 1: Seleccionar tipo
    if (step === 'type') {
        return (
            <div
                className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                style={{
                    background: 'rgba(0,0,0,0.4)',
                    backdropFilter: 'blur(12px)',
                    animation: 'fadeIn 0.3s ease-out'
                }}
            >
                <style>{`
                    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                    @keyframes scaleUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                    @keyframes slideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                `}</style>

                <div
                    className="w-full max-w-lg bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden"
                    style={{
                        animation: 'scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                    }}
                >
                    {/* Header */}
                    <div className="px-8 py-6 border-b border-slate-200/60 bg-gradient-to-r from-blue-50 to-indigo-50">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                                    <Sparkles size={24} className="text-blue-600" />
                                    Crear Nuevo Recurso
                                </h2>
                                <p className="text-slate-600 text-sm font-medium mt-1">
                                    Elige el tipo de recurso que quieres crear
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-9 h-9 rounded-full bg-white/80 hover:bg-white text-slate-500 hover:text-slate-700 flex items-center justify-center transition-all shadow-sm"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-8">
                        <div className="grid grid-cols-1 gap-4">
                            {/* Equipo */}
                            <button
                                onClick={() => handleTypeSelect('equipment')}
                                className="group relative p-6 rounded-2xl border-2 border-slate-200 hover:border-blue-500 transition-all duration-300 bg-white hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 text-left"
                                style={{
                                    animation: 'slideIn 0.4s ease-out',
                                    animationDelay: '0.1s',
                                    animationFillMode: 'both'
                                }}
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                                        <Wrench size={28} className="text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-slate-900 mb-1">Equipo</h3>
                                        <p className="text-sm text-slate-600 leading-relaxed">
                                            Equipos, instrumentos, dispositivos técnicos o electrodomésticos
                                        </p>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                                                Ficha Técnica
                                            </span>
                                            <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                                                Manual
                                            </span>
                                            <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                                                To-Do
                                            </span>
                                        </div>
                                    </div>
                                    <div className="w-6 h-6 rounded-full border-2 border-slate-300 group-hover:border-blue-500 transition-colors flex items-center justify-center">
                                        <div className="w-2 h-2 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    </div>
                                </div>
                            </button>

                            {/* Área / Habitación */}
                            <button
                                onClick={() => handleTypeSelect('room')}
                                className="group relative p-6 rounded-2xl border-2 border-slate-200 hover:border-green-500 transition-all duration-300 bg-white hover:bg-gradient-to-br hover:from-green-50 hover:to-emerald-50 text-left"
                                style={{
                                    animation: 'slideIn 0.4s ease-out',
                                    animationDelay: '0.2s',
                                    animationFillMode: 'both'
                                }}
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                                        <Home size={28} className="text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-slate-900 mb-1">Área / Habitación</h3>
                                        <p className="text-sm text-slate-600 leading-relaxed">
                                            Espacios físicos, habitaciones, áreas de trabajo o zonas
                                        </p>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                                                To-Do
                                            </span>
                                            <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                                                Documentación
                                            </span>
                                            {currentContext === 'personal' && (
                                                <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                                                    Lista de Compras
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="w-6 h-6 rounded-full border-2 border-slate-300 group-hover:border-green-500 transition-colors flex items-center justify-center">
                                        <div className="w-2 h-2 rounded-full bg-green-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Paso 2: Formulario
    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{
                background: 'rgba(0,0,0,0.4)',
                backdropFilter: 'blur(12px)'
            }}
        >
            <div
                className="w-full max-w-lg bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden"
                style={{
                    animation: 'scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
            >
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-200/60 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                                Crear {resourceType === 'equipment' ? 'Equipo' : 'Área'}
                            </h2>
                            <p className="text-slate-600 text-sm font-medium mt-1">
                                Completa la información básica
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                setStep('type');
                                setFormData({ name: '', description: '', identifier: '' });
                            }}
                            className="w-9 h-9 rounded-full bg-white/80 hover:bg-white text-slate-500 hover:text-slate-700 flex items-center justify-center transition-all shadow-sm"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Form */}
                <div className="p-8 space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Nombre del Recurso *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder={resourceType === 'equipment' ? 'Ej: Equipo HPLC, Cromatógrafo Agilent' : 'Ej: Cocina Principal, Habitación 2'}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 font-medium"
                            autoFocus
                        />
                        <p className="text-xs text-slate-500 mt-1.5">
                            Este es el nombre descriptivo del recurso (ej: "Equipo HPLC"). Puedes cambiarlo después sin afectar el código QR.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Descripción
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Descripción opcional del recurso..."
                            rows={3}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            ID del {resourceType === 'equipment' ? 'Equipo' : 'Área'} (opcional)
                        </label>
                        <input
                            type="text"
                            value={formData.identifier}
                            onChange={(e) => setFormData({ ...formData, identifier: e.target.value.toUpperCase() })}
                            placeholder={resourceType === 'equipment' ? 'Ej: DX-001, HPL-002' : 'Ej: COC-001, HAB-205'}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 font-mono text-sm bg-slate-50"
                        />
                        <p className="text-xs text-slate-500 mt-1.5">
                            ID personalizado para búsqueda rápida. Debe ser único. Si lo dejas vacío, puedes buscarlo por nombre.
                        </p>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <div className="flex items-start gap-2">
                            <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-white text-xs font-bold">i</span>
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-blue-900 mb-1">
                                    Tres elementos distintos
                                </p>
                                <ul className="text-xs text-blue-700 leading-relaxed space-y-1">
                                    <li>• <strong>ID Personalizado</strong> (ej: DX-001): Usado para búsqueda, debe ser único. Opcional.</li>
                                    <li>• <strong>Nombre</strong> (ej: Equipo HPLC): Descriptivo, puede repetirse.</li>
                                    <li>• <strong>Código QR</strong>: Se genera automáticamente, único, no cambiable.</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {currentGroup && (
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                            <p className="text-xs font-semibold text-blue-900 mb-1">Grupo:</p>
                            <p className="text-sm text-blue-700">{currentGroup.name}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-8 py-6 border-t border-slate-200/60 bg-slate-50/50 flex justify-end gap-3">
                    <button
                        onClick={() => {
                            setStep('type');
                            setFormData({ name: '', description: '', qrCode: '' });
                        }}
                        className="px-6 py-3 bg-white border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
                        disabled={isCreating}
                    >
                        Atrás
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={!formData.name.trim() || isCreating}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isCreating ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Creando...
                            </>
                        ) : (
                            <>
                                <Sparkles size={16} />
                                Crear {resourceType === 'equipment' ? 'Equipo' : 'Área'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateResourceModal;

