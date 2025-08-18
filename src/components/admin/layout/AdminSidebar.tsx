import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  Building2,
  CheckCircle,
  Database,
  FileText,
  Handshake,
  Lock,
  Mail,
  RefreshCw,
  Shield,
  TrendingUp,
  Users,
} from 'lucide-react';

interface AdminSidebarProps {
  collapsed: boolean;
  currentPage: string;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ collapsed, currentPage }) => {
  const location = useLocation();

  const navigationItems = [
    {
      section: 'Platform Overview',
      items: [
        { id: 'dashboard', label: 'Executive Dashboard', icon: BarChart3, href: '/admin' },
        { id: 'system-status', label: 'System Health', icon: Activity, href: '/admin/system-status' },
        { id: 'analytics', label: 'Platform Analytics', icon: TrendingUp, href: '/admin/analytics' },
      ],
    },
    {
      section: 'Organization Management',
      items: [
        { id: 'organizations', label: 'Organizations', icon: Building2, href: '/admin/organizations' },
        { id: 'partnerships', label: 'Partnerships', icon: Handshake, href: '/admin/partnerships' },
        { id: 'client-access', label: 'Client Access', icon: Lock, href: '/admin/client-access' },
        { id: 'billing', label: 'Billing Overview', icon: FileText, href: '/admin/billing' },
      ],
    },
    {
      section: 'User Management',
      items: [
        { id: 'users', label: 'All Users', icon: Users, href: '/admin/users' },
        { id: 'roles', label: 'Role Management', icon: Shield, href: '/admin/roles' },
        { id: 'invitations', label: 'Invitations', icon: Mail, href: '/admin/invitations' },
        { id: 'user-analytics', label: 'User Analytics', icon: BarChart3, href: '/admin/user-analytics' },
      ],
    },
    {
      section: 'Data Management',
      items: [
        { id: 'bigquery', label: 'BigQuery Clients', icon: Database, href: '/admin/bigquery' },
        { id: 'apps', label: 'App Approvals', icon: CheckCircle, href: '/admin/apps' },
        { id: 'pipeline', label: 'Data Pipeline', icon: RefreshCw, href: '/admin/pipeline' },
        { id: 'quality', label: 'Data Quality', icon: CheckCircle, href: '/admin/quality' },
      ],
    },
    {
      section: 'Security & Compliance',
      items: [
        { id: 'audit', label: 'Audit Logs', icon: FileText, href: '/admin/audit' },
        { id: 'security', label: 'Security Monitor', icon: Shield, href: '/admin/security' },
        { id: 'compliance', label: 'Compliance', icon: CheckCircle, href: '/admin/compliance' },
        { id: 'access-review', label: 'Access Reviews', icon: Users, href: '/admin/access-review' },
      ],
    },
  ];

  return (
    <aside
      className={`fixed left-0 top-16 h-[calc(100vh-4rem)] bg-gray-900 border-r border-gray-800 transition-all duration-300 z-30 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="h-full overflow-y-auto py-4">
        {navigationItems.map((section) => (
          <div key={section.section} className="mb-6">
            {!collapsed && (
              <h3 className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {section.section}
              </h3>
            )}
            <nav className="space-y-1">
              {section.items.map((item) => {
                const isActive = currentPage === item.id || location.pathname === item.href;
                const IconComponent = item.icon;
                return (
                  <NavLink
                    key={item.id}
                    to={item.href}
                    className={`flex items-center px-4 py-3 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-orange-500/10 text-orange-400 border-r-2 border-orange-400'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    <IconComponent className={`${collapsed ? 'w-5 h-5' : 'w-5 h-5 mr-3'} flex-shrink-0`} />
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
