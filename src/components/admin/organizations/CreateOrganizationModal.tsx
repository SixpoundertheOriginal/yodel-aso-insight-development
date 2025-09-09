import React, { useState } from 'react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { NewOrganization } from '@/types/organization';

interface CreateOrganizationModalProps {
  onClose: () => void;
  onCreate: (orgData: NewOrganization) => Promise<void>;
  creating?: boolean;
}

export const CreateOrganizationModal: React.FC<CreateOrganizationModalProps> = ({ onClose, onCreate, creating }) => {
  const [formData, setFormData] = useState<NewOrganization>({
    name: '',
    slug: '',
    domain: '',
    subscription_tier: 'professional'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Organization name is required';
    }

    if (!formData.slug.trim()) {
      newErrors.slug = 'Organization slug is required';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = 'Slug can only contain lowercase letters, numbers, and hyphens';
    }

    if (!formData.domain.trim()) {
      newErrors.domain = 'Domain is required';
    } else if (!/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.domain)) {
      newErrors.domain = 'Please enter a valid domain';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setErrors({});
    try {
      await onCreate(formData);
    } catch (err: unknown) {
      const error = err as FunctionsHttpError | Error;
      const message =
        error instanceof FunctionsHttpError
          ? error.context?.error || error.message
          : error.message;
      setErrors({ general: message || 'Failed to create organization' });
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Create Organization</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.general && (
            <div className="text-red-400 text-sm mb-4">
              {errors.general}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            {errors.name && <span className="text-red-400 text-xs">{errors.name}</span>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Slug</label>
            <input
              type="text"
              required
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              className="w-full px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            {errors.slug && <span className="text-red-400 text-xs">{errors.slug}</span>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Domain</label>
            <input
              type="text"
              required
              value={formData.domain}
              onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
              className="w-full px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            {errors.domain && <span className="text-red-400 text-xs">{errors.domain}</span>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Subscription Tier</label>
            <select
              value={formData.subscription_tier}
              onChange={(e) => setFormData({ ...formData, subscription_tier: e.target.value as 'starter' | 'professional' | 'enterprise' })}
              className="w-full px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="starter">Starter</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <button type="button" onClick={onClose} className="px-3 py-1 text-sm border rounded-md">Cancel</button>
            <button
              type="submit"
              disabled={creating}
              className="px-3 py-1 text-sm bg-orange-600 text-white rounded-md disabled:opacity-50"
            >
              {creating ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateOrganizationModal;
