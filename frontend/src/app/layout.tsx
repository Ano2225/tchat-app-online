import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Outfit, DM_Sans } from 'next/font/google';
import AuthProvider from "./providers";
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { NotificationProvider } from '@/contexts/NotificationContext';
import Script from 'next/script';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-outfit',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-dm-sans',
  display: 'swap',
});



export const metadata: Metadata = {
  title: "BabiChat - Chat en ligne",
  description: "BabiChat - Connecte-toi avec tes potes en temps réel. Chat sécurisé et rapide.",
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" data-scroll-behavior="smooth">
      <head>
        {/* Theme init: runs before first paint — prevents flash of wrong theme */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme:dark)').matches;if(t==='dark'||(t===null&&d))document.documentElement.classList.add('dark')}catch(e){}})()` }} />
        {/* Preconnect to backend so the first API/socket call pays no DNS+TCP cost */}
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8000'} />
        {process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID && (
          <Script
            src={`${process.env.NEXT_PUBLIC_UMAMI_URL || 'http://localhost:3001'}/script.js`}
            data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
            strategy="afterInteractive"
            defer
          />
        )}
      </head>
      <body className={`antialiased ${outfit.variable} ${dmSans.variable}`}>
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
