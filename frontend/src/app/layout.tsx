import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "./providers";
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { NotificationProvider } from '@/contexts/NotificationContext';
import Script from 'next/script';



export const metadata: Metadata = {
  title: "BabiChat - Chat en ligne",
  description: "BabiChat - Connecte-toi avec tes potes en temps réel. Chat sécurisé et rapide.",
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        {process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID && (
          <Script
            src={`${process.env.NEXT_PUBLIC_UMAMI_URL || 'http://localhost:3001'}/script.js`}
            data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
            strategy="afterInteractive"
            defer
          />
        )}
      </head>
      <body className="antialiased">
        <ErrorBoundary>
          <NotificationProvider>
            <Toaster/>
            <AuthProvider>{children}</AuthProvider>
          </NotificationProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
