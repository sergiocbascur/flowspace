import React, { useState, useRef, useEffect } from 'react';
import { X, QrCode, AlertCircle, ArrowRight } from 'lucide-react';

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
                // Importación dinámica
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
                        // Llamada directa al prop
                        if (typeof onCodeScanned === 'function') {
                            onCodeScanned(decodedText);
                        } else {
                            console.error('onCodeScanned no es una función');
                            alert('ERROR: onCodeScanned no es una función');
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
        alert('DEBUG: Click en botón manual');
        if (manualCode.trim()) {
            alert('DEBUG: Código ingresado: ' + manualCode.trim());

            if (typeof onCodeScanned === 'function') {
                try {
                    alert('DEBUG: Ejecutando onCodeScanned...');
                    onCodeScanned(manualCode.trim());
                    alert('DEBUG: onCodeScanned ejecutado (si ves esto, la función retornó)');
                } catch (e) {
                    console.error('Error llamando onCodeScanned:', e);
                    alert('ERROR EXCEPCIÓN: ' + e.message);
                }
            } else {
                alert('ERROR CRÍTICO: onCodeScanned NO es una función. Es: ' + typeof onCodeScanned);
            }
        } else {
            alert('DEBUG: Código vacío');
        }
    };

    return (
        <div className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center">
            <div className="w-full max-w-md px-4 relative">
                <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
                    <div className="p-4 flex items-center justify-between border-b border-slate-100 bg-white z-10 relative">
                        <h3 className="text-lg font-bold text-slate-900">Ingresar Código de Equipo</h3>
                        <button
                            onClick={handleClose}
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <X size={24} className="text-slate-600" />
                        </button>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Opción 1: Ingreso Manual */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
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
                                    className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={handleManualSubmit}
                                    disabled={!manualCode.trim()}
                                    className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ArrowRight size={24} />
                                </button>
                            </div>
                        </div>

                        <div className="relative flex items-center py-2">
                            <div className="flex-grow border-t border-slate-200"></div>
                            <span className="flex-shrink-0 mx-4 text-slate-400 text-sm">O escanear QR</span>
                            <div className="flex-grow border-t border-slate-200"></div>
                        </div>

                        {/* Opción 2: Cámara */}
                        {!showCamera ? (
                            <button
                                onClick={() => setShowCamera(true)}
                                className="w-full py-4 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                            >
                                <QrCode size={24} />
                                Activar Cámara
                            </button>
                        ) : (
                            <div className="relative bg-black aspect-square overflow-hidden rounded-xl">
                                {isLoading && (
                                    <div className="absolute inset-0 flex items-center justify-center z-20 bg-slate-100">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                                    </div>
                                )}
                                <div id="reader" ref={scannerRef} className="w-full h-full"></div>
                                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">
                                    {debugLog}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QRScannerModal;
