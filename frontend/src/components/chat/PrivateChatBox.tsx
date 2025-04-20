import React, { useEffect, useState, useRef } from 'react';
import { useSocketStore } from '@/store/socketStore';
import { useAuthStore } from '@/store/authStore';

interface PrivateChatBoxProps {
  recipient: {
    id: string;
    username: string;
  };
  onClose?: () => void;
}

const PrivateChatBox: React.FC<PrivateChatBoxProps> = ({ recipient, onClose }) => {
  const { user } = useAuthStore();
  const socket = useSocketStore((state) => state.socket);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // --- Effet pour rejoindre la room privée et récupérer l'historique des messages ---
  useEffect(() => {
    if (!socket || !user) return;

    console.log('Joining private room', recipient.id);

    // Joindre la room privée
    socket.emit('join_private_room', {
      senderId: user.id,
      recipientId: recipient.id,
    });

    // Écoute des messages privés entrants
    const handleMessage = (msg: any) => {
      console.log('Received message:', msg);
      if (
        (msg.sender._id === recipient.id && msg.recipient === user.id) ||
        (msg.sender._id === user.id && msg.recipient === recipient.id)
      ) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    socket.on('receive_private_message', handleMessage);

    // Récupérer l'historique des messages privés
    socket.emit('get_message_history', {
      userId: user.id,
      recipientId: recipient.id,
    });

    // Écoute de l'historique des messages
    socket.on('message_history', (history: any[]) => {
      console.log('Message history:', history);
      setMessages(history);
    });

    // Scroll automatique vers le bas
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }

    return () => {
      socket.off('receive_private_message', handleMessage);
      socket.off('message_history');
    };
  }, [socket, recipient.id, user?.id]);

  // --- Fonction pour envoyer un message ---
  const handleSend = () => {
    if (!message.trim() || !socket || !user) return;

    console.log('Sending message:', message);

    // Créer un message à envoyer
    const newMessage = {
      senderId: user.id,
      recipientId: recipient.id,
      content: message.trim(),
    };

    // Envoyer le message au serveur
    socket.emit('send_private_message', newMessage);

    // Réinitialiser le champ de saisie
    setMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border rounded p-4 bg-white">
      <div className="flex justify-between mb-2">
        <h3 className="font-semibold">Chat avec {recipient.username}</h3>
        {onClose && (
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            X
          </button>
        )}
      </div>
      
      {/* Liste des messages */}
      <div className="h-64 overflow-y-auto border p-2 mb-2 bg-gray-50">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`mb-1 ${msg.sender._id === user?.id ? 'text-right' : 'text-left'}`}
          >
            <span
              className={`inline-block px-3 py-1 rounded ${
                msg.sender._id === user?.id 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-300'
              }`}
            >
              {msg.content}
            </span>
            <span className="text-xs text-gray-500 block mt-1">
              {new Date(msg.createdAt).toLocaleTimeString()}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Formulaire d'envoi */}
      <div className="flex">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Écrivez un message..."
          className="flex-grow border rounded p-2 mr-2"
        />
        <button
          onClick={handleSend}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Envoyer
        </button>
      </div>
    </div>
  );
};

export default PrivateChatBox;
