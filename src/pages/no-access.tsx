import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useAccessControl } from '@/hooks/useAccessControl';
import { logAccessDenied } from '@/lib/analytics/accessDeniedEvent';
import { ShieldX, LogOut, Mail } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const NoAccess = () => {
  const { signOut, user } = useAuth();
  const { organizationId, roles, isSuperAdmin } = usePermissions();
  const location = useLocation();
  const { accessDenialReason } = useAccessControl(location.pathname + location.search);

  // Log access denied event for troubleshooting
  useEffect(() => {
    if (user) {
      // Determine reason for access denial
      let reason: 'no-organization' | 'no-roles' | 'other' = 'other';
      if (!organizationId) {
        reason = 'no-organization';
      } else if (!roles?.length) {
        reason = 'no-roles';
      }

      // Log using centralized analytics service
      logAccessDenied({
        userId: user.id,
        email: user.email,
        organizationId,
        roles: roles || [],
        isSuperAdmin: isSuperAdmin || false,
        reason,
        userAgent: navigator.userAgent,
        path: location.pathname,
      });
    }
  }, [user, organizationId, roles, isSuperAdmin, location.pathname]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleContactSupport = () => {
    // You can customize this with your support email or help desk link
    window.location.href = 'mailto:support@yodel-aso.com?subject=Account Access Request';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
          <CardHeader className="text-center">
            {/* Branding */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-yodel-orange to-orange-600 shadow-lg">
                <span className="text-lg font-bold text-foreground">Y</span>
              </div>
              <span className="text-2xl font-bold text-foreground">Yodel ASO</span>
            </div>

            {/* Access Denied Icon */}
            <div className="flex justify-center mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20 border-2 border-red-500/30">
                <ShieldX className="h-8 w-8 text-red-400" />
              </div>
            </div>

            <CardTitle className="text-foreground text-xl mb-2">
              No access to this application
            </CardTitle>
            <CardDescription className="text-zinc-400 text-base leading-relaxed">
              Your account is not assigned to any organization or lacks the required permissions to access this application.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Contact Administrator Message */}
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 text-center">
              <p className="text-zinc-300 text-sm mb-3">
                Please contact your administrator to request access to this application.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleContactSupport}
                  className="border-zinc-600 text-zinc-300 hover:bg-zinc-700 hover:text-foreground"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Contact Support
                </Button>
              </div>
            </div>

            {/* Sign Out Button */}
            <div className="pt-2">
              <Button
                onClick={handleSignOut}
                className="w-full bg-gradient-to-r from-yodel-orange to-orange-600 hover:from-orange-600 hover:to-orange-700 text-foreground font-medium"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>

            {/* User Info for Support (only in development) */}
            {process.env.NODE_ENV === 'development' && user && (
              <details className="text-xs text-zinc-500 mt-4">
                <summary className="cursor-pointer hover:text-zinc-400">Debug Info (dev only)</summary>
                <div className="mt-2 p-2 bg-zinc-800/30 rounded text-left font-mono">
                  <div>User: {user.email}</div>
                  <div>ID: {user.id}</div>
                  <div>Org: {organizationId || 'null'}</div>
                  <div>Roles: {roles?.length ? roles.join(', ') : 'none'}</div>
                  <div>Super Admin: {isSuperAdmin ? 'yes' : 'no'}</div>
                </div>
              </details>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-zinc-500">
          If you believe this is an error, please contact your system administrator.
        </div>
      </div>
    </div>
  );
};

export default NoAccess;