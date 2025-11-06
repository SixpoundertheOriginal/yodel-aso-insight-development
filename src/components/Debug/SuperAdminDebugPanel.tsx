import { useState } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

interface DiagnosticResult {
  timestamp: string;
  tests: {
    name: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
    data?: any;
  }[];
}

export const SuperAdminDebugPanel = () => {
  const { user } = useAuth();
  const permissions = usePermissions();
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostics = async () => {
    if (!user) return;
    
    setIsRunning(true);
    const results: DiagnosticResult = {
      timestamp: new Date().toISOString(),
      tests: [],
    };

    try {
      // Test 1: Raw permissions query
      const { data: rawData, error: rawError } = await supabase
        .from('profiles')
        .select('organization_id, user_roles(role, organization_id)')
        .eq('id', user.id)
        .single();

      results.tests.push({
        name: 'Raw Permissions Query',
        status: rawError ? 'fail' : 'pass',
        message: rawError 
          ? `Failed: ${rawError.message}` 
          : `Success: Found ${rawData?.user_roles?.length || 0} role(s)`,
        data: { rawData, rawError },
      });

      // Test 2: Check session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      results.tests.push({
        name: 'Auth Session',
        status: session ? 'pass' : 'fail',
        message: session 
          ? `Valid session expires: ${new Date(session.expires_at! * 1000).toLocaleString()}` 
          : 'No active session',
        data: { hasSession: !!session, sessionError },
      });

      // Test 3: Check is_super_admin RPC function
      const { data: rlsTest, error: rlsError } = await supabase.rpc('is_super_admin');
      
      results.tests.push({
        name: 'is_super_admin() RPC Function',
        status: rlsError ? 'fail' : (rlsTest ? 'pass' : 'warning'),
        message: rlsError 
          ? `Failed: ${rlsError.message}`
          : rlsTest 
            ? 'Returns TRUE (user is super admin)' 
            : 'Returns FALSE (user is NOT super admin)',
        data: { rlsTest, rlsError },
      });

      // Test 4: Check usePermissions hook result
      results.tests.push({
        name: 'usePermissions Hook',
        status: permissions.isSuperAdmin ? 'pass' : 'warning',
        message: permissions.isSuperAdmin
          ? 'Hook correctly identifies super admin'
          : 'Hook does NOT identify as super admin',
        data: {
          isSuperAdmin: permissions.isSuperAdmin,
          roles: permissions.roles,
          organizationId: permissions.organizationId,
          isLoading: permissions.isLoading,
        },
      });

      // Test 5: Compare raw query vs hook
      const rawHasSuperAdmin = rawData?.user_roles?.some(
        (r: any) => r.role === 'SUPER_ADMIN'
      );
      const mismatch = rawHasSuperAdmin !== permissions.isSuperAdmin;

      results.tests.push({
        name: 'Data Consistency Check',
        status: mismatch ? 'fail' : 'pass',
        message: mismatch
          ? '⚠️ MISMATCH: Raw query shows super admin but hook does not (CACHE ISSUE)'
          : '✅ Raw query and hook agree on super admin status',
        data: { rawHasSuperAdmin, hookSuperAdmin: permissions.isSuperAdmin },
      });

    } catch (error) {
      results.tests.push({
        name: 'Diagnostic Execution',
        status: 'fail',
        message: `Unexpected error: ${error}`,
        data: { error },
      });
    }

    setDiagnostics(results);
    setIsRunning(false);
  };

  // Only show for actual SUPER_ADMIN users (not ORG_ADMIN)
  // This is a debug panel - only show to users who actually have SUPER_ADMIN role
  const shouldShow = permissions.isSuperAdmin && !permissions.isLoading;

  if (!shouldShow) return null;

  return (
    <Card className="fixed bottom-4 right-4 w-[500px] max-h-[600px] overflow-auto shadow-lg border-2 border-yellow-500 z-50">
      <CardHeader className="bg-yellow-500/10">
        <CardTitle className="flex items-center gap-2 text-yellow-600">
          <AlertCircle className="h-5 w-5" />
          Super Admin Diagnostics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            User: {user?.email}
          </div>
          <Button
            onClick={runDiagnostics}
            disabled={isRunning}
            size="sm"
            variant="outline"
          >
            {isRunning ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              'Run Diagnostics'
            )}
          </Button>
        </div>

        {diagnostics && (
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Last run: {new Date(diagnostics.timestamp).toLocaleString()}
            </div>

            {diagnostics.tests.map((test, index) => (
              <div
                key={index}
                className="border rounded-lg p-3 space-y-2"
              >
                <div className="flex items-center gap-2">
                  {test.status === 'pass' && (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                  {test.status === 'fail' && (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  {test.status === 'warning' && (
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                  )}
                  <span className="font-medium text-sm">{test.name}</span>
                  <Badge
                    variant={
                      test.status === 'pass'
                        ? 'default'
                        : test.status === 'fail'
                        ? 'destructive'
                        : 'secondary'
                    }
                  >
                    {test.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{test.message}</p>
                {test.data && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      View details
                    </summary>
                    <pre className="mt-2 p-2 bg-muted rounded overflow-auto max-h-40">
                      {JSON.stringify(test.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}

        {!diagnostics && (
          <div className="text-center text-sm text-muted-foreground py-8">
            Click "Run Diagnostics" to test super admin access
          </div>
        )}
      </CardContent>
    </Card>
  );
};
