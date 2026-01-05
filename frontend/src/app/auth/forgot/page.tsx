'use client';
import { useState } from 'react';
import { Mail, ArrowRight } from 'lucide-react';
export default function ForgotPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, var(--background) 0%, var(--muted) 50%, var(--background) 100%)' }}>
      <div className="container-custom py-16">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: 'var(--accent)', color: 'white' }}>
              <ArrowRight className="h-4 w-4" />
              <span className="text-sm font-medium">Recuperar acesso</span>
            </div>
            <h1 className="text-3xl font-bold mt-4">Esqueci minha senha</h1>
            <p className="mt-2" style={{ color: 'var(--muted-foreground)' }}>
              Informe seu email para que o administrador possa ajudar na recuperação.
            </p>
          </div>
          <div className="card p-6">
            {sent ? (
              <p className="text-green-600">Solicitação registrada. Aguarde contato do administrador.</p>
            ) : (
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  setSent(true);
                }}
              >
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: 'var(--muted-foreground)' }} />
                  <input
                    type="email"
                    placeholder="Seu email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input pl-12 pr-12 h-12 text-base shadow-sm w-full"
                    required
                  />
                </div>
                <button className="btn btn-primary w-full h-12 text-base">Enviar</button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

