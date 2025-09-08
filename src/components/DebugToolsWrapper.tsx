import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PermissionWrapper } from '@/components/PermissionWrapper';
import { Crown, Bug, Database, Zap } from 'lucide-react';

interface DebugToolsWrapperProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export const DebugToolsWrapper: React.FC<DebugToolsWrapperProps> = ({
  children,
  title = "Developer Tools",
  description = "Debug tools and technical information"
}) => {
  return (
    <PermissionWrapper permission="ui.debug.show_test_buttons">
      <Card className="mt-4 border-dashed border-yellow-400 bg-yellow-50/50 dark:bg-yellow-900/10">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
            <Bug className="h-5 w-5" />
            {title}
            <Crown className="h-4 w-4" />
          </CardTitle>
          {description && (
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              {description}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {children}
        </CardContent>
      </Card>
    </PermissionWrapper>
  );
};

// Specialized wrappers for common debug scenarios
export const BigQueryTestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <DebugToolsWrapper 
    title="BigQuery Test Suite" 
    description="Database connection and query testing tools"
  >
    <div className="flex items-center gap-2 mb-3 p-2 bg-blue-50 rounded border border-blue-200">
      <Database className="h-4 w-4 text-blue-600" />
      <span className="text-sm font-medium text-blue-700">BigQuery Integration</span>
    </div>
    {children}
  </DebugToolsWrapper>
);

export const PerformanceTestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <DebugToolsWrapper 
    title="Performance Testing" 
    description="API performance and load testing utilities"
  >
    <div className="flex items-center gap-2 mb-3 p-2 bg-green-50 rounded border border-green-200">
      <Zap className="h-4 w-4 text-green-600" />
      <span className="text-sm font-medium text-green-700">Performance Monitoring</span>
    </div>
    {children}
  </DebugToolsWrapper>
);

export const TechnicalMetadataWrapper: React.FC<{ metadata: any }> = ({ metadata }) => (
  <PermissionWrapper permission="ui.debug.show_metadata">
    <details className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded border border-dashed border-gray-300">
      <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
        Technical Metadata (Click to expand)
      </summary>
      <pre className="mt-2 text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap overflow-auto max-h-40">
        {JSON.stringify(metadata, null, 2)}
      </pre>
    </details>
  </PermissionWrapper>
);