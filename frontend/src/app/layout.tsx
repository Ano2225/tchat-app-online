import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "./providers";
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from '@/components/ui/ErrorBoundary';



export const metadata: Metadata = {
  title: "BabiChat - Chat en ligne",
  description: "BabiChat - Connecte-toi avec tes potes en temps réel. Chat sécurisé et rapide.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">
        <ErrorBoundary>
          <Toaster/>
          <AuthProvider>{children}</AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
