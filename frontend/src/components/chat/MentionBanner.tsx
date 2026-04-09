'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import GenderAvatar from '@/components/ui/GenderAvatar'

interface MentionNotif {
  fromUsername: string
  room: string
  preview: string
  senderAvatarUrl?: string | null
  senderSexe?: string | null
}

interface MentionBannerProps {
  notif: MentionNotif | null
  onDismiss: () => void
  onNavigate: (room: string) => void
}

export default function MentionBanner({ notif, onDismiss, onNavigate }: MentionBannerProps) {
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-dismiss after 6s
  useEffect(() => {
    if (!notif) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(onDismiss, 6000)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [notif, onDismiss])

  if (!notif || typeof document === 'undefined') return null

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 'calc(var(--header-h, 56px) + 10px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99999,
        animation: 'mentionSlideDown 0.28s cubic-bezier(0.34,1.56,0.64,1) both',
        width: 'min(400px, calc(100vw - 32px))',
      }}
    >
      <style>{`
        @keyframes mentionSlideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-18px) scale(0.96); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0)      scale(1);    }
        }
      `}</style>

      <div
        style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--accent-glow)',
          borderTop: '3px solid var(--accent)',
          borderRadius: '14px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.22), 0 0 0 1px var(--accent-glow)',
          overflow: 'hidden',
        }}
      >
        {/* Progress bar auto-dismiss */}
        <div
          style={{
            position: 'absolute',
            bottom: 0, left: 0, right: 0,
            height: '2px',
            background: 'var(--accent-dim)',
          }}
        >
          <div
            style={{
              height: '100%',
              background: 'var(--accent)',
              animation: 'mentionProgress 6s linear both',
              transformOrigin: 'left',
            }}
          />
          <style>{`
            @keyframes mentionProgress {
              from { width: 100%; }
              to   { width: 0%; }
            }
          `}</style>
        </div>

        {/* Content */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 14px 14px' }}>
          {/* Bell + avatar stack */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <GenderAvatar
              username={notif.fromUsername}
              avatarUrl={notif.senderAvatarUrl || undefined}
              sexe={notif.senderSexe || undefined}
              size="sm"
              className="w-9 h-9 rounded-xl"
              clickable={false}
            />
            <span
              style={{
                position: 'absolute',
                top: '-5px', right: '-5px',
                fontSize: '13px',
                lineHeight: 1,
                animation: 'mentionBell 0.5s ease 0.3s both',
              }}
            >
              🔔
            </span>
            <style>{`
              @keyframes mentionBell {
                0%   { transform: rotate(0deg); }
                25%  { transform: rotate(20deg); }
                50%  { transform: rotate(-15deg); }
                75%  { transform: rotate(10deg); }
                100% { transform: rotate(0deg); }
              }
            `}</style>
          </div>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px', flexWrap: 'wrap' }}>
              <span style={{
                fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 700,
                color: 'var(--accent)',
              }}>
                @{notif.fromUsername}
              </span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>
                t&apos;a mentionné dans
              </span>
              <span style={{
                fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 600,
                color: 'var(--text-secondary)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                padding: '1px 6px', borderRadius: '6px',
              }}>
                #{notif.room}
              </span>
            </div>
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '13px',
              color: 'var(--text-secondary)', lineHeight: 1.45,
              overflow: 'hidden', display: '-webkit-box',
              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
              margin: 0,
            }}>
              {notif.preview}
            </p>
          </div>

          {/* Dismiss */}
          <button
            onClick={onDismiss}
            style={{
              flexShrink: 0,
              width: '24px', height: '24px',
              borderRadius: '6px',
              border: 'none', cursor: 'pointer',
              background: 'transparent',
              color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px', lineHeight: 1,
              transition: 'background 0.1s, color 0.1s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
            }}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        {/* Action bar */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end',
          padding: '0 14px 12px',
          gap: '8px',
        }}>
          <button
            onClick={() => { onNavigate(notif.room); onDismiss() }}
            style={{
              fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 600,
              color: 'var(--accent)',
              background: 'var(--accent-dim)',
              border: '1px solid var(--accent-glow)',
              borderRadius: '8px',
              padding: '5px 14px',
              cursor: 'pointer',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.8' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
          >
            Voir le message →
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
