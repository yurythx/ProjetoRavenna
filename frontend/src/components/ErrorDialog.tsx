'use client';
import { AlertTriangle } from 'lucide-react';
import { createPortal } from 'react-dom';
export function ErrorDialog({
  open,
  title,
  description,
  details,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  details?: string[];
  onClose: () => void;
}) {
  if (!open) return null;
  return createPortal(
    <div role="alertdialog" aria-modal="true" className="fixed inset-0 z-[100] flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative max-w-md w-full rounded-lg shadow-lg overflow-hidden">
        <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)', color: '#7f1d1d' }}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            <h2 className="text-lg font-semibold">{title}</h2>
          </div>
          {description && <p className="text-sm mt-1">{description}</p>}
          {details && details.length > 0 && (
            <ul className="mt-2 text-sm list-disc pl-5">
              {details.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="bg-white px-5 py-3 flex justify-end">
          <button className="px-4 py-2 rounded bg-red-600 text-white" onClick={onClose}>Entendi</button>
        </div>
      </div>
    </div>,
    document.body
  );
}


