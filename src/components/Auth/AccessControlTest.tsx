import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useAccessControl } from '@/hooks/useAccessControl';
import { Badge } from '@/components/ui/badge';
import { useLocation } from 'react-router-dom';

/**
 * Test component for verifying No Access implementation
 * Only shows in development environment
 */
export const AccessControlTest: React.FC = () => {
  const { user } = useAuth();
  const { organizationId, roles, isSuperAdmin, isLoading } = usePermissions();
  const location = useLocation();
  const currentPath = location.pathname + location.search;
  const accessControl = useAccessControl(currentPath);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const handleTestNoOrgAccess = () => {
    // This would need to be implemented via your admin interface
    // or by temporarily modifying the user's organization in the database
    console.log('To test No Access: Remove user from organization via admin panel');
  };

  const handleTestNoRolesAccess = () => {
    // This would need to be implemented via your admin interface
    // or by temporarily removing user roles in the database
    console.log('To test No Access: Remove all roles from user via admin panel');
  };

  return (
    <Card className="fixed bottom-4 right-4 w-80 max-h-96 overflow-auto bg-blue-950 border-blue-800 text-blue-100 opacity-90 hover:opacity-100 transition-opacity z-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-mono">Access Control Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className="grid grid-cols-2 gap-2">
          <div>User:</div>
          <div className="font-mono">{user?.email?.substring(0, 20)}...</div>
          
          <div>Org ID:</div>
          <div className="font-mono">{organizationId || 'null'}</div>
          
          <div>Roles:</div>
          <div className="flex flex-wrap gap-1">
            {roles?.length ? (
              roles.map((role, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {role}
                </Badge>
              ))
            ) : (
              <span className="text-red-300">none</span>
            )}
          </div>
          
          <div>Super Admin:</div>
          <div>{isSuperAdmin ? '✅' : '❌'}</div>
          
          <div>Loading:</div>
          <div>{isLoading ? '⏳' : '✅'}</div>
        </div>

        <hr className="border-blue-700" />

        <div className="grid grid-cols-2 gap-2">
          <div>Has Access:</div>
          <div>{accessControl.hasAccess ? '✅' : '❌'}</div>
          
          <div>Should Show NoAccess:</div>
          <div>{accessControl.shouldShowNoAccess ? '❌ YES' : '✅ NO'}</div>
          
          <div>Denial Reason:</div>
          <div className="text-orange-300">
            {accessControl.accessDenialReason || 'none'}
          </div>
        </div>

        <hr className="border-blue-700" />

        <div className="space-y-1">
          <Button
            size="sm"
            variant="outline"
            onClick={handleTestNoOrgAccess}
            className="w-full text-xs border-blue-600 text-blue-200 hover:bg-blue-800"
          >
            Test No Organization
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleTestNoRolesAccess}
            className="w-full text-xs border-blue-600 text-blue-200 hover:bg-blue-800"
          >
            Test No Roles
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.location.href = '/no-access'}
            className="w-full text-xs border-blue-600 text-blue-200 hover:bg-blue-800"
          >
            View NoAccess Page
          </Button>
        </div>

        <div className="text-xs text-blue-300 mt-2">
          Path: {currentPath.substring(0, 30)}...
        </div>
      </CardContent>
    </Card>
  );
};

export default AccessControlTest;