import React, { useState } from 'react';
import { Copy, Download, Check } from 'lucide-react';

const QRCodeForView = ({ resource, viewType }) => {
    const [copied, setCopied] = useState(false);

    const getViewPaths = () => {
        const baseUrl = window.location.origin;
        const qrCode = resource.qr_code;
        
        const paths = {
            'details': `${baseUrl}/resource/${qrCode}`,
            'manual': `${baseUrl}/resource/${qrCode}/manual`,
            'tasks': `${baseUrl}/resource/${qrCode}/tasks`,
            'shopping': `${baseUrl}/resource/${qrCode}/shopping`,
            'docs': `${baseUrl}/resource/${qrCode}/docs`
        };
        
        return paths[viewType] || paths['details'];
    };

    const getViewLabel = () => {
        const labels = {
            'details': 'Ficha Técnica',
            'manual': 'Manual',
            'tasks': 'To-Do / Tareas',
            'shopping': 'Lista de Compras',
            'docs': 'Documentación'
        };
        return labels[viewType] || labels['details'];
    };

    const qrUrl = getViewPaths();
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(qrUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Error copiando:', error);
        }
    };

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = qrImageUrl;
        link.download = `QR-${resource.qr_code}-${viewType}.png`;
        link.click();
    };

    return (
        <div className="w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-6 border-2 border-blue-100">
            <div className="flex flex-col items-center gap-4">
                {/* QR Code */}
                <div className="relative">
                    <div className="p-4 bg-white rounded-2xl shadow-lg border-2 border-white/50">
                        <img 
                            src={qrImageUrl} 
                            alt={`QR Code: ${getViewLabel()}`} 
                            className="w-40 h-40 mix-blend-multiply opacity-95" 
                        />
                    </div>
                    {/* Badge de tipo de vista */}
                    <div className="absolute -top-2 -right-2 px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full shadow-lg">
                        {getViewLabel()}
                    </div>
                </div>

                {/* Información */}
                <div className="text-center space-y-1">
                    <p className="text-sm font-bold text-slate-900">
                        {resource.name}
                    </p>
                    <p className="text-xs text-slate-600 font-medium">
                        {resource.qr_code}
                    </p>
                </div>

                {/* Instrucciones */}
                <div className="text-center space-y-1">
                    <p className="text-xs font-semibold text-slate-700">
                        Escanea para ver {getViewLabel().toLowerCase()} en modo lectura
                    </p>
                    <div className="flex items-center justify-center gap-3 text-xs text-slate-500">
                        <span>✓ Sin necesidad de login</span>
                        {resource.latitude && resource.longitude && (
                            <>
                                <span>•</span>
                                <span>📍 Requiere estar cerca</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Acciones */}
                <div className="flex gap-2 mt-2">
                    <button
                        onClick={handleCopy}
                        className="px-4 py-2 bg-white border-2 border-blue-200 text-blue-700 rounded-xl font-semibold hover:bg-blue-50 transition-all flex items-center gap-2 text-sm shadow-sm"
                    >
                        {copied ? (
                            <>
                                <Check size={16} />
                                Copiado
                            </>
                        ) : (
                            <>
                                <Copy size={16} />
                                Copiar URL
                            </>
                        )}
                    </button>
                    <button
                        onClick={handleDownload}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center gap-2 text-sm shadow-lg"
                    >
                        <Download size={16} />
                        Descargar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QRCodeForView;





