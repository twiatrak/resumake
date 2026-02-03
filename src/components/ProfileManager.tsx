import React, { useState } from 'react';
import { ProfileData } from '../utils/profiles';

interface ProfileManagerProps {
  profiles: Record<string, ProfileData>;
  activeProfileId: string;
  onProfileChange: (profileId: string) => void;
  onCreateProfile: (name: string) => void;
  onRenameProfile: (profileId: string, newName: string) => void;
  onDuplicateProfile: (profileId: string) => void;
  onDeleteProfile: (profileId: string) => void;
}

const ProfileManager: React.FC<ProfileManagerProps> = ({
  profiles,
  activeProfileId,
  onProfileChange,
  onCreateProfile,
  onRenameProfile,
  onDuplicateProfile,
  onDeleteProfile,
}) => {
  const [showActions, setShowActions] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [renamingProfileId, setRenamingProfileId] = useState<string | null>(null);

  const profileIds = Object.keys(profiles);
  const activeProfile = profiles[activeProfileId];

  const handleCreate = () => {
    if (newProfileName.trim()) {
      onCreateProfile(newProfileName.trim());
      setNewProfileName('');
      setShowCreateDialog(false);
    }
  };

  const handleRename = () => {
    if (renamingProfileId && newProfileName.trim()) {
      onRenameProfile(renamingProfileId, newProfileName.trim());
      setNewProfileName('');
      setRenamingProfileId(null);
      setShowRenameDialog(false);
    }
  };

  const handleDuplicate = () => {
    onDuplicateProfile(activeProfileId);
  };

  const handleDelete = () => {
    if (profileIds.length <= 1) {
      alert('Cannot delete the last remaining profile.');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete the profile "${activeProfile?.name}"? This action cannot be undone.`
    );

    if (confirmed) {
      onDeleteProfile(activeProfileId);
    }
  };

  const openRenameDialog = () => {
    setRenamingProfileId(activeProfileId);
    setNewProfileName(activeProfile?.name || '');
    setShowRenameDialog(true);
    setShowActions(false);
  };

  const openCreateDialog = () => {
    setNewProfileName('');
    setShowCreateDialog(true);
    setShowActions(false);
  };

  return (
    <div className="mb-4 flex flex-col items-center gap-2 border-t pt-4">
      <div className="text-sm font-semibold text-gray-700 mb-1">Profile</div>
      
      <div className="flex items-center gap-2">
        <select
          value={activeProfileId}
          onChange={(e) => onProfileChange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {profileIds.map((id) => (
            <option key={id} value={id}>
              {profiles[id].name}
            </option>
          ))}
        </select>

        <button
          onClick={() => setShowActions(!showActions)}
          className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
          title="Profile actions"
        >
          ⚙️
        </button>
      </div>

      {showActions && (
        <div className="flex flex-wrap gap-2 mt-2">
          <button
            onClick={openCreateDialog}
            className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors text-sm"
            title="Create new profile"
          >
            New
          </button>
          <button
            onClick={openRenameDialog}
            className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors text-sm"
            title="Rename current profile"
          >
            Rename
          </button>
          <button
            onClick={handleDuplicate}
            className="px-3 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors text-sm"
            title="Duplicate current profile"
          >
            Duplicate
          </button>
          <button
            onClick={handleDelete}
            disabled={profileIds.length <= 1}
            className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title="Delete current profile"
          >
            Delete
          </button>
        </div>
      )}

      {/* Create Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Create New Profile</h3>
            <input
              type="text"
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Profile name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowCreateDialog(false);
                  setNewProfileName('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newProfileName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Dialog */}
      {showRenameDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Rename Profile</h3>
            <input
              type="text"
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              placeholder="Profile name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowRenameDialog(false);
                  setRenamingProfileId(null);
                  setNewProfileName('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRename}
                disabled={!newProfileName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileManager;
