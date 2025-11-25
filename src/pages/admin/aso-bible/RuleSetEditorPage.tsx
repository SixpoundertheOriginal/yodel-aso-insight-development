/**
 * ASO Bible Rule Set Editor Page
 *
 * Phase 13.3: Full-featured ruleset editor with tabbed interface
 *
 * Features:
 * - Edit all override types (tokens, hooks, stopwords, KPIs, formulas, recommendations)
 * - Preview changes before publishing
 * - Version history
 * - Permission-gated (internal users only)
 */

import React, { useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { useRuleset, useRulesetPreview, usePublishRuleset } from '@/hooks/admin/useRulesets';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Eye, Save, AlertCircle, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Import editor components (will create these next)
import { TokenRelevanceEditor } from '@/components/admin/aso-bible/editors/TokenRelevanceEditor';
import { HookPatternEditor } from '@/components/admin/aso-bible/editors/HookPatternEditor';
import { StopwordEditor } from '@/components/admin/aso-bible/editors/StopwordEditor';
import { KpiWeightEditor } from '@/components/admin/aso-bible/editors/KpiWeightEditor';
import { FormulaOverrideEditor } from '@/components/admin/aso-bible/editors/FormulaOverrideEditor';
import { RecommendationTemplateEditor } from '@/components/admin/aso-bible/editors/RecommendationTemplateEditor';
import { VersionHistoryView } from '@/components/admin/aso-bible/editors/VersionHistoryView';
import { ScoringModelView } from '@/components/admin/aso-bible/editors/ScoringModelView';
import { RuleSetAncestryTimeline } from '@/components/admin/aso-bible/rules/RuleSetAncestryTimeline';
import { RuleSetDiagnosticsPanel } from '@/components/admin/aso-bible/rules/RuleSetDiagnosticsPanel';

export default function RuleSetEditorPage() {
  const { isInternalYodel, isSuperAdmin } = usePermissions();
  const navigate = useNavigate();
  const { vertical, market, orgId } = useParams<{
    vertical?: string;
    market?: string;
    orgId?: string;
  }>();

  const [activeTab, setActiveTab] = useState('tokens');
  const [showPreview, setShowPreview] = useState(false);

  // Permission check
  if (!isInternalYodel && !isSuperAdmin) {
    return <Navigate to="/no-access" replace />;
  }

  // Fetch ruleset data
  const { data: ruleset, isLoading, error } = useRuleset(vertical, market, orgId);

  // Preview mutation
  const previewMutation = useRulesetPreview();

  // Publish mutation
  const publishMutation = usePublishRuleset();

  const handlePreview = async () => {
    try {
      const result = await previewMutation.mutateAsync({
        vertical,
        market,
        organization_id: orgId,
      });
      console.log('Preview result:', result);
      setShowPreview(true);
    } catch (err) {
      console.error('Preview failed:', err);
    }
  };

  const handlePublish = async () => {
    if (!ruleset) return;

    try {
      await publishMutation.mutateAsync({
        vertical,
        market,
        organization_id: orgId,
        overrides: ruleset,
        notes: 'Published from admin UI',
      });
      alert('Ruleset published successfully!');
    } catch (err) {
      console.error('Publish failed:', err);
      alert('Failed to publish ruleset');
    }
  };

  // Determine scope label
  const getScopeLabel = () => {
    if (vertical && market) return `${vertical} / ${market}`;
    if (vertical) return vertical;
    if (market) return market;
    if (orgId) return `Client: ${orgId}`;
    return 'Unknown';
  };

  if (isLoading) {
    return (
      <AdminLayout currentPage="aso-bible-rulesets">
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500">Loading ruleset...</div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !ruleset) {
    return (
      <AdminLayout currentPage="aso-bible-rulesets">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load ruleset. Please try again or contact support.
          </AlertDescription>
        </Alert>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout currentPage="aso-bible-rulesets">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin/aso-bible/rulesets')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to List
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Edit Rule Set
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {getScopeLabel()}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={previewMutation.isPending}
            >
              <Eye className="w-4 h-4 mr-2" />
              {previewMutation.isPending ? 'Previewing...' : 'Preview'}
            </Button>
            <Button
              onClick={handlePublish}
              disabled={publishMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              {publishMutation.isPending ? 'Publishing...' : 'Publish Changes'}
            </Button>
          </div>
        </div>

        {/* Metadata Card */}
        <Card>
          <CardHeader>
            <CardTitle>Ruleset Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-500">Scope</div>
                <div className="font-medium">
                  {vertical && market ? 'Vertical + Market' : vertical ? 'Vertical' : market ? 'Market' : 'Client'}
                </div>
              </div>
              {vertical && (
                <div>
                  <div className="text-sm text-gray-500">Vertical</div>
                  <Badge variant="outline">{vertical}</Badge>
                </div>
              )}
              {market && (
                <div>
                  <div className="text-sm text-gray-500">Market</div>
                  <Badge variant="outline">{market}</Badge>
                </div>
              )}
              {orgId && (
                <div>
                  <div className="text-sm text-gray-500">Organization</div>
                  <Badge variant="outline">{orgId}</Badge>
                </div>
              )}
              <div>
                <div className="text-sm text-gray-500">Version</div>
                <Badge variant="secondary">v{ruleset.version || 1}</Badge>
              </div>
              <div>
                <div className="text-sm text-gray-500">Status</div>
                {ruleset.is_active ? (
                  <Badge className="bg-green-500">Active</Badge>
                ) : (
                  <Badge variant="outline">Inactive</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RuleSetAncestryTimeline
            mergedRuleSet={ruleset.mergedRuleSet}
            inheritance={ruleset.inheritanceSummary}
          />
          <RuleSetDiagnosticsPanel mergedRuleSet={ruleset.mergedRuleSet} />
        </div>

        {/* Tabbed Editor Interface */}
        <Card>
          <CardContent className="pt-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-8 w-full">
                <TabsTrigger value="tokens">Tokens</TabsTrigger>
                <TabsTrigger value="hooks">Hooks</TabsTrigger>
                <TabsTrigger value="stopwords">Stopwords</TabsTrigger>
                <TabsTrigger value="kpis">KPI Weights</TabsTrigger>
                <TabsTrigger value="formulas">Formulas</TabsTrigger>
                <TabsTrigger value="recommendations">Templates</TabsTrigger>
                <TabsTrigger value="scoring-model">Scoring Model</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

              <div className="mt-6">
                <TabsContent value="tokens" className="space-y-4">
                  <TokenRelevanceEditor
                    vertical={vertical}
                    market={market}
                    organizationId={orgId}
                    tokens={ruleset.token_relevance_overrides || []}
                  />
                </TabsContent>

                <TabsContent value="hooks" className="space-y-4">
                  <HookPatternEditor
                    vertical={vertical}
                    market={market}
                    organizationId={orgId}
                    hooks={ruleset.hook_pattern_overrides || []}
                  />
                </TabsContent>

                <TabsContent value="stopwords" className="space-y-4">
                  <StopwordEditor
                    vertical={vertical}
                    market={market}
                    organizationId={orgId}
                    stopwords={ruleset.stopword_overrides || []}
                  />
                </TabsContent>

                <TabsContent value="kpis" className="space-y-4">
                  <KpiWeightEditor
                    vertical={vertical}
                    market={market}
                    organizationId={orgId}
                    kpis={ruleset.kpi_weight_overrides || []}
                  />
                </TabsContent>

                <TabsContent value="formulas" className="space-y-4">
                  <FormulaOverrideEditor
                    vertical={vertical}
                    market={market}
                    organizationId={orgId}
                    formulas={ruleset.formula_overrides || []}
                  />
                </TabsContent>

                <TabsContent value="recommendations" className="space-y-4">
                  <RecommendationTemplateEditor
                    vertical={vertical}
                    market={market}
                    organizationId={orgId}
                    recommendations={ruleset.recommendation_template_overrides || []}
                  />
                </TabsContent>

                <TabsContent value="scoring-model" className="space-y-4">
                  <ScoringModelView
                    vertical={vertical}
                    market={market}
                    organizationId={orgId}
                  />
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                  <VersionHistoryView
                    vertical={vertical}
                    market={market}
                    organizationId={orgId}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
