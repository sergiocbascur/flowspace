import React, { useState, useRef, useEffect } from 'react';
import { X, QrCode, ArrowRight, Camera } from 'lucide-react';

const QRScannerModal = ({ onCodeScanned, onClose }) => {
    const scannerRef = useRef(null);
    const html5QrCodeRef = useRef(null);
    const [error, setError] = useState('');
    const [isClosing, setIsClosing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [debugLog, setDebugLog] = useState('Iniciando...');
    const [manualCode, setManualCode] = useState('');
    const [showCamera, setShowCamera] = useState(false);

    useEffect(() => {
        if (!showCamera || !scannerRef.current) return;

        const initScanner = async () => {
            try {
                const { Html5Qrcode } = await import('html5-qrcode');
                const elementId = scannerRef.current.id;
                const html5QrCode = new Html5Qrcode(elementId);
                html5QrCodeRef.current = html5QrCode;
                setIsLoading(false);
                setDebugLog(prev => prev + '\nLibrería cargada');

                const config = {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0
                };

                html5QrCode.start(
                    { facingMode: "environment" },
                    config,
                    (decodedText) => {
                        setDebugLog(prev => prev + '\nDETECTADO: ' + decodedText);
                        if (typeof onCodeScanned === 'function') {
                            onCodeScanned(decodedText);
                        }
                    },
                    (errorMessage) => { }
                ).catch((err) => {
                    console.error('Error iniciando escáner:', err);
                    setError('No se pudo acceder a la cámara.');
                    setDebugLog(prev => prev + '\nERROR INICIO: ' + err.message);
                    setIsLoading(false);
                });
            } catch (err) {
                console.error('Error cargando html5-qrcode:', err);
                setError('Error al cargar el escáner QR');
                setIsLoading(false);
            }
        };

        initScanner();

        return () => {
            if (html5QrCodeRef.current) {
                try {
                    if (html5QrCodeRef.current.isScanning) {
                        html5QrCodeRef.current.stop().catch(e => console.warn(e));
                    }
                    html5QrCodeRef.current.clear();
                } catch (e) { }
                html5QrCodeRef.current = null;
            }
        };
    }, [showCamera]);

    const handleClose = async () => {
        if (isClosing) return;
        setIsClosing(true);

        try {
            if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
                await html5QrCodeRef.current.stop();
                html5QrCodeRef.current.clear();
                html5QrCodeRef.current = null;
            }
        } catch (err) {
            console.error('Error al cerrar escáner:', err);
        } finally {
            onClose();
        }
    };

    const handleManualSubmit = () => {
        if (manualCode.trim()) {
            onCodeScanned(manualCode.trim());
            setManualCode('');
        }
    };

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
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
                className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col"
                style={{
                    animation: 'scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255,255,255,0.5) inset'
                }}
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-200/60 flex justify-between items-center bg-white/50">
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <QrCode size={20} className="text-blue-600" />
                        Escanear Código
                    </h3>
                    <button
                        onClick={handleClose}
                        className="w-8 h-8 rounded-full bg-slate-200/50 hover:bg-slate-300/50 flex items-center justify-center text-slate-500 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Manual Input */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            Código Manual
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={manualCode}
                                onChange={(e) => setManualCode(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleManualSubmit();
                                    }
                                }}
                                placeholder="Ej: DX-001"
                                className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={handleManualSubmit}
                                disabled={!manualCode.trim()}
                                className="px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                            >
                                <ArrowRight size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-slate-200"></div>
                        <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-bold uppercase tracking-wider">
                            O escanear QR
                        </span>
                        <div className="flex-grow border-t border-slate-200"></div>
                    </div>

                    {/* Camera */}
                    {!showCamera ? (
                        <button
                            onClick={() => setShowCamera(true)}
                            className="w-full py-12 rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/50 transition-all group flex flex-col items-center justify-center gap-3"
                        >
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                                <Camera size={32} />
                            </div>
                            <span className="font-bold text-slate-600 group-hover:text-blue-600 transition-colors">
                                Activar Cámara
                            </span>
                        </button>
                    ) : (
                        <div className="relative aspect-square overflow-hidden rounded-2xl bg-black shadow-inner">
                            {isLoading && (
                                <div className="absolute inset-0 flex items-center justify-center z-20 bg-slate-900/50 backdrop-blur-sm">
                                    <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                                </div>
                            )}
                            <div id="reader" ref={scannerRef} className="w-full h-full"></div>
                            {debugLog && (
                                <div className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-md text-white/80 text-[10px] p-2 truncate font-mono">
                                    {debugLog}
                                </div>
                            )}
                            <div className="absolute inset-0 border-[30px] border-black/30 pointer-events-none">
                                <div className="absolute inset-0 border-2 border-white/50 rounded-lg"></div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QRScannerModal;
