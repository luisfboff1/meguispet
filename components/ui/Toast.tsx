import React from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
}

const bgColors = {
  success: 'bg-green-600',
  error: 'bg-red-600',
  info: 'bg-blue-600',
};

export const Toast: React.FC<ToastProps> = ({ message, type = 'info', onClose }) => {
  React.useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded shadow-lg text-white ${bgColors[type]} animate-fade-in`}
      role="alert"
    >
      <span>{message}</span>
      <button className="ml-4 text-white/80 hover:text-white" onClick={onClose}>&times;</button>
    </div>
  );
};

export default Toast;
