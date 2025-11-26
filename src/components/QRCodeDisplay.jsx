// Componente para mostrar QR Code
const QRCodeDisplay = ({ code }) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(code)}`;
    return (
        <div className="flex flex-col items-center gap-2">
            <img src={qrUrl} alt={`QR Code: ${code}`} className="w-40 h-40" />
            <p className="text-xs text-slate-500 font-medium">Escanea para unirse</p>
        </div>
    );
};

export default QRCodeDisplay;




