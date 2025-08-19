import React from 'react';
import { useNavigate } from 'react-router-dom';
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

interface NavigationItem {
  id: string;
  label: string;
  icon: any;
  href: string;
  status: 'ready' | 'in_development' | 'coming_soon' | 'placeholder';
}

interface AdminSidebarProps {
  collapsed: boolean;
  currentPage: string;
}

const navigationConfig: Record<string, NavigationItem['status']> = {
  dashboard: 'ready',
  organizations: 'in_development',
  users: 'in_development',
  'system-status': 'placeholder',
  roles: 'placeholder',
  invitations: 'placeholder',
  bigquery: 'placeholder',
  analytics: 'coming_soon',
  partnerships: 'coming_soon',
  'client-access': 'coming_soon',
  billing: 'coming_soon',
  'user-analytics': 'coming_soon',
  apps: 'coming_soon',
  pipeline: 'coming_soon',
  quality: 'coming_soon',
  audit: 'coming_soon',
  security: 'coming_soon',
  compliance: 'coming_soon',
  'access-review': 'coming_soon',
};

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ collapsed, currentPage }) => {
  const navigate = useNavigate();

  const getStatusBadge = (status: NavigationItem['status']) => {
    switch (status) {
      case 'ready':
        return <span className="bg-green-500 w-2 h-2 rounded-full ml-2" />;
      case 'in_development':
        return (
          <span className="bg-yellow-500 text-xs px-1 rounded ml-2">DEV</span>
        );
      case 'coming_soon':
        return (
          <span className="bg-gray-500 text-xs px-1 rounded ml-2">SOON</span>
        );
      case 'placeholder':
        return <span className="bg-red-500 w-2 h-2 rounded-full ml-2" />;
    }
  };

  const handleNavigation = (item: NavigationItem) => {
    if (item.status === 'ready') {
      navigate(item.href);
    } else {
      navigate(`/admin/placeholder?feature=${item.id}&status=${item.status}`);
    }
  };

  const navigationItems: { section: string; items: NavigationItem[] }[] = [
    {
      section: 'Platform Overview',
      items: [
        {
          id: 'dashboard',
          label: 'Executive Dashboard',
          icon: BarChart3,
          href: '/admin?tab=dashboard',
          status: navigationConfig['dashboard'],
        },
        {
          id: 'system-status',
          label: 'System Health',
          icon: Activity,
          href: '/admin/system-status',
          status: navigationConfig['system-status'],
        },
        {
          id: 'analytics',
          label: 'Platform Analytics',
          icon: TrendingUp,
          href: '/admin/analytics',
          status: navigationConfig['analytics'],
        },
      ],
    },
    {
      section: 'Organization Management',
      items: [
        {
          id: 'organizations',
          label: 'Organizations',
          icon: Building2,
          href: '/admin?tab=organizations',
          status: navigationConfig['organizations'],
        },
        {
          id: 'partnerships',
          label: 'Partnerships',
          icon: Handshake,
          href: '/admin/partnerships',
          status: navigationConfig['partnerships'],
        },
        {
          id: 'client-access',
          label: 'Client Access',
          icon: Lock,
          href: '/admin/client-access',
          status: navigationConfig['client-access'],
        },
        {
          id: 'billing',
          label: 'Billing Overview',
          icon: FileText,
          href: '/admin/billing',
          status: navigationConfig['billing'],
        },
      ],
    },
    {
      section: 'User Management',
      items: [
        {
          id: 'users',
          label: 'All Users',
          icon: Users,
          href: '/admin?tab=users',
          status: navigationConfig['users'],
        },
        {
          id: 'roles',
          label: 'Role Management',
          icon: Shield,
          href: '/admin/roles',
          status: navigationConfig['roles'],
        },
        {
          id: 'invitations',
          label: 'Invitations',
          icon: Mail,
          href: '/admin/invitations',
          status: navigationConfig['invitations'],
        },
        {
          id: 'user-analytics',
          label: 'User Analytics',
          icon: BarChart3,
          href: '/admin/user-analytics',
          status: navigationConfig['user-analytics'],
        },
      ],
    },
    {
      section: 'Data Management',
      items: [
        {
          id: 'bigquery',
          label: 'BigQuery Clients',
          icon: Database,
          href: '/admin/bigquery',
          status: navigationConfig['bigquery'],
        },
        {
          id: 'apps',
          label: 'App Approvals',
          icon: CheckCircle,
          href: '/admin/apps',
          status: navigationConfig['apps'],
        },
        {
          id: 'pipeline',
          label: 'Data Pipeline',
          icon: RefreshCw,
          href: '/admin/pipeline',
          status: navigationConfig['pipeline'],
        },
        {
          id: 'quality',
          label: 'Data Quality',
          icon: CheckCircle,
          href: '/admin/quality',
          status: navigationConfig['quality'],
        },
      ],
    },
    {
      section: 'Security & Compliance',
      items: [
        {
          id: 'audit',
          label: 'Audit Logs',
          icon: FileText,
          href: '/admin/audit',
          status: navigationConfig['audit'],
        },
        {
          id: 'security',
          label: 'Security Monitor',
          icon: Shield,
          href: '/admin/security',
          status: navigationConfig['security'],
        },
        {
          id: 'compliance',
          label: 'Compliance',
          icon: CheckCircle,
          href: '/admin/compliance',
          status: navigationConfig['compliance'],
        },
        {
          id: 'access-review',
          label: 'Access Reviews',
          icon: Users,
          href: '/admin/access-review',
          status: navigationConfig['access-review'],
        },
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
                const isActive = currentPage === item.id;
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item)}
                    className={`w-full flex items-center px-4 py-3 text-left text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-orange-500/10 text-orange-400 border-r-2 border-orange-400'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    <IconComponent
                      className={`${collapsed ? 'w-5 h-5' : 'w-5 h-5 mr-3'} flex-shrink-0`}
                    />
                    {!collapsed && (
                      <span className="flex items-center">
                        {item.label}
                        {getStatusBadge(item.status)}
                      </span>
                    )}
                  </button>
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
