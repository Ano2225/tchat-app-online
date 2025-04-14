import React, { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { Users, User, CircleUser, Circle } from 'lucide-react';

interface UsersOnlineProps {
  socket: Socket | null;
}

const UsersOnline: React.FC<UsersOnlineProps> = ({ socket }) => {
  const [users, setUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!socket) return;

    // Recevoir la liste des utilisateurs connectés
    const handleUpdateUserList = (userList: string[]) => {
      setUsers(userList);
    };

    socket.on('update_user_list', handleUpdateUserList);

    return () => {
      socket.off('update_user_list', handleUpdateUserList);
    };
  }, [socket]);

  return (
    <div className="bg-white rounded-lg shadow-md p-4 max-w-md mx-auto">
      <div className="flex items-center border-b border-gray-200 pb-3 mb-4">
        <Users className="text-blue-500 mr-2" size={24} />
        <h3 className="text-lg font-semibold text-gray-800">Utilisateurs en ligne</h3>
        <div className="ml-auto bg-blue-100 text-blue-800 rounded-full px-2 py-1 text-xs font-medium">
          {users.length}
        </div>
      </div>
      
      {users.length === 0 ? (
        <div className="flex flex-col items-center py-6 text-gray-500">
          <CircleUser size={48} className="mb-2 opacity-40" />
          <p>Aucun utilisateur en ligne</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {users.map((username, index) => (
            <li key={index} className="flex items-center p-2 hover:bg-gray-50 rounded-md transition-colors">
              <div className="mr-3 relative">
                <User size={20} className="text-gray-600" />
                <Circle size={8} className="absolute bottom-0 right-0 text-green-500 fill-green-500" />
              </div>
              <span className="text-gray-700">{username}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default UsersOnline;