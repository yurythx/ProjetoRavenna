import { Metadata } from 'next';
import { Suspense } from 'react';
import NotificacoesClient from './NotificacoesClient';

export const metadata: Metadata = {
    title: 'Notificações | Ravenna',
    description: 'Suas atualizações e mensagens do sistema',
};

import { useTranslations } from 'next-intl';

export default function NotificacoesPage() {
    const t = useTranslations('Common');
    return (
        <Suspense fallback={<div className="container-custom py-8">{t('loading')}</div>}>
            <NotificacoesClient />
        </Suspense>
    );
}
