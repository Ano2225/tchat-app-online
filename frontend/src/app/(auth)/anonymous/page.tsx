'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { handleError } from '@/utils/errorHandler'
import { User, Theater, Calendar, Info } from 'lucide-react'

export default function AnonymousPage() {
  const [formData, setFormData] = useState({
    username: '',
    age: '',
    sexe: ''
  })
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    if (!formData.username.trim()) {
      toast.error('Veuillez entrer un nom d\'utilisateur')
      return
    }

    if (formData.username.trim().length < 3) {
      toast.error('Le nom d\'utilisateur doit contenir au moins 3 caractères')
      return
    }

    if (formData.username.trim().length > 20) {
      toast.error('Le nom d\'utilisateur ne peut pas dépasser 20 caractères')
      return
    }

    const age = parseInt(formData.age)
    if (!formData.age || isNaN(age) || age < 18 || age > 28) {
      toast.error('Veuillez entrer un âge valide (18-28 ans)')
      return
    }

    setLoading(true)

    try {
      const authStore = useAuthStore.getState()
      const result = await authStore.signInAnonymous(formData.username.trim(), {
        age: formData.age ? parseInt(formData.age) : undefined,
        sexe: formData.sexe || 'autre',
      })

      if (result.success) {
        toast.success('Connexion anonyme réussie!')
        router.push('/chat')
      } else {
        toast.error(result.error || 'Erreur de connexion')
      }
    } catch (err: unknown) {
      handleError(err)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
    color: 'var(--text-primary)',
  }

  return (
    <main
      className="min-h-[100dvh] flex flex-col items-center justify-center p-4 py-8 relative"
      style={{ background: 'var(--bg-base)' }}
    >
      <header className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-end">
        <ThemeToggle variant="inline" />
      </header>

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/3 w-64 h-64 sm:w-96 sm:h-96 rounded-full filter blur-3xl opacity-15 animate-pulse" style={{ background: 'var(--text-muted)' }} />
        <div className="absolute bottom-1/3 right-1/3 w-64 h-64 sm:w-96 sm:h-96 rounded-full filter blur-3xl opacity-10 animate-pulse" style={{ background: 'var(--text-muted)', animationDelay: '1s' }} />
      </div>

      <div className="relative w-full max-w-md">
        <div
          className="rounded-3xl p-5 sm:p-8"
          style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-xl)' }}
        >
          <div className="text-center mb-5">
            <div
              className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mx-auto mb-3"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)' }}
            >
              <User className="w-6 h-6 sm:w-7 sm:h-7" style={{ color: 'var(--text-secondary)' }} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-primary)' }}>
              Mode Anonyme
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Chattez sans créer de compte</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-secondary)' }}>
                Choisissez un pseudo
              </label>
              <div className="relative">
                <input
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Votre pseudo temporaire"
                  className="w-full rounded-xl pl-10 py-3 text-sm focus:outline-none transition-all"
                  style={inputStyle}
                  required
                  minLength={3}
                  maxLength={20}
                />
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Theater className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>
              <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>Entre 3 et 20 caractères</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-secondary)' }}>
                Votre âge
              </label>
              <div className="relative">
                <input
                  name="age"
                  type="number"
                  value={formData.age}
                  onChange={handleChange}
                  placeholder="18"
                  className="w-full rounded-xl pl-10 py-3 text-sm focus:outline-none transition-all"
                  style={inputStyle}
                  required
                  min="18"
                  max="28"
                />
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Calendar className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>
              <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>Âge requis : 18 à 28 ans</p>
            </div>

            <div>
              <label htmlFor="anon-sexe" className="block text-sm font-medium mb-2" style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-secondary)' }}>
                Votre sexe
              </label>
              <select
                id="anon-sexe"
                name="sexe"
                value={formData.sexe}
                onChange={handleChange}
                className="w-full rounded-xl px-3 py-3 text-sm focus:outline-none transition-all"
                style={inputStyle}
              >
                <option value="">Sélectionnez</option>
                <option value="homme">Homme</option>
                <option value="femme">Femme</option>
                <option value="autre">Autre</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] mt-2"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)', fontFamily: 'var(--font-ui)' }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Connexion…
                </>
              ) : 'Commencer à chatter'}
            </button>
          </form>

          <div className="mt-5 text-center space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Ou</span>
              <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
            </div>

            <div className="space-y-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
              <p>
                Vous avez un compte ?{' '}
                <Link href="/login" className="font-medium hover:underline" style={{ color: 'var(--accent-text)' }}>Se connecter</Link>
              </p>
              <p>
                <Link href="/register" className="font-medium hover:underline" style={{ color: 'var(--accent-text)' }}>Créer un compte permanent</Link>
              </p>
            </div>
          </div>

          <div
            className="mt-5 p-3 rounded-xl flex items-start gap-3"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
          >
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Vos messages ne seront pas sauvegardés. Créez un compte pour conserver votre historique.
            </p>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link href="/" className="text-sm transition-colors hover:underline" style={{ color: 'var(--text-muted)' }}>
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </main>
  )
}