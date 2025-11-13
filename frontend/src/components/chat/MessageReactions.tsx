import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import styles from './MessageReactions.module.css';

interface Reaction {
  emoji: string;
  users: { id: string; username: string }[];
  count: number;
}

interface MessageReactionsProps {
  messageId: string;
  reactions: Reaction[];
  onAddReaction: (messageId: string, emoji: string) => void;
  isOwn?: boolean;
  senderId?: string;
}

const MessageReactions: React.FC<MessageReactionsProps> = ({
  messageId,
  reactions,
  onAddReaction,
  isOwn = false,
  senderId
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [hoveredReaction, setHoveredReaction] = useState<string | null>(null);
  const user = useAuthStore((state) => state.user);

  const commonEmojis = ['👍', '❤️', '😂', '😮', '😢', '😡', '👏', '🔥'];

  // Debug log pour voir les réactions reçues
  React.useEffect(() => {
    if (reactions && reactions.length > 0) {
      console.log('MessageReactions - reactions received:', reactions);
    }
  }, [reactions]);

  const handleEmojiClick = (emoji: string) => {
    onAddReaction(messageId, emoji);
    setShowEmojiPicker(false);
  };

  const hasUserReacted = (reaction: Reaction) => {
    if (!user?.id || !reaction.users) return false;
    return reaction.users.some(u => u.id === user.id);
  };

  const getUserCurrentReaction = () => {
    if (!user?.id || !reactions) return null;
    return reactions.find(reaction => reaction.users && reaction.users.some(u => u.id === user.id));
  };



  const formatUsersList = (users: { id: string; username: string }[]) => {
    if (!users || users.length === 0) return '';
    if (users.length === 1) return users[0].username;
    if (users.length === 2) return `${users[0].username} et ${users[1].username}`;
    return `${users[0].username}, ${users[1].username} et ${users.length - 2} autre${users.length - 2 > 1 ? 's' : ''}`;
  };

  return (
    <div className={`${styles.reactionsContainer} ${isOwn ? styles.isOwn : ''} group`}>
      {reactions && reactions.length > 0 && reactions
        .filter(reaction => reaction.count > 0 && reaction.users && reaction.users.length > 0)
        .map((reaction) => (
        <div key={reaction.emoji} className="relative">
          <button
            onClick={() => handleEmojiClick(reaction.emoji)}
            onMouseEnter={() => setHoveredReaction(reaction.emoji)}
            onMouseLeave={() => setHoveredReaction(null)}
            className={`${styles.reactionButton} ${
              hasUserReacted(reaction) ? styles.active : styles.inactive
            }`}
          >
            <span>{reaction.emoji}</span>
            <span>{reaction.count}</span>
          </button>
          
          {/* Tooltip avec les utilisateurs */}
          {hoveredReaction === reaction.emoji && reaction.users && reaction.users.length > 0 && (
            <div className={styles.tooltip}>
              <div className={styles.tooltipContent}>
                {reaction.emoji} {formatUsersList(reaction.users)}
              </div>
              <div className={styles.tooltipArrow}></div>
            </div>
          )}
        </div>
      ))}
      
      {/* Add reaction button - show for all authenticated users */}
      {user?.id && (
        <div className="relative">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={styles.addReactionButton}
            title="Ajouter une réaction"
          >
            +
          </button>

          {showEmojiPicker && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowEmojiPicker(false)}
              />
              <div className={`${styles.emojiPicker} ${isOwn ? styles.isOwn : styles.isNotOwn}`}>
                <div className={styles.emojiGrid}>
                  {commonEmojis.map((emoji) => {
                    const currentReaction = getUserCurrentReaction();
                    const isCurrentReaction = currentReaction?.emoji === emoji;
                    const existingReaction = reactions?.find(r => r.emoji === emoji);
                    const hasThisReaction = hasUserReacted(existingReaction || { emoji, users: [], count: 0 });
                    
                    return (
                      <button
                        key={emoji}
                        onClick={() => handleEmojiClick(emoji)}
                        className={`${styles.emojiButton} ${
                          hasThisReaction ? 'bg-orange-100 dark:bg-orange-900/30' : ''
                        }`}
                        title={hasThisReaction ? 'Supprimer cette réaction' : `Réagir avec ${emoji}`}
                      >
                        {emoji}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default MessageReactions;