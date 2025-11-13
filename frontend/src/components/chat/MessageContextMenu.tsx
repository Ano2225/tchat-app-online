import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import ReportModal from '@/components/ui/ReportModal';
import UserSelectedModal from '../UserSelected/UserSelectedModal';
import axiosInstance from '@/utils/axiosInstance';
import toast from 'react-hot-toast';
import styles from './MessageContextMenu.module.css';

interface Message {
  _id: string;
  sender: {
    _id: string;
    username: string;
  };
  content: string;
  createdAt: string;
}

interface MessageContextMenuProps {
  message: Message;
  onReply: (message: Message) => void;
  onClose: () => void;
  position: { x: number; y: number };
  socket: any;
  isOwnMessage?: boolean;
}

const MessageContextMenu: React.FC<MessageContextMenuProps> = ({
  message,
  onReply,
  onClose,
  position,
  socket,
  isOwnMessage: isOwnMessageProp,
}) => {
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Message['sender'] | null>(null);
  const user = useAuthStore((state) => state.user);

  const isOwnMessage = isOwnMessageProp ?? message.sender._id === user?.id;
  


  const handleReply = () => {
    onReply(message);
    onClose();
  };

  const handleBlock = async () => {
    try {
      await axiosInstance.post(`/reports/block/${message.sender._id}`);
      toast.success(`${message.sender.username} a été bloqué`);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Erreur lors du blocage';
      toast.error(errorMessage);
    }
    onClose();
  };

  const handleReport = () => {
    console.log('Opening report modal for user:', message.sender.username);
    setShowReportModal(true);
  };

  const handleReportClose = () => {
    setShowReportModal(false);
    onClose();
  };

  return (
    <>
      <div
        data-context-menu
        className={`fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg py-1 z-[9999] w-40 ${styles.contextMenu}`}
        style={{
          left: position.x,
          top: position.y
        }}
      >
        <button
          onClick={handleReply}
          className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          <span>Répondre</span>
        </button>

        {!isOwnMessage && (
          <>
            <button
              onClick={() => setSelectedUser(message.sender)}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>Message privé</span>
            </button>

            <hr className="border-gray-200 dark:border-gray-600 my-1" />
            <button
              onClick={handleBlock}
              className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2 text-red-600 dark:text-red-400 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
              </svg>
              <span>Bloquer</span>
            </button>

            <button
              onClick={handleReport}
              className="w-full px-3 py-2 text-left text-sm hover:bg-orange-50 dark:hover:bg-orange-900/20 flex items-center space-x-2 text-orange-600 dark:text-orange-400 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span>Signaler</span>
            </button>
          </>
        )}
      </div>

      {showReportModal && (
        <ReportModal
          targetUserId={message.sender._id}
          username={message.sender.username}
          onClose={handleReportClose}
        />
      )}
      
      {/* Debug */}
      {showReportModal && console.log('ReportModal should be visible:', showReportModal)}

      {selectedUser && (
        <UserSelectedModal
          userId={selectedUser._id}
          socket={socket}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </>
  );
};

export default MessageContextMenu;