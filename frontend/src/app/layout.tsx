import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "./providers";
import { Header } from "@/components/Header";
import { ModuleAlert } from "@/components/ModuleAlert";
import { ToastContainer } from "@/components/ToastContainer";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { DynamicBranding } from "@/components/DynamicBranding";
import { getTenantConfig } from "@/services/tenant";
import { cookies } from "next/headers";

// Usando fontes do sistema para evitar dependência de Google Fonts
const fontClass = "font-sans";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getTenantConfig();

  const title = config?.brand_name || "Projeto Ravenna";
  const description = config?.footer_text || "Gestão Inteligente";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://projetoravenna.cloud";

  return {
    title: {
      default: `${title} | Gestão Inteligente`,
      template: `%s | ${title}`
    },
    description: description,
    icons: config?.favicon ? [{ rel: "icon", url: config.favicon }] : undefined,
    metadataBase: new URL(siteUrl),
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0ea5e9"
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = await getTenantConfig();
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get('theme')?.value;
  const initialThemeClass = themeCookie === 'dark' ? 'dark' : themeCookie === 'light' ? '' : '';
  return (
    <html lang="pt-BR" suppressHydrationWarning data-scroll-behavior="smooth" className={initialThemeClass}>
      <head>
        <style dangerouslySetInnerHTML={{
          __html: `
            :root {
              ${config?.primary_color ? `--brand-primary: ${config.primary_color};` : ''}
              ${config?.secondary_color ? `--brand-secondary: ${config.secondary_color};` : ''}
              ${config?.primary_color_dark ? `--brand-primary-dark: ${config.primary_color_dark};` : ''}
              ${config?.secondary_color_dark ? `--brand-secondary-dark: ${config.secondary_color_dark};` : ''}
              
              /* Alias for backward compatibility if needed */
              --django-green-primary: var(--brand-primary);
              --django-green-dark: var(--brand-secondary);
            }
          `
        }} />
      </head>
      <body
        className={`${fontClass} antialiased min-h-screen flex flex-col`}
      >
        <ThemeProvider>
          <Providers>
            <DynamicBranding />
            <ToastContainer />
            <ModuleAlert />
            <Header logoUrl={config?.logo || undefined} brandName={config?.brand_name || undefined} />
            <main className="flex-1">
              {children}
            </main>
            <footer className="border-t border-border mt-16">
              <div className="container-custom py-8">
                <p className="text-center text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  © {new Date().getFullYear()} {config?.brand_name || "Projeto Ravenna"}. {config?.footer_text}
                </p>
              </div>
            </footer>
          </Providers>
        </ThemeProvider>
      </body>
    </html >
  );
}
