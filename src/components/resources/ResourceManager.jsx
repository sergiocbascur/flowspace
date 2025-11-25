import React, { useState, useEffect } from 'react';
import { X, FileText, Book, CheckSquare, Folder, ShoppingCart, Upload, Download, Trash2, Eye } from 'lucide-react';
import QRCodeForView from '../QRCodeForView';
import CheckableList from '../CheckableList';
import { apiChecklists, apiDocuments, apiResources } from '../../apiService';
import logger from '../../utils/logger';

const ResourceManager = ({ resource, onClose, currentContext, toast }) => {
    const [activeTab, setActiveTab] = useState('details');
    const [loading, setLoading] = useState(false);
    
    // Estados para cada sección
    const [todoList, setTodoList] = useState(null);
    const [shoppingList, setShoppingList] = useState(null);
    const [manuals, setManuals] = useState([]);
    const [docs, setDocs] = useState([]);
    const [resourceData, setResourceData] = useState(resource);

    // Cargar datos iniciales
    useEffect(() => {
        if (resource) {
            setResourceData(resource);
            loadInitialData();
        }
    }, [resource]);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            // Cargar To-Do
            const todoResult = await apiChecklists.getByResource(resource.id, 'todo');
            if (todoResult.success) {
                setTodoList(todoResult.checklist);
            }

            // Cargar Shopping (solo si es personal)
            if (currentContext === 'personal' && (resource.resource_type === 'room' || resource.resource_type === 'house')) {
                const shoppingResult = await apiChecklists.getByResource(resource.id, 'shopping');
                if (shoppingResult.success) {
                    setShoppingList(shoppingResult.checklist);
                }
            }

            // Cargar documentos
            loadDocuments();
        } catch (error) {
            logger.error('Error cargando datos del recurso:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadDocuments = async () => {
        try {
            const manualsResult = await apiDocuments.getAll({
                linkedToType: 'resource',
                linkedToId: resource.id
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
            if (!todoList?.id) {
                // Crear lista primero
                const createResult = await apiChecklists.getByResource(resource.id, 'todo');
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
            if (!shoppingList?.id) {
                const createResult = await apiChecklists.getByResource(resource.id, 'shopping');
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
        try {
            const result = await apiDocuments.upload(file, {
                name: file.name,
                linkedToType: 'resource',
                linkedToId: resource.id,
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

    // Determinar qué tabs mostrar
    const showShopping = currentContext === 'personal' && 
                        (resource.resource_type === 'room' || resource.resource_type === 'house');

    const tabs = [
        { id: 'details', label: 'Ficha', icon: FileText },
        { id: 'manual', label: 'Manual', icon: Book },
        { id: 'tasks', label: 'To-Do', icon: CheckSquare },
        ...(showShopping ? [{ id: 'shopping', label: 'Compras', icon: ShoppingCart }] : []),
        { id: 'docs', label: 'Docs', icon: Folder }
    ];

    if (!resource) return null;

    return (
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-6"
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
                className="w-full max-w-4xl bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                style={{
                    animation: 'scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                }}
            >
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-200/60 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                            {resourceData.name}
                        </h2>
                        <p className="text-slate-600 text-sm font-medium mt-1 capitalize">
                            {resourceData.resource_type === 'equipment' ? 'Equipo' : 
                             resourceData.resource_type === 'room' ? 'Área / Habitación' :
                             resourceData.resource_type}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-full bg-white/80 hover:bg-white text-slate-500 hover:text-slate-700 flex items-center justify-center transition-all shadow-sm"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* QR Code Section - Dinámico según tab */}
                <div className="px-8 pt-6 pb-4">
                    <QRCodeForView resource={resourceData} viewType={activeTab} />
                </div>

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
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Nombre</label>
                                        <input
                                            type="text"
                                            value={resourceData.name || ''}
                                            onChange={(e) => setResourceData({ ...resourceData, name: e.target.value })}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                                        />
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
                                    <div className="flex justify-end">
                                        <button
                                            onClick={async () => {
                                                try {
                                                    const result = await apiResources.update(resourceData.id, {
                                                        name: resourceData.name,
                                                        description: resourceData.description
                                                    });
                                                    if (result.success) {
                                                        toast?.showSuccess('Recurso actualizado');
                                                    }
                                                } catch (error) {
                                                    logger.error('Error actualizando recurso:', error);
                                                    toast?.showError('Error al actualizar');
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

