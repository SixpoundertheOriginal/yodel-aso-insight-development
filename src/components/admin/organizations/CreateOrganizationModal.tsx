import React from 'react';

interface CreateOrganizationModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateOrganizationModal: React.FC<CreateOrganizationModalProps> = ({ onClose, onSuccess }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Create Organization</h2>
        <p className="text-sm mb-4">This is a placeholder modal.</p>
        <div className="flex justify-end space-x-2">
          <button className="px-3 py-1 text-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            className="px-3 py-1 text-sm bg-orange-600 text-white rounded"
            onClick={onSuccess}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateOrganizationModal;
