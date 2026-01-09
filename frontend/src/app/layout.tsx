import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import { Header } from "@/components/Header";
import { ModuleAlert } from "@/components/ModuleAlert";
import { ToastContainer } from "@/components/ToastContainer";
import { ThemeProvider } from "@/contexts/ThemeContext";

const roboto = Roboto({
  weight: ['300', '400', '500', '700', '900'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: {
    default: "Projeto Ravenna | Gestão Inteligente",
    template: "%s | Projeto Ravenna"
  },
  description: "Projeto Ravenna - Ecossistema completo de gestão e serviços digitais integrados em projetoravenna.cloud.",
  keywords: ["ravenna", "projeto ravenna", "gestão", "módulos", "serviços", "cloud"],
  authors: [{ name: "Projeto Ravenna" }],
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Projeto Ravenna",
    url: "https://projetoravenna.cloud"
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0ea5e9"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className={`${roboto.variable} antialiased min-h-screen flex flex-col`}>
        <ThemeProvider>
          <Providers>
            <ToastContainer />
            <ModuleAlert />
            <Header />
            <main className="flex-1">
              {children}
            </main>
            <footer className="border-t border-border mt-16">
              <div className="container-custom py-8">
                <p className="text-center text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  © {new Date().getFullYear()} Projeto Ravenna. Todos os direitos reservados.
                </p>
              </div>
            </footer>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
