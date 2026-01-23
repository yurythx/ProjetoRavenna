import { Metadata } from 'next';
import { Suspense } from 'react';
import FavoritosClient from './FavoritosClient';

export const metadata: Metadata = {
    title: 'Meus Favoritos | Ravenna',
    description: 'Artigos que você salvou para ler depois',
};

import { useTranslations } from 'next-intl';

export default function FavoritosPage() {
    const t = useTranslations('Common');
    return (
        <Suspense fallback={<div className="container mx-auto px-4 py-8">{t('loading')}</div>}>
            <FavoritosClient />
        </Suspense>
    );
}
