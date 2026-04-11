import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Non disponible — BabiChat',
  robots: { index: false, follow: false },
};

export default function NotAvailablePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-sm w-full text-center space-y-6">
        {/* Drapeau CI */}
        <div className="text-6xl select-none">🇨🇮</div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Disponible uniquement en Côte d&apos;Ivoire
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            BabiChat est une plateforme conçue pour la communauté ivoirienne.
            Le service n&apos;est pas accessible depuis votre pays actuellement.
          </p>
        </div>

        <div
          className="rounded-2xl px-6 py-4 text-sm text-gray-600 dark:text-gray-300"
          style={{ background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.15)' }}
        >
          <span className="font-medium" style={{ color: '#7C3AED' }}>BabiChat</span>
          {' '}— Chat, jeux et communauté 🇨🇮
        </div>
      </div>
    </div>
  );
}
