
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppDiscovery } from '@/hooks/useAppDiscovery';
import { usePermissions } from '@/hooks/usePermissions';
import { PendingAppsTable } from './PendingAppsTable';
import { ApprovedAppsTable } from './ApprovedAppsTable';
import { Search, RefreshCw, Database, CheckCircle, Clock, X } from 'lucide-react';

type AdminOrgSelectorProps = {
  onSelectOrg: (orgId: string) => void;
};

const AdminOrgSelector: React.FC<AdminOrgSelectorProps> = ({ onSelectOrg }) => {
  const [orgs] = useState([
    { id: 'dbdb0cc5-9cfa-4bf1-bb97-7ccf2d1f783f', name: 'YodelMobile' },
    { id: '7cccba3f-0a8f-446f-9dba-86e9cb68c92b', name: 'Yodel Mobile (Internal)' }
  ]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Select Organization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {orgs.map((org) => (
            <Button
              key={org.id}
              onClick={() => onSelectOrg(org.id)}
              variant="outline"
              className="w-full"
            >
              {org.name}
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export const AppDiscoveryHub: React.FC = () => {
  const {
    organizationId,
    canApproveApps,
    isSuperAdmin,
    isLoading: permissionsLoading
  } = usePermissions();
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(organizationId ?? null);
  const effectiveOrgId = selectedOrgId || organizationId;
  const {
    pendingApps,
    approvedApps,
    isLoading,
    discoverApps,
    approveApp,
    rejectApp,
    isDiscovering,
    isUpdating
  } = useAppDiscovery(effectiveOrgId || '');

  if (permissionsLoading) {
    return <div>Loading permissions...</div>;
  }

  if (isSuperAdmin && !effectiveOrgId) {
    return <AdminOrgSelector onSelectOrg={setSelectedOrgId} />;
  }

  if (!effectiveOrgId) {
    return <div>No organization assigned</div>;
  }

  if (!canApproveApps) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <X className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Access Denied</h2>
          <p className="text-zinc-400">You don't have permission to access app discovery.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">App Discovery</h1>
          <p className="text-zinc-400">
            Discover apps from your BigQuery data and approve them for dashboard access
          </p>
        </div>
        <Button
          onClick={discoverApps}
          disabled={isDiscovering}
          className="bg-yodel-orange hover:bg-orange-600"
        >
          {isDiscovering ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Scan BigQuery for Apps
            </>
          )}
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{pendingApps.length}</p>
                <p className="text-sm text-zinc-400">Pending Approval</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{approvedApps.length}</p>
                <p className="text-sm text-zinc-400">Approved Apps</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Database className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{pendingApps.length + approvedApps.length}</p>
                <p className="text-sm text-zinc-400">Total Discovered</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Pending Apps */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-400" />
              Pending Apps
              {pendingApps.length > 0 && (
                <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400">
                  {pendingApps.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Apps discovered from BigQuery awaiting your approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-zinc-400" />
              </div>
            ) : pendingApps.length === 0 ? (
              <div className="text-center py-8">
                <Database className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                <p className="text-zinc-400">No pending apps found</p>
                <p className="text-sm text-zinc-500 mt-1">
                  Click "Scan BigQuery" to discover new apps
                </p>
              </div>
            ) : (
              <PendingAppsTable
                apps={pendingApps}
                onApprove={approveApp}
                onReject={rejectApp}
                isUpdating={isUpdating}
              />
            )}
          </CardContent>
        </Card>

        {/* Approved Apps */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              Approved Apps
              {approvedApps.length > 0 && (
                <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                  {approvedApps.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Apps currently active in your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-zinc-400" />
              </div>
            ) : approvedApps.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                <p className="text-zinc-400">No approved apps yet</p>
                <p className="text-sm text-zinc-500 mt-1">
                  Approve pending apps to see them here
                </p>
              </div>
            ) : (
              <ApprovedAppsTable apps={approvedApps} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
