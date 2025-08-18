import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

interface AdminSidebarProps {
  collapsed: boolean;
  currentPage: string;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ collapsed, currentPage }) => {
  const location = useLocation();
  const getLink = (id: string) => (id === 'dashboard' ? '/admin' : `/admin?tab=${id}`);
  const activeTab = new URLSearchParams(location.search).get('tab') || 'dashboard';

  const navigationSections = [
    {
      title: 'Platform Overview',
      items: [
        { id: 'dashboard', label: 'Executive Dashboard', icon: '📊' },
      ],
    },
    {
      title: 'Organization Management',
      items: [
        { id: 'organizations', label: 'Organizations', icon: '🏢' },
      ],
    },
    {
      title: 'User Management',
      items: [
        { id: 'users', label: 'All Users', icon: '👥' },
      ],
    },
    {
      title: 'Partnerships',
      items: [
        { id: 'partnerships', label: 'Partnerships', icon: '🤝' },
      ],
    },
    {
      title: 'Data Management',
      items: [
        { id: 'bigquery', label: 'BigQuery Clients', icon: '🗄️' },
      ],
    },
    {
      title: 'Security & Compliance',
      items: [
        { id: 'security', label: 'Security Monitor', icon: '🔒' },
      ],
    },
  ];

  return (
    <aside
      className={`fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 z-30 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="h-full overflow-y-auto py-4">
        {navigationSections.map((section) => (
          <div key={section.title} className="mb-6">
            {!collapsed && (
              <h3 className="px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                {section.title}
              </h3>
            )}
            <nav className="space-y-1">
              {section.items.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <NavLink
                    key={item.id}
                    to={getLink(item.id)}
                    className={`flex items-center px-4 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-orange-50 text-orange-600 border-r-2 border-orange-600 dark:bg-orange-900/20 dark:text-orange-400'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="text-lg mr-3">{item.icon}</span>
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default AdminSidebar;
