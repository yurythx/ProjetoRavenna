'use client';
import { createPortal } from 'react-dom';
export function ConfirmDialog({
  open,
  title,
  description,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return createPortal(
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[100] flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded shadow p-4 max-w-sm w-full">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button className="px-3 py-1 rounded border" onClick={onCancel}>Cancelar</button>
          <button className="px-3 py-1 rounded bg-red-600 text-white" onClick={onConfirm}>Confirmar</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

