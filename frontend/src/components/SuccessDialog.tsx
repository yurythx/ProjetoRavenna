'use client';
import { CheckCircle2, Eye, Share2, ArrowRight, FilePlus } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useToast } from '@/contexts/ToastContext';
import { useTranslations } from 'next-intl';

export function SuccessDialog({
  open,
  title,
  description,
  onClose,
  slug,
  confirmLabel,
  onCreateAnother,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  slug?: string;
  confirmLabel?: string;
  onCreateAnother?: () => void;
}) {
  const { show } = useToast();
  const t = useTranslations('Dialogs');
  const tc = useTranslations('Common');

  if (!open) return null;

  const handleShare = () => {
    if (slug && typeof navigator !== 'undefined') {
      const url = `${window.location.origin}/artigos/${slug}`;
      navigator.clipboard.writeText(url);
      show({ type: 'success', message: t('linkCopied') });
    }
  };

  return createPortal(
    <div role="alertdialog" aria-modal="true" className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-w-sm w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-scale-in border dark:border-slate-800">
        <div className="p-8 text-center bg-success-soft">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success-soft text-success mb-4">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{title}</h2>
          {description && <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{description}</p>}
        </div>

        <div className="p-4 space-y-2">
          {slug && (
            <>
              {onCreateAnother ? (
                <button
                  onClick={onCreateAnother}
                  className="flex items-center justify-center gap-2 w-full py-3 text-white rounded-xl font-medium transition-colors shadow-lg"
                  style={{ backgroundColor: 'var(--success)' }}
                >
                  <FilePlus className="w-4 h-4" /> {t('createAnother')}
                </button>
              ) : (
                <a
                  href={`/artigos/${slug}`}
                  className="flex items-center justify-center gap-2 w-full py-3 text-white rounded-xl font-medium transition-colors shadow-lg"
                  style={{ backgroundColor: 'var(--success)' }}
                >
                  <Eye className="w-4 h-4" /> {t('viewArticle')} <ArrowRight className="w-4 h-4" />
                </a>
              )}

              <button
                onClick={handleShare}
                className="flex items-center justify-center gap-2 w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors"
              >
                <Share2 className="w-4 h-4" /> {t('copyLink')}
              </button>
            </>
          )}

          <button
            onClick={onClose}
            className="w-full py-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm transition-colors pt-2"
          >
            {confirmLabel || tc('save')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
