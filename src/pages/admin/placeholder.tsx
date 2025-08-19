import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { PlaceholderPage } from '@/components/admin/shared/PlaceholderPage';

const featureInfo: Record<string, { title: string; description: string }> = {
  dashboard: { title: 'Executive Dashboard', description: 'Platform overview and key metrics.' },
  organizations: {
    title: 'Organizations Management',
    description: 'Manage organizations and their associated settings.',
  },
  users: {
    title: 'User Management',
    description: 'Administer platform users and their roles.',
  },
  'system-status': {
    title: 'System Health',
    description: 'Monitor overall system performance and uptime.',
  },
  roles: { title: 'Role Management', description: 'Define and assign user roles and permissions.' },
  invitations: {
    title: 'Invitations',
    description: 'Manage invitations for new users to join the platform.',
  },
  bigquery: {
    title: 'BigQuery Clients',
    description: 'Manage BigQuery client connections and usage.',
  },
  analytics: {
    title: 'Platform Analytics',
    description: 'Advanced analytics for platform-wide insights.',
  },
  partnerships: {
    title: 'Partnerships',
    description: 'Manage strategic partnerships and integrations.',
  },
  'client-access': {
    title: 'Client Access',
    description: 'Control client permissions and access levels.',
  },
  billing: {
    title: 'Billing Overview',
    description: 'View and manage billing information and invoices.',
  },
  'user-analytics': {
    title: 'User Analytics',
    description: 'Analyze user behavior and engagement metrics.',
  },
  apps: {
    title: 'App Approvals',
    description: 'Review and approve submitted applications.',
  },
  pipeline: {
    title: 'Data Pipeline',
    description: 'Monitor and manage data ingestion pipelines.',
  },
  quality: {
    title: 'Data Quality',
    description: 'Assess and ensure quality of platform data.',
  },
  audit: { title: 'Audit Logs', description: 'Review system audit trails.' },
  security: {
    title: 'Security Monitor',
    description: 'Track security events and alerts.',
  },
  compliance: {
    title: 'Compliance',
    description: 'Ensure platform adheres to compliance standards.',
  },
  'access-review': {
    title: 'Access Reviews',
    description: 'Periodic review of user access levels.',
  },
};

const PlaceholderRoute: React.FC = () => {
  const [searchParams] = useSearchParams();
  const feature = searchParams.get('feature') || 'dashboard';
  const statusParam = searchParams.get('status');
  const status = (statusParam === 'in_development' ? 'in_development' : 'coming_soon') as
    | 'in_development'
    | 'coming_soon';

  const info = featureInfo[feature] || { title: feature, description: '' };

  return (
    <AdminLayout currentPage={feature}>
      <PlaceholderPage title={info.title} description={info.description} status={status} />
    </AdminLayout>
  );
};

export default PlaceholderRoute;
