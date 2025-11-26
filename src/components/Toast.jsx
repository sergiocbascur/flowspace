import React, { useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const Toast = ({ notification, onClose }) => {
    useEffect(() => {
        if (notification.autoClose !== false) {
            const timer = setTimeout(() => {
                onClose(notification.id);
            }, notification.duration || 5000);
            return () => clearTimeout(timer);
        }
    }, [notification, onClose]);

    const icons = {
        success: <CheckCircle2 size={20} className="text-green-600" />,
        error: <AlertCircle size={20} className="text-red-600" />,
        warning: <AlertTriangle size={20} className="text-amber-600" />,
        info: <Info size={20} className="text-blue-600" />
    };

    const styles = {
        success: 'bg-green-50 border-green-200 text-green-900',
        error: 'bg-red-50 border-red-200 text-red-900',
        warning: 'bg-amber-50 border-amber-200 text-amber-900',
        info: 'bg-blue-50 border-blue-200 text-blue-900'
    };

    return (
        <div
            className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg animate-in slide-in-from-top-2 fade-in ${styles[notification.type] || styles.info}`}
            role="alert"
        >
            <div className="flex-shrink-0 mt-0.5">
                {icons[notification.type] || icons.info}
            </div>
            <div className="flex-1 min-w-0">
                {notification.title && (
                    <h4 className="font-semibold text-sm mb-1">{notification.title}</h4>
                )}
                <p className="text-sm">{notification.message}</p>
            </div>
            <button
                onClick={() => onClose(notification.id)}
                className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Cerrar notificación"
            >
                <X size={16} />
            </button>
        </div>
    );
};

export default Toast;




