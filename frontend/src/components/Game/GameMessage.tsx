'use client';

import { motion } from 'framer-motion';

interface GameMessageProps {
  content: string;
  timestamp: string;
}

export default function GameMessage({ content, timestamp }: GameMessageProps) {
  const isWinner     = content.includes('BONNE RÉPONSE') || content.includes('BONNE REPONSE');
  const isExpired    = content.includes('TEMPS ÉCOULÉ') || content.includes('TEMPS ECOULE');
  const isTransition = content.includes('Prochaine question') || content.includes('prochaine question');

  const accentColor = isWinner  ? 'var(--online)'
                    : isExpired ? 'var(--danger)'
                    : 'var(--accent)';

  const icon  = isWinner ? '🏆' : isExpired ? '⏰' : isTransition ? '⏳' : '🤖';
  const label = isWinner ? 'Bonne réponse' : isExpired ? 'Temps écoulé' : isTransition ? 'Transition' : 'Quiz Bot';

  const formatContent = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part.split('\n').flatMap((line, li, arr) =>
        li < arr.length - 1 ? [line, <br key={`${i}-${li}`} />] : [line]
      );
    });
  };

  const timeStr = (() => {
    try {
      const d = new Date(timestamp);
      return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderLeft: `3px solid ${accentColor}`,
        borderRadius: 'var(--radius-sm)',
        padding: '10px 14px',
        marginBottom: '6px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '13px', lineHeight: 1 }}>{icon}</span>
          <span style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.06em',
            color: accentColor,
            textTransform: 'uppercase' as const,
          }}>
            {label}
          </span>
        </div>
        {timeStr && (
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
            {timeStr}
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{
        fontFamily: 'var(--font-body)',
        fontSize: '13px',
        color: 'var(--text-secondary)',
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap' as const,
      }}>
        {formatContent(content)}
      </div>
    </motion.div>
  );
}
