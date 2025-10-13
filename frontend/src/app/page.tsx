'use client'

import Link from 'next/link'
import ThemeToggle from '@/components/ui/ThemeToggle'

const NavigationCards = () => {
  const cards = [
    { href: '/login', icon: '🔐', title: 'Connexion', desc: 'Accédez à votre compte', colors: 'from-primary-600 to-primary-500' },
    { href: '/register', icon: '✨', title: 'Inscription', desc: 'Créez votre compte', colors: 'from-secondary-600 to-secondary-500' },
    { href: '/anonymous', icon: '👤', title: 'Anonyme', desc: 'Essayez sans compte', colors: 'from-turquoise-600 to-turquoise-500' }
  ];

  return (
    <div className="grid md:grid-cols-3 gap-6 max-w-2xl mx-auto">
      {cards.map((card) => (
        <Link key={card.href} href={card.href}>
          <div className={`group relative overflow-hidden bg-gradient-to-r ${card.colors} p-6 rounded-2xl hover:scale-105 transition-all duration-300 cursor-pointer shadow-2xl`}>
            <div className="relative z-10">
              <div className="text-3xl mb-3">{card.icon}</div>
              <h3 className="text-white font-bold text-lg mb-2">{card.title}</h3>
              <p className="text-white/80 text-sm">{card.desc}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};

const FeatureCards = () => {
  const features = [
    { icon: '⚡', title: 'Ultra Rapide', desc: 'Tchat en direct avec tes amis' },
    { icon: '🔒', title: 'Sécurisé', desc: 'Tes conversations restent privées' },
    { icon: '🎆', title: 'Fun', desc: 'Ambiance cool et décontractée' }
  ];

  return (
    <div className="mt-16 grid md:grid-cols-3 gap-8 text-center">
      {features.map((feature) => (
        <div key={feature.title} className="text-gray-600 dark:text-gray-300">
          <div className="text-4xl mb-4">{feature.icon}</div>
          <h4 className="text-gray-900 dark:text-white font-semibold mb-2">{feature.title}</h4>
          <p className="text-sm">{feature.desc}</p>
        </div>
      ))}
    </div>
  );
};

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-200 to-gray-100 dark:from-neutral-dark dark:via-gray-900 dark:to-neutral-dark relative overflow-hidden">
      <ThemeToggle />
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500 rounded-full opacity-10"></div>
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-secondary-500 rounded-full opacity-10"></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-primary-600 to-secondary-600 dark:from-white dark:via-primary-100 dark:to-secondary-100 mb-4 tracking-tight">
              TChat
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-primary-500 to-secondary-500 mx-auto rounded-full"></div>
          </div>

          <p className="text-xl text-gray-700 dark:text-gray-300 mb-12 leading-relaxed">
            Le chat des jeunes de 13 à 25 ans en civ !<br/>
            <span className="text-primary-600 dark:text-primary-300">Connecte-toi avec tes potes en temps réel.</span>
          </p>
          
          <NavigationCards />

          <FeatureCards />
        </div>
      </div>
    </div>
  )
}