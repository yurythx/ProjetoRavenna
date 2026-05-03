import type { Metadata, Viewport } from "next";
import { Exo_2, Rajdhani, JetBrains_Mono } from "next/font/google";
import "./globals.css";

import { AppHeader } from "@/components/app-header";
import { AuthProvider } from "@/components/auth-provider";
import { ErrorBoundary } from "@/components/error-boundary";
import { QueryProvider } from "@/components/query-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster as UiToaster } from "@/components/ui/toaster";
import { ToastProvider } from "@/hooks/use-toast";
import { getSiteBaseUrl } from "@/lib/env";
import { Toaster as SonnerToaster } from "sonner";

const exo2 = Exo_2({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const rajdhani = Rajdhani({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const viewport: Viewport = {
  themeColor: "#050508",
};

export const metadata: Metadata = {
  title: {
    template: "%s | RAVENNA",
    default: "RAVENNA — Portal do Herói",
  },
  description: "Forje sua lenda. O ecossistema completo para o universo Ravenna — portal do jogador, comunidade e lore.",
  metadataBase: new URL(getSiteBaseUrl()),
  openGraph: {
    title: "RAVENNA — Portal do Herói",
    description: "Forje sua lenda.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      data-theme="dark"
      suppressHydrationWarning
      className={`${exo2.variable} ${rajdhani.variable} ${jetbrainsMono.variable} h-full`}
    >
      <head>
        <link rel="alternate" type="application/rss+xml" title="Ravenna — Blog" href="/rss.xml" />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--rv-dark)] text-[var(--rv-text-primary)] antialiased relative">
        {/* Global Ambient Background */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
          <div className="rv-orb rv-animate-pulse-glow" style={{ width: "800px", height: "800px", top: "-10%", right: "-10%", background: "var(--rv-accent)", opacity: 0.12 }} />
          <div className="rv-orb" style={{ width: "600px", height: "600px", bottom: "-10%", left: "-10%", background: "var(--rv-purple)", opacity: 0.08 }} />
        </div>

        <ThemeProvider>
          <AuthProvider>
            <QueryProvider>
              <ToastProvider>
                <AppHeader />
                <main className="relative z-10 flex-1 pt-20">
                  <ErrorBoundary>{children}</ErrorBoundary>
                </main>
                <UiToaster />
                <SonnerToaster
                  richColors
                  theme="dark"
                  toastOptions={{
                    style: {
                      background: "var(--rv-surface)",
                      border: "1px solid var(--rv-border)",
                      color: "var(--rv-text-primary)",
                      fontFamily: "var(--font-display)",
                    },
                  }}
                />
              </ToastProvider>
            </QueryProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
