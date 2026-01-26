'use client';
import { Suspense, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react';
import { ErrorDialog } from '@/components/ErrorDialog';
import { SuccessDialog } from '@/components/SuccessDialog';

import { useTranslations } from 'next-intl';

function LoginContent() {
  const t = useTranslations('Auth');
  const tc = useTranslations('Common');
  const { login, isLoading, token } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { show } = useToast();
  const router = useRouter();
  const [remember, setRemember] = useState(true);
  const [capsLock, setCapsLock] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';
  const [errorOpen, setErrorOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setErrorDetails([]);
    try {
      await login(identifier, password, remember);
      show({ type: 'success', message: t('loginSuccessToast', { name: identifier ? `, ${identifier}` : '' }) });
      setSuccessOpen(true);
      setTimeout(() => {
        setSuccessOpen(false);
        router.push(next);
      }, 3000);
    } catch (err: any) {
      let message = t('loginErrorMsg');
      let details: string[] = [];

      if (!err.response) {
        // Erro de rede ou servidor inacessível
        message = t('serverUnavailable');
        details = [
          t('serverUnavailableDetails'),
          'Verifique sua conexão com a internet.',
          'O sistema pode estar em manutenção.'
        ];
      } else if (err.response.status >= 500) {
        // Erro interno do servidor
        message = t('serverError');
        details = [t('serverErrorDetails')];
      } else {
        // Erros de cliente (400, 401, 403)
        const resp = err.response.data || {};
        if (resp.detail) {
          message = String(resp.detail);
          if (message.includes('No active account') || message.includes('Authentication credentials were not provided')) {
            message = t('invalidCredentials');
            details = [t('invalidCredentialsDetails')];
          }
        } else {
          message = t('invalidData');
          if (Array.isArray(resp.non_field_errors)) {
            details.push(...resp.non_field_errors.map(String));
          }
          if (resp.email) details.push(`Email: ${Array.isArray(resp.email) ? resp.email.join(', ') : String(resp.email)}`);
          if (resp.password) details.push(`Senha: ${Array.isArray(resp.password) ? resp.password.join(', ') : String(resp.password)}`);
          if (details.length === 0) details.push(t('verifyFields'));
        }
      }

      setError(message);
      show({ type: 'error', message });
      setErrorDetails(details);
      setErrorOpen(true);
    }
  }
  function onPasswordKeyUp(e: React.KeyboardEvent<HTMLInputElement>) {
    setCapsLock(e.getModifierState && e.getModifierState('CapsLock'));
  }
  useEffect(() => {
    setError(null);
    setErrorDetails([]);
  }, [identifier, password]);

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, var(--background) 0%, var(--muted) 50%, var(--background) 100%)' }}>
      <div className="container-custom py-16">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: 'var(--accent)', color: 'white' }}>
              <ArrowRight className="h-4 w-4" />
              <span className="text-sm font-medium">{t('welcome')}</span>
            </div>
            <h1 className="text-3xl font-bold mt-4">{t('title')}</h1>
            <p className="mt-2" style={{ color: 'var(--muted-foreground)' }}>
              {t('subtitle')}
            </p>
          </div>
          <div className="card p-6">
            {token && <p className="text-success mb-4">{t('alreadyAuthenticated')}</p>}
            {error && <p className="text-error mb-4" role="alert" aria-live="polite">{error}</p>}
            <form onSubmit={onSubmit} className="space-y-4" aria-describedby="login-status">
              <div className="relative w-full">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: 'var(--muted-foreground)' }} />
                <input
                  type="text"
                  placeholder={t('identifier')}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className={`input w-full pl-12 pr-12 h-12 text-base shadow-sm ${error ? 'border-error' : ''}`}
                  aria-label={t('identifier')}
                  autoComplete="username"
                />
              </div>
              <div className="relative w-full">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: 'var(--muted-foreground)' }} />
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder={t('password')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyUp={onPasswordKeyUp}
                  className={`input w-full pl-12 pr-12 h-12 text-base shadow-sm ${error ? 'border-error' : ''}`}
                  aria-label={t('password')}
                  autoComplete={remember ? 'current-password' : 'off'}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded hover:bg-white/10"
                  aria-pressed={showPwd}
                  aria-label={showPwd ? t('hidePassword') : t('showPassword')}
                >
                  {showPwd ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {capsLock && <p className="badge badge-warning">{t('capsLock')}</p>}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  <span>{t('rememberMe')}</span>
                </label>
                <a href="/auth/forgot" className="text-sm underline" style={{ color: 'var(--accent)' }}>{t('forgotPassword')}</a>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary w-full h-12 text-base"
                aria-disabled={isLoading}
              >
                {isLoading ? t('loggingIn') : t('login')}
              </button>
            </form>
          </div>
          <ErrorDialog
            open={errorOpen}
            title={t('loginErrorTitle')}
            description={error || t('loginErrorMsg')}
            details={[
              ...(capsLock ? [t('capsLock')] : []),
              ...errorDetails
            ]}
            onClose={() => setErrorOpen(false)}
          />
          <SuccessDialog
            open={successOpen}
            title="Success!"
            description={t('loginSuccessDialog', { name: identifier ? ` como ${identifier}` : '' })}
            onClose={() => {
              setSuccessOpen(false);
              router.push(next);
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const t = useTranslations('Common');
  return (
    <Suspense fallback={<div className="container-custom py-20 text-center">{t('loading')}</div>}>
      <LoginContent />
    </Suspense>
  );
}

