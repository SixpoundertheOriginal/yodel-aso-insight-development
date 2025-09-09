import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Play, Copy, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { systemApi, organizationsApi, usersApi } from '@/lib/admin-api';

interface DiagnosticResult {
  success: boolean;
  status: number;
  contentType: string;
  data?: any;
  error?: string;
  timestamp: Date;
  response: string;
}

interface DiagnosticsState {
  health: DiagnosticResult | null;
  whoami: DiagnosticResult | null;
  organizations: DiagnosticResult | null;
  users: DiagnosticResult | null;
  running: boolean;
}

// Utility to check if content type is JSON
export const isJson = (contentType: string): boolean => {
  return contentType.toLowerCase().includes('application/json');
};

// Safe JSON parse with content type guard
const safeJsonParse = (text: string, contentType: string) => {
  if (!isJson(contentType)) {
    throw new Error(`Expected JSON, got ${contentType}`);
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`Invalid JSON: ${e.message}`);
  }
};

export const AdminDiagnostics: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<DiagnosticsState>({
    health: null,
    whoami: null,
    organizations: null,
    users: null,
    running: false,
  });

  const [currentOrgId, setCurrentOrgId] = useState(localStorage.getItem('currentOrgId') || '');

  const runDiagnostic = async (
    name: keyof DiagnosticsState,
    apiCall: () => Promise<any>
  ): Promise<DiagnosticResult> => {
    try {
      const startTime = performance.now();
      const result = await apiCall();
      const endTime = performance.now();
      
      return {
        success: true,
        status: 200,
        contentType: 'application/json',
        data: result,
        timestamp: new Date(),
        response: JSON.stringify(result, null, 2)
      };
    } catch (error: any) {
      // Handle fetch errors with response details
      if (error.status) {
        return {
          success: false,
          status: error.status,
          contentType: error.response?.headers?.get?.('content-type') || 'unknown',
          error: error.message,
          timestamp: new Date(),
          response: error.response ? error.response.text?.() || 'No response body' : error.message
        };
      }
      
      return {
        success: false,
        status: 0,
        contentType: 'error',
        error: error.message,
        timestamp: new Date(),
        response: error.message
      };
    }
  };

  const runHealthCheck = async () => {
    // Direct fetch to get headers
    try {
      const response = await fetch('/api/health');
      const contentType = response.headers.get('content-type') || '';
      const text = await response.text();
      
      const result: DiagnosticResult = {
        success: response.ok,
        status: response.status,
        contentType,
        timestamp: new Date(),
        response: text.slice(0, 200) + (text.length > 200 ? '...' : '')
      };

      if (response.ok && isJson(contentType)) {
        try {
          result.data = JSON.parse(text);
        } catch (e) {
          result.error = `Invalid JSON: ${e.message}`;
        }
      } else if (!response.ok) {
        result.error = `HTTP ${response.status}: ${response.statusText}`;
      } else if (!isJson(contentType)) {
        result.error = `Expected JSON, got ${contentType}`;
      }

      return result;
    } catch (error: any) {
      return {
        success: false,
        status: 0,
        contentType: 'error',
        error: error.message,
        timestamp: new Date(),
        response: error.message
      };
    }
  };

  const runAllDiagnostics = async () => {
    setDiagnostics(prev => ({ ...prev, running: true }));
    
    try {
      // Health check (special case for headers)
      const health = await runHealthCheck();
      setDiagnostics(prev => ({ ...prev, health }));

      // WhoAmI
      const whoami = await runDiagnostic('whoami', () => systemApi.whoami());
      setDiagnostics(prev => ({ ...prev, whoami }));

      // Organizations
      const organizations = await runDiagnostic('organizations', () => organizationsApi.list());
      setDiagnostics(prev => ({ ...prev, organizations }));

      // Users  
      const users = await runDiagnostic('users', () => usersApi.list());
      setDiagnostics(prev => ({ ...prev, users }));

    } finally {
      setDiagnostics(prev => ({ ...prev, running: false }));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(console.error);
  };

  const renderResult = (name: string, result: DiagnosticResult | null) => {
    if (!result) {
      return (
        <div className="flex items-center space-x-2 text-gray-500">
          <Clock className="w-4 h-4" />
          <span>Not run</span>
        </div>
      );
    }

    const StatusIcon = result.success ? CheckCircle : XCircle;
    const statusColor = result.success ? 'text-green-500' : 'text-red-500';

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <StatusIcon className={`w-4 h-4 ${statusColor}`} />
            <span className="font-medium">{name}</span>
            <Badge variant={result.success ? 'default' : 'destructive'}>
              {result.status}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {result.contentType}
            </Badge>
          </div>
          <div className="text-xs text-gray-500">
            {result.timestamp.toLocaleTimeString()}
          </div>
        </div>
        
        {result.error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            {result.error}
          </div>
        )}
        
        {result.data && (
          <div className="text-sm bg-gray-50 p-2 rounded">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium">Data Summary:</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(JSON.stringify(result.data, null, 2))}
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
            {name === 'whoami' && result.data && (
              <div>
                <p>Role: {result.data.role || 'Unknown'}</p>
                <p>Orgs: {result.data.organizations?.length || 0}</p>
                <p>Super Admin: {result.data.is_super_admin ? 'Yes' : 'No'}</p>
              </div>
            )}
            {name === 'organizations' && Array.isArray(result.data) && (
              <p>Count: {result.data.length} organizations</p>
            )}
            {name === 'users' && Array.isArray(result.data) && (
              <p>Count: {result.data.length} users</p>
            )}
          </div>
        )}
        
        <details className="text-xs">
          <summary className="cursor-pointer text-gray-600">Raw Response</summary>
          <Textarea 
            value={result.response} 
            readOnly 
            className="mt-1 text-xs font-mono h-20"
          />
        </details>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Diagnostics</h1>
          <p className="text-gray-600">API health and connectivity checks</p>
        </div>
        <Button 
          onClick={runAllDiagnostics} 
          disabled={diagnostics.running}
          className="flex items-center space-x-2"
        >
          <Play className="w-4 h-4" />
          <span>{diagnostics.running ? 'Running...' : 'Run All'}</span>
        </Button>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Current Org ID (for scoped tests):</label>
        <input
          type="text"
          value={currentOrgId}
          onChange={(e) => {
            setCurrentOrgId(e.target.value);
            localStorage.setItem('currentOrgId', e.target.value);
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          placeholder="Enter organization ID for scoped API tests"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Health Check</CardTitle>
            <CardDescription>System health status</CardDescription>
          </CardHeader>
          <CardContent>
            {renderResult('health', diagnostics.health)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Who Am I</CardTitle>
            <CardDescription>Current user and permissions</CardDescription>
          </CardHeader>
          <CardContent>
            {renderResult('whoami', diagnostics.whoami)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Organizations</CardTitle>
            <CardDescription>Organization access check</CardDescription>
          </CardHeader>
          <CardContent>
            {renderResult('organizations', diagnostics.organizations)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>User listing and scoping</CardDescription>
          </CardHeader>
          <CardContent>
            {renderResult('users', diagnostics.users)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Shell Commands</CardTitle>
          <CardDescription>Quick copy commands for manual testing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm font-mono">
            <div className="flex items-center justify-between bg-gray-100 p-2 rounded">
              <code>./scripts/admin-smoke.sh http://localhost:8080 "$SUPER" "$ORGADM" "$ORGID"</code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard('./scripts/admin-smoke.sh http://localhost:8080 "$SUPER" "$ORGADM" "$ORGID"')}
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
            <div className="flex items-center justify-between bg-gray-100 p-2 rounded">
              <code>BOT_EMAIL=test@example.com BOT_PASSWORD=password node scripts/get-token.ts</code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard('BOT_EMAIL=test@example.com BOT_PASSWORD=password node scripts/get-token.ts')}
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};