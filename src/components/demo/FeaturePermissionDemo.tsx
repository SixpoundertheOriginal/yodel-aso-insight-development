import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Zap, BarChart3, Search, Palette, TrendingUp, Target } from 'lucide-react';
import { FeatureGuard } from '@/components/permissions/FeatureGuard';
import { useFeaturePermissions } from '@/hooks/useFeaturePermission';
import { FEATURE_KEYS, FEATURE_LABELS, FEATURE_DESCRIPTIONS } from '@/constants/features';
import { useUserProfile } from '@/hooks/useUserProfile';

const FEATURE_ICONS = {
  [FEATURE_KEYS.ASO_AI_AUDIT]: Target,
  [FEATURE_KEYS.GROWTH_ACCELERATORS]: TrendingUp,
  [FEATURE_KEYS.METADATA_GENERATOR]: Zap,
  [FEATURE_KEYS.KEYWORD_INTELLIGENCE]: Search,
  [FEATURE_KEYS.CREATIVE_INTELLIGENCE]: Palette,
  [FEATURE_KEYS.COMPETITIVE_ANALYSIS]: BarChart3,
  [FEATURE_KEYS.ADVANCED_ANALYTICS]: BarChart3,
};

export const FeaturePermissionDemo: React.FC = () => {
  const { profile } = useUserProfile();
  const allFeatures = Object.values(FEATURE_KEYS) as string[];
  const { permissions, loading } = useFeaturePermissions(allFeatures);

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
            Feature Permission System Demo
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            This demo shows how application features are controlled based on your organization's permission settings.
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

      {/* Enabled Features */}
      <Card>
        <CardHeader>
          <CardTitle className="text-green-600">✅ Available Features</CardTitle>
          <p className="text-sm text-muted-foreground">
            Features your organization has enabled for your role.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {enabledFeatures.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No features are currently enabled for your role.
            </p>
          ) : (
            enabledFeatures.map(([feature]) => {
              const Icon = FEATURE_ICONS[feature as keyof typeof FEATURE_ICONS] || Shield;
              return (
                <FeatureGuard key={feature} feature={feature}>
                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Icon className="h-5 w-5 text-green-600 mt-1" />
                      <div>
                        <h4 className="font-medium text-green-800 dark:text-green-200">
                          {FEATURE_LABELS[feature as keyof typeof FEATURE_LABELS] || feature}
                        </h4>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          {FEATURE_DESCRIPTIONS[feature as keyof typeof FEATURE_DESCRIPTIONS] || 'Feature description not available'}
                        </p>
                        <Badge variant="secondary" className="mt-2 text-xs">
                          Access Granted
                        </Badge>
                      </div>
                    </div>
                  </div>
                </FeatureGuard>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Disabled Features */}
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">🚫 Restricted Features</CardTitle>
          <p className="text-sm text-muted-foreground">
            Features that are not available to your role or organization.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {disabledFeatures.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              All features are enabled for your role! 🎉
            </p>
          ) : (
            disabledFeatures.map(([feature]) => {
              const Icon = FEATURE_ICONS[feature as keyof typeof FEATURE_ICONS] || Shield;
              return (
                <div key={feature} className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4 opacity-60">
                  <div className="flex items-start gap-3">
                    <Icon className="h-5 w-5 text-red-600 mt-1" />
                    <div>
                      <h4 className="font-medium text-red-800 dark:text-red-200">
                        {FEATURE_LABELS[feature as keyof typeof FEATURE_LABELS] || feature}
                      </h4>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        {FEATURE_DESCRIPTIONS[feature as keyof typeof FEATURE_DESCRIPTIONS] || 'Feature description not available'}
                      </p>
                      <Badge variant="destructive" className="mt-2 text-xs">
                        Access Denied
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Usage Examples */}
      <Card>
        <CardHeader>
          <CardTitle>🔧 Implementation Examples</CardTitle>
          <p className="text-sm text-muted-foreground">
            How to use the FeatureGuard component in your application.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Basic Usage:</h4>
              <code className="text-sm text-muted-foreground block bg-background p-2 rounded border">
                {`<FeatureGuard feature="features.aso_ai_audit">
  <ASOAuditComponent />
</FeatureGuard>`}
              </code>
            </div>
            
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">With Fallback:</h4>
              <code className="text-sm text-muted-foreground block bg-background p-2 rounded border">
                {`<FeatureGuard 
  feature="features.advanced_analytics" 
  fallback={<UpgradePrompt />}
>
  <AdvancedAnalytics />
</FeatureGuard>`}
              </code>
            </div>
            
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Hook Usage:</h4>
              <code className="text-sm text-muted-foreground block bg-background p-2 rounded border">
                {`const { hasPermission } = useFeaturePermission('features.keyword_intelligence');
if (hasPermission) {
  // Show feature
}`}
              </code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};