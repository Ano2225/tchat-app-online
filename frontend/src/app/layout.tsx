import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "./providers";
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import ThemeToggle from '@/components/ui/ThemeToggle';



export const metadata: Metadata = {
  title: "Chat en ligne - Discutez avec vos amis",
  description: "Rejoignez des salons de discussion anonymes ou avec authentification. Partagez vos idées, discutez en temps réel et vivez des échanges passionnants.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body 
      >
        <ErrorBoundary>
          <ThemeToggle />
          <Toaster/>
          <AuthProvider>{children}</AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
