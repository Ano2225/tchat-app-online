'use client';

import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

const STEPS = [
  {
    icon: '🇨🇮',
    title: 'Bienvenue sur BabiChat !',
    description:
      'La première plateforme de chat communautaire pensée pour les Ivoiriens. Discute en temps réel, joue au quiz et connecte-toi avec des milliers de personnes de chez toi.',
  },
  {
    icon: '💬',
    title: 'Les salons de discussion',
    description:
      'Choisis un salon dans la colonne de gauche — Général, Musique, Sport… Chaque salon est une communauté active. Rejoins la conversation et présente-toi !',
    tip: 'Commence par le salon Général, le plus actif.',
  },
  {
    icon: '💌',
    title: 'Messages privés',
    description:
      'Clique sur l\'avatar d\'un utilisateur dans la liste à droite pour lui envoyer un message privé. La conversation reste visible uniquement entre vous deux.',
    tip: 'Tu peux aussi cliquer sur un avatar dans le chat.',
  },
  {
    icon: '😊',
    title: 'Ton statut du jour',
    description:
      'Clique sur ton pseudo en haut → Profil → champ Statut. Dis aux autres ce que tu fais en ce moment. Les utilisateurs voient ton statut dans la liste en direct.',
    tip: '"En cours d\'exam 😤", "Dispo pour causer 👋", "Au bureau 💼"…',
  },
  {
    icon: '🎮',
    title: 'Le Quiz en direct',
    description:
      'Rejoins le salon "Game" pour participer au quiz communautaire en temps réel. Une question toutes les 15 secondes — réponds A, B, C ou D dans le chat pour marquer des points !',
  },
];

interface Props {
  onClose: () => void;
}

const OnboardingModal: React.FC<Props> = ({ onClose }) => {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9000]"
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
      />

      {/* Card */}
      <div
        className="fixed z-[9001] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md mx-4"
        style={{ width: 'min(440px, calc(100vw - 2rem))' }}
      >
        <div
          className="relative rounded-2xl overflow-hidden flex flex-col"
          style={{
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-default)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
          }}
        >
          {/* Progress bar */}
          <div className="h-1 w-full" style={{ background: 'var(--border-subtle)' }}>
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${((step + 1) / STEPS.length) * 100}%`,
                background: 'var(--accent)',
              }}
            />
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-xl transition-all z-10"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Content */}
          <div className="px-8 pt-10 pb-6 text-center flex flex-col items-center gap-4">
            {/* Icon */}
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl flex-shrink-0"
              style={{ background: 'var(--accent-dim)', border: '1px solid var(--border-default)' }}
            >
              {current.icon}
            </div>

            {/* Step counter */}
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>
              {step + 1} / {STEPS.length}
            </p>

            {/* Title */}
            <h2
              className="text-xl font-bold leading-snug"
              style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-primary)' }}
            >
              {current.title}
            </h2>

            {/* Description */}
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {current.description}
            </p>

            {/* Tip */}
            {current.tip && (
              <div
                className="w-full rounded-xl px-4 py-3 text-sm text-left"
                style={{ background: 'var(--accent-dim)', border: '1px solid var(--border-default)' }}
              >
                <span className="font-semibold" style={{ color: 'var(--accent-text)' }}>💡 </span>
                <span style={{ color: 'var(--text-secondary)' }}>{current.tip}</span>
              </div>
            )}
          </div>

          {/* Dot indicators */}
          <div className="flex items-center justify-center gap-1.5 pb-2">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === step ? '20px' : '6px',
                  height: '6px',
                  background: i === step ? 'var(--accent)' : 'var(--border-default)',
                }}
                aria-label={`Étape ${i + 1}`}
              />
            ))}
          </div>

          {/* Actions */}
          <div
            className="flex items-center justify-between gap-3 px-6 py-4"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            {/* Prev / Passer */}
            {step > 0 ? (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
              >
                <ChevronLeft className="w-4 h-4" />
                Précédent
              </button>
            ) : (
              <button
                onClick={onClose}
                className="text-sm transition-opacity hover:opacity-70"
                style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}
              >
                Passer
              </button>
            )}

            {/* Next / Finish */}
            <button
              onClick={() => {
                if (isLast) { onClose(); return; }
                setStep(s => s + 1);
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
              style={{ background: 'var(--accent)', boxShadow: '0 2px 12px var(--accent-glow)' }}
            >
              {isLast ? 'Commencer ✨' : (
                <>
                  Suivant
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default OnboardingModal;
