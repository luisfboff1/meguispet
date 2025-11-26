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
      className={`fixed bottom-6 right-6 z-[9999] px-4 py-3 rounded shadow-lg text-white ${bgColors[type]} animate-fade-in max-w-md`}
      role="alert"
    >
      <div className="flex items-start gap-4">
        <span className="whitespace-pre-line flex-1">{message}</span>
        <button className="text-white/80 hover:text-white text-xl leading-none" onClick={onClose}>&times;</button>
      </div>
    </div>
  );
};

export default Toast;
