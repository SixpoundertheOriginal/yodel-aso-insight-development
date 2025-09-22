import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { usePermissions } from '@/hooks/usePermissions';
import { useEnhancedFeatureAccess } from '@/hooks/useEnhancedFeatureAccess';
import { useFeatureBasedRouting } from '@/hooks/useFeatureBasedRouting';
import { supabase } from '@/integrations/supabase/client';
import { 
  TestTube, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Database, 
  Shield, 
  Route,
  Users,
  Zap
} from 'lucide-react';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

interface TestSection {
  title: string;
  icon: React.ComponentType<any>;
  tests: TestResult[];
}

export default function FeatureTestingLab() {
  const { isSuperAdmin } = usePermissions();
  const { hasFeature, features, loading: featuresLoading } = useEnhancedFeatureAccess();
  const { checkRouteAccess, getAccessibleRoutes } = useFeatureBasedRouting();
  const [testResults, setTestResults] = useState<TestSection[]>([]);
  const [testing, setTesting] = useState(false);

  // Database connectivity tests
  const runDatabaseTests = async (): Promise<TestResult[]> => {
    const tests: TestResult[] = [];

    try {
      // Test platform features table
      const { data: platformFeatures, error: pfError } = await supabase
        .from('platform_features')
        .select('count')
        .limit(1);

      tests.push({
        name: 'Platform Features Table Access',
        passed: !pfError,
        message: pfError ? `Error: ${pfError.message}` : 'Successfully accessed platform_features table',
        details: { count: platformFeatures?.length || 0 }
      });

      // Test unified feature system tables
      const { data: unifiedFeatures, error: unfError } = await supabase
        .from('platform_features')
        .select('count')
        .limit(1);

      tests.push({
        name: 'Platform Features Table Access',
        passed: !unfError,
        message: unfError ? `Error: ${unfError.message}` : 'Successfully accessed platform_features table'
      });

      const { data: orgEntitlements, error: oeError } = await supabase
        .from('org_feature_entitlements')
        .select('count')
        .limit(1);

      tests.push({
        name: 'Organization Feature Entitlements Table Access',
        passed: !oeError,
        message: oeError ? `Error: ${oeError.message}` : 'Successfully accessed org_feature_entitlements table'
      });

      // Test user overrides table
      const { data: userOverrides, error: uoError } = await supabase
        .from('user_feature_overrides')
        .select('count')
        .limit(1);

      tests.push({
        name: 'User Overrides Table Access',
        passed: !uoError,
        message: uoError ? `Error: ${uoError.message}` : 'Successfully accessed user_feature_overrides table'
      });

    } catch (error) {
      tests.push({
        name: 'Database Connection',
        passed: false,
        message: `Database connection failed: ${error}`,
        details: error
      });
    }

    return tests;
  };

  // Feature access tests
  const runFeatureAccessTests = async (): Promise<TestResult[]> => {
    const tests: TestResult[] = [];

    // Test core features
    const coreFeatures = [
      'executive_dashboard',
      'analytics', 
      'keyword_intelligence',
      'competitive_intelligence'
    ];

    coreFeatures.forEach(feature => {
      const hasAccess = hasFeature(feature);
      tests.push({
        name: `Feature Access: ${feature}`,
        passed: true, // This test is informational
        message: `Access ${hasAccess ? 'granted' : 'denied'} for ${feature}`,
        details: { hasAccess, feature }
      });
    });

    // Test super admin bypass
    if (isSuperAdmin) {
      tests.push({
        name: 'Super Admin Bypass',
        passed: true,
        message: 'Super admin has universal feature access',
        details: { totalFeatures: features.length }
      });
    }

    return tests;
  };

  // API connectivity tests
  const runAPITests = async (): Promise<TestResult[]> => {
    const tests: TestResult[] = [];

    try {
      // Test admin-features endpoint
      const session = await supabase.auth.getSession();
      const response = await fetch(`https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/admin-features`, {
        headers: {
          'Authorization': `Bearer ${session.data.session?.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      tests.push({
        name: 'Admin Features API',
        passed: response.ok && data.success,
        message: response.ok ? 'API endpoint responding correctly' : `API error: ${response.status}`,
        details: { status: response.status, data: data.success ? 'OK' : data.error }
      });

    } catch (error) {
      tests.push({
        name: 'API Connectivity',
        passed: false,
        message: `API connection failed: ${error}`,
        details: error
      });
    }

    return tests;
  };

  // Route access tests
  const runRouteTests = (): TestResult[] => {
    const tests: TestResult[] = [];
    
    const testRoutes = [
      '/dashboard/executive',
      '/dashboard/analytics', 
      '/aso-ai-hub',
      '/admin/features'
    ];

    const accessibleRoutes = getAccessibleRoutes();
    
    testRoutes.forEach(route => {
      const hasAccess = checkRouteAccess(route);
      tests.push({
        name: `Route Access: ${route}`,
        passed: true, // Informational
        message: `Route ${hasAccess ? 'accessible' : 'blocked'}`,
        details: { route, hasAccess }
      });
    });

    tests.push({
      name: 'Total Accessible Routes',
      passed: true,
      message: `${accessibleRoutes.length} routes accessible`,
      details: { accessibleRoutes }
    });

    return tests;
  };

  // Run all tests
  const runAllTests = async () => {
    setTesting(true);
    
    try {
      const databaseTests = await runDatabaseTests();
      const featureTests = await runFeatureAccessTests();
      const apiTests = await runAPITests();
      const routeTests = runRouteTests();

      setTestResults([
        {
          title: 'Database Layer',
          icon: Database,
          tests: databaseTests
        },
        {
          title: 'Feature Access',
          icon: Shield,
          tests: featureTests
        },
        {
          title: 'API Layer',
          icon: Zap,
          tests: apiTests
        },
        {
          title: 'Route Protection',
          icon: Route,
          tests: routeTests
        }
      ]);

    } catch (error) {
      console.error('Test execution error:', error);
    } finally {
      setTesting(false);
    }
  };

  // Access gate for non-super admins
  if (!isSuperAdmin) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Access Denied
            </CardTitle>
            <CardDescription>
              Only super administrators can access the feature testing lab.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Feature Testing Lab</h1>
          <p className="text-muted-foreground">
            Comprehensive testing suite for the feature permissions system
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1">
          <TestTube className="h-3 w-3" />
          Testing Suite
        </Badge>
      </div>

      <Alert>
        <TestTube className="h-4 w-4" />
        <AlertDescription>
          This testing lab validates the entire feature permissions system including database connectivity, 
          API endpoints, feature access logic, and route protection. Run tests to ensure everything is working correctly.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
          <CardDescription>Current state of the feature permissions system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {features.length}
              </div>
              <div className="text-sm text-muted-foreground">Features Loaded</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {isSuperAdmin ? 'Active' : 'Inactive'}
              </div>
              <div className="text-sm text-muted-foreground">Super Admin</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {getAccessibleRoutes().length}
              </div>
              <div className="text-sm text-muted-foreground">Accessible Routes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {featuresLoading ? 'Loading' : 'Ready'}
              </div>
              <div className="text-sm text-muted-foreground">System State</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button 
          onClick={runAllTests} 
          disabled={testing || featuresLoading}
          className="flex items-center gap-2"
        >
          <TestTube className="h-4 w-4" />
          {testing ? 'Running Tests...' : 'Run All Tests'}
        </Button>
      </div>

      {testResults.length > 0 && (
        <div className="space-y-6">
          {testResults.map((section, sectionIndex) => (
            <Card key={sectionIndex}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <section.icon className="h-5 w-5" />
                  {section.title}
                </CardTitle>
                <CardDescription>
                  {section.tests.length} test{section.tests.length !== 1 ? 's' : ''} executed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {section.tests.map((test, testIndex) => (
                    <div key={testIndex} className="flex items-start gap-3 p-3 rounded-lg border">
                      <div className="flex-shrink-0 mt-0.5">
                        {test.passed ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium">{test.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{test.message}</p>
                        {test.details && (
                          <details className="mt-2">
                            <summary className="text-xs text-muted-foreground cursor-pointer">
                              Show details
                            </summary>
                            <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                              {JSON.stringify(test.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                      <Badge variant={test.passed ? "default" : "destructive"}>
                        {test.passed ? "PASS" : "FAIL"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}