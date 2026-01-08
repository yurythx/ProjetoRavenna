'use client';
import { CheckCircle2, Eye, Share2, ArrowRight } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useToast } from '@/contexts/ToastContext';

export function SuccessDialog({
  open,
  title,
  description,
  onClose,
  slug,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  slug?: string;
}) {
  const { show } = useToast();
  if (!open) return null;

  const handleShare = () => {
    if (slug && typeof navigator !== 'undefined') {
      const url = `${window.location.origin}/artigos/${slug}`;
      navigator.clipboard.writeText(url);
      show({ type: 'success', message: 'Link copiado para a área de transferência!' });
    }
  };

  return createPortal(
    <div role="alertdialog" aria-modal="true" className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-w-sm w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-scale-in border dark:border-slate-800">
        <div className="p-8 text-center bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 mb-4">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{title}</h2>
          {description && <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{description}</p>}
        </div>

        <div className="p-4 space-y-2">
          {slug && (
            <a
              href={`/artigos/${slug}`}
              className="flex items-center justify-center gap-2 w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-green-600/20"
            >
              <Eye className="w-4 h-4" /> Ver Artigo <ArrowRight className="w-4 h-4" />
            </a>
          )}

          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-2 w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors"
          >
            <Share2 className="w-4 h-4" /> Copiar Link
          </button>

          <button
            onClick={onClose}
            className="w-full py-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm transition-colors pt-2"
          >
            Continuar editando
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
