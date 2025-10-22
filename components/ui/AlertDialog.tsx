import React from 'react';
import { AlertCircle, CheckCircle, XCircle, Info } from 'lucide-react';
import { Button } from './button';

interface AlertDialogProps {
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
  confirmText?: string;
}

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const colors = {
  success: {
    icon: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
    button: 'bg-green-600 hover:bg-green-700',
  },
  error: {
    icon: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    button: 'bg-red-600 hover:bg-red-700',
  },
  warning: {
    icon: 'text-yellow-600',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    button: 'bg-yellow-600 hover:bg-yellow-700',
  },
  info: {
    icon: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    button: 'bg-blue-600 hover:bg-blue-700',
  },
};

export const AlertDialog: React.FC<AlertDialogProps> = ({
  title,
  message,
  type = 'info',
  onClose,
  confirmText = 'OK',
}) => {
  const Icon = icons[type];
  const colorScheme = colors[type];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full animate-fade-in">
        <div className={`p-6 border-b ${colorScheme.border}`}>
          <div className="flex items-center space-x-3">
            <Icon className={`h-6 w-6 ${colorScheme.icon}`} />
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          </div>
        </div>

        <div className={`p-6 ${colorScheme.bg}`}>
          <p className="text-gray-700 whitespace-pre-line">{message}</p>
        </div>

        <div className="p-6 flex justify-end space-x-3">
          <Button
            onClick={onClose}
            className={`${colorScheme.button} text-white`}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AlertDialog;
