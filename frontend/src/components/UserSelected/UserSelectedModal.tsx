import React, { useEffect, useState } from 'react';
import PrivateChatBox from '../chat/PrivateChatBox';
import ReportModal from '@/components/ui/ReportModal';
import { Socket } from 'socket.io-client';
import axiosInstance from '@/utils/axiosInstance';
import toast from 'react-hot-toast';
import GenderAvatar from '@/components/ui/GenderAvatar';
import { MessageCircle, AlertTriangle, UserX, Cake, MapPin, Venus, Mars, CircleEllipsis, X } from 'lucide-react';

interface UserProfile {
  _id: string;
  username: string;
  age?: number;
  ville?: string;
  sexe?: string;
  avatarUrl?: string;
}

interface Props {
  userId: string;
  socket: Socket | null;
  onClose: () => void;
}

function sexeLabel(sexe?: string) {
  if (sexe === 'femme' || sexe === 'female') return 'Femme';
  if (sexe === 'homme' || sexe === 'male')   return 'Homme';
  if (sexe === 'autre')                       return 'Autre';
  return null;
}

function SexeIcon({ sexe }: { sexe?: string }) {
  if (sexe === 'femme' || sexe === 'female') return <Venus className="w-3.5 h-3.5 text-pink-400" />;
  if (sexe === 'homme' || sexe === 'male')   return <Mars  className="w-3.5 h-3.5 text-blue-400" />;
  return <CircleEllipsis className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />;
}

const UserSelectedModal: React.FC<Props> = ({ userId, socket, onClose }) => {
  const [profile, setProfile]           = useState<UserProfile | null>(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [showChat, setShowChat]         = useState(false);
  const [showReportModal, setShowReport] = useState(false);
  const [blocking, setBlocking]         = useState(false);

  const handleClose = () => { onClose(); setProfile(null); setShowChat(false); };

  useEffect(() => {
    let cancelled = false;
    if (!userId || userId === profile?._id) return;
    setLoading(true);
    setError(null);
    axiosInstance.get(`/user/${userId}`)
      .then(r => { if (!cancelled) setProfile(r.data); })
      .catch(e => { if (!cancelled) setError(e?.response?.data?.message || 'Profil introuvable'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (showChat && profile) return <PrivateChatBox recipient={profile} socket={socket} onClose={onClose} />;

  const backdrop = (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={handleClose} />
  );

  if (loading) return (
    <>
      {backdrop}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 rounded-2xl p-6 flex items-center gap-3"
        style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-lg)' }}>
        <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        <span className="text-sm" style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-secondary)' }}>Chargement…</span>
      </div>
    </>
  );

  if (error) return (
    <>
      {backdrop}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 rounded-2xl p-6 text-center w-72"
        style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-lg)' }}>
        <p className="text-sm mb-4" style={{ color: 'var(--danger)' }}>{error}</p>
        <button onClick={handleClose} className="px-4 py-2 rounded-lg text-sm"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>Fermer</button>
      </div>
    </>
  );

  if (!profile) return null;

  const label = sexeLabel(profile.sexe);
  const hasInfo = profile.age || label || profile.ville;

  return (
    <>
      {backdrop}
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-80 max-w-[92vw] rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-lg)' }}
        role="dialog" aria-modal="true"
      >
        {/* ── Header band ── */}
        <div className="relative px-6 pt-6 pb-5 text-center"
          style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
            aria-label="Fermer"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          <div style={{ '--tw-ring-color': 'var(--accent-glow)', '--tw-ring-offset-color': 'var(--bg-elevated)' } as React.CSSProperties}>
            <GenderAvatar
              username={profile.username}
              avatarUrl={profile.avatarUrl}
              sexe={profile.sexe}
              size="lg"
              className="w-20 h-20 mx-auto mb-3 ring-2 ring-offset-2"
            />
          </div>

          <h3 className="font-bold text-lg leading-tight mb-1" style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-primary)' }}>
            {profile.username}
          </h3>

          <div className="flex items-center justify-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--online)' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>En ligne</span>
          </div>
        </div>

        {/* ── Info pills ── */}
        {hasInfo && (
          <div className="px-5 py-4 flex flex-wrap justify-center gap-2"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            {profile.age && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
                <Cake className="w-3.5 h-3.5" />
                {profile.age} ans
              </span>
            )}
            {label && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
                <SexeIcon sexe={profile.sexe} />
                {label}
              </span>
            )}
            {profile.ville && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
                <MapPin className="w-3.5 h-3.5" />
                {profile.ville}
              </span>
            )}
          </div>
        )}

        {/* ── Actions ── */}
        <div className="p-4 space-y-2">
          {/* Message */}
          <button
            onClick={() => setShowChat(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: 'var(--accent)', color: '#fff', fontFamily: 'var(--font-ui)' }}
          >
            <MessageCircle className="w-4 h-4" />
            Envoyer un message
          </button>

          {/* Report + Block */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setShowReport(true)}
              className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Signaler
            </button>

            <button
              onClick={async () => {
                setBlocking(true);
                try {
                  await axiosInstance.post(`/reports/block/${profile._id}`);
                  toast.success(`${profile.username} bloqué`);
                  handleClose();
                } catch (e: unknown) {
                  const err = e as { response?: { data?: { message?: string } } };
                  toast.error(err.response?.data?.message || 'Erreur');
                } finally {
                  setBlocking(false);
                }
              }}
              disabled={blocking}
              className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
              style={{ background: 'var(--bg-elevated)', color: 'var(--danger)', border: '1px solid var(--border-default)' }}
            >
              <UserX className="w-3.5 h-3.5" />
              {blocking ? '…' : 'Bloquer'}
            </button>
          </div>
        </div>
      </div>

      {showReportModal && (
        <ReportModal
          targetUserId={profile._id}
          username={profile.username}
          onClose={() => setShowReport(false)}
        />
      )}
    </>
  );
};

export default UserSelectedModal;
