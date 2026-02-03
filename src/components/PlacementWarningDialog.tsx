import React from 'react';

interface PlacementWarningDialogProps {
  isOpen: boolean;
  sectionName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const PlacementWarningDialog: React.FC<PlacementWarningDialogProps> = ({
  isOpen,
  sectionName,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 print:hidden">
      <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
        <h3 className="text-lg font-bold mb-4 text-gray-900">⚠️ Section Placement Warning</h3>
        <p className="text-gray-700 mb-6">
          The <strong>{sectionName}</strong> section may be too large to fit in the sidebar and content could be cut off or overflow. 
          Are you sure you want to move it?
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Move Anyway
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlacementWarningDialog;
