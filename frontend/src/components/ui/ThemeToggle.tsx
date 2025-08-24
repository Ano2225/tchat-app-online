'use client'

import { useState, useEffect } from 'react'

interface ThemeToggleProps {
  variant?: 'fixed' | 'inline'
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ variant = 'fixed' }) => {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const theme = localStorage.getItem('theme')
    if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDark(true)
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
      setIsDark(false)
    } else {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
      setIsDark(true)
    }
  }

  const className = variant === 'fixed' 
    ? "fixed top-4 right-4 z-50 p-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full shadow-lg hover:bg-white/20 transition-all"
    : "p-2 bg-gray-100/10 hover:bg-gray-100/20 border border-gray-200/20 rounded-xl transition-all duration-200"

  return (
    <button
      onClick={toggleTheme}
      className={className}
      title="Changer le thème"
    >
      {isDark ? (
        <span className="text-lg">☀️</span>
      ) : (
        <span className="text-lg">🌙</span>
      )}
    </button>
  )
}

export default ThemeToggle