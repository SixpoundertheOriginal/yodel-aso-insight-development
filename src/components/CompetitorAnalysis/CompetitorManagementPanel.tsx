/**
 * Competitor Management Panel
 *
 * Manages competitors for a target app:
 * - List all competitors
 * - Add new competitors
 * - Audit competitors
 * - View audit status
 * - Remove competitors
 *
 * @module components/CompetitorAnalysis/CompetitorManagementPanel
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Star,
  TrendingUp,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AddCompetitorDialog } from './AddCompetitorDialog';
import {
  auditAllCompetitorsForApp,
  type AuditCompetitorResult,
  type AuditCompetitorError,
} from '@/services/competitor-audit.service';
import { toast } from 'sonner';

interface CompetitorManagementPanelProps {
  targetAppId: string;
  organizationId: string;
  onCompetitorsUpdated?: () => void;
  onAnalyzeClick?: (audits: AuditCompetitorResult[]) => void;
}

interface Competitor {
  id: string;
  competitor_app_store_id: string;
  competitor_name: string;
  competitor_icon_url: string | null;
  competitor_rating: number | null;
  competitor_review_count: number | null;
  competitor_category: string | null;
  last_audit_at: string | null;
  last_audit_score: number | null;
  audit_status: 'never_audited' | 'pending' | 'completed' | 'failed' | 'stale';
  is_audit_stale: boolean;
  created_at: string;
}

export const CompetitorManagementPanel: React.FC<CompetitorManagementPanelProps> = ({
  targetAppId,
  organizationId,
  onCompetitorsUpdated,
  onAnalyzeClick,
}) => {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [auditing, setAuditing] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCompetitors();
  }, [targetAppId]);

  const loadCompetitors = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('app_competitors')
        .select('*')
        .eq('target_app_id', targetAppId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCompetitors(data || []);
    } catch (error: any) {
      console.error('Failed to load competitors:', error);
      toast.error('Failed to load competitors');
    } finally {
      setLoading(false);
    }
  };

  const handleAuditAll = async () => {
    if (competitors.length === 0) {
      toast.error('No competitors to audit');
      return;
    }

    setAuditing(true);
    toast.info(`Auditing ${competitors.length} competitors...`);

    try {
      const results = await auditAllCompetitorsForApp(targetAppId, organizationId, undefined, true);

      const successCount = results.filter((r) => !('error' in r)).length;
      const failedCount = results.filter((r) => 'error' in r).length;

      if (successCount > 0) {
        toast.success(`Successfully audited ${successCount}/${competitors.length} competitors`);

        // Reload competitors to show updated audit status
        await loadCompetitors();

        // Trigger analysis if callback provided
        if (onAnalyzeClick) {
          const successfulAudits = results.filter((r) => !('error' in r)) as AuditCompetitorResult[];
          onAnalyzeClick(successfulAudits);
        }

        onCompetitorsUpdated?.();
      }

      if (failedCount > 0) {
        toast.warning(`${failedCount} audits failed`);
      }
    } catch (error: any) {
      console.error('Failed to audit competitors:', error);
      toast.error('Failed to audit competitors');
    } finally {
      setAuditing(false);
    }
  };

  const handleDelete = async (competitorId: string, competitorName: string) => {
    if (!confirm(`Remove ${competitorName} as competitor? This will delete all audit history.`)) {
      return;
    }

    setDeletingIds((prev) => new Set(prev).add(competitorId));

    try {
      const { error } = await supabase
        .from('app_competitors')
        .update({ is_active: false })
        .eq('id', competitorId);

      if (error) throw error;

      toast.success(`Removed ${competitorName}`);
      await loadCompetitors();
      onCompetitorsUpdated?.();
    } catch (error: any) {
      console.error('Failed to delete competitor:', error);
      toast.error('Failed to remove competitor');
    } finally {
      setDeletingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(competitorId);
        return newSet;
      });
    }
  };

  const getAuditStatusBadge = (status: Competitor['audit_status'], isStale: boolean) => {
    if (isStale && status === 'completed') {
      return (
        <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-400">
          <Clock className="h-3 w-3 mr-1" />
          Stale
        </Badge>
      );
    }

    const configs = {
      never_audited: { icon: Clock, color: 'border-zinc-600 text-zinc-400', text: 'Not Audited' },
      pending: { icon: Loader2, color: 'border-blue-500/30 text-blue-400', text: 'Pending' },
      completed: { icon: CheckCircle2, color: 'border-emerald-500/30 text-emerald-400', text: 'Completed' },
      failed: { icon: AlertCircle, color: 'border-red-500/30 text-red-400', text: 'Failed' },
      stale: { icon: Clock, color: 'border-amber-500/30 text-amber-400', text: 'Stale' },
    };

    const config = configs[status];
    const Icon = config.icon;

    return (
      <Badge variant="outline" className={`text-xs ${config.color}`}>
        <Icon className={`h-3 w-3 mr-1 ${status === 'pending' ? 'animate-spin' : ''}`} />
        {config.text}
      </Badge>
    );
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const needsAuditCount = competitors.filter(
    (c) => c.audit_status === 'never_audited' || c.is_audit_stale
  ).length;

  if (loading) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-medium text-zinc-300 flex items-center gap-2">
                <Users className="h-4 w-4 text-violet-400" />
                Competitors ({competitors.length})
              </CardTitle>
              {needsAuditCount > 0 && (
                <p className="text-xs text-amber-400 mt-1">
                  {needsAuditCount} competitor{needsAuditCount > 1 ? 's' : ''} need{needsAuditCount === 1 ? 's' : ''} audit
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleAuditAll}
                disabled={auditing || competitors.length === 0}
              >
                {auditing ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Auditing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Audit All
                  </>
                )}
              </Button>
              <Button
                size="sm"
                onClick={() => setAddDialogOpen(true)}
                className="bg-violet-600 hover:bg-violet-700"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Competitor
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {competitors.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
              <h3 className="text-sm font-medium text-zinc-400 mb-1">No competitors added yet</h3>
              <p className="text-xs text-zinc-500 mb-4">
                Add competitors to compare their metadata and get insights
              </p>
              <Button size="sm" onClick={() => setAddDialogOpen(true)} className="bg-violet-600 hover:bg-violet-700">
                <Plus className="h-3 w-3 mr-1" />
                Add Your First Competitor
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {competitors.map((competitor) => (
                <div
                  key={competitor.id}
                  className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700 hover:border-zinc-600 transition-all"
                >
                  {/* App Icon */}
                  {competitor.competitor_icon_url ? (
                    <img
                      src={competitor.competitor_icon_url}
                      alt={competitor.competitor_name}
                      className="w-12 h-12 rounded-lg flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-zinc-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-zinc-400 text-xs">No Icon</span>
                    </div>
                  )}

                  {/* App Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium text-zinc-100 truncate">
                        {competitor.competitor_name}
                      </h4>
                      {competitor.last_audit_score !== null && (
                        <Badge variant="outline" className="text-xs border-violet-500/30 text-violet-400">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {competitor.last_audit_score.toFixed(0)}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      {competitor.competitor_category && (
                        <span>{competitor.competitor_category}</span>
                      )}
                      {competitor.competitor_rating && (
                        <>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                            <span>{competitor.competitor_rating.toFixed(1)}</span>
                          </div>
                        </>
                      )}
                      <span>•</span>
                      <span>ID: {competitor.competitor_app_store_id}</span>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      {getAuditStatusBadge(competitor.audit_status, competitor.is_audit_stale)}
                      {competitor.last_audit_at && (
                        <span className="text-xs text-zinc-500">
                          Last audit: {formatDate(competitor.last_audit_at)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(competitor.id, competitor.competitor_name)}
                    disabled={deletingIds.has(competitor.id)}
                    className="flex-shrink-0 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                  >
                    {deletingIds.has(competitor.id) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddCompetitorDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        targetAppId={targetAppId}
        organizationId={organizationId}
        onCompetitorAdded={() => {
          loadCompetitors();
          onCompetitorsUpdated?.();
        }}
      />
    </>
  );
};
