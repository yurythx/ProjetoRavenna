'use client';

import { createPortal } from 'react-dom';

type ConfirmDialogProps = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
};

export function ConfirmDialog({ open, onCancel, onConfirm, title, description }: ConfirmDialogProps) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-2xl max-w-sm w-full animate-scale-in border dark:border-slate-800">
        <h3 className="text-lg font-bold mb-2 text-slate-900 dark:text-white">{title}</h3>
        <p className="text-slate-600 dark:text-slate-400 mb-6">{description}</p>
        <div className="flex justify-end gap-3">
          <button 
            onClick={onCancel} 
            className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors font-medium"
          >
            Cancelar
          </button>
          <button 
            onClick={onConfirm} 
            className="px-4 py-2 text-white rounded-lg transition-colors font-medium shadow-lg"
            style={{ backgroundColor: 'var(--error)' }}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
