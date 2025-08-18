import React, { useState } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { AdminBreadcrumb } from './AdminBreadcrumb';

interface AdminLayoutProps {
  children: React.ReactNode;
  currentPage?: string;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, currentPage = 'dashboard' }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="admin-layout min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminHeader
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        sidebarCollapsed={sidebarCollapsed}
      />

      <div className="flex">
        <AdminSidebar collapsed={sidebarCollapsed} currentPage={currentPage} />
        <main
          className={`flex-1 transition-all duration-300 ${
            sidebarCollapsed ? 'ml-16' : 'ml-64'
          }`}
        >
          <div className="p-6">
            <AdminBreadcrumb currentPage={currentPage} />
            <div className="mt-4">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
