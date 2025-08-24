'use client'

import Link from 'next/link'
import ThemeToggle from '@/components/ui/ThemeToggle'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-200 to-gray-100 dark:from-neutral-dark dark:via-gray-900 dark:to-neutral-dark relative overflow-hidden">
      <ThemeToggle />
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-secondary-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-turquoise-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-500"></div>
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
          
          <div className="grid md:grid-cols-3 gap-6 max-w-2xl mx-auto">
            <Link href="/login">
              <div className="group relative overflow-hidden bg-gradient-to-r from-primary-600 to-primary-500 p-6 rounded-2xl hover:scale-105 transition-all duration-300 cursor-pointer shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-primary-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative z-10">
                  <div className="text-3xl mb-3">🔐</div>
                  <h3 className="text-white font-bold text-lg mb-2">Connexion</h3>
                  <p className="text-primary-100 text-sm">Accédez à votre compte</p>
                </div>
              </div>
            </Link>
            
            <Link href="/register">
              <div className="group relative overflow-hidden bg-gradient-to-r from-secondary-600 to-secondary-500 p-6 rounded-2xl hover:scale-105 transition-all duration-300 cursor-pointer shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-r from-secondary-500 to-secondary-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative z-10">
                  <div className="text-3xl mb-3">✨</div>
                  <h3 className="text-white font-bold text-lg mb-2">Inscription</h3>
                  <p className="text-secondary-100 text-sm">Créez votre compte</p>
                </div>
              </div>
            </Link>
            
            <Link href="/anonymous">
              <div className="group relative overflow-hidden bg-gradient-to-r from-turquoise-600 to-turquoise-500 p-6 rounded-2xl hover:scale-105 transition-all duration-300 cursor-pointer shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-r from-turquoise-500 to-turquoise-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative z-10">
                  <div className="text-3xl mb-3">👤</div>
                  <h3 className="text-white font-bold text-lg mb-2">Anonyme</h3>
                  <p className="text-turquoise-100 text-sm">Essayez sans compte</p>
                </div>
              </div>
            </Link>
          </div>

          <div className="mt-16 grid md:grid-cols-3 gap-8 text-center">
            <div className="text-gray-600 dark:text-gray-300">
              <div className="text-4xl mb-4">⚡</div>
              <h4 className="text-gray-900 dark:text-white font-semibold mb-2">Ultra Rapide</h4>
              <p className="text-sm">Tchat en direct avec tes amis</p>
            </div>
            <div className="text-gray-600 dark:text-gray-300">
              <div className="text-4xl mb-4">🔒</div>
              <h4 className="text-gray-900 dark:text-white font-semibold mb-2">Sécurisé</h4>
              <p className="text-sm">Tes conversations restent privées</p>
            </div>
            <div className="text-gray-600 dark:text-gray-300">
              <div className="text-4xl mb-4">🎆</div>
              <h4 className="text-gray-900 dark:text-white font-semibold mb-2">Fun</h4>
              <p className="text-sm">Ambiance cool et décontractée</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}