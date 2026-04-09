'use client';

import { useGameStore } from '@/store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { Socket } from 'socket.io-client';

const LETTERS = ['A', 'B', 'C', 'D'];

interface Player {
  userId: string;
  username: string;
  score: number;
}

interface GamePanelProps {
  channel: string;
  socket?: Socket & { userId?: string };
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────
function Leaderboard({
  leaderboard,
  socketUserId,
}: {
  leaderboard: Player[];
  socketUserId?: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const prevRanksRef = useRef<Map<string, number>>(new Map());
  const [rankChanges, setRankChanges] = useState<Map<string, 'up' | 'new'>>(new Map());

  const totalPlayers = leaderboard.length;
  const scoredPlayers = leaderboard.filter(p => p.score > 0);
  const shown = showAll ? scoredPlayers : scoredPlayers.slice(0, 6);

  const myRank = scoredPlayers.findIndex(p => p.userId === socketUserId) + 1;
  const myScore = leaderboard.find(p => p.userId === socketUserId)?.score ?? 0;

  // Detect rank changes when leaderboard updates
  const leaderKey = scoredPlayers.map(p => `${p.userId}:${p.score}`).join(',');
  useEffect(() => {
    const changes = new Map<string, 'up' | 'new'>();
    scoredPlayers.forEach((player, idx) => {
      const prev = prevRanksRef.current.get(player.userId);
      if (prev === undefined) changes.set(player.userId, 'new');
      else if (idx < prev) changes.set(player.userId, 'up');
    });

    const newRanks = new Map<string, number>();
    scoredPlayers.forEach((p, i) => newRanks.set(p.userId, i));
    prevRanksRef.current = newRanks;

    if (changes.size > 0) {
      setRankChanges(changes);
      const timer = setTimeout(() => setRankChanges(new Map()), 2500);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaderKey]);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span style={{
          fontFamily: 'var(--font-ui)', fontSize: '11px', fontWeight: 600,
          letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--text-muted)',
        }}>
          Classement
        </span>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {myRank > 0 && myScore > 0 && (
            <span style={{
              fontFamily: 'var(--font-ui)', fontSize: '11px', fontWeight: 600,
              color: 'var(--accent)', background: 'var(--accent-dim)', padding: '2px 8px', borderRadius: '20px',
            }}>
              #{myRank} · {myScore} pts
            </span>
          )}
          <span style={{
            fontFamily: 'var(--font-ui)', fontSize: '10px', color: 'var(--text-muted)',
            background: 'var(--bg-elevated)', padding: '2px 7px', borderRadius: '20px',
            border: '1px solid var(--border-default)',
          }}>
            {totalPlayers} joueur{totalPlayers > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {scoredPlayers.length === 0 ? (
        <div style={{
          textAlign: 'center' as const, padding: '14px 0',
          color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'var(--font-body)',
          fontStyle: 'italic',
        }}>
          Aucun point marqué pour l&apos;instant
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '4px' }}>
          <AnimatePresence>
            {shown.map((player, i) => {
              const isMe = player.userId === socketUserId;
              const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
              const change = rankChanges.get(player.userId);
              const isFirst = i === 0;

              return (
                <motion.div
                  key={player.userId}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8, transition: { duration: 0.15 } }}
                  transition={{ duration: 0.25, layout: { duration: 0.3, type: 'spring', stiffness: 300, damping: 30 } }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '7px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: isMe
                      ? 'var(--accent-dim)'
                      : isFirst ? 'rgba(255,215,0,0.05)' : 'transparent',
                    border: `1px solid ${isMe
                      ? 'var(--accent-glow)'
                      : isFirst ? 'rgba(255,215,0,0.18)' : 'transparent'}`,
                  }}
                >
                  {/* Rank / Medal */}
                  <span style={{
                    fontSize: '13px', minWidth: '20px', textAlign: 'center' as const,
                    color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', fontWeight: 600,
                  }}>
                    {medal || `${i + 1}`}
                  </span>

                  {/* Username */}
                  <span style={{
                    fontFamily: 'var(--font-body)', fontSize: '13px',
                    color: isMe ? 'var(--accent-text)' : 'var(--text-secondary)',
                    fontWeight: isMe ? 600 : 400,
                    flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
                  }}>
                    {player.username}{isMe ? ' (vous)' : ''}
                  </span>

                  {/* Rank change indicator */}
                  <AnimatePresence>
                    {change === 'up' && (
                      <motion.span
                        key="up"
                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        style={{ color: 'var(--online)', fontSize: '11px', fontWeight: 800, lineHeight: 1 }}
                      >↑</motion.span>
                    )}
                    {change === 'new' && (
                      <motion.span
                        key="new"
                        initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                        style={{
                          color: 'var(--accent)', fontSize: '9px', fontWeight: 700,
                          background: 'var(--accent-dim)', padding: '1px 5px', borderRadius: '10px',
                          border: '1px solid var(--accent-glow)', lineHeight: 1.6,
                        }}
                      >NEW</motion.span>
                    )}
                  </AnimatePresence>

                  {/* Score */}
                  <span style={{
                    fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 700,
                    color: isMe ? 'var(--accent)' : isFirst ? 'rgba(255,180,0,0.9)' : 'var(--text-muted)',
                    minWidth: '48px', textAlign: 'right' as const,
                  }}>
                    {player.score} pts
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {scoredPlayers.length > 6 && (
        <button
          onClick={() => setShowAll(v => !v)}
          style={{
            marginTop: '6px', width: '100%', padding: '6px',
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-ui)', fontSize: '12px', color: 'var(--accent)', fontWeight: 500,
          }}
        >
          {showAll ? '▲ Réduire' : `▼ Voir tous (${scoredPlayers.length})`}
        </button>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function GamePanel({ channel, socket }: GamePanelProps) {
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [localAnswered, setLocalAnswered] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const {
    isActive, currentQuestion, leaderboard, timeLeft,
    winner, hasAnswered, isLoading, lastAnswer, correctAnswer, explanation,
  } = useGameStore();

  useEffect(() => {
    setLocalAnswered(false);
    setSelectedOption(null);
  }, [currentQuestion?.question]);

  useEffect(() => {
    if (!socket) return;
    setConnectionStatus(socket.connected ? 'connected' : 'disconnected');
    const onConnect    = () => setConnectionStatus('connected');
    const onDisconnect = () => setConnectionStatus('disconnected');
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    return () => { socket.off('connect', onConnect); socket.off('disconnect', onDisconnect); };
  }, [socket]);

  const submitAnswer = useCallback((option: string, index: number) => {
    if (hasAnswered || localAnswered || !socket) return;
    setLocalAnswered(true);
    setSelectedOption(index);
    socket.emit('game_answer', { answer: option });
  }, [hasAnswered, localAnswered, socket]);

  if (channel !== 'Game') return null;

  const answered      = hasAnswered || localAnswered;
  const answerCorrect = lastAnswer?.isCorrect ?? null;
  const isRevealed    = timeLeft === 0 && !!correctAnswer;
  const timerPct      = Math.max(0, (timeLeft / 15) * 100);
  const timerColor    = timeLeft <= 3 ? 'var(--danger)' : timeLeft <= 7 ? 'var(--amber)' : 'var(--accent)';
  const timerBg       = timeLeft <= 3 ? 'rgba(239,68,68,0.1)' : timeLeft <= 7 ? 'rgba(245,158,11,0.1)' : 'var(--accent-dim)';

  const card: React.CSSProperties = {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    padding: '14px 16px',
  };

  return (
    <div style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
      <AnimatePresence mode="wait">

        {/* ── IDLE ──────────────────────────────────────────────────────── */}
        {!isActive && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

            {/* Hero */}
            <div style={{ ...card, textAlign: 'center' as const, marginBottom: '10px', padding: '24px 20px' }}>
              <div style={{
                fontFamily: 'var(--font-ui)', fontSize: '44px', fontWeight: 800,
                color: 'var(--accent)', lineHeight: 1, letterSpacing: '-0.03em', marginBottom: '6px',
              }}>
                Quiz
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', fontFamily: 'var(--font-body)' }}>
                Répondez en premier · 10 pts par bonne réponse
              </div>

              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' as const, marginBottom: '20px' }}>
                {['🌍 Catégories variées', '⚡ Temps réel', '🏆 Classement'].map(tag => (
                  <span key={tag} style={{
                    fontSize: '12px', padding: '4px 10px', borderRadius: '20px',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
                    color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)', fontWeight: 500,
                  }}>
                    {tag}
                  </span>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}>
                <motion.div
                  animate={connectionStatus === 'connected' ? { opacity: [1, 0.4, 1] } : {}}
                  transition={{ duration: 1.8, repeat: Infinity }}
                  style={{
                    width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0,
                    background: connectionStatus === 'connected' ? 'var(--online)'
                              : connectionStatus === 'connecting' ? 'var(--amber)' : 'var(--danger)',
                  }}
                />
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {connectionStatus === 'connected'    && 'Connecté · quiz démarre automatiquement'}
                  {connectionStatus === 'connecting'   && 'Connexion en cours...'}
                  {connectionStatus === 'disconnected' && 'Connexion perdue · rechargez la page'}
                </span>
              </div>
            </div>

            {leaderboard.length > 0 && (
              <div style={card}>
                <Leaderboard leaderboard={leaderboard} socketUserId={socket?.userId} />
              </div>
            )}
          </motion.div>
        )}

        {/* ── LOADING (between questions) ────────────────────────────────── */}
        {isActive && isLoading && !currentQuestion && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ ...card, textAlign: 'center' as const, padding: '36px 20px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '16px' }}>
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    animate={{ scale: [0.6, 1, 0.6], opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.2 }}
                    style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)' }}
                  />
                ))}
              </div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: '16px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Prochaine question
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Préparez-vous !</div>
            </div>

            {leaderboard.length > 0 && (
              <div style={card}>
                <Leaderboard leaderboard={leaderboard} socketUserId={socket?.userId} />
              </div>
            )}
          </motion.div>
        )}

        {/* ── ACTIVE QUESTION ────────────────────────────────────────────── */}
        {isActive && currentQuestion && (
          <motion.div
            key={currentQuestion.question}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >

            {/* ── WINNER BANNER (prominent) ──────────────────────────────── */}
            <AnimatePresence>
              {winner && (
                <motion.div
                  key="winner-top"
                  initial={{ opacity: 0, scale: 0.92, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  style={{
                    marginBottom: '8px',
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'linear-gradient(135deg, rgba(255,215,0,0.12) 0%, var(--accent-dim) 100%)',
                    border: '1px solid rgba(255,215,0,0.35)',
                    textAlign: 'center' as const,
                  }}
                >
                  <div style={{ fontSize: '28px', marginBottom: '4px' }}>🏆</div>
                  <div style={{
                    fontFamily: 'var(--font-ui)', fontSize: '15px', fontWeight: 800,
                    color: 'var(--accent-text)', marginBottom: '2px',
                  }}>
                    {winner}
                  </div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>
                    a trouvé en premier ! +10 pts
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Timer header */}
            <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                {currentQuestion.categoryEmoji && (
                  <span style={{ fontSize: '18px', lineHeight: 1, flexShrink: 0 }}>{currentQuestion.categoryEmoji}</span>
                )}
                <div style={{ minWidth: 0 }}>
                  {currentQuestion.category && (
                    <div style={{
                      fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em',
                      color: 'var(--text-muted)', textTransform: 'uppercase' as const, fontFamily: 'var(--font-ui)',
                    }}>
                      {currentQuestion.category}
                    </div>
                  )}
                  {currentQuestion.difficulty && (
                    <span style={{
                      display: 'inline-block', fontSize: '10px', padding: '1px 7px', borderRadius: '20px',
                      fontWeight: 600, fontFamily: 'var(--font-ui)', letterSpacing: '0.06em',
                      textTransform: 'uppercase' as const,
                      background: currentQuestion.difficulty === 'Facile'    ? 'rgba(34,197,94,0.12)'
                                : currentQuestion.difficulty === 'Difficile' ? 'rgba(239,68,68,0.12)'
                                : 'rgba(245,158,11,0.12)',
                      color: currentQuestion.difficulty === 'Facile'    ? 'var(--online)'
                           : currentQuestion.difficulty === 'Difficile' ? 'var(--danger)'
                           : 'var(--amber)',
                      border: `1px solid ${
                        currentQuestion.difficulty === 'Facile'    ? 'rgba(34,197,94,0.3)'
                      : currentQuestion.difficulty === 'Difficile' ? 'rgba(239,68,68,0.3)'
                      : 'rgba(245,158,11,0.3)'}`,
                    }}>
                      {currentQuestion.difficulty}
                    </span>
                  )}
                </div>
              </div>

              {/* Countdown */}
              <motion.div
                key={timeLeft}
                initial={{ scale: 1.25, opacity: 0.6 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.15 }}
                style={{
                  fontFamily: 'var(--font-ui)', fontSize: '34px', fontWeight: 800, lineHeight: 1,
                  color: isRevealed ? 'var(--text-muted)' : timerColor,
                  background: isRevealed ? 'var(--bg-elevated)' : timerBg,
                  padding: '4px 10px', borderRadius: 'var(--radius-sm)',
                  minWidth: '58px', textAlign: 'center' as const, flexShrink: 0,
                  transition: 'color 0.3s, background 0.3s',
                }}
              >
                {isRevealed ? '✓' : String(timeLeft).padStart(2, '0')}
              </motion.div>
            </div>

            {/* Progress bar */}
            <div style={{ height: '3px', background: 'var(--border-default)', borderRadius: '2px', marginBottom: '8px', overflow: 'hidden' }}>
              <motion.div
                animate={{ width: `${timerPct}%` }}
                transition={{ duration: 0.4, ease: 'linear' }}
                style={{ height: '100%', background: timerColor, borderRadius: '2px', transition: 'background 0.3s' }}
              />
            </div>

            {/* Question text */}
            <div style={{ ...card, marginBottom: '8px' }}>
              <p style={{
                fontFamily: 'var(--font-ui)', fontSize: '15px', fontWeight: 700,
                lineHeight: 1.55, color: 'var(--text-primary)', margin: 0,
              }}>
                {currentQuestion.question}
              </p>
            </div>

            {/* My answer result badge */}
            <AnimatePresence>
              {answered && answerCorrect !== null && (
                <motion.div
                  key="badge"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    padding: '9px 14px', borderRadius: 'var(--radius-sm)', marginBottom: '8px',
                    fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 600,
                    textAlign: 'center' as const,
                    background: answerCorrect ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                    border: `1px solid ${answerCorrect ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)'}`,
                    color: answerCorrect ? 'var(--online)' : 'var(--danger)',
                  }}
                >
                  {answerCorrect ? '✓ Bonne réponse ! +10 pts' : '✗ Mauvaise réponse'}
                </motion.div>
              )}
              {answered && answerCorrect === null && (
                <motion.div
                  key="pending"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    padding: '9px 14px', borderRadius: 'var(--radius-sm)', marginBottom: '8px',
                    fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 500,
                    textAlign: 'center' as const,
                    background: 'var(--accent-dim)', border: '1px solid var(--accent-glow)', color: 'var(--accent-text)',
                  }}
                >
                  Réponse envoyée · en attente...
                </motion.div>
              )}
            </AnimatePresence>

            {/* Options */}
            {currentQuestion.options && currentQuestion.options.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '5px' }}>
                {currentQuestion.options.map((option, index) => {
                  const isSelected   = selectedOption === index;
                  const isCorrectOpt = !!correctAnswer && option.toLowerCase() === correctAnswer.toLowerCase();
                  const isWrongSel   = answered && isSelected && answerCorrect === false;

                  let bg          = 'var(--bg-elevated)';
                  let border      = 'var(--border-default)';
                  let textColor   = 'var(--text-secondary)';
                  let letterBg    = 'var(--bg-surface)';
                  let letterColor = 'var(--text-muted)';
                  let opacity     = 1;
                  const cursor    = answered ? 'not-allowed' : 'pointer';

                  if (answered) {
                    if (isCorrectOpt) {
                      bg = 'rgba(34,197,94,0.1)'; border = 'rgba(34,197,94,0.45)';
                      textColor = 'var(--online)'; letterBg = 'rgba(34,197,94,0.18)'; letterColor = 'var(--online)';
                    } else if (isWrongSel) {
                      bg = 'rgba(239,68,68,0.1)'; border = 'rgba(239,68,68,0.45)';
                      textColor = 'var(--danger)'; letterBg = 'rgba(239,68,68,0.18)'; letterColor = 'var(--danger)';
                    } else {
                      opacity = 0.35;
                    }
                  }

                  return (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity, x: 0 }}
                      transition={{ delay: 0.04 + index * 0.055 }}
                      whileHover={!answered ? { x: 3, borderColor: 'var(--accent)', transition: { duration: 0.1 } } : {}}
                      whileTap={!answered ? { scale: 0.98 } : {}}
                      onClick={() => submitAnswer(option, index)}
                      disabled={answered}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 12px',
                        background: bg, border: `1px solid ${border}`,
                        borderRadius: 'var(--radius-sm)', cursor,
                        textAlign: 'left' as const, width: '100%',
                        transition: 'opacity 0.15s, background 0.15s, border-color 0.15s',
                      }}
                    >
                      <span style={{
                        fontFamily: 'var(--font-ui)', fontSize: '11px', fontWeight: 700,
                        width: '24px', height: '24px', borderRadius: '6px',
                        background: letterBg, color: letterColor,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, border: `1px solid ${border}`, transition: 'all 0.15s',
                      }}>
                        {LETTERS[index]}
                      </span>
                      <span style={{
                        fontFamily: 'var(--font-body)', fontSize: '13px', color: textColor,
                        flex: 1, lineHeight: 1.45, textAlign: 'left' as const, transition: 'color 0.15s',
                      }}>
                        {option}
                      </span>
                      {answered && isCorrectOpt && <span style={{ color: 'var(--online)', fontSize: '14px', flexShrink: 0 }}>✓</span>}
                      {answered && isWrongSel   && <span style={{ color: 'var(--danger)', fontSize: '14px', flexShrink: 0 }}>✗</span>}
                    </motion.button>
                  );
                })}
              </div>
            ) : (
              <div style={{ ...card, textAlign: 'center' as const, color: 'var(--text-muted)', fontSize: '13px' }}>
                Options non disponibles
              </div>
            )}

            {/* Explanation (shown after question ends) */}
            <AnimatePresence>
              {isRevealed && explanation && (
                <motion.div
                  key="explanation"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 0.3 }}
                  style={{
                    marginTop: '8px',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-default)',
                    borderLeft: '3px solid var(--accent)',
                  }}
                >
                  <div style={{
                    fontFamily: 'var(--font-ui)', fontSize: '10px', fontWeight: 700,
                    letterSpacing: '0.08em', textTransform: 'uppercase' as const,
                    color: 'var(--accent)', marginBottom: '4px',
                  }}>
                    💡 Explication
                  </div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {explanation}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Hint (before answering) */}
            {!answered && !isRevealed && (
              <div style={{ marginTop: '10px', textAlign: 'center' as const, fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                Cliquez une option ou tapez{' '}
                {LETTERS.map((l, i) => (
                  <span key={l}>
                    <code style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '4px', padding: '0 4px', fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{l}</code>
                    {i < LETTERS.length - 1 ? ' ' : ''}
                  </span>
                ))}{' '}
                dans le chat
              </div>
            )}

            {/* Leaderboard (during active question) */}
            {leaderboard.length > 0 && (
              <div style={{ ...card, marginTop: '10px' }}>
                <Leaderboard leaderboard={leaderboard} socketUserId={socket?.userId} />
              </div>
            )}
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
