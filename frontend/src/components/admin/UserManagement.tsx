'use client';

import React, { useState, useEffect } from 'react';
import axiosInstance from '@/utils/axiosInstance';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface User {
  _id: string;
  username: string;
  email: string;
  isBlocked: boolean;
  createdAt: string;
  lastSeen: string;
  isOnline: boolean;
  age?: number;
  ville?: string;
  sexe?: string;
}

interface UserManagementProps {
  onUserAction?: (action: string, userId: string) => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ onUserAction }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  useEffect(() => {
    fetchUsers();
  }, [currentPage, search, statusFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/admin/users', {
        params: {
          page: currentPage,
          limit: 20,
          search,
          status: statusFilter
        }
      });
      
      setUsers(response.data.users);
      setTotalPages(response.data.pagination.pages);
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserBlock = async (userId: string, isBlocked: boolean) => {
    try {
      const reason = isBlocked ? prompt('Raison du blocage (optionnel):') : null;
      
      await axiosInstance.put(`/admin/users/${userId}/block`, { 
        isBlocked: !isBlocked,
        reason 
      });
      
      fetchUsers();
      onUserAction?.(isBlocked ? 'unblock' : 'block', userId);
    } catch (error) {
      console.error('Erreur lors du blocage/déblocage:', error);
    }
  };

  const handleUserDelete = async (userId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.')) {
      return;
    }
    
    try {
      await axiosInstance.delete(`/admin/users/${userId}`);
      fetchUsers();
      onUserAction?.('delete', userId);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    }
  };

  const handleBulkAction = async (action: 'block' | 'unblock' | 'delete') => {
    if (selectedUsers.length === 0) return;
    
    const confirmMessage = action === 'delete' 
      ? `Supprimer ${selectedUsers.length} utilisateur(s) ? Cette action est irréversible.`
      : `${action === 'block' ? 'Bloquer' : 'Débloquer'} ${selectedUsers.length} utilisateur(s) ?`;
    
    if (!confirm(confirmMessage)) return;

    try {
      const promises = selectedUsers.map(userId => {
        if (action === 'delete') {
          return axiosInstance.delete(`/admin/users/${userId}`);
        } else {
          return axiosInstance.put(`/admin/users/${userId}/block`, { 
            isBlocked: action === 'block' 
          });
        }
      });

      await Promise.all(promises);
      setSelectedUsers([]);
      fetchUsers();
    } catch (error) {
      console.error('Erreur lors de l\'action groupée:', error);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllUsers = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(user => user._id));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Gestion des Utilisateurs
        </h2>
        
        {/* Filtres et recherche */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Rechercher par nom ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value as 'all' | 'active' | 'blocked')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">Tous les utilisateurs</option>
            <option value="active">Utilisateurs actifs</option>
            <option value="blocked">Utilisateurs bloqués</option>
          </select>
        </div>

        {/* Actions groupées */}
        {selectedUsers.length > 0 && (
          <div className="flex gap-2 mb-4 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
            <span className="text-sm text-blue-700 dark:text-blue-300 mr-4">
              {selectedUsers.length} utilisateur(s) sélectionné(s)
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction('block')}
            >
              Bloquer
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction('unblock')}
            >
              Débloquer
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction('delete')}
              className="text-red-600 border-red-600 hover:bg-red-50"
            >
              Supprimer
            </Button>
          </div>
        )}
      </div>

      {/* Tableau des utilisateurs */}
      <div className="overflow-x-auto">
        <table className="w-full table-auto">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-3 px-4">
                <input
                  type="checkbox"
                  checked={selectedUsers.length === users.length && users.length > 0}
                  onChange={selectAllUsers}
                  className="rounded"
                />
              </th>
              <th className="text-left py-3 px-4 text-gray-900 dark:text-white">Utilisateur</th>
              <th className="text-left py-3 px-4 text-gray-900 dark:text-white">Informations</th>
              <th className="text-left py-3 px-4 text-gray-900 dark:text-white">Statut</th>
              <th className="text-left py-3 px-4 text-gray-900 dark:text-white">Dernière connexion</th>
              <th className="text-left py-3 px-4 text-gray-900 dark:text-white">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="py-3 px-4">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user._id)}
                    onChange={() => toggleUserSelection(user._id)}
                    className="rounded"
                  />
                </td>
                
                <td className="py-3 px-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${user.isOnline ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{user.username}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                    </div>
                  </div>
                </td>
                
                <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                  <div className="text-sm">
                    {user.age && <p>Âge: {user.age} ans</p>}
                    {user.ville && <p>Ville: {user.ville}</p>}
                    {user.sexe && <p>Sexe: {user.sexe}</p>}
                  </div>
                </td>
                
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.isBlocked 
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      : user.isOnline
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                  }`}>
                    {user.isBlocked ? 'Bloqué' : user.isOnline ? 'En ligne' : 'Hors ligne'}
                  </span>
                </td>
                
                <td className="py-3 px-4 text-gray-600 dark:text-gray-400 text-sm">
                  {new Date(user.lastSeen).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </td>
                
                <td className="py-3 px-4">
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUserBlock(user._id, user.isBlocked)}
                      className={user.isBlocked ? 'text-green-600 border-green-600' : 'text-yellow-600 border-yellow-600'}
                    >
                      {user.isBlocked ? 'Débloquer' : 'Bloquer'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUserDelete(user._id)}
                      className="text-red-600 border-red-600 hover:bg-red-50"
                    >
                      Supprimer
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Précédent
          </Button>
          
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {currentPage} sur {totalPages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Suivant
          </Button>
        </div>
      )}
    </Card>
  );
};

export default UserManagement;