import React, { useState } from 'react';

interface ShareableLinkModalProps {
  isOpen: boolean;
  onApplyTemporarily: () => void;
  onSaveAsNewProfile: (name: string) => void;
  onCancel: () => void;
}

const ShareableLinkModal: React.FC<ShareableLinkModalProps> = ({
  isOpen,
  onApplyTemporarily,
  onSaveAsNewProfile,
  onCancel,
}) => {
  const [profileName, setProfileName] = useState('Imported from Link');
  const [showNameInput, setShowNameInput] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleSaveAsNewProfile = () => {
    if (profileName.trim()) {
      onSaveAsNewProfile(profileName.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 print:hidden">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Settings Found in Link
        </h2>
        
        <p className="text-gray-700 mb-6">
          This link contains resume settings. How would you like to use them?
        </p>

        {showNameInput ? (
          <div className="mb-6">
            <label htmlFor="profile-name" className="block text-sm font-medium text-gray-700 mb-2">
              Profile Name
            </label>
            <input
              id="profile-name"
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter profile name"
              autoFocus
            />
          </div>
        ) : null}

        <div className="flex flex-col gap-3">
          {!showNameInput ? (
            <>
              <button
                onClick={onApplyTemporarily}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Apply Temporarily
              </button>
              
              <button
                onClick={() => setShowNameInput(true)}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Save as New Profile
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleSaveAsNewProfile}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                disabled={!profileName.trim()}
              >
                Save Profile
              </button>
              
              <button
                onClick={() => setShowNameInput(false)}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Back
              </button>
            </>
          )}
          
          <button
            onClick={onCancel}
            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>

        <div className="mt-4 text-xs text-gray-600">
          <p className="mb-2">
            <strong>Apply Temporarily:</strong> Use these settings without saving. Your current profile won't be changed.
          </p>
          <p>
            <strong>Save as New Profile:</strong> Create a new profile with these settings that you can switch to later.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShareableLinkModal;
