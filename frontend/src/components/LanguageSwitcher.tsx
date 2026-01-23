'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';

export function LanguageSwitcher() {
    const locale = useLocale();
    const router = useRouter();

    const handleLocaleChange = (newLocale: string) => {
        // Set cookie manually if needed, next-intl middleware might handle this
        document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
        router.refresh();
    };

    return (
        <div className="flex items-center gap-2">
            <select
                value={locale}
                onChange={(e) => handleLocaleChange(e.target.value)}
                className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer hover:text-accent transition-colors"
                aria-label="Selecionar idioma"
            >
                <option value="pt-br">PT</option>
                <option value="en">EN</option>
                <option value="es">ES</option>
            </select>
        </div>
    );
}
