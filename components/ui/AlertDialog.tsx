import React from 'react';
import { AlertCircle, CheckCircle, XCircle, Info } from 'lucide-react';
import { Button } from './button';

interface AlertDialogProps {
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
  confirmText?: string;
  onCancel?: () => void;
  cancelText?: string;
}

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const colors = {
  success: {
    icon: 'text-success',
    bg: 'bg-success-muted',
    border: 'border-success/30',
    button: 'bg-success hover:bg-success/90',
  },
  error: {
    icon: 'text-destructive',
    bg: 'bg-destructive/10',
    border: 'border-destructive/30',
    button: 'bg-destructive hover:bg-destructive/90',
  },
  warning: {
    icon: 'text-warning',
    bg: 'bg-warning-muted',
    border: 'border-warning/30',
    button: 'bg-warning hover:bg-warning/90',
  },
  info: {
    icon: 'text-info',
    bg: 'bg-info-muted',
    border: 'border-info/30',
    button: 'bg-info hover:bg-info/90',
  },
};

export const AlertDialog: React.FC<AlertDialogProps> = ({
  title,
  message,
  type = 'info',
  onClose,
  confirmText = 'OK',
  onCancel,
  cancelText = 'Cancelar',
}) => {
  const Icon = icons[type];
  const colorScheme = colors[type];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-lg shadow-xl max-w-md w-full animate-fade-in">
        <div className={`p-6 border-b ${colorScheme.border}`}>
          <div className="flex items-center space-x-3">
            <Icon className={`h-6 w-6 ${colorScheme.icon}`} />
            <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          </div>
        </div>

        <div className={`p-6 ${colorScheme.bg}`}>
          <p className="text-foreground whitespace-pre-line">{message}</p>
        </div>

        <div className="p-6 flex justify-end space-x-3">
          {onCancel && (
            <Button
              variant="outline"
              onClick={onCancel}
            >
              {cancelText}
            </Button>
          )}
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
