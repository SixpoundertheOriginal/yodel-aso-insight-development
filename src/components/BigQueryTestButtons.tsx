import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Database, Loader2, Play, RefreshCw } from 'lucide-react';
import { BigQueryTestWrapper } from './DebugToolsWrapper';

interface TestResult {
  success: boolean;
  duration: number;
  recordCount?: number;
  error?: string;
}

export const BigQueryTestButtons: React.FC = () => {
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [runningTests, setRunningTests] = useState<Set<string>>(new Set());

  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    setRunningTests(prev => new Set([...prev, testName]));
    const startTime = Date.now();
    
    try {
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      setTestResults(prev => ({
        ...prev,
        [testName]: {
          success: true,
          duration,
          recordCount: Array.isArray(result?.data) ? result.data.length : undefined
        }
      }));
      
      toast.success(`${testName} completed in ${duration}ms`);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      setTestResults(prev => ({
        ...prev,
        [testName]: {
          success: false,
          duration,
          error: error.message
        }
      }));
      
      toast.error(`${testName} failed: ${error.message}`);
    } finally {
      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete(testName);
        return newSet;
      });
    }
  };

  const testBigQueryConnection = async () => {
    const { data, error } = await supabase.functions.invoke('bigquery-aso-data', {
      body: {
        organizationId: "84728f94-91db-4f9c-b025-5221fbed4065",
        dateRange: { from: "2025-07-04", to: "2025-08-06" },
        selectedApps: ["AppOne"],
        trafficSources: []
      }
    });
    
    if (error) throw error;
    return data;
  };

  const testDataFreshness = async () => {
    // Test how recent our data is
    const { data, error } = await supabase
      .from('aso_metrics')
      .select('date, created_at')
      .order('date', { ascending: false })
      .limit(1);
      
    if (error) throw error;
    return data;
  };

  const renderTestResult = (testName: string) => {
    const result = testResults[testName];
    const isRunning = runningTests.has(testName);
    
    if (isRunning) {
      return <Badge variant="secondary">Running...</Badge>;
    }
    
    if (!result) {
      return null;
    }
    
    return (
      <Badge variant={result.success ? "default" : "destructive"} className="ml-2">
        {result.success ? `✓ ${result.duration}ms` : `✗ ${result.error?.substring(0, 20)}...`}
        {result.recordCount !== undefined && ` (${result.recordCount} rows)`}
      </Badge>
    );
  };

  return (
    <BigQueryTestWrapper>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => runTest('BigQuery Connection', testBigQueryConnection)}
            disabled={runningTests.has('BigQuery Connection')}
            className="flex items-center gap-2"
          >
            {runningTests.has('BigQuery Connection') ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Database className="h-4 w-4" />
            )}
            Test BigQuery
          </Button>
          {renderTestResult('BigQuery Connection')}
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => runTest('Data Freshness', testDataFreshness)}
            disabled={runningTests.has('Data Freshness')}
            className="flex items-center gap-2"
          >
            {runningTests.has('Data Freshness') ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Check Data Freshness
          </Button>
          {renderTestResult('Data Freshness')}
        </div>
        
        <div className="text-xs text-yellow-600 dark:text-yellow-400 border-t border-yellow-200 pt-2">
          <p><strong>Note:</strong> These tests verify BigQuery connectivity and data availability.</p>
          <p>Only visible to platform administrators.</p>
        </div>
      </div>
    </BigQueryTestWrapper>
  );
};