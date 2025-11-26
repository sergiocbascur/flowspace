import React, { useState, useEffect } from 'react';
import { X, Folder, Download, FileText, AlertCircle } from 'lucide-react';
import logger from '../../utils/logger';

const ResourceDocsView = ({ qrCode, onClose, toast }) => {
    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [resource, setResource] = useState(null);

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

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                const apiUrl = getApiUrl();

                // Obtener información del recurso
                const resourceResponse = await fetch(`${apiUrl}/resources/public/${qrCode}`);
                if (!resourceResponse.ok) {
                    throw new Error('Recurso no encontrado');
                }
                const resourceData = await resourceResponse.json();
                if (!resourceData.success) {
                    throw new Error(resourceData.error || 'Recurso no encontrado');
                }
                setResource(resourceData.resource);

                // Obtener documentos (excluir manuales)
                const docsResponse = await fetch(`${apiUrl}/documents?resourceId=${resourceData.resource.id}`);
                if (docsResponse.ok) {
                    const docsData = await docsResponse.json();
                    if (docsData.success) {
                        // Filtrar documentos (excluir manuales)
                        const docsList = docsData.documents?.filter(doc => {
                            const isManual = doc.name.toLowerCase().includes('manual') ||
                                           doc.document_type === 'manual' ||
                                           doc.metadata?.documentType === 'manual';
                            return !isManual;
                        }) || [];
                        setDocs(docsList);
                    }
                }
            } catch (err) {
                logger.error('Error cargando documentación:', err);
                setError(err.message || 'Error al cargar la documentación');
            } finally {
                setLoading(false);
            }
        };

        if (qrCode) {
            fetchData();
        }
    }, [qrCode]);

    const handleDownload = (docId, docName) => {
        const apiUrl = getApiUrl().replace('/api', '');
        window.open(`${apiUrl}/api/documents/${docId}/download`, '_blank');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
                <div className="text-center text-white">
                    <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-lg">Cargando documentación...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
                <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Error</h2>
                    <p className="text-slate-600 mb-6">{error}</p>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                            Cerrar
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 text-white p-4 flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <Folder size={28} />
                        {resource?.name || 'Documentación'}
                    </h1>
                    <p className="text-white/80 text-sm mt-1">Documentos y archivos relacionados</p>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                )}
            </div>

            <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-2xl p-6 shadow-xl overflow-y-auto">
                {docs.length === 0 ? (
                    <div className="text-center py-12">
                        <Folder size={64} className="text-white/30 mx-auto mb-4" />
                        <p className="text-white/70 text-lg font-medium">No hay documentos disponibles</p>
                        <p className="text-white/50 text-sm mt-2">Los documentos aparecerán aquí cuando sean agregados</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {docs.map(doc => (
                            <div
                                key={doc.id}
                                className="bg-white/10 hover:bg-white/20 rounded-xl p-6 border border-white/20 transition-all group"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                                        <FileText size={24} className="text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-white text-lg mb-1 truncate">
                                            {doc.name}
                                        </h3>
                                        {doc.description && (
                                            <p className="text-white/70 text-sm mb-3 line-clamp-2">
                                                {doc.description}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-2 text-xs text-white/60 mb-4">
                                            <span>{doc.file_type?.toUpperCase()}</span>
                                            {doc.file_size && (
                                                <>
                                                    <span>•</span>
                                                    <span>{(doc.file_size / 1024).toFixed(1)} KB</span>
                                                </>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleDownload(doc.id, doc.name)}
                                                className="flex-1 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Download size={16} />
                                                Descargar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResourceDocsView;


