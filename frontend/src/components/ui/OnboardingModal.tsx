'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

type Placement = 'center' | 'right' | 'left' | 'top' | 'bottom';
type SpotlightPad = number | { top?: number; right?: number; bottom?: number; left?: number };

interface Step {
  target: string | null;
  mobileTarget?: string | null;
  placement: Placement;
  spotlightPad?: SpotlightPad;
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
    mobileTarget: '[data-tour="mobile-channels"]',
    spotlightPad: { top: 6, right: 4, bottom: 6, left: 4 },
    placement: 'right',
    icon: '💬',
    title: 'Les salons de discussion',
    description:
      'Choisis un salon ici — Général, Musique, Sport… Chaque salon est une communauté active. Rejoins la conversation et présente-toi !',
    tip: 'Commence par le salon Général, le plus actif.',
  },
  {
    target: '[data-tour="users"]',
    mobileTarget: '[data-tour="mobile-users"]',
    placement: 'left',
    icon: '💌',
    title: 'Messages privés',
    description:
      'Clique sur le pseudo ou l\'avatar d\'un utilisateur dans cette liste pour lui envoyer un message privé. La conversation reste visible uniquement entre vous deux.',
  },
  {
    target: '[data-tour="profile-summary"]',
    placement: 'bottom',
    spotlightPad: { top: 6, right: 8, bottom: 3, left: 8 },
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
    target: '[data-tour="game-channel-summary"]',
    mobileTarget: null,
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
const DESKTOP_BREAKPOINT = 1024;
const TOOLTIP_H = 340;

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function resolvePad(pad?: SpotlightPad) {
  if (typeof pad === 'number') {
    return { top: pad, right: pad, bottom: pad, left: pad };
  }
  return {
    top: pad?.top ?? PAD,
    right: pad?.right ?? PAD,
    bottom: pad?.bottom ?? PAD,
    left: pad?.left ?? PAD,
  };
}

function getViewportSize() {
  const viewport = window.visualViewport;
  return {
    vw: viewport?.width ?? window.innerWidth,
    vh: viewport?.height ?? window.innerHeight,
  };
}

function measureTarget(selector: string, pad?: SpotlightPad): SpotlightRect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const { vw, vh } = getViewportSize();
  const isOutsideViewport = r.bottom <= 0 || r.top >= vh || r.right <= 0 || r.left >= vw;
  if ((r.width === 0 && r.height === 0) || isOutsideViewport) return null;
  const resolvedPad = resolvePad(pad);
  const top = Math.max(8, r.top - resolvedPad.top);
  const left = Math.max(8, r.left - resolvedPad.left);
  return {
    top,
    left,
    width: Math.max(16, Math.min(r.width + resolvedPad.left + resolvedPad.right, vw - left - 8)),
    height: Math.max(16, Math.min(r.height + resolvedPad.top + resolvedPad.bottom, vh - top - 8)),
  };
}

function tooltipStyle(rect: SpotlightRect, placement: Placement): React.CSSProperties {
  const { vw, vh } = getViewportSize();
  const base: React.CSSProperties = { position: 'fixed', width: TOOLTIP_W, zIndex: 9003 };

  const clampTop = (v: number) => Math.max(8, Math.min(vh - TOOLTIP_H - 8, v));
  const clampLeft = (v: number) => Math.max(8, Math.min(vw - TOOLTIP_W - 8, v));

  switch (placement) {
    case 'right':
      return {
        ...base,
        top: clampTop(rect.top + rect.height / 2 - TOOLTIP_H / 2),
        left: clampLeft(rect.left + rect.width + GAP),
      };
    case 'left':
      return {
        ...base,
        top: clampTop(rect.top + rect.height / 2 - TOOLTIP_H / 2),
        left: clampLeft(rect.left - TOOLTIP_W - GAP),
      };
    case 'bottom':
      return {
        ...base,
        top: clampTop(rect.top + rect.height + GAP),
        left: clampLeft(rect.left + rect.width / 2 - TOOLTIP_W / 2),
      };
    case 'top':
      return {
        ...base,
        top: clampTop(rect.top - TOOLTIP_H - GAP),
        left: clampLeft(rect.left + rect.width / 2 - TOOLTIP_W / 2),
      };
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
  const [isMobile, setIsMobile] = useState(false);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const updateSpotlight = useCallback(() => {
    const { vw } = getViewportSize();
    const mobile = vw < DESKTOP_BREAKPOINT;
    const target = mobile
      ? (current.mobileTarget === undefined ? current.target : current.mobileTarget)
      : current.target;
    setIsMobile(mobile);
    if (!target) {
      setSpotlight(null);
      return;
    }
    setSpotlight(measureTarget(target, current.spotlightPad));
  }, [current.mobileTarget, current.spotlightPad, current.target]);

  useEffect(() => {
    // Small delay so layout is stable before measuring
    const t = setTimeout(updateSpotlight, 80);
    window.addEventListener('resize', updateSpotlight);
    window.addEventListener('scroll', updateSpotlight, true);
    const viewport = window.visualViewport;
    viewport?.addEventListener('resize', updateSpotlight);
    viewport?.addEventListener('scroll', updateSpotlight);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', updateSpotlight);
      window.removeEventListener('scroll', updateSpotlight, true);
      viewport?.removeEventListener('resize', updateSpotlight);
      viewport?.removeEventListener('scroll', updateSpotlight);
    };
  }, [updateSpotlight]);

  const goNext = () => { if (isLast) { onClose(); return; } setStep(s => s + 1); };
  const goPrev = () => setStep(s => s - 1);

  const isCentered = current.placement === 'center' || !spotlight;
  const shouldCenterTooltip = isMobile || isCentered;

  const tooltipCard = (
    <div
      className="rounded-2xl overflow-hidden flex flex-col animate-in fade-in-0 zoom-in-95 duration-200"
      style={{
        background: 'var(--bg-panel)',
        border: '2px solid var(--accent)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
        width: isMobile
          ? 'min(360px, calc(100vw - 1rem))'
          : shouldCenterTooltip
          ? 'min(440px, calc(100vw - 2rem))'
          : TOOLTIP_W,
        maxHeight: isMobile ? 'min(62vh, 460px)' : 'min(calc(100vh - 24px), 560px)',
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
      <div
        className={`flex flex-col ${isMobile ? 'gap-2.5 px-4 pt-5 pb-3' : 'gap-3 px-5 pt-6 pb-4'} ${shouldCenterTooltip ? 'items-center text-center' : 'items-start'}`}
        style={{ overflowY: 'auto' }}
      >
        <div
          className={`${isMobile ? 'w-12 h-12 text-2xl' : 'w-14 h-14 text-3xl'} rounded-2xl flex items-center justify-center flex-shrink-0`}
          style={{ background: 'var(--accent-dim)', border: '1px solid var(--border-default)' }}
        >
          {current.icon}
        </div>

        <div className={shouldCenterTooltip ? 'text-center' : ''}>
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
      <div
        className="mx-auto mb-1 inline-flex items-center justify-center gap-1 rounded-full px-2 py-1"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
      >
        {STEPS.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setStep(i)}
            className="rounded-full transition-all duration-200 focus:outline-none"
            style={{
              width: i === step ? '12px' : '4px',
              height: '4px',
              background: i === step ? 'var(--accent)' : 'color-mix(in srgb, var(--border-default) 78%, transparent)',
              opacity: i === step ? 1 : 0.9,
              boxShadow: i === step ? '0 0 0 1px color-mix(in srgb, var(--accent) 28%, transparent)' : 'none',
            }}
            aria-label={`Étape ${i + 1}`}
            aria-current={i === step ? 'step' : undefined}
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
      {shouldCenterTooltip ? (
        // Centré (mobile ou étape welcome / fallback)
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
