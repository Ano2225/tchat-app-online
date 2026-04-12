import React from 'react';

interface StatusBarsProps {
  isOnline: boolean;
  size?: number;
  className?: string;
}

/**
 * Indicateur de présence en deux barres verticales.
 * En ligne  → deux barres pleines (var(--online))
 * Hors ligne → une barre pleine + une barre fantôme (var(--text-muted))
 */
const StatusBars: React.FC<StatusBarsProps> = ({ isOnline, size = 12, className }) => {
  const color = isOnline ? 'var(--online)' : 'var(--text-muted)';
  const w = size;
  const h = size;
  const barW = Math.round(w * 0.34);
  const barH = Math.round(h * 0.78);
  const gap = Math.round(w * 0.18);
  const totalBarsW = barW * 2 + gap;
  const startX = (w - totalBarsW) / 2;
  const startY = (h - barH) / 2;
  const rx = barW / 2;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      fill="none"
      className={className}
      aria-label={isOnline ? 'En ligne' : 'Hors ligne'}
      role="img"
    >
      {/* Première barre — toujours visible */}
      <rect
        x={startX}
        y={startY}
        width={barW}
        height={barH}
        rx={rx}
        fill={color}
      />
      {/* Deuxième barre — pleine si en ligne, fantôme si hors ligne */}
      <rect
        x={startX + barW + gap}
        y={startY}
        width={barW}
        height={barH}
        rx={rx}
        fill={color}
        opacity={isOnline ? 1 : 0.25}
      />
    </svg>
  );
};

export default StatusBars;
