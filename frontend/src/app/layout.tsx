import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "./providers";
import { Header } from "@/components/Header";
import { ModuleAlert } from "@/components/ModuleAlert";
import { ToastContainer } from "@/components/ToastContainer";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { getTenantConfig } from "@/services/tenant";

// Usando fontes do sistema para evitar dependência de Google Fonts
const fontClass = "font-sans";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getTenantConfig();

  const title = config?.brand_name || "Projeto Ravenna";
  const description = config?.footer_text || "Gestão Inteligente";

  return {
    title: {
      default: `${title} | Gestão Inteligente`,
      template: `%s | ${title}`
    },
    description: description,
    icons: config?.favicon ? [{ rel: "icon", url: config.favicon }] : undefined,
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

  // Construct dynamic CSS variables for light and dark modes
  const dynamicStyles = config ? `
    :root {
      --brand-primary: ${config.primary_color};
      --brand-secondary: ${config.secondary_color};
      --brand-primary-dark: ${config.primary_color_dark};
      --brand-secondary-dark: ${config.secondary_color_dark};
    }
  ` : '';

  return (
    <html lang="pt-BR" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        {dynamicStyles && (
          <style dangerouslySetInnerHTML={{ __html: dynamicStyles }} />
        )}
      </head>
      <body
        className={`${fontClass} antialiased min-h-screen flex flex-col`}
      >
        <ThemeProvider>
          <Providers>
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
    </html>
  );
}
