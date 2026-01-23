import { NextRequest, NextResponse } from 'next/server';

export default function middleware(request: NextRequest) {
    // Apenas continuamos para permitir que o Next.js resolva as rotas normalmente.
    // O locale será resolvido no src/i18n/request.ts via cookies ou configuração do tenant.
    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
