'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

type Placement = 'center' | 'right' | 'left' | 'top' | 'bottom';

interface Step {
  target: string | null;
  placement: Placement;
  icon: string;
  title: string;
  description: string;
  tip?: string;
}

const STEPS: Step[] = [
  {
    target: null,
    placement: 'center',
    icon: '🇨🇮',
    title: 'Bienvenue sur BabiChat !',
    description:
      'La première plateforme de chat communautaire pensée pour les Ivoiriens. Discute en temps réel, joue au quiz et connecte-toi avec des milliers de personnes de chez toi.',
  },
  {
    target: '[data-tour="channels"]',
    placement: 'right',
    icon: '💬',
    title: 'Les salons de discussion',
    description:
      'Choisis un salon ici — Général, Musique, Sport… Chaque salon est une communauté active. Rejoins la conversation et présente-toi !',
    tip: 'Commence par le salon Général, le plus actif.',
  },
  {
    target: '[data-tour="users"]',
    placement: 'left',
    icon: '💌',
    title: 'Messages privés',
    description:
      'Clique sur le pseudo ou l\'avatar d\'un utilisateur dans cette liste pour lui envoyer un message privé. La conversation reste visible uniquement entre vous deux.',
  },
  {
    target: '[data-tour="profile"]',
    placement: 'bottom',
    icon: '😊',
    title: 'Ton statut du jour',
    description:
      'Clique ici pour accéder à ton profil. Tu peux y définir un statut visible par tous — dis aux autres ce que tu fais en ce moment !',
    tip: '"En cours d\'exam 😤", "Dispo pour causer 👋", "Au bureau 💼"…',
  },
  {
    target: '[data-tour="chat-input"]',
    placement: 'top',
    icon: '🔔',
    title: 'Taguer quelqu\'un dans le chat',
    description:
      'Tape @ suivi du pseudo d\'un utilisateur pour le mentionner ici. Il recevra une notification et ton message sera mis en évidence pour lui.',
    tip: 'Ex : "@Koné tu as vu le match ?" — il sera notifié même s\'il ne regarde pas.',
  },
  {
    target: '[data-tour="game-channel"]',
    placement: 'right',
    icon: '🎮',
    title: 'Le Quiz en direct',
    description:
      'Rejoins ce salon pour participer au quiz communautaire en temps réel. Une question toutes les 15 secondes — réponds A, B, C ou D dans le chat pour marquer des points !',
  },
];

const TOOLTIP_W = 340;
const GAP = 14;
const PAD = 10;

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function measureTarget(selector: string): SpotlightRect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return {
    top: r.top - PAD,
    left: r.left - PAD,
    width: r.width + PAD * 2,
    height: r.height + PAD * 2,
  };
}

function tooltipStyle(rect: SpotlightRect, placement: Placement): React.CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const base: React.CSSProperties = { position: 'fixed', width: TOOLTIP_W, zIndex: 9003 };

  const clampTop = (v: number) => Math.max(8, Math.min(vh - 320, v));
  const clampLeft = (v: number) => Math.max(8, Math.min(vw - TOOLTIP_W - 8, v));

  switch (placement) {
    case 'right':
      return { ...base, top: clampTop(rect.top + rect.height / 2 - 160), left: rect.left + rect.width + GAP };
    case 'left':
      return { ...base, top: clampTop(rect.top + rect.height / 2 - 160), right: vw - rect.left + GAP };
    case 'bottom':
      return { ...base, top: rect.top + rect.height + GAP, left: clampLeft(rect.left + rect.width / 2 - TOOLTIP_W / 2) };
    case 'top':
      return { ...base, bottom: vh - rect.top + GAP, left: clampLeft(rect.left + rect.width / 2 - TOOLTIP_W / 2) };
    default:
      return base;
  }
}

interface Props {
  onClose: () => void;
}

const OnboardingModal: React.FC<Props> = ({ onClose }) => {
  const [step, setStep] = useState(0);
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const updateSpotlight = useCallback(() => {
    if (!current.target) { setSpotlight(null); return; }
    setSpotlight(measureTarget(current.target));
  }, [current.target]);

  useEffect(() => {
    // Small delay so layout is stable before measuring
    const t = setTimeout(updateSpotlight, 80);
    window.addEventListener('resize', updateSpotlight);
    return () => { clearTimeout(t); window.removeEventListener('resize', updateSpotlight); };
  }, [updateSpotlight]);

  const goNext = () => { if (isLast) { onClose(); return; } setStep(s => s + 1); };
  const goPrev = () => setStep(s => s - 1);

  const isCentered = current.placement === 'center' || !spotlight;

  const tooltipCard = (
    <div
      className="rounded-2xl overflow-hidden flex flex-col animate-in fade-in-0 zoom-in-95 duration-200"
      style={{
        background: 'var(--bg-panel)',
        border: '2px solid var(--accent)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
        width: isCentered ? 'min(440px, calc(100vw - 2rem))' : TOOLTIP_W,
      }}
    >
      {/* Progress bar */}
      <div className="h-1 w-full" style={{ background: 'var(--border-subtle)' }}>
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${((step + 1) / STEPS.length) * 100}%`, background: 'var(--accent)' }}
        />
      </div>

      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-xl z-10"
        style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
        aria-label="Fermer"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Content */}
      <div className={`px-5 pt-6 pb-4 flex flex-col gap-3 ${isCentered ? 'items-center text-center' : 'items-start'}`}>
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
          style={{ background: 'var(--accent-dim)', border: '1px solid var(--border-default)' }}
        >
          {current.icon}
        </div>

        <div className={isCentered ? 'text-center' : ''}>
          <p className="text-[11px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
            {step + 1} / {STEPS.length}
          </p>
          <h2 className="text-base font-bold leading-snug" style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-primary)' }}>
            {current.title}
          </h2>
        </div>

        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {current.description}
        </p>

        {current.tip && (
          <div
            className="w-full rounded-xl px-3 py-2 text-xs"
            style={{ background: 'var(--accent-dim)', border: '1px solid var(--border-default)' }}
          >
            <span className="font-semibold" style={{ color: 'var(--accent-text)' }}>💡 </span>
            <span style={{ color: 'var(--text-secondary)' }}>{current.tip}</span>
          </div>
        )}
      </div>

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-1.5 pb-1">
        {STEPS.map((_, i) => (
          <button
            key={i}
            onClick={() => setStep(i)}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === step ? '18px' : '6px',
              height: '6px',
              background: i === step ? 'var(--accent)' : 'var(--border-default)',
            }}
            aria-label={`Étape ${i + 1}`}
          />
        ))}
      </div>

      {/* Actions */}
      <div
        className="flex items-center justify-between gap-3 px-5 py-3"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        {step > 0 ? (
          <button
            onClick={goPrev}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Précédent
          </button>
        ) : (
          <button
            onClick={onClose}
            className="text-sm transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}
          >
            Passer
          </button>
        )}

        <button
          onClick={goNext}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
          style={{ background: 'var(--accent)', boxShadow: '0 2px 10px var(--accent-glow)' }}
        >
          {isLast ? 'Commencer ✨' : <><span>Suivant</span><ChevronRight className="w-3.5 h-3.5" /></>}
        </button>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      {/* Overlay sombre — uniquement quand pas de spotlight (étape centrée) */}
      {!spotlight && (
        <div className="fixed inset-0" style={{ zIndex: 9000, background: 'rgba(0,0,0,0.65)' }} />
      )}

      {/* Spotlight — son box-shadow joue le rôle d'overlay ET met en valeur la zone */}
      {spotlight && (
        <div
          style={{
            position: 'fixed',
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
            borderRadius: 14,
            zIndex: 9001,
            pointerEvents: 'none',
            boxShadow: `0 0 0 9999px rgba(0,0,0,0.65), 0 0 0 3px var(--accent)`,
            transition: 'all 0.35s cubic-bezier(.4,0,.2,1)',
          }}
        />
      )}

      {/* Tooltip / Card */}
      {isCentered ? (
        // Centré (étape welcome ou fallback mobile)
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 9002 }}>
          <div className="relative">{tooltipCard}</div>
        </div>
      ) : (
        // Positionné à côté du spotlight
        <div className="relative" style={{ ...tooltipStyle(spotlight!, current.placement), zIndex: 9002 }}>
          {tooltipCard}
        </div>
      )}
    </>,
    document.body
  );
};

export default OnboardingModal;
