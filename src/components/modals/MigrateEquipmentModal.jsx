import React, { useState, useEffect } from 'react';
import { X, Layers, AlertCircle, CheckCircle2, Loader } from 'lucide-react';
import { apiEquipment, apiResources, apiGroups } from '../../apiService';
import logger from '../../utils/logger';

const MigrateEquipmentModal = ({ isOpen, onClose, currentContext, toast }) => {
    const [equipmentList, setEquipmentList] = useState([]);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(false);
    const [assignments, setAssignments] = useState({}); // { equipmentId: groupId }

    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen, currentContext]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Cargar todos los equipos (sin grupo asignado o del contexto actual)
            const allEquipment = await apiEquipment.getAll();
            
            // Filtrar equipos que necesitan migración (sin group_id o group_id sin contexto válido)
            const filteredEquipment = Array.isArray(allEquipment) 
                ? allEquipment.filter(eq => !eq.group_id || eq.group_id === null)
                : [];

            setEquipmentList(filteredEquipment);

            // Cargar grupos del contexto actual
            const allGroups = await apiGroups.getAll();
            const contextGroups = Array.isArray(allGroups)
                ? allGroups.filter(g => g.type === currentContext)
                : [];
            setGroups(contextGroups);
        } catch (error) {
            logger.error('Error cargando datos:', error);
            toast?.showError('Error al cargar equipos');
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async (equipmentId, qrCode) => {
        const groupId = assignments[equipmentId];
        if (!groupId) {
            toast?.showWarning('Selecciona un grupo para este equipo');
            return;
        }

        try {
            setLoading(true);

            // Crear recurso desde equipment
            const equipment = equipmentList.find(eq => eq.id === equipmentId || eq.qr_code === qrCode);
            if (!equipment) {
                toast?.showError('Equipo no encontrado');
                return;
            }

            // Crear recurso en la nueva tabla
            const resourceData = {
                qr_code: equipment.qr_code,
                name: equipment.name,
                resourceType: 'equipment',
                groupId: groupId,
                description: equipment.description || '',
                status: equipment.status === 'operational' ? 'active' : 'maintenance',
                latitude: equipment.latitude || null,
                longitude: equipment.longitude || null,
                geofenceRadius: equipment.geofence_radius || 50,
                metadata: {
                    last_maintenance: equipment.last_maintenance,
                    next_maintenance: equipment.next_maintenance,
                    migrated_from: 'equipment',
                    original_id: equipment.id
                }
            };

            const result = await apiResources.create(resourceData);
            
            if (result.success) {
                // Actualizar equipment con el group_id para referencia
                await apiEquipment.update(qrCode, { group_id: groupId });
                
                toast?.showSuccess(`Equipo "${equipment.name}" asignado correctamente`);
                // Remover de la lista
                setEquipmentList(prev => prev.filter(eq => eq.id !== equipmentId && eq.qr_code !== qrCode));
                setAssignments(prev => {
                    const newAssignments = { ...prev };
                    delete newAssignments[equipmentId];
                    return newAssignments;
                });
            } else {
                toast?.showError(result.error || 'Error al asignar equipo');
            }
        } catch (error) {
            logger.error('Error asignando equipo:', error);
            toast?.showError('Error al asignar equipo');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
            style={{
                background: 'rgba(0,0,0,0.4)',
                backdropFilter: 'blur(12px)',
                animation: 'fadeIn 0.3s ease-out'
            }}
        >
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes scaleUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            `}</style>

            <div
                className="w-full max-w-3xl bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                style={{
                    animation: 'scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                }}
            >
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-200/60 bg-gradient-to-r from-orange-50 to-amber-50">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                                <AlertCircle size={24} className="text-orange-600" />
                                Migración Temporal de Equipos
                            </h2>
                            <p className="text-slate-600 text-sm font-medium mt-1">
                                Asigna grupos a equipos existentes ({currentContext === 'work' ? 'Trabajo' : 'Personal'})
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
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {loading && equipmentList.length === 0 ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader className="w-8 h-8 animate-spin text-blue-600" />
                        </div>
                    ) : equipmentList.length === 0 ? (
                        <div className="text-center py-12">
                            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                            <p className="text-lg font-semibold text-slate-700">¡Todos los equipos están asignados!</p>
                            <p className="text-sm text-slate-500 mt-2">No hay equipos pendientes de migración.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {equipmentList.map((equipment) => (
                                <div
                                    key={equipment.id || equipment.qr_code}
                                    className="bg-slate-50 rounded-xl p-6 border border-slate-200"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                                <Layers size={20} className="text-blue-600" />
                                                {equipment.name}
                                            </h3>
                                            <p className="text-sm text-slate-500 mt-1 font-mono">
                                                QR: {equipment.qr_code}
                                            </p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                            equipment.status === 'operational'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-amber-100 text-amber-700'
                                        }`}>
                                            {equipment.status === 'operational' ? 'Operativo' : 'En Mantención'}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <select
                                            value={assignments[equipment.id || equipment.qr_code] || ''}
                                            onChange={(e) => setAssignments({
                                                ...assignments,
                                                [equipment.id || equipment.qr_code]: e.target.value
                                            })}
                                            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                                        >
                                            <option value="">Selecciona un grupo</option>
                                            {groups.map(group => (
                                                <option key={group.id} value={group.id}>
                                                    {group.name}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={() => handleAssign(equipment.id || equipment.qr_code, equipment.qr_code)}
                                            disabled={loading || !assignments[equipment.id || equipment.qr_code]}
                                            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                        >
                                            Asignar
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MigrateEquipmentModal;

