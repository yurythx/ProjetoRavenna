import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { getTenantConfig } from '../services/tenant';

export default getRequestConfig(async () => {
    const cookieStore = await cookies();
    const locale = cookieStore.get('NEXT_LOCALE')?.value || (await getTenantConfig())?.default_language || 'pt-br';

    return {
        locale,
        messages: (await import(`../../messages/${locale}.json`)).default
    };
});
