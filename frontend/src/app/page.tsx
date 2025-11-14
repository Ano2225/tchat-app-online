'use client'

import Link from 'next/link'
import ThemeToggle from '@/components/ui/ThemeToggle'

export default function Home() {
  const cards = [
    { href: '/login', icon: '🔐', title: 'Connexion', desc: 'Accédez à votre compte', colors: 'from-blue-600 to-blue-500' },
    { href: '/register', icon: '✨', title: 'Inscription', desc: 'Créez votre compte', colors: 'from-purple-600 to-purple-500' },
    { href: '/anonymous', icon: '👤', title: 'Anonyme', desc: 'Essayez sans compte', colors: 'from-gray-700 to-gray-600' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 relative overflow-hidden">
      {/* Header avec ThemeToggle */}
      <header className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-end">
        <ThemeToggle variant="inline" />
      </header>
      
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>
      
      <div className="relative min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-4xl mx-auto">
          {/* Logo */}
          <div className="mb-8">
            <h1 className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 mb-4">
              BabiChat
            </h1>
            <p className="text-xl text-gray-700 dark:text-gray-300 mb-2">
              Connecte-toi avec tes potes en temps réel
            </p>
          </div>
          
          {/* Navigation Cards */}
          <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto mb-12">
            {cards.map((card) => (
              <Link key={card.href} href={card.href}>
                <div className={`bg-gradient-to-r ${card.colors} p-6 rounded-2xl hover:scale-105 transition-transform duration-200 shadow-lg`}>
                  <div className="text-4xl mb-3">{card.icon}</div>
                  <h3 className="text-white font-bold text-lg mb-2">{card.title}</h3>
                  <p className="text-white/90 text-sm">{card.desc}</p>
                </div>
              </Link>
            ))}
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div className="p-4">
              <div className="text-3xl mb-2">⚡</div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Ultra Rapide</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Messages instantanés</p>
            </div>
            <div className="p-4">
              <div className="text-3xl mb-2">🔒</div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Sécurisé</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Conversations privées</p>
            </div>
            <div className="p-4">
              <div className="text-3xl mb-2">🎉</div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Fun</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Ambiance cool</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}