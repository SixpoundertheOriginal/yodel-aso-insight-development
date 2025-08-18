import React from 'react';

interface AdminBreadcrumbProps {
  currentPage: string;
}

const labels: Record<string, string> = {
  dashboard: 'Dashboard',
  organizations: 'Organizations',
  users: 'Users',
  partnerships: 'Partnerships',
  bigquery: 'BigQuery',
  security: 'Security',
};

export const AdminBreadcrumb: React.FC<AdminBreadcrumbProps> = ({ currentPage }) => {
  return (
    <nav className="text-sm text-gray-500 dark:text-gray-400" aria-label="Breadcrumb">
      <ol className="list-none p-0 inline-flex">
        <li className="flex items-center">
          <span>Admin</span>
        </li>
        <li className="flex items-center">
          <span className="mx-2">/</span>
          <span className="text-gray-700 dark:text-gray-200 capitalize">
            {labels[currentPage] || currentPage}
          </span>
        </li>
      </ol>
    </nav>
  );
};

export default AdminBreadcrumb;
