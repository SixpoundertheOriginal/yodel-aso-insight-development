import React from 'react';

interface AdminHeaderProps {
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ onToggleSidebar, sidebarCollapsed }) => {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 z-40">
      <button
        onClick={onToggleSidebar}
        className="text-gray-600 dark:text-gray-300 focus:outline-none"
        aria-label="Toggle sidebar"
      >
        {sidebarCollapsed ? '➡️' : '⬅️'}
      </button>
      <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Admin Panel</h1>
      <div />
    </header>
  );
};

export default AdminHeader;
