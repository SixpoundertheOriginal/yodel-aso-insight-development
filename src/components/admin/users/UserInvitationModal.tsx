import React, { useState, useEffect } from 'react';
import { X, UserPlus } from 'lucide-react';
import { Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface UserInvitationModalProps {
  onClose: () => void;
  onInvite: (userData: {
    email: string;
    roles: string[];
    organization_id: string;
    first_name?: string;
    last_name?: string;
  }) => void;
}

export const UserInvitationModal: React.FC<UserInvitationModalProps> = ({
  onClose,
  onInvite
}) => {
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    roles: ['viewer'],
    organization_id: ''
  });
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      const { data: response, error } = await supabase.functions.invoke('admin-organizations');
      if (error) throw error;
      if (response?.success) {
        setOrganizations(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load organizations:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onInvite(formData);
    } catch (error) {
      console.error('Invitation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { value: 'super_admin', label: 'Super Admin', description: 'Full platform access' },
    { value: 'org_admin', label: 'Organization Admin', description: 'Full organization access' },
    { value: 'aso_manager', label: 'ASO Manager', description: 'ASO data and insights access' },
    { value: 'analyst', label: 'Analyst', description: 'Read-only data access' },
    { value: 'viewer', label: 'Viewer', description: 'Basic dashboard access' },
    { value: 'client', label: 'Client', description: 'Limited client portal access' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <UserPlus className="w-5 h-5 mr-2 text-orange-400" />
            Invite User
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                First Name
              </label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Last Name
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Organization *
            </label>
            <select
              required
              value={formData.organization_id}
              onChange={(e) => setFormData({ ...formData, organization_id: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Select Organization</option>
              {organizations.map((org: any) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Roles *
            </label>
            <select
              multiple
              required
              value={formData.roles}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  roles: Array.from(e.target.selectedOptions, option => option.value)
                })
              }
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {roles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Hold Ctrl/Command to select multiple roles
            </p>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-600 rounded-md text-gray-300 hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Sending...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
