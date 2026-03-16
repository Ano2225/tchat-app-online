'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ── Stations — direct Icecast/Shoutcast streams (no CORS, no ads) ─────────── */
const STATIONS = [
  { url: 'https://ice1.somafm.com/groovesalad-128-mp3',   name: 'Groove Salad',  genre: 'Ambient Chill',  emoji: '🎵' },
  { url: 'https://ice1.somafm.com/lush-128-mp3',           name: 'Lush',          genre: 'Dream Pop',      emoji: '🌸' },
  { url: 'https://ice1.somafm.com/dronezone-128-mp3',      name: 'Drone Zone',    genre: 'Dark Ambient',   emoji: '🧘' },
  { url: 'https://ice1.somafm.com/spacestation-128-mp3',   name: 'Space Station', genre: 'Space Ambient',  emoji: '🌌' },
  { url: 'https://ice1.somafm.com/suburbsofgoa-128-mp3',   name: 'Suburbs of Goa', genre: 'Chillout',      emoji: '🌴' },
];

/* ── Animated equalizer bars ──────────────────────────────────────────────── */
function EqBars({ active }: { active: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '14px' }}>
      {[0.6, 1, 0.75, 0.9, 0.5].map((h, i) => (
        <motion.div
          key={i}
          animate={active ? { scaleY: [h, 1, h * 0.4, 1, h] } : { scaleY: 0.25 }}
          transition={active ? { duration: 0.8 + i * 0.12, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
          style={{
            width: '3px',
            height: '14px',
            borderRadius: '2px',
            background: 'var(--accent)',
            transformOrigin: 'bottom',
            opacity: active ? 1 : 0.35,
          }}
        />
      ))}
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────────────────── */
export default function MusicPlayer() {
  const [expanded, setExpanded]     = useState(false);
  const [isPlaying, setIsPlaying]   = useState(false);
  const [stationIdx, setStationIdx] = useState(0);
  const [volume, setVolume]         = useState(50);
  const [isLoading, setIsLoading]   = useState(false);
  const [hasError, setHasError]     = useState(false);
  const audioRef                     = useRef<HTMLAudioElement | null>(null);

  /* ── Init audio element once ─────────────────────────────────────────── */
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'none';
    audio.volume  = 0.5;

    audio.addEventListener('playing',  () => { setIsPlaying(true);  setIsLoading(false); setHasError(false); });
    audio.addEventListener('pause',    () => setIsPlaying(false));
    audio.addEventListener('waiting',  () => setIsLoading(true));
    audio.addEventListener('canplay',  () => setIsLoading(false));
    audio.addEventListener('error',    () => { setHasError(true); setIsLoading(false); setIsPlaying(false); });

    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  /* ── Controls ─────────────────────────────────────────────────────────── */
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      setHasError(false);
      setIsLoading(true);
      if (!audio.src || audio.src !== STATIONS[stationIdx].url) {
        audio.src = STATIONS[stationIdx].url;
      }
      audio.play().catch(() => { setHasError(true); setIsLoading(false); });
    }
  }, [isPlaying, stationIdx]);

  const selectStation = useCallback((idx: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    setStationIdx(idx);
    setHasError(false);
    setIsLoading(true);
    audio.pause();
    audio.src = STATIONS[idx].url;
    audio.play().catch(() => { setHasError(true); setIsLoading(false); });
  }, []);

  const handleVolume = useCallback((val: number) => {
    setVolume(val);
    if (audioRef.current) audioRef.current.volume = val / 100;
  }, []);

  const station = STATIONS[stationIdx];

  /* ── Shared styles ────────────────────────────────────────────────────── */
  const card: React.CSSProperties = {
    background:   'var(--bg-panel)',
    border:       '1px solid var(--border-default)',
    borderRadius: 'var(--radius-lg)',
    boxShadow:    'var(--shadow-lg)',
  };

  return (
    <div style={{ position: 'fixed', bottom: '24px', left: '24px', zIndex: 200 }}>
      <AnimatePresence mode="wait">

        {/* ── COLLAPSED pill ─────────────────────────────────────────────── */}
        {!expanded && (
          <motion.button
            key="pill"
            initial={{ scale: 0.85, opacity: 0, y: 8 }}
            animate={{ scale: 1,    opacity: 1, y: 0 }}
            exit   ={{ scale: 0.85, opacity: 0, y: 8 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            onClick={() => setExpanded(true)}
            style={{
              ...card,
              display:    'flex',
              alignItems: 'center',
              gap:        '10px',
              padding:    '10px 16px',
              cursor:     'pointer',
              color:      'var(--text-primary)',
              border:     `1px solid ${isPlaying ? 'var(--accent-glow)' : 'var(--border-default)'}`,
            }}
          >
            <span style={{ fontSize: '17px', lineHeight: 1 }}>{station.emoji}</span>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {isPlaying ? station.name : 'Radio'}
            </span>
            {isPlaying
              ? <EqBars active />
              : <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>♪</span>
            }
          </motion.button>
        )}

        {/* ── EXPANDED player ────────────────────────────────────────────── */}
        {expanded && (
          <motion.div
            key="player"
            initial={{ scale: 0.92, opacity: 0, y: 12 }}
            animate={{ scale: 1,    opacity: 1, y: 0  }}
            exit   ={{ scale: 0.92, opacity: 0, y: 12 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            style={{ ...card, width: '268px', overflow: 'hidden' }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 16px 0' }}>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Radio Chat
              </span>
              <button
                onClick={() => setExpanded(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '20px', lineHeight: 1, padding: '0 2px' }}
                aria-label="Réduire"
              >×</button>
            </div>

            {/* Now playing card */}
            <div style={{ padding: '12px 16px' }}>
              <div style={{
                background:   'var(--bg-surface)',
                border:       `1px solid ${isPlaying ? 'var(--accent-glow)' : 'var(--border-default)'}`,
                borderRadius: 'var(--radius-md)',
                padding:      '12px 14px',
                display:      'flex',
                alignItems:   'center',
                gap:          '12px',
                transition:   'border-color 0.3s',
              }}>
                <motion.div
                  animate={isPlaying ? { rotate: [0, 5, -5, 0] } : {}}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ fontSize: '28px', lineHeight: 1, flexShrink: 0 }}
                >
                  {station.emoji}
                </motion.div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {station.name}
                  </div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
                    {station.genre}
                  </div>
                </div>
                <EqBars active={isPlaying} />
              </div>
            </div>

            {/* Play / Pause */}
            <div style={{ padding: '0 16px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              {hasError ? (
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--danger)', textAlign: 'center' }}>
                  Stream indisponible — réessayez
                </div>
              ) : null}
              <motion.button
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                onClick={togglePlay}
                style={{
                  width:          '48px',
                  height:         '48px',
                  borderRadius:   '50%',
                  background:     'var(--accent)',
                  border:         'none',
                  cursor:         'pointer',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  fontSize:       '18px',
                  color:          '#fff',
                  flexShrink:     0,
                  transition:     'background 0.2s',
                }}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }}
                  />
                ) : isPlaying ? '⏸' : '▶'}
              </motion.button>
            </div>

            {/* Volume */}
            <div style={{ padding: '0 16px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', flexShrink: 0 }}>
                {volume === 0 ? '🔇' : volume < 40 ? '🔈' : '🔊'}
              </span>
              <input
                type="range"
                min={0} max={100} value={volume}
                onChange={e => handleVolume(Number(e.target.value))}
                style={{ flex: 1, accentColor: 'var(--accent)', cursor: 'pointer', height: '3px' }}
                aria-label="Volume"
              />
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: '11px', color: 'var(--text-muted)', minWidth: '28px', textAlign: 'right' }}>
                {volume}%
              </span>
            </div>

            {/* Station list */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '10px 10px 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase', padding: '0 6px 6px' }}>
                Stations
              </div>
              {STATIONS.map((s, i) => {
                const active = i === stationIdx;
                return (
                  <motion.button
                    key={s.url}
                    whileHover={{ x: 2 }}
                    onClick={() => selectStation(i)}
                    style={{
                      display:      'flex',
                      alignItems:   'center',
                      gap:          '10px',
                      padding:      '8px 8px',
                      borderRadius: 'var(--radius-sm)',
                      background:   active ? 'var(--accent-dim)' : 'transparent',
                      border:       `1px solid ${active ? 'var(--accent-glow)' : 'transparent'}`,
                      cursor:       'pointer',
                      textAlign:    'left',
                      width:        '100%',
                      transition:   'background 0.15s, border-color 0.15s',
                    }}
                  >
                    <span style={{ fontSize: '16px', flexShrink: 0 }}>{s.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: active ? 700 : 500, color: active ? 'var(--accent-text)' : 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.name}
                      </div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--text-muted)' }}>
                        {s.genre}
                      </div>
                    </div>
                    {active && isPlaying && (
                      <div style={{ flexShrink: 0 }}>
                        <EqBars active />
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
