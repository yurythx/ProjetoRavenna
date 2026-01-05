'use client';

import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div 
          className="min-h-screen flex items-center justify-center p-6"
          style={{ background: 'var(--background)' }}
        >
          <div 
            className="max-w-md w-full text-center p-8 rounded-xl shadow-lg"
            style={{ 
              background: 'var(--card-bg)',
              border: '1px solid var(--border)'
            }}
            role="alert"
            aria-live="assertive"
          >
            <div 
              className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(239, 68, 68, 0.1)' }}
            >
              <AlertTriangle className="w-8 h-8 text-red-500" aria-hidden="true" />
            </div>
            
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
              Algo deu errado
            </h1>
            
            <p className="mb-6" style={{ color: 'var(--muted-foreground)' }}>
              {this.state.error?.message || 'Ocorreu um erro inesperado. Por favor, tente novamente.'}
            </p>
            
            <button
              onClick={this.handleReset}
              className="btn btn-primary flex items-center gap-2 mx-auto"
              aria-label="Tentar novamente"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              Tentar Novamente
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
