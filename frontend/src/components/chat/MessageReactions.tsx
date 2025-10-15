import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';

interface Reaction {
  emoji: string;
  users: string[];
  count: number;
}

interface MessageReactionsProps {
  messageId: string;
  reactions: Reaction[];
  onAddReaction: (messageId: string, emoji: string) => void;
}

const MessageReactions: React.FC<MessageReactionsProps> = ({
  messageId,
  reactions,
  onAddReaction,
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const user = useAuthStore((state) => state.user);

  const commonEmojis = ['👍', '❤️', '😂', '😮', '😢', '😡', '👏', '🔥'];

  const handleEmojiClick = (emoji: string) => {
    onAddReaction(messageId, emoji);
    setShowEmojiPicker(false);
  };

  const hasUserReacted = (reaction: Reaction) => {
    return user?.id && reaction.users.includes(user.id);
  };

  const getUserReaction = () => {
    return reactions.find(reaction => user?.id && reaction.users.includes(user.id));
  };

  const hasUserReactedToMessage = () => {
    return reactions.some(reaction => user?.id && reaction.users.includes(user.id));
  };

  return (
    <div className="flex items-center space-x-1 mt-1">
      {/* Existing reactions */}
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          onClick={() => handleEmojiClick(reaction.emoji)}
          className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs transition-all ${
            hasUserReacted(reaction)
              ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 border border-primary-300'
              : 'bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-600 dark:text-gray-400'
          }`}
        >
          <span>{reaction.emoji}</span>
          <span>{reaction.count}</span>
        </button>
      ))}

      {/* Add reaction button */}
      <div className="relative">
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="w-7 h-7 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 flex items-center justify-center text-gray-500 dark:text-gray-400 transition-all hover:scale-110"
          title="Ajouter une réaction"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-.464 5.535a1 1 0 10-1.415-1.414 3 3 0 01-4.242 0 1 1 0 00-1.415 1.414 5 5 0 007.072 0z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Emoji picker */}
        {showEmojiPicker && (
          <>
            <div 
              className="fixed inset-0 z-20" 
              onClick={() => setShowEmojiPicker(false)}
            />
            <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl p-3 z-30 min-w-[200px]">
              <div className="grid grid-cols-4 gap-2">
                {commonEmojis.map((emoji) => {
                  const userReaction = getUserReaction();
                  const isCurrentReaction = userReaction?.emoji === emoji;
                  
                  return (
                    <button
                      key={emoji}
                      onClick={() => handleEmojiClick(emoji)}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all hover:scale-110 text-lg ${
                        isCurrentReaction 
                          ? 'bg-primary-100 dark:bg-primary-900 border-2 border-primary-500'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
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
    </div>
  );
};

export default MessageReactions;