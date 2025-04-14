'use client';

import React, { useEffect, useState } from 'react';
import axiosInstance from '../../utils/axiosInstance';

interface ChatChannelProps {
  onJoinRoom: (roomName: string) => void;
  currentRoom: string;
}

interface Channel {
  _id: string;
  name: string;
}

const ChatChannel: React.FC<ChatChannelProps> = ({ onJoinRoom, currentRoom }) => {
  const [channels, setChannels] = useState<Channel[]>([]);

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const res = await axiosInstance.get('/channels');
        setChannels(res.data);
      } catch (err) {
        console.error('Erreur lors du chargement des canaux :', err);
      }
    };

    fetchChannels();
  }, []);

  return (
    <div className="w-64 bg-gray-50 border-r p-4 overflow-y-auto">
      <h3 className="text-lg font-semibold mb-4 text-black">📡 Canaux</h3>
      <ul className="space-y-2 text-black">
        {channels.map((channel) => (
          <li key={channel._id}>
            <button
              className={`w-full text-left px-4 py-2 rounded ${
                currentRoom === channel.name ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'
              }`}
              onClick={() => onJoinRoom(channel.name)}
            >
              #{channel.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ChatChannel;
