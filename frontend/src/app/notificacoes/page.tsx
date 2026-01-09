import { Metadata } from 'next';
import { Suspense } from 'react';
import NotificacoesClient from './NotificacoesClient';

export const metadata: Metadata = {
    title: 'Notificações | Ravenna',
    description: 'Suas atualizações e mensagens do sistema',
};

export default function NotificacoesPage() {
    return (
        <Suspense fallback={<div className="container-custom py-8">Carregando...</div>}>
            <NotificacoesClient />
        </Suspense>
    );
}
