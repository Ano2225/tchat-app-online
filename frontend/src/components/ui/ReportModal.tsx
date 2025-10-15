'use client';

import React, { useState } from 'react';
import { reportService } from '@/services/reportService';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  username: string;
}

const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, userId, username }) => {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const reasons = [
    { value: 'spam', label: 'Spam' },
    { value: 'harassment', label: 'Harcèlement' },
    { value: 'inappropriate_content', label: 'Contenu inapproprié' },
    { value: 'fake_profile', label: 'Faux profil' },
    { value: 'other', label: 'Autre' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) return;

    setLoading(true);
    try {
      await reportService.reportUser(userId, reason, description);
      alert('Signalement envoyé avec succès');
      onClose();
    } catch (error) {
      alert('Erreur lors du signalement');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Signaler {username}
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Raison du signalement
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            >
              <option value="">Sélectionner une raison</option>
              {reasons.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description (optionnel)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !reason}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
            >
              {loading ? 'Envoi...' : 'Signaler'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportModal;