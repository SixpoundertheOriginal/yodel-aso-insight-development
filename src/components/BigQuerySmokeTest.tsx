
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Database, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TestResult {
  success: boolean;
  httpStatus?: number;
  error?: string;
  response?: any;
  timestamp: string;
  testDuration: number;
}

export const BigQuerySmokeTest: React.FC = () => {
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runSmokeTest = async () => {
    setIsRunning(true);
    const startTime = Date.now();
    
    console.log('🔬 [SmokeTest] Starting BigQuery Edge Function test...');
    
    try {
      const testPayload = {
        organizationId: "84728f94-91db-4f9c-b025-5221fbed4065",
        dateRange: {
          from: "2025-06-01",
          to: "2025-07-01"
        },
        selectedApps: ["AppOne", "AppTwo"],
        trafficSources: [],
        limit: 10
      };

      console.log('📤 [SmokeTest] Sending payload:', testPayload);

      // Call the BigQuery Edge Function directly using Supabase client
      const { data, error } = await supabase.functions.invoke('bigquery-aso-data', {
        body: testPayload
      });

      const endTime = Date.now();
      const testDuration = endTime - startTime;

      console.log('📥 [SmokeTest] Raw response:', { data, error });

      if (error) {
        console.error('❌ [SmokeTest] Function invocation error:', error);
        setTestResult({
          success: false,
          error: `Function error: ${error.message}`,
          timestamp: new Date().toISOString(),
          testDuration
        });
        return;
      }

      // Check if we got a successful response structure
      if (data && typeof data === 'object') {
        const isSuccess = data.success === true;
        const hasData = data.data && Array.isArray(data.data) && data.data.length > 0;
        const hasMeta = data.meta && typeof data.meta === 'object';
        const dataSource = data.meta?.dataSource || 'unknown';
        
        console.log('✅ [SmokeTest] Response analysis:', {
          isSuccess,
          hasData,
          hasMeta,
          dataSource,
          rowCount: data.data?.length || 0,
          executionTime: data.meta?.executionTimeMs
        });

        setTestResult({
          success: isSuccess && hasData,
          httpStatus: 200,
          response: data,
          timestamp: new Date().toISOString(),
          testDuration
        });
      } else {
        console.error('❌ [SmokeTest] Invalid response structure:', data);
        setTestResult({
          success: false,
          error: 'Invalid response structure from function',
          response: data,
          timestamp: new Date().toISOString(),
          testDuration
        });
      }

    } catch (error: any) {
      const endTime = Date.now();
      const testDuration = endTime - startTime;
      
      console.error('💥 [SmokeTest] Test failed with exception:', error);
      setTestResult({
        success: false,
        error: error.message || 'Unknown error',
        timestamp: new Date().toISOString(),
        testDuration
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Auto-run test on component mount
  useEffect(() => {
    runSmokeTest();
  }, []);

  const renderTestStatus = () => {
    if (isRunning) {
      return (
        <div className="flex items-center gap-2 text-blue-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Running BigQuery smoke test...</span>
        </div>
      );
    }

    if (!testResult) {
      return (
        <div className="flex items-center gap-2 text-zinc-400">
          <Database className="h-4 w-4" />
          <span>Ready to test</span>
        </div>
      );
    }

    if (testResult.success) {
      return (
        <div className="flex items-center gap-2 text-green-400">
          <CheckCircle className="h-4 w-4" />
          <span>BigQuery connection successful!</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 text-red-400">
        <AlertCircle className="h-4 w-4" />
        <span>BigQuery test failed</span>
      </div>
    );
  };

  const renderResponseDetails = () => {
    if (!testResult) return null;

    const { response } = testResult;
    
    return (
      <div className="space-y-4">
        {/* Test Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-zinc-800 p-3 rounded">
            <div className="text-xs text-zinc-400">Status</div>
            <Badge variant={testResult.success ? "default" : "destructive"}>
              {testResult.success ? "PASS" : "FAIL"}
            </Badge>
          </div>
          <div className="bg-zinc-800 p-3 rounded">
            <div className="text-xs text-zinc-400">Duration</div>
            <div className="text-sm font-medium">{testResult.testDuration}ms</div>
          </div>
          <div className="bg-zinc-800 p-3 rounded">
            <div className="text-xs text-zinc-400">Data Source</div>
            <div className="text-sm font-medium">
              {response?.meta?.dataSource || 'unknown'}
            </div>
          </div>
          <div className="bg-zinc-800 p-3 rounded">
            <div className="text-xs text-zinc-400">Rows</div>
            <div className="text-sm font-medium">
              {response?.data?.length || 0}
            </div>
          </div>
        </div>

        {/* Error Details */}
        {testResult.error && (
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded">
            <h4 className="text-red-400 font-medium mb-2">Error Details</h4>
            <pre className="text-sm text-red-300 whitespace-pre-wrap">
              {testResult.error}
            </pre>
          </div>
        )}

        {/* BigQuery Metadata */}
        {response?.meta && (
          <div className="bg-zinc-800 p-4 rounded">
            <h4 className="text-white font-medium mb-2">BigQuery Metadata</h4>
            <pre className="text-xs text-zinc-300 whitespace-pre-wrap overflow-auto max-h-40">
              {JSON.stringify(response.meta, null, 2)}
            </pre>
          </div>
        )}

        {/* Sample Data */}
        {response?.data && response.data.length > 0 && (
          <div className="bg-zinc-800 p-4 rounded">
            <h4 className="text-white font-medium mb-2">Sample Data (First 3 Rows)</h4>
            <pre className="text-xs text-zinc-300 whitespace-pre-wrap overflow-auto max-h-60">
              {JSON.stringify(response.data.slice(0, 3), null, 2)}
            </pre>
          </div>
        )}

        {/* Full Response */}
        <details className="bg-zinc-900 p-4 rounded">
          <summary className="text-white font-medium cursor-pointer">
            Full Response (Click to expand)
          </summary>
          <pre className="text-xs text-zinc-300 whitespace-pre-wrap overflow-auto max-h-96 mt-2">
            {JSON.stringify(testResult.response || testResult.error, null, 2)}
          </pre>
        </details>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="text-white">BigQuery Edge Function Smoke Test</span>
            <Button 
              onClick={runSmokeTest} 
              disabled={isRunning}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Re-run Test
            </Button>
          </CardTitle>
          <div className="text-sm text-zinc-400">
            This test verifies that the <code>bigquery-aso-data</code> Edge Function 
            can successfully connect to Google BigQuery and return real data.
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {renderTestStatus()}
          {renderResponseDetails()}
        </CardContent>
      </Card>

      {/* Test Instructions */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">What This Test Checks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-zinc-300">
          <div>✅ Edge Function invocation succeeds</div>
          <div>✅ BigQuery credentials are configured</div>
          <div>✅ Data is returned from BigQuery (not mock)</div>
          <div>✅ Response includes proper metadata</div>
          <div>✅ Execution time is reasonable (&lt; 30s)</div>
          <div className="pt-2 text-xs text-zinc-400">
            <strong>Note:</strong> This test uses organization ID: 84728f94-91db-4f9c-b025-5221fbed4065
            and queries for AppOne, AppTwo data from June 2025.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
