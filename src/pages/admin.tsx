import { Navigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';

export default function Admin() {
  const { isSuperAdmin } = usePermissions();
  
  if (!isSuperAdmin) {
    return <Navigate to="/no-access" replace />;
  }
  
  // Redirect to organizations as the default admin page
  return <Navigate to="/admin/organizations" replace />;
}