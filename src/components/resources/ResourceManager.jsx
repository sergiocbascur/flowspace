import React, { useState, useEffect } from 'react';
import { X, FileText, Book, CheckSquare, Folder, ShoppingCart, Upload, Download, Trash2, Eye, History, CalendarCheck, Wrench, CheckCircle2, Activity, Plus, MessageSquare, MapPin, Key, Copy, QrCode, ChevronDown, ChevronUp } from 'lucide-react';
import QRCodeForView from '../QRCodeForView';
import CheckableList from '../CheckableList';
import { apiChecklists, apiDocuments, apiResources, apiEquipment } from '../../apiService';
import logger from '../../utils/logger';

const ResourceManager = ({ resource, onClose, currentContext, toast, groups = [] }) => {
    // Validación temprana: si no hay resource, no renderizar nada
    if (!resource) {
        return null;
    }

    // Determinar el contexto del recurso basado en su grupo
    const resourceGroup = groups.find(g => g.id === (resource.group_id || resource.groupId));
    const resourceContext = resource.group_type || resourceGroup?.type || null;

    const [activeTab, setActiveTab] = useState('details');
    const [loading, setLoading] = useState(false);
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
    const [showQR, setShowQR] = useState(!isMobile); // En móvil, oculto por defecto
    
    // Estados para cada sección
    const [todoList, setTodoList] = useState(null);
    const [shoppingList, setShoppingList] = useState(null);
    const [manuals, setManuals] = useState([]);
    const [docs, setDocs] = useState([]);
    const [resourceData, setResourceData] = useState(() => {
        // Inicializar con el recurso original, manteniendo el group_id original
        return {
            ...resource,
            group_id: resource.group_id || resource.groupId || null,
            group_type: resource.group_type || resourceGroup?.type || null
        };
    });
    const [equipmentLogs, setEquipmentLogs] = useState([]);
    const [showAddLogInput, setShowAddLogInput] = useState(false);
    const [newLogContent, setNewLogContent] = useState('');
    const [isEquipment] = useState(() => {
        return resource?.resource_type === 'equipment' || resource?.id?.toString().startsWith('EQUIP-');
    });

    // Cargar datos iniciales
    useEffect(() => {
        if (resource) {
            // IMPORTANTE: Mantener el group_id original del recurso, no sobrescribirlo
            setResourceData({
                ...resource,
                // Asegurar que group_id se mantiene del recurso original
                group_id: resource.group_id || resource.groupId || null,
                // Si el recurso tiene group_type en los datos, mantenerlo
                group_type: resource.group_type || (resource.group_id ? groups.find(g => g.id === resource.group_id)?.type : null) || null
            });
            loadInitialData();
        }
    }, [resource, groups]);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            if (!resourceData || !resourceData.id) return;
            
            // Cargar To-Do (solo si el recurso existe en la tabla resources, no para equipment antiguo)
            if (!resourceData.id.startsWith('EQUIP-')) {
                try {
                    const todoResult = await apiChecklists.getByResource(resourceData.id, 'todo');
                    if (todoResult.success) {
                        setTodoList(todoResult.checklist);
                    }
                } catch (todoError) {
                    logger.warn('Error cargando To-Do (puede ser equipment antiguo):', todoError);
                }
            }

            // Cargar Shopping (solo si es personal y no es equipment antiguo)
            if (!resourceData.id.startsWith('EQUIP-') && currentContext === 'personal' && (resourceData.resource_type === 'room' || resourceData.resource_type === 'house')) {
                try {
                    const shoppingResult = await apiChecklists.getByResource(resourceData.id, 'shopping');
                    if (shoppingResult.success) {
                        setShoppingList(shoppingResult.checklist);
                    }
                } catch (shoppingError) {
                    logger.warn('Error cargando Shopping:', shoppingError);
                }
            }

            // Cargar documentos
            loadDocuments();

            // Cargar logs: para equipos antiguos (EQUIP-*) usar sistema antiguo, para recursos nuevos usar sistema nuevo
            if (isEquipment) {
                if (resourceData.id && resourceData.id.startsWith('EQUIP-') && resourceData.qr_code) {
                    // Equipo antiguo: usar sistema antiguo de equipment_logs
                    try {
                        const logs = await apiEquipment.getLogs(resourceData.qr_code);
                        setEquipmentLogs(Array.isArray(logs) ? logs : []);
                    } catch (logError) {
                        logger.warn('Error cargando logs del sistema antiguo:', logError);
                        setEquipmentLogs([]);
                    }
                } else {
                    // Recurso nuevo: usar sistema nuevo de resource_logs
                    try {
                        const logsResult = await apiResources.getLogs(resourceData.id);
                        if (logsResult.success && logsResult.logs) {
                            setEquipmentLogs(logsResult.logs);
                        } else {
                            setEquipmentLogs([]);
                        }
                    } catch (logError) {
                        logger.warn('Error cargando logs del recurso:', logError);
                        setEquipmentLogs([]);
                    }
                }
            } else {
                setEquipmentLogs([]);
            }
        } catch (error) {
            logger.error('Error cargando datos del recurso:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadDocuments = async () => {
        if (!resourceData || !resourceData.id) return;
        try {
            const manualsResult = await apiDocuments.getAll({
                linkedToType: 'resource',
                linkedToId: resourceData.id
            });

            if (manualsResult.success) {
                const allDocs = manualsResult.documents || [];
                // Separar manuales de documentación (por metadata o nombre)
                const manualsDocs = allDocs.filter(doc => 
                    doc.name.toLowerCase().includes('manual') || 
                    doc.metadata?.documentType === 'manual'
                );
                const otherDocs = allDocs.filter(doc => !manualsDocs.includes(doc));
                
                setManuals(manualsDocs);
                setDocs(otherDocs);
            }
        } catch (error) {
            logger.error('Error cargando documentos:', error);
        }
    };

    // Handlers para To-Do
    const handleAddTodoItem = async (item) => {
        try {
            if (!resourceData?.id) return;
            
            if (!todoList?.id) {
                // Crear lista primero
                const createResult = await apiChecklists.getByResource(resourceData.id, 'todo');
                if (!createResult.success) throw new Error('Error creando lista');
                setTodoList(createResult.checklist);
            }

            const result = await apiChecklists.addItem(todoList.id, item);
            if (result.success) {
                setTodoList(result.checklist);
                toast?.showSuccess('Tarea agregada');
            }
        } catch (error) {
            logger.error('Error agregando tarea:', error);
            toast?.showError('Error al agregar tarea');
        }
    };

    const handleToggleTodoItem = async (itemId) => {
        try {
            const item = todoList.items.find(i => i.id === itemId);
            if (!item) return;

            const result = await apiChecklists.updateItem(todoList.id, itemId, {
                checked: !item.checked
            });
            if (result.success) {
                setTodoList(result.checklist);
            }
        } catch (error) {
            logger.error('Error actualizando tarea:', error);
        }
    };

    const handleDeleteTodoItem = async (itemId) => {
        try {
            const result = await apiChecklists.deleteItem(todoList.id, itemId);
            if (result.success) {
                setTodoList(result.checklist);
                toast?.showSuccess('Tarea eliminada');
            }
        } catch (error) {
            logger.error('Error eliminando tarea:', error);
        }
    };

    // Handlers para Shopping
    const handleAddShoppingItem = async (item) => {
        try {
            if (!resourceData?.id) return;
            
            if (!shoppingList?.id) {
                const createResult = await apiChecklists.getByResource(resourceData.id, 'shopping');
                if (!createResult.success) throw new Error('Error creando lista');
                setShoppingList(createResult.checklist);
            }

            const result = await apiChecklists.addItem(shoppingList.id, item);
            if (result.success) {
                setShoppingList(result.checklist);
                toast?.showSuccess('Item agregado');
            }
        } catch (error) {
            logger.error('Error agregando item:', error);
            toast?.showError('Error al agregar item');
        }
    };

    const handleToggleShoppingItem = async (itemId) => {
        try {
            const item = shoppingList.items.find(i => i.id === itemId);
            if (!item) return;

            const result = await apiChecklists.updateItem(shoppingList.id, itemId, {
                checked: !item.checked
            });
            if (result.success) {
                setShoppingList(result.checklist);
            }
        } catch (error) {
            logger.error('Error actualizando item:', error);
        }
    };

    const handleDeleteShoppingItem = async (itemId) => {
        try {
            const result = await apiChecklists.deleteItem(shoppingList.id, itemId);
            if (result.success) {
                setShoppingList(result.checklist);
                toast?.showSuccess('Item eliminado');
            }
        } catch (error) {
            logger.error('Error eliminando item:', error);
        }
    };

    // Handler para subir documentos
    const handleUploadDocument = async (file, type = 'documentation') => {
        if (!resourceData?.id) return;
        
        try {
            const result = await apiDocuments.upload(file, {
                name: file.name,
                linkedToType: 'resource',
                linkedToId: resourceData.id,
                metadata: { documentType: type }
            });

            if (result.success) {
                toast?.showSuccess('Documento subido correctamente');
                loadDocuments();
            } else {
                toast?.showError(result.error || 'Error al subir documento');
            }
        } catch (error) {
            logger.error('Error subiendo documento:', error);
            toast?.showError('Error al subir documento');
        }
    };

    const handleDeleteDocument = async (docId) => {
        try {
            const result = await apiDocuments.delete(docId);
            if (result.success) {
                toast?.showSuccess('Documento eliminado');
                loadDocuments();
            }
        } catch (error) {
            logger.error('Error eliminando documento:', error);
            toast?.showError('Error al eliminar documento');
        }
    };

    // Determinar qué tabs mostrar (resource ya está validado arriba)
    const showShopping = currentContext === 'personal' && 
                        (resourceData?.resource_type === 'room' || resourceData?.resource_type === 'house');

    const tabs = [
        { id: 'details', label: 'Ficha', icon: FileText },
        { id: 'manual', label: 'Manual', icon: Book },
        { id: 'tasks', label: 'To-Do', icon: CheckSquare },
        ...(showShopping ? [{ id: 'shopping', label: 'Compras', icon: ShoppingCart }] : []),
        { id: 'docs', label: 'Docs', icon: Folder }
    ];

    return (
        <div
            className={`fixed inset-0 z-[10000] flex ${isMobile ? 'items-stretch' : 'items-center justify-center'} ${isMobile ? 'p-0' : 'p-6'}`}
            style={{
                background: 'rgba(0,0,0,0.4)',
                backdropFilter: 'blur(12px)',
                animation: 'fadeIn 0.3s ease-out'
            }}
        >
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes scaleUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                @keyframes slideIn { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            `}</style>

            <div
                className={`w-full ${isMobile ? 'max-w-full h-full max-h-screen rounded-none' : 'max-w-4xl max-h-[90vh] rounded-3xl'} bg-white/95 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col`}
                style={{
                    animation: 'scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                }}
            >
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-200/60 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                                    {resourceData.name}
                                </h2>
                                {/* Indicador de contexto si no coincide */}
                                {resourceContext && resourceContext !== currentContext && (
                                    <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold uppercase">
                                        {resourceContext === 'work' ? 'Trabajo' : 'Personal'}
                                    </span>
                                )}
                            </div>
                            <p className="text-slate-600 text-sm font-medium mt-1 capitalize">
                                {resourceData.resource_type === 'equipment' ? 'Equipo' : 
                                 resourceData.resource_type === 'room' ? 'Área / Habitación' :
                                 resourceData.resource_type}
                            </p>
                            {/* Advertencia si el recurso pertenece a otro contexto */}
                            {resourceContext && resourceContext !== currentContext && (
                                <p className="text-xs text-amber-600 mt-2 font-semibold bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                                    ⚠️ Este recurso pertenece a la sección "{resourceContext === 'work' ? 'Trabajo' : 'Personal'}", pero estás viéndolo desde "{currentContext === 'work' ? 'Trabajo' : 'Personal'}". Los cambios pueden afectar su visibilidad.
                                </p>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="w-9 h-9 rounded-full bg-white/80 hover:bg-white text-slate-500 hover:text-slate-700 flex items-center justify-center transition-all shadow-sm ml-4 flex-shrink-0"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* QR Code Section - Dinámico según tab */}
                {isMobile ? (
                    <div className="px-4 pt-4 pb-2">
                        <button
                            onClick={() => setShowQR(!showQR)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <QrCode size={18} className="text-blue-600" />
                                <span className="text-sm font-semibold text-blue-900">
                                    {showQR ? 'Ocultar' : 'Ver'} Código QR
                                </span>
                            </div>
                            {showQR ? <ChevronUp size={18} className="text-blue-600" /> : <ChevronDown size={18} className="text-blue-600" />}
                        </button>
                        {showQR && (
                            <div className="mt-3">
                                <QRCodeForView resource={resourceData} viewType={activeTab} />
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="px-8 pt-6 pb-4">
                        <QRCodeForView resource={resourceData} viewType={activeTab} />
                    </div>
                )}

                {/* Tabs iOS-style */}
                <div className="px-8 pb-6">
                    <div className="flex bg-slate-100/80 p-1 rounded-xl overflow-x-auto">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex-1 min-w-0 py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                                        activeTab === tab.id
                                            ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5'
                                            : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    <Icon size={18} className={activeTab === tab.id ? 'text-blue-600' : ''} />
                                    <span className="text-sm font-bold whitespace-nowrap">{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <>
                            {/* Tab: Details */}
                            {activeTab === 'details' && (
                                <div className="space-y-6">
                                    {/* ID Personalizado (editable) */}
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            ID del {isEquipment ? 'Equipo' : 'Área'}
                                            <span className="text-xs font-normal text-slate-500 ml-2">(para búsqueda)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={resourceData.identifier || ''}
                                            onChange={(e) => setResourceData({ ...resourceData, identifier: e.target.value.toUpperCase() })}
                                            placeholder="Ej: DX-001"
                                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-mono text-sm"
                                        />
                                        <p className="text-xs text-slate-500 mt-1">
                                            ID personalizado usado para búsqueda. Debe ser único si se proporciona.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Nombre</label>
                                        <input
                                            type="text"
                                            value={resourceData.name || ''}
                                            onChange={(e) => setResourceData({ ...resourceData, name: e.target.value })}
                                            placeholder="Ej: Equipo HPLC"
                                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                                        />
                                        <p className="text-xs text-slate-500 mt-1">
                                            Nombre descriptivo del recurso. Puede repetirse.
                                        </p>
                                    </div>

                                    {/* Código QR (solo lectura, informativo) */}
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Código QR
                                            <span className="text-xs font-normal text-slate-500 ml-2">(generado automáticamente, no modificable)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={resourceData.qr_code || ''}
                                            disabled
                                            className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-xl text-slate-600 font-mono text-sm cursor-not-allowed"
                                        />
                                        <p className="text-xs text-slate-500 mt-1">
                                            Código único generado automáticamente para el QR. No se puede cambiar.
                                        </p>
                                    </div>

                                    {/* Selector de Grupo/Contexto */}
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Grupo / Contexto *
                                        </label>
                                        <select
                                            value={resourceData.group_id || ''}
                                            onChange={(e) => {
                                                const selectedGroupId = e.target.value;
                                                const selectedGroup = groups.find(g => g.id === selectedGroupId);
                                                setResourceData({ 
                                                    ...resourceData, 
                                                    group_id: selectedGroupId,
                                                    group_type: selectedGroup?.type || null
                                                });
                                            }}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white"
                                        >
                                            <option value="">Selecciona un grupo...</option>
                                            {/* Mostrar TODOS los grupos, no solo los del contexto actual */}
                                            {groups.map(group => (
                                                <option key={group.id} value={group.id}>
                                                    {group.name} ({group.type === 'work' ? 'Trabajo' : 'Personal'}){group.type !== currentContext ? ' ⚠️' : ''}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-slate-500 mt-1">
                                            El grupo determina en qué sección (Trabajo/Personal) aparece el recurso. Selecciona un grupo del contexto correcto.
                                        </p>
                                        {resourceData.group_id && groups.find(g => g.id === resourceData.group_id)?.type !== currentContext && (
                                            <p className="text-xs text-amber-600 mt-1 font-semibold">
                                                ⚠️ Este recurso está asignado a un grupo de "{groups.find(g => g.id === resourceData.group_id)?.type === 'work' ? 'Trabajo' : 'Personal'}", por lo que solo será visible en esa sección.
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Descripción</label>
                                        <textarea
                                            value={resourceData.description || ''}
                                            onChange={(e) => setResourceData({ ...resourceData, description: e.target.value })}
                                            rows={4}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 resize-none"
                                        />
                                    </div>

                                    {/* Georreferencia (para equipos) */}
                                    {isEquipment && (
                                        <div className="space-y-4 p-6 bg-slate-50/50 rounded-2xl border border-slate-100">
                                            <div className="flex items-center gap-2 mb-4">
                                                <MapPin size={18} className="text-blue-600" />
                                                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Georreferencia y Geocerca</h3>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Latitud</label>
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        value={resourceData.latitude || ''}
                                                        onChange={(e) => setResourceData({ ...resourceData, latitude: e.target.value })}
                                                        placeholder="-33.4489"
                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-mono"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (navigator.geolocation) {
                                                                navigator.geolocation.getCurrentPosition(
                                                                    (position) => {
                                                                        setResourceData({
                                                                            ...resourceData,
                                                                            latitude: position.coords.latitude.toFixed(6),
                                                                            longitude: position.coords.longitude.toFixed(6)
                                                                        });
                                                                        toast?.showSuccess('Ubicación obtenida');
                                                                    },
                                                                    (error) => {
                                                                        toast?.showWarning('No se pudo obtener la ubicación. Asegúrate de permitir el acceso al GPS.');
                                                                    }
                                                                );
                                                            }
                                                        }}
                                                        className="mt-2 w-full px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium"
                                                    >
                                                        📍 Obtener Mi Ubicación
                                                    </button>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Longitud</label>
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        value={resourceData.longitude || ''}
                                                        onChange={(e) => setResourceData({ ...resourceData, longitude: e.target.value })}
                                                        placeholder="-70.6693"
                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-mono"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                                                    Radio de Geocerca (metros)
                                                </label>
                                                <input
                                                    type="number"
                                                    step="1"
                                                    min="1"
                                                    value={resourceData.geofence_radius || 50}
                                                    onChange={(e) => setResourceData({ ...resourceData, geofence_radius: parseInt(e.target.value) || 50 })}
                                                    placeholder="50"
                                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                                />
                                                <p className="text-xs text-slate-500 mt-1">
                                                    Distancia máxima (en metros) para acceder a la vista pública del equipo.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Equipment-specific fields */}
                                    {isEquipment && (
                                        <>
                                            {/* Código Temporal */}
                                            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Key size={16} className="text-blue-600" />
                                                    <h4 className="text-sm font-bold text-slate-800">Código Temporal de Acceso</h4>
                                                </div>
                                                <p className="text-xs text-slate-600 mb-3">
                                                    Genera un código temporal válido por 30 segundos para acceder a la vista pública sin verificación de ubicación.
                                                </p>
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            const result = await apiEquipment.generateTempCode(resourceData.qr_code);
                                                            logger.debug('Resultado generar código:', result);
                                                            if (result && result.success && result.code) {
                                                                // Copiar código al portapapeles
                                                                try {
                                                                    await navigator.clipboard.writeText(result.code);
                                                                    toast?.showSuccess(`Código: ${result.code} (copiado)`);
                                                                } catch (clipError) {
                                                                    // Si falla el portapapeles, solo mostrar el código
                                                                    toast?.showSuccess(`Código: ${result.code}`);
                                                                }
                                                            } else {
                                                                const errorMsg = result?.error || 'Error al generar código';
                                                                logger.error('Error en respuesta:', result);
                                                                toast?.showError(errorMsg);
                                                            }
                                                        } catch (error) {
                                                            logger.error('Error generando código temporal:', error);
                                                            toast?.showError(`Error: ${error.message || 'Error al generar código temporal'}`);
                                                        }
                                                    }}
                                                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                                                >
                                                    <Copy size={16} />
                                                    Generar Código Temporal
                                                </button>
                                            </div>

                                            {/* Status */}
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-2">Estado Operativo</label>
                                                <button
                                                    onClick={async () => {
                                                        const newStatus = resourceData.status === 'active' ? 'maintenance' : 'active';
                                                        setResourceData({ ...resourceData, status: newStatus });
                                                        try {
                                                            if (resourceData.qr_code) {
                                                                await apiEquipment.update(resourceData.qr_code, {
                                                                    status: newStatus === 'active' ? 'operational' : 'maintenance'
                                                                });
                                                                toast?.showSuccess('Estado actualizado');
                                                            }
                                                        } catch (error) {
                                                            logger.error('Error actualizando estado:', error);
                                                            toast?.showError('Error al actualizar estado');
                                                        }
                                                    }}
                                                    className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl border text-sm font-bold transition-all ${
                                                        resourceData.status === 'active'
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                                            : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                                    }`}
                                                >
                                                    {resourceData.status === 'active' ? <CheckCircle2 size={18} /> : <Wrench size={18} />}
                                                    {resourceData.status === 'active' ? 'Operativo' : 'En Mantención'}
                                                </button>
                                            </div>

                                            {/* Maintenance Dates */}
                                            <div className="grid grid-cols-2 gap-6 p-6 bg-slate-50/50 rounded-2xl border border-slate-100">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                                        <History size={14} /> Última Mantención
                                                    </label>
                                                    <input
                                                        type="date"
                                                        value={resourceData.last_maintenance ? new Date(resourceData.last_maintenance).toISOString().split('T')[0] : ''}
                                                        onChange={(e) => {
                                                            const newDate = e.target.value;
                                                            setResourceData({ ...resourceData, last_maintenance: newDate });
                                                            if (resourceData.qr_code) {
                                                                apiEquipment.update(resourceData.qr_code, { lastMaintenance: newDate });
                                                            }
                                                        }}
                                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium text-slate-700 cursor-pointer"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                                        <CalendarCheck size={14} /> Próxima Revisión
                                                    </label>
                                                    <input
                                                        type="date"
                                                        value={resourceData.next_maintenance ? new Date(resourceData.next_maintenance).toISOString().split('T')[0] : ''}
                                                        onChange={(e) => {
                                                            const newDate = e.target.value;
                                                            setResourceData({ ...resourceData, next_maintenance: newDate });
                                                            if (resourceData.qr_code) {
                                                                apiEquipment.update(resourceData.qr_code, { nextMaintenance: newDate });
                                                            }
                                                        }}
                                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium text-slate-700 cursor-pointer"
                                                    />
                                                </div>
                                            </div>

                                            {/* Logs Section - Mostrar para TODOS los equipos */}
                                            {isEquipment && (
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                                            <Activity size={20} className="text-blue-500" />
                                                            Bitácora de Eventos
                                                        </h3>
                                                        {/* Mostrar botón de agregar para TODOS los equipos */}
                                                        <button
                                                            onClick={() => setShowAddLogInput(!showAddLogInput)}
                                                            className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all text-sm font-medium shadow-lg shadow-slate-900/20 active:scale-95 flex items-center gap-2"
                                                        >
                                                            <Plus size={16} /> Nueva Entrada
                                                        </button>
                                                    </div>

                                                {showAddLogInput && (
                                                    <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                                                        <textarea
                                                            value={newLogContent}
                                                            onChange={(e) => setNewLogContent(e.target.value)}
                                                            placeholder="Describe el mantenimiento realizado o la incidencia..."
                                                            className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none text-sm"
                                                            rows={3}
                                                            autoFocus
                                                        />
                                                        <div className="flex justify-end gap-2 mt-3">
                                                            <button
                                                                onClick={() => {
                                                                    setShowAddLogInput(false);
                                                                    setNewLogContent('');
                                                                }}
                                                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
                                                            >
                                                                Cancelar
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    if (!newLogContent.trim() || !resourceData.id) return;
                                                                    try {
                                                                        // Determinar qué API usar según si es equipo antiguo o nuevo
                                                                        if (resourceData.id.startsWith('EQUIP-') && resourceData.qr_code) {
                                                                            // Equipo antiguo: usar sistema antiguo
                                                                            await apiEquipment.addLog(resourceData.qr_code, newLogContent);
                                                                            const logs = await apiEquipment.getLogs(resourceData.qr_code);
                                                                            setEquipmentLogs(Array.isArray(logs) ? logs : []);
                                                                        } else {
                                                                            // Recurso nuevo: usar sistema nuevo
                                                                            const result = await apiResources.addLog(resourceData.id, newLogContent);
                                                                            if (result.success) {
                                                                                // Recargar logs
                                                                                const logsResult = await apiResources.getLogs(resourceData.id);
                                                                                if (logsResult.success && logsResult.logs) {
                                                                                    setEquipmentLogs(logsResult.logs);
                                                                                }
                                                                            } else {
                                                                                throw new Error(result.error || 'Error al agregar entrada');
                                                                            }
                                                                        }
                                                                        toast?.showSuccess('Entrada agregada');
                                                                        setNewLogContent('');
                                                                        setShowAddLogInput(false);
                                                                    } catch (error) {
                                                                        logger.error('Error agregando log:', error);
                                                                        toast?.showError(error.message || 'Error al agregar entrada');
                                                                    }
                                                                }}
                                                                disabled={!newLogContent.trim()}
                                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                Guardar Entrada
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Mostrar logs para TODOS los equipos */}
                                                {true && (
                                                    <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-slate-100 relative">
                                                        {equipmentLogs.length > 0 && (
                                                            <div className="absolute left-[42px] top-8 bottom-8 w-[2px] bg-slate-200 rounded-full"></div>
                                                        )}
                                                        <div className="space-y-6">
                                                            {equipmentLogs.length === 0 ? (
                                                                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
                                                                    <p className="text-slate-400 text-sm">No hay registros de actividad</p>
                                                                </div>
                                                            ) : (
                                                                equipmentLogs.map((log, i) => (
                                                                    <div key={log.id || i} className="relative flex gap-4 group">
                                                                        <div className={`relative z-10 w-3 h-3 mt-1.5 rounded-full border-2 border-white shadow-sm flex-shrink-0 ${i === 0 ? 'bg-blue-500 ring-4 ring-blue-500/10' : 'bg-slate-300'}`}></div>
                                                                        <div className="flex-1">
                                                                            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 group-hover:border-blue-200 transition-colors">
                                                                                <p className="text-sm text-slate-800 font-medium leading-relaxed mb-2">
                                                                                    {log.content}
                                                                                </p>
                                                                                <div className="flex items-center justify-between">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[11px] text-indigo-700 font-bold">
                                                                                            {log.username?.charAt(0).toUpperCase() || '?'}
                                                                                        </div>
                                                                                        <span className="text-xs text-slate-500 font-medium">{log.username || 'Usuario'}</span>
                                                                                    </div>
                                                                                    <span className="text-xs text-slate-400">
                                                                                        {log.created_at ? new Date(log.created_at).toLocaleDateString('es-CL', {
                                                                                            day: '2-digit',
                                                                                            month: 'short',
                                                                                            year: 'numeric',
                                                                                            hour: '2-digit',
                                                                                            minute: '2-digit'
                                                                                        }) : ''}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        </>
                                    )}

                                    <div className="flex justify-end">
                                        <button
                                            onClick={async () => {
                                                try {
                                                    // Si es equipment antiguo (EQUIP-*), usar endpoint de equipment directamente
                                                    if (resourceData.id.startsWith('EQUIP-') && resourceData.qr_code) {
                                                        // Actualizar equipment antiguo
                                                        const equipmentUpdate = {
                                                            name: resourceData.name,
                                                            description: resourceData.description,
                                                            status: resourceData.status === 'active' ? 'operational' : 'maintenance',
                                                            lastMaintenance: resourceData.last_maintenance,
                                                            nextMaintenance: resourceData.next_maintenance,
                                                            latitude: resourceData.latitude ? parseFloat(resourceData.latitude) : null,
                                                            longitude: resourceData.longitude ? parseFloat(resourceData.longitude) : null,
                                                            geofenceRadius: resourceData.geofence_radius ? parseInt(resourceData.geofence_radius) : 50
                                                        };

                                                        // Si se está asignando un grupo, incluirlo en la actualización
                                                        if (resourceData.group_id) {
                                                            equipmentUpdate.groupId = resourceData.group_id;
                                                        }

                                                        const equipmentResult = await apiEquipment.update(resourceData.qr_code, equipmentUpdate);
                                                        if (equipmentResult && !equipmentResult.error) {
                                                            toast?.showSuccess('Equipo actualizado');
                                                            // Recargar los datos del equipo actualizado
                                                            const updatedEquipment = await apiEquipment.getByQR(resourceData.qr_code);
                                                            if (updatedEquipment && !updatedEquipment.error) {
                                                                // Actualizar el estado local con los datos actualizados
                                                                setResourceData({
                                                                    ...resourceData,
                                                                    name: updatedEquipment.name,
                                                                    description: updatedEquipment.description,
                                                                    status: updatedEquipment.status === 'operational' ? 'active' : 'maintenance',
                                                                    group_id: updatedEquipment.group_id,
                                                                    last_maintenance: updatedEquipment.last_maintenance,
                                                                    next_maintenance: updatedEquipment.next_maintenance,
                                                                    latitude: updatedEquipment.latitude,
                                                                    longitude: updatedEquipment.longitude,
                                                                    geofence_radius: updatedEquipment.geofence_radius
                                                                });
                                                            }
                                                        } else {
                                                            toast?.showError(equipmentResult?.error || 'Error al actualizar equipo');
                                                        }
                                                    } else {
                                                        // Recurso nuevo - validar que tiene grupo
                                                        if (!resourceData.group_id) {
                                                            toast?.showError('Debes seleccionar un grupo para el recurso');
                                                            return;
                                                        }

                                                        const updateData = {
                                                            name: resourceData.name,
                                                            description: resourceData.description,
                                                            identifier: resourceData.identifier || null,
                                                            groupId: resourceData.group_id, // Incluir grupo en la actualización
                                                        };

                                                        // Si es un equipo, incluir campos de georreferencia y mantenimiento
                                                        if (isEquipment) {
                                                            updateData.status = resourceData.status;
                                                            updateData.last_maintenance = resourceData.last_maintenance;
                                                            updateData.next_maintenance = resourceData.next_maintenance;
                                                            updateData.latitude = resourceData.latitude ? parseFloat(resourceData.latitude) : null;
                                                            updateData.longitude = resourceData.longitude ? parseFloat(resourceData.longitude) : null;
                                                            updateData.geofence_radius = resourceData.geofence_radius ? parseInt(resourceData.geofence_radius) : 50;
                                                        }

                                                        const result = await apiResources.update(resourceData.id, updateData);
                                                        if (result.success) {
                                                            toast?.showSuccess('Recurso actualizado');
                                                            // Actualizar el estado con los datos del servidor
                                                            if (result.resource) {
                                                                setResourceData(result.resource);
                                                            }
                                                        } else {
                                                            toast?.showError(result.error || 'Error al actualizar');
                                                        }
                                                    }
                                                } catch (error) {
                                                    logger.error('Error actualizando recurso:', error);
                                                    toast?.showError('Error al actualizar: ' + (error.message || 'Error desconocido'));
                                                }
                                            }}
                                            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg"
                                        >
                                            Guardar Cambios
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Tab: Manual */}
                            {activeTab === 'manual' && (
                                <DocumentSection
                                    documents={manuals}
                                    type="manual"
                                    onUpload={(file) => handleUploadDocument(file, 'manual')}
                                    onDelete={handleDeleteDocument}
                                    placeholder="No hay manuales subidos"
                                />
                            )}

                            {/* Tab: To-Do */}
                            {activeTab === 'tasks' && (
                                <div>
                                    <CheckableList
                                        items={todoList?.items || []}
                                        type="todo"
                                        onAddItem={handleAddTodoItem}
                                        onToggleItem={handleToggleTodoItem}
                                        onDeleteItem={handleDeleteTodoItem}
                                    />
                                </div>
                            )}

                            {/* Tab: Shopping */}
                            {activeTab === 'shopping' && showShopping && (
                                <div>
                                    <CheckableList
                                        items={shoppingList?.items || []}
                                        type="shopping"
                                        onAddItem={handleAddShoppingItem}
                                        onToggleItem={handleToggleShoppingItem}
                                        onDeleteItem={handleDeleteShoppingItem}
                                    />
                                </div>
                            )}

                            {/* Tab: Docs */}
                            {activeTab === 'docs' && (
                                <DocumentSection
                                    documents={docs}
                                    type="documentation"
                                    onUpload={(file) => handleUploadDocument(file, 'documentation')}
                                    onDelete={handleDeleteDocument}
                                    placeholder="No hay documentación subida"
                                />
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// Componente para sección de documentos
const DocumentSection = ({ documents, type, onUpload, onDelete, placeholder }) => {
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = React.useRef(null);

    const handleDragOver = (e) => {
        e.preventDefault();
        setDragging(true);
    };

    const handleDragLeave = () => {
        setDragging(false);
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        setDragging(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            await handleFileUpload(files[0]);
        }
    };

    const handleFileSelect = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            await handleFileUpload(files[0]);
        }
    };

    const handleFileUpload = async (file) => {
        try {
            setUploading(true);
            await onUpload(file);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (error) {
            console.error('Error uploading:', error);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Upload Area */}
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                    dragging
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
                }`}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    accept=".pdf,.doc,.docx,.txt,.md"
                    className="hidden"
                    disabled={uploading}
                />
                <Upload size={32} className={`mx-auto mb-3 ${dragging ? 'text-blue-600' : 'text-slate-400'}`} />
                <p className="text-sm font-semibold text-slate-700 mb-1">
                    {dragging ? 'Suelta el archivo aquí' : 'Arrastra un archivo o haz clic para subir'}
                </p>
                <p className="text-xs text-slate-500">PDF, Word, Texto</p>
                {uploading && (
                    <div className="mt-4">
                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </div>
                )}
            </div>

            {/* Document List */}
            {documents.length === 0 ? (
                <div className="text-center py-12">
                    <Folder size={48} className="text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">{placeholder}</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {documents.map(doc => (
                        <div
                            key={doc.id}
                            className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-300 transition-all group"
                        >
                            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                <FileText size={24} className="text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-900 truncate">{doc.name}</p>
                                <p className="text-xs text-slate-500">
                                    {doc.file_type?.toUpperCase()} • {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : ''}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <a
                                    href={apiDocuments.getDownloadUrl(doc.id)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 rounded-lg bg-blue-100 hover:bg-blue-200 flex items-center justify-center transition-colors"
                                    title="Ver"
                                >
                                    <Eye size={18} className="text-blue-600" />
                                </a>
                                <button
                                    onClick={() => onDelete(doc.id)}
                                    className="w-10 h-10 rounded-lg bg-red-100 hover:bg-red-200 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                                    title="Eliminar"
                                >
                                    <Trash2 size={18} className="text-red-600" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ResourceManager;

