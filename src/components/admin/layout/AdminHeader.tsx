import React from 'react';
import { Activity, Menu, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface AdminHeaderProps {
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ onToggleSidebar, sidebarCollapsed }) => {
  const { user } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-gray-900 border-b border-gray-800">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-4">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            {sidebarCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
          </button>

          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">Y</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Admin Panel</h1>
              <p className="text-xs text-gray-400">Platform Administration</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm">
            <Activity className="w-4 h-4 text-green-400" />
            <span className="text-gray-300">System Healthy</span>
          </div>

          <div className="flex items-center space-x-2 px-3 py-2 bg-gray-800 rounded-lg">
            <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white font-medium text-xs">
                {user?.email?.charAt(0).toUpperCase() || 'A'}
              </span>
            </div>
            <span className="text-sm text-gray-300">Super Admin</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
