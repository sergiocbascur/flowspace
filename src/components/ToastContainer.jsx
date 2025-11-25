import React from 'react';
import Toast from './Toast';

const ToastContainer = ({ notifications, onClose }) => {
    return (
        <div
            className="fixed top-4 right-4 z-[999999] space-y-2 max-w-md w-full pointer-events-none"
            aria-live="polite"
            aria-atomic="true"
        >
            {notifications.map(notification => (
                <div key={notification.id} className="pointer-events-auto">
                    <Toast notification={notification} onClose={onClose} />
                </div>
            ))}
        </div>
    );
};

export default ToastContainer;



