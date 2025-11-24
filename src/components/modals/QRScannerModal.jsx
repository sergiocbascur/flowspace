import React, { useState, useRef, useEffect } from 'react';
import { X, QrCode, ArrowRight } from 'lucide-react';

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
                background: 'linear-gradient(135deg, rgba(0,0,0,0.95) 0%, rgba(20,20,40,0.98) 100%)',
                backdropFilter: 'blur(40px)',
                animation: 'fadeIn 0.3s ease-out'
            }}
        >
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { 
                        opacity: 0;
                        transform: translateY(20px) scale(0.95);
                    }
                    to { 
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
                @keyframes shimmer {
                    0% { background-position: -1000px 0; }
                    100% { background-position: 1000px 0; }
                }
                .glass-card {
                    background: linear-gradient(135deg, 
                        rgba(255, 255, 255, 0.1) 0%, 
                        rgba(255, 255, 255, 0.05) 100%);
                    backdrop-filter: blur(20px) saturate(180%);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    box-shadow: 
                        0 8px 32px 0 rgba(0, 0, 0, 0.37),
                        inset 0 1px 0 0 rgba(255, 255, 255, 0.1);
                }
                .shimmer-button {
                    background: linear-gradient(90deg, 
                        rgba(59, 130, 246, 0.8) 0%, 
                        rgba(99, 102, 241, 0.8) 50%, 
                        rgba(59, 130, 246, 0.8) 100%);
                    background-size: 200% 100%;
                    animation: shimmer 3s linear infinite;
                }
            `}</style>

            <div
                className="w-full max-w-md glass-card rounded-3xl overflow-hidden"
                style={{
                    animation: 'slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}
            >
                {/* Header */}
                <div
                    className="px-6 py-5 flex items-center justify-between"
                    style={{
                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                >
                    <h3 className="text-2xl font-bold text-white tracking-tight">
                        Escanear Código
                    </h3>
                    <button
                        onClick={handleClose}
                        className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                        style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(10px)'
                        }}
                    >
                        <X size={20} className="text-white" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Manual Input */}
                    <div>
                        <label className="block text-sm font-semibold text-white/70 mb-3 tracking-wide">
                            CÓDIGO MANUAL
                        </label>
                        <div className="flex gap-3">
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
                                className="flex-1 px-5 py-4 rounded-2xl text-white placeholder-white/40 font-medium tracking-wide focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    backdropFilter: 'blur(10px)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)'
                                }}
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={handleManualSubmit}
                                disabled={!manualCode.trim()}
                                className="px-6 py-4 rounded-2xl font-bold text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shimmer-button shadow-lg shadow-blue-500/30"
                            >
                                <ArrowRight size={24} />
                            </button>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-white/10"></div>
                        <span className="flex-shrink-0 mx-4 text-white/50 text-sm font-medium tracking-wider">
                            O ESCANEAR QR
                        </span>
                        <div className="flex-grow border-t border-white/10"></div>
                    </div>

                    {/* Camera */}
                    {!showCamera ? (
                        <button
                            onClick={() => setShowCamera(true)}
                            className="w-full py-5 rounded-2xl font-bold text-white transition-all hover:scale-[1.02] active:scale-98 flex items-center justify-center gap-3 shadow-xl"
                            style={{
                                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.06) 100%)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255, 255, 255, 0.15)'
                            }}
                        >
                            <QrCode size={24} />
                            <span className="tracking-wide">Activar Cámara</span>
                        </button>
                    ) : (
                        <div
                            className="relative aspect-square overflow-hidden rounded-3xl shadow-2xl"
                            style={{
                                background: 'linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(20,20,40,0.9) 100%)',
                                border: '2px solid rgba(59, 130, 246, 0.3)'
                            }}
                        >
                            {isLoading && (
                                <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/60 backdrop-blur-sm">
                                    <div
                                        className="w-16 h-16 rounded-full border-4 border-transparent animate-spin"
                                        style={{
                                            borderTopColor: '#3b82f6',
                                            borderRightColor: '#6366f1'
                                        }}
                                    ></div>
                                </div>
                            )}
                            <div id="reader" ref={scannerRef} className="w-full h-full"></div>
                            {debugLog && (
                                <div
                                    className="absolute bottom-0 left-0 right-0 text-white text-xs p-3 truncate font-mono"
                                    style={{
                                        background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
                                        backdropFilter: 'blur(10px)'
                                    }}
                                >
                                    {debugLog}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QRScannerModal;
