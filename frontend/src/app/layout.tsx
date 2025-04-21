import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "./providers";
import { Toaster } from 'react-hot-toast';



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
        <Toaster/>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
