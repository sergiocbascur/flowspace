import { useState, useCallback } from 'react';

let toastIdCounter = 0;

export const useToast = () => {
    const [notifications, setNotifications] = useState([]);

    const showToast = useCallback((message, type = 'info', options = {}) => {
        const id = ++toastIdCounter;
        const notification = {
            id,
            message,
            type,
            title: options.title,
            duration: options.duration || 5000,
            autoClose: options.autoClose !== false
        };

        setNotifications(prev => [...prev, notification]);

        return id;
    }, []);

    const removeToast = useCallback((id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    // Helpers para tipos comunes
    const showSuccess = useCallback((message, options) => {
        return showToast(message, 'success', options);
    }, [showToast]);

    const showError = useCallback((message, options) => {
        return showToast(message, 'error', { duration: 7000, ...options });
    }, [showToast]);

    const showWarning = useCallback((message, options) => {
        return showToast(message, 'warning', options);
    }, [showToast]);

    const showInfo = useCallback((message, options) => {
        return showToast(message, 'info', options);
    }, [showToast]);

    return {
        notifications,
        showToast,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        removeToast
    };
};




