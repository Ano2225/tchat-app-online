import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Outfit, DM_Sans } from 'next/font/google';
import Script from 'next/script';

const themeScript = `(function(){try{var t=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme:dark)').matches;if(t==='dark'||(t===null&&d))document.documentElement.classList.add('dark')}catch(e){}})();`

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-outfit',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-dm-sans',
  display: 'swap',
});



export const metadata: Metadata = {
  title: "BabiChat – Le tchat 100% ivoirien",
  description: "BabiChat est le premier tchat en ligne dédié à la Côte d'Ivoire. Connecte-toi avec des jeunes ivoiriens, discute en temps réel, joue au quiz et envoie des messages privés. Gratuit, sans inscription obligatoire.",
  keywords: "chat Côte d'Ivoire, tchat ivoirien, chat CI, babichat, chat en ligne Abidjan, tchat gratuit Côte d'Ivoire, chat Abidjan, tchat CI, messagerie Côte d'Ivoire, chat ivoirien gratuit, discussion en ligne Côte d'Ivoire",
  openGraph: {
    title: "BabiChat – Le tchat 100% ivoirien",
    description: "Connecte-toi avec des jeunes ivoiriens en temps réel. Chat, quiz, messages privés. Gratuit et sans inscription.",
    type: "website",
    locale: "fr_CI",
  },
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
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Theme init: runs before first paint — prevents flash of wrong theme.
            Native <script> in a Server Component is serialized as raw HTML by the
            server and executed by the browser before React hydration, so React never
            "sees" it as a component node. suppressHydrationWarning silences the
            mismatch check on this element. */}
        {/* eslint-disable-next-line @next/next/no-before-interactive-script-component */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} suppressHydrationWarning />
        {/* Preconnect to backend so the first API/socket call pays no DNS+TCP cost */}
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8000'} />
      </head>
      <body className={`antialiased ${outfit.variable} ${dmSans.variable}`}>
        {process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID && (
          <Script
            src={`${process.env.NEXT_PUBLIC_UMAMI_URL || 'http://localhost:3001'}/script.js`}
            data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
            strategy="afterInteractive"
            defer
          />
        )}
        {children}
      </body>
    </html>
  );
}
