import { useSearchParams } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import AdminDashboard from './admin/AdminDashboard';
import { Navigate } from 'react-router-dom';

export default function Admin() {
  const { isSuperAdmin } = usePermissions();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab');
  
  if (!isSuperAdmin) {
    return <Navigate to="/no-access" replace />;
  }
  
  // If there's a tab parameter, show the dashboard with tabs
  if (tab) {
    return <AdminDashboard />;
  }
  
  // Otherwise redirect to organizations as the default admin page
  return <Navigate to="/admin/organizations" replace />;
}