import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BigQuerySmokeTest } from '@/components/BigQuerySmokeTest';
import { BigQueryTestButtons } from '@/components/BigQueryTestButtons';
import { PermissionWrapper } from '@/components/PermissionWrapper';
import { TechnicalMetadataWrapper } from '@/components/DebugToolsWrapper';
import { Badge } from '@/components/ui/badge';
import { Shield, Database, Zap, Bug } from 'lucide-react';

export const SystemDebugPanel: React.FC = () => {
  const systemMetadata = {
    version: process.env.REACT_APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV,
    buildTime: new Date().toISOString(),
    userAgent: navigator.userAgent.substring(0, 100),
    features: {
      bigQuery: true,
      realTimeData: true,
      debugMode: true
    }
  };

  return (
    <PermissionWrapper permission="ui.admin.show_system_info">
      <div className="space-y-6">
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Shield className="h-5 w-5" />
              Platform Administrator Tools
            </CardTitle>
            <p className="text-sm text-blue-600">
              Advanced debugging and system monitoring tools for platform administrators.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-blue-600">
                <Database className="h-3 w-3 mr-1" />
                BigQuery Connected
              </Badge>
              <Badge variant="outline" className="text-green-600">
                <Zap className="h-3 w-3 mr-1" />
                Real-time Data
              </Badge>
              <Badge variant="outline" className="text-purple-600">
                <Bug className="h-3 w-3 mr-1" />
                Debug Mode
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Quick Debug Tools */}
        <BigQueryTestButtons />

        {/* Full Smoke Test */}
        <Card>
          <CardHeader>
            <CardTitle>Comprehensive System Test</CardTitle>
          </CardHeader>
          <CardContent>
            <BigQuerySmokeTest />
          </CardContent>
        </Card>

        {/* System Metadata */}
        <TechnicalMetadataWrapper metadata={systemMetadata} />
      </div>
    </PermissionWrapper>
  );
};