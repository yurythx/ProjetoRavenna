import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Projeto Ravenna",
  description: "Portal do jogador - Projeto Ravenna",
  metadataBase: new URL(getSiteBaseUrl()),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="alternate" type="application/rss+xml" title="Projeto Ravenna - Blog" href="/rss.xml" />
        <script
          id="theme-init"
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var k='ravenna.theme';var t=localStorage.getItem(k)||'system';var r=document.documentElement;if(t==='light'||t==='dark'){r.dataset.theme=t}else{delete r.dataset.theme}}catch(e){}})();",
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <AuthProvider>
            <QueryProvider>
              <ToastProvider>
                <AppHeader />
                <main className="flex-1 pt-20">
                  <ErrorBoundary>{children}</ErrorBoundary>
                </main>
                <UiToaster />
                <SonnerToaster richColors />
              </ToastProvider>
            </QueryProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
