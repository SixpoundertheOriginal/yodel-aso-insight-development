import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Zap, BarChart3, Search, Palette, TrendingUp, Target, Users, Settings, Brain } from 'lucide-react';
import { FeatureGuard } from '@/components/permissions/FeatureGuard';
import { useFeaturePermission } from '@/hooks/useFeaturePermission';
import { PLATFORM_FEATURES_ENHANCED, FEATURE_LABELS, FEATURE_DESCRIPTIONS, FEATURE_CATEGORIES } from '@/constants/features';
import { useUserProfile } from '@/hooks/useUserProfile';

const FEATURE_ICONS = {
  // Performance Intelligence
  [PLATFORM_FEATURES_ENHANCED.EXECUTIVE_DASHBOARD]: BarChart3,
  [PLATFORM_FEATURES_ENHANCED.ANALYTICS]: BarChart3,
  [PLATFORM_FEATURES_ENHANCED.CONVERSION_INTELLIGENCE]: TrendingUp,
  [PLATFORM_FEATURES_ENHANCED.PERFORMANCE_INTELLIGENCE]: Target,
  [PLATFORM_FEATURES_ENHANCED.PREDICTIVE_FORECASTING]: Brain,
  
  // AI Command Center
  [PLATFORM_FEATURES_ENHANCED.ASO_AI_HUB]: Brain,
  [PLATFORM_FEATURES_ENHANCED.CHATGPT_VISIBILITY_AUDIT]: Target,
  [PLATFORM_FEATURES_ENHANCED.AI_METADATA_GENERATOR]: Zap,
  [PLATFORM_FEATURES_ENHANCED.STRATEGIC_AUDIT_ENGINE]: Shield,
  
  // Growth Accelerators
  [PLATFORM_FEATURES_ENHANCED.KEYWORD_INTELLIGENCE]: Search,
  [PLATFORM_FEATURES_ENHANCED.COMPETITIVE_INTELLIGENCE]: BarChart3,
  [PLATFORM_FEATURES_ENHANCED.CREATIVE_REVIEW]: Palette,
  [PLATFORM_FEATURES_ENHANCED.APP_DISCOVERY]: Search,
  [PLATFORM_FEATURES_ENHANCED.ASO_CHAT]: Brain,
  [PLATFORM_FEATURES_ENHANCED.MARKET_INTELLIGENCE]: TrendingUp,
  [PLATFORM_FEATURES_ENHANCED.REVIEWS_PUBLIC_RSS_ENABLED]: Shield,
  [PLATFORM_FEATURES_ENHANCED.CREATIVE_ANALYSIS]: Palette,
  [PLATFORM_FEATURES_ENHANCED.KEYWORD_RANK_TRACKING]: Search,
  [PLATFORM_FEATURES_ENHANCED.VISIBILITY_OPTIMIZER]: Target,
  
  // Control Center
  [PLATFORM_FEATURES_ENHANCED.APP_INTELLIGENCE]: BarChart3,
  [PLATFORM_FEATURES_ENHANCED.PORTFOLIO_MANAGER]: Users,
  [PLATFORM_FEATURES_ENHANCED.SYSTEM_CONTROL]: Settings,
  
  // Account
  [PLATFORM_FEATURES_ENHANCED.PROFILE_MANAGEMENT]: Users,
  [PLATFORM_FEATURES_ENHANCED.PREFERENCES]: Settings,
};

export const FeaturePermissionDemo: React.FC = () => {
  const { profile } = useUserProfile();
  const allFeatures = Object.values(PLATFORM_FEATURES_ENHANCED) as string[];
  const [permissions, setPermissions] = React.useState<Record<string, boolean>>({});
  const [loading, setLoading] = React.useState(true);

  // Check permissions for all features
  React.useEffect(() => {
    const checkPermissions = async () => {
      setLoading(true);
      const permissionResults: Record<string, boolean> = {};
      
      // For demo purposes, we'll use a simple permission check
      // In a real app, this would use the actual permission hooks
      for (const feature of allFeatures) {
        // Simulate permission check - in real app use useFeaturePermission hook
        permissionResults[feature] = Math.random() > 0.5; // Random for demo
      }
      
      setPermissions(permissionResults);
      setLoading(false);
    };

    checkPermissions();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Feature Permissions...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const enabledFeatures = Object.entries(permissions).filter(([_, enabled]) => enabled);
  const disabledFeatures = Object.entries(permissions).filter(([_, enabled]) => !enabled);

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Unified Feature Permission System Demo
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Showcasing the unified 24-feature system organized in 5 categories with role-based access control.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{enabledFeatures.length}</div>
              <div className="text-sm text-muted-foreground">Enabled Features</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{disabledFeatures.length}</div>
              <div className="text-sm text-muted-foreground">Disabled Features</div>
            </div>
            <div className="text-center">
              <Badge variant="outline" className="px-3 py-1">
                {profile?.user_roles?.[0]?.role || 'Unknown Role'}
              </Badge>
              <div className="text-sm text-muted-foreground mt-1">Your Role</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Categories */}
      {Object.entries(FEATURE_CATEGORIES).map(([categoryKey, category]) => (
        <Card key={categoryKey}>
          <CardHeader>
            <CardTitle className="text-primary">{category.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{category.description}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {category.features.map(featureKey => {
              const isEnabled = permissions[featureKey];
              const Icon = FEATURE_ICONS[featureKey as keyof typeof FEATURE_ICONS] || Shield;
              
              return (
                <div 
                  key={featureKey}
                  className={`border rounded-lg p-4 ${
                    isEnabled 
                      ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' 
                      : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`h-5 w-5 mt-1 ${isEnabled ? 'text-green-600' : 'text-red-600'}`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className={`font-medium ${
                          isEnabled 
                            ? 'text-green-800 dark:text-green-200' 
                            : 'text-red-800 dark:text-red-200'
                        }`}>
                          {FEATURE_LABELS[featureKey] || featureKey}
                        </h4>
                        <Badge 
                          variant={isEnabled ? 'secondary' : 'destructive'} 
                          className="text-xs"
                        >
                          {isEnabled ? 'Access Granted' : 'Access Denied'}
                        </Badge>
                      </div>
                      <p className={`text-sm ${
                        isEnabled 
                          ? 'text-green-700 dark:text-green-300' 
                          : 'text-red-700 dark:text-red-300'
                      }`}>
                        {FEATURE_DESCRIPTIONS[featureKey] || 'Feature description not available'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      {/* Implementation Examples */}
      <Card>
        <CardHeader>
          <CardTitle>🔧 Unified System Implementation</CardTitle>
          <p className="text-sm text-muted-foreground">
            How to use the unified feature permission system in your application.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Basic Feature Guard:</h4>
              <code className="text-sm text-muted-foreground block bg-background p-2 rounded border">
                {`<FeatureGuard feature="${PLATFORM_FEATURES_ENHANCED.ASO_AI_HUB}">
  <ASOAIHub />
</FeatureGuard>`}
              </code>
            </div>
            
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Enhanced Hook Usage:</h4>
              <code className="text-sm text-muted-foreground block bg-background p-2 rounded border">
                {`const { hasFeature, getFeatureStatus } = useEnhancedFeatureAccess();
const canUseKeywordIntel = hasFeature('${PLATFORM_FEATURES_ENHANCED.KEYWORD_INTELLIGENCE}');
const featureStatus = getFeatureStatus('${PLATFORM_FEATURES_ENHANCED.ANALYTICS}');`}
              </code>
            </div>
            
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Feature Categories:</h4>
              <code className="text-sm text-muted-foreground block bg-background p-2 rounded border">
                {`// 24 features across 5 categories:
// • Performance Intelligence (5 features)
// • AI Command Center (4 features) 
// • Growth Accelerators (10 features)
// • Control Center (3 features)
// • Account (2 features)`}
              </code>
            </div>
            
            <div className="bg-primary/5 p-4 rounded-lg">
              <h4 className="font-medium mb-2 text-primary">✨ Unified System Benefits:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Single source of truth for 24 enterprise features</li>
                <li>• Organization-level entitlements with user-level overrides</li>
                <li>• Automatic usage tracking and analytics</li>
                <li>• Role-based default permissions</li>
                <li>• Enhanced admin interface with bulk operations</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};