'use client';
import { HelpCircle } from 'lucide-react';
export function ConfirmSuccessDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />
      <div className="relative max-w-md w-full rounded-lg shadow-lg overflow-hidden">
        <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)', color: '#064e3b' }}>
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            <h2 className="text-lg font-semibold">{title}</h2>
          </div>
          {description && <p className="text-sm mt-1">{description}</p>}
        </div>
        <div className="bg-white px-5 py-3 flex justify-end gap-2">
          <button className="px-4 py-2 rounded border" onClick={onCancel}>{cancelLabel || 'Cancelar'}</button>
          <button className="px-4 py-2 rounded bg-green-600 text-white" onClick={onConfirm}>{confirmLabel || 'Confirmar'}</button>
        </div>
      </div>
    </div>
  );
}

