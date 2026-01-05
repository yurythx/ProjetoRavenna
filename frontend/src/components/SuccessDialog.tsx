'use client';
import { CheckCircle2 } from 'lucide-react';
import { createPortal } from 'react-dom';
export function SuccessDialog({
  open,
  title,
  description,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
}) {
  if (!open) return null;
  return createPortal(
    <div role="alertdialog" aria-modal="true" className="fixed inset-0 z-[100] flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative max-w-md w-full rounded-lg shadow-lg overflow-hidden">
        <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)', color: '#064e3b' }}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            <h2 className="text-lg font-semibold">{title}</h2>
          </div>
          {description && <p className="text-sm mt-1">{description}</p>}
        </div>
        <div className="bg-white px-5 py-3 flex justify-end">
          <button className="px-4 py-2 rounded bg-green-600 text-white" onClick={onClose}>Continuar</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
