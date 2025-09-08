import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Code, Database, Shield, User, Zap } from 'lucide-react';
import { 
  DevToolsWrapper, 
  AdminWrapper, 
  DebugInfoWrapper, 
  LiveBadgeWrapper,
  PerformanceMetricsWrapper,
  SystemInfoWrapper 
} from '@/components/PermissionWrapper';
import { useUIPermissions } from '@/hooks/useUIPermissions';
import { useUserProfile } from '@/hooks/useUserProfile';

export const UIPermissionDemo: React.FC = () => {
  const { profile } = useUserProfile();
  const { 
    permissions, 
    loading,
    canAccessDevTools,
    canSeeDebugInfo,
    canSeeLiveBadges,
    canAccessAdminFeatures
  } = useUIPermissions();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Permission Demo...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Permission Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            UI Permission System Demo
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            This demo shows how different UI elements are visible based on your role permissions.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Role:</span>
              <Badge variant="outline">
                {profile?.user_roles?.[0]?.role || 'Unknown'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Dev Tools:</span>
              <Badge variant={canAccessDevTools ? 'default' : 'secondary'}>
                {canAccessDevTools ? 'Allowed' : 'Restricted'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Admin:</span>
              <Badge variant={canAccessAdminFeatures ? 'default' : 'secondary'}>
                {canAccessAdminFeatures ? 'Allowed' : 'Restricted'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Live Badges:</span>
              <Badge variant={canSeeLiveBadges ? 'default' : 'secondary'}>
                {canSeeLiveBadges ? 'Visible' : 'Hidden'}
              </Badge>
            </div>
          </div>

          {/* All Permissions List */}
          <details className="mb-4">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
              View All Permissions ({Object.keys(permissions).length})
            </summary>
            <div className="mt-2 p-3 bg-muted rounded-lg">
              <pre className="text-xs">
                {JSON.stringify(permissions, null, 2)}
              </pre>
            </div>
          </details>
        </CardContent>
      </Card>

      {/* Business Features - Always Visible */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Business Features
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            These core business features are always visible to all users.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Database className="h-4 w-4" />
              <span>Analytics Dashboard</span>
            </div>
            <Badge variant="default">Always Visible</Badge>
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Zap className="h-4 w-4" />
              <span>Performance Metrics</span>
              <LiveBadgeWrapper>
                <Badge variant="secondary" className="text-xs">
                  Live
                </Badge>
              </LiveBadgeWrapper>
            </div>
            <Badge variant="default">Core Feature</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Developer Tools - Conditionally Visible */}
      <DevToolsWrapper>
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <Code className="h-5 w-5" />
              Developer Tools
            </CardTitle>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              These tools are only visible to users with developer permissions.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" size="sm" className="mr-2">
              Test API Connection
            </Button>
            <Button variant="outline" size="sm" className="mr-2">
              Clear Cache
            </Button>
            <Button variant="outline" size="sm">
              Export Debug Data
            </Button>
            
            <DebugInfoWrapper>
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium">Debug Information</summary>
                <div className="mt-2 p-3 bg-yellow-100 dark:bg-yellow-900 rounded text-xs">
                  <pre>
                    {JSON.stringify({
                      userAgent: navigator.userAgent.substring(0, 50) + '...',
                      timestamp: new Date().toISOString(),
                      permissions: Object.keys(permissions).length,
                      role: profile?.user_roles?.[0]?.role
                    }, null, 2)}
                  </pre>
                </div>
              </details>
            </DebugInfoWrapper>
          </CardContent>
        </Card>
      </DevToolsWrapper>

      {/* Admin Tools - Conditionally Visible */}
      <AdminWrapper>
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <Shield className="h-5 w-5" />
              Admin Tools
            </CardTitle>
            <p className="text-sm text-red-700 dark:text-red-300">
              Administrative functions only visible to admin users.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" size="sm" className="mr-2">
              Manage Users
            </Button>
            <Button variant="outline" size="sm" className="mr-2">
              System Settings
            </Button>
            <Button variant="outline" size="sm">
              View Audit Logs
            </Button>

            <SystemInfoWrapper>
              <div className="mt-4 p-3 bg-red-100 dark:bg-red-900 rounded">
                <h4 className="font-medium text-sm mb-2">System Information</h4>
                <div className="text-xs space-y-1">
                  <div>Organization: {profile?.organizations?.name || 'Unknown'}</div>
                  <div>Tier: {profile?.organizations?.subscription_tier || 'Unknown'}</div>
                  <div>Active Permissions: {Object.keys(permissions).length}</div>
                </div>
              </div>
            </SystemInfoWrapper>
          </CardContent>
        </Card>
      </AdminWrapper>

      {/* Performance Metrics - Conditionally Visible */}
      <PerformanceMetricsWrapper>
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
              <Zap className="h-5 w-5" />
              Performance Metrics
            </CardTitle>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Advanced performance data visible to authorized users.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">99.9%</div>
                <div className="text-xs text-blue-500">Uptime</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">1.2s</div>
                <div className="text-xs text-blue-500">Avg Response</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">45ms</div>
                <div className="text-xs text-blue-500">API Latency</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </PerformanceMetricsWrapper>
    </div>
  );
};