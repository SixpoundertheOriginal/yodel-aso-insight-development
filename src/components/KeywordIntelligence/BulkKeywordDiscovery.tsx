import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Rocket, 
  Clock, 
  CheckCircle, 
  XCircle, 
  TrendingUp,
  Users,
  Target,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { bulkKeywordDiscoveryService, type BulkDiscoveryParams, type BulkDiscoveryJob } from '@/services/bulk-keyword-discovery.service';

interface BulkKeywordDiscoveryProps {
  organizationId: string;
  targetAppId?: string;
  onKeywordsDiscovered?: (keywords: any[]) => void;
}

export const BulkKeywordDiscovery: React.FC<BulkKeywordDiscoveryProps> = ({
  organizationId,
  targetAppId,
  onKeywordsDiscovered
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentJob, setCurrentJob] = useState<BulkDiscoveryJob | null>(null);
  const [recentJobs, setRecentJobs] = useState<BulkDiscoveryJob[]>([]);
  const [discoveryParams, setDiscoveryParams] = useState<BulkDiscoveryParams>({
    targetCount: 30,
    includeCompetitors: true,
    analysisDepth: 'standard',
    country: 'us'
  });

  React.useEffect(() => {
    loadRecentJobs();
  }, [organizationId]);

  const loadRecentJobs = async () => {
    try {
      const jobs = await bulkKeywordDiscoveryService.getRecentJobs(organizationId, 5);
      setRecentJobs(jobs);
    } catch (error) {
      console.error('Failed to load recent jobs:', error);
    }
  };

  const startBulkDiscovery = async () => {
    if (!targetAppId) {
      toast.error('Please select an app first');
      return;
    }

    setIsRunning(true);
    try {
      console.log('🚀 Starting bulk discovery with params:', discoveryParams);
      
      const jobId = await bulkKeywordDiscoveryService.startBulkDiscovery(
        organizationId,
        targetAppId,
        discoveryParams
      );

      // Poll for job updates
      pollJobStatus(jobId);
      
      toast.success('Keyword discovery started!');
    } catch (error) {
      console.error('Bulk discovery failed:', error);
      toast.error('Failed to start keyword discovery');
      setIsRunning(false);
    }
  };

  const pollJobStatus = async (jobId: string) => {
    const maxAttempts = 30; // 2.5 minutes max
    let attempts = 0;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setIsRunning(false);
        toast.error('Discovery timed out');
        return;
      }

      try {
        const job = await bulkKeywordDiscoveryService.getDiscoveryJob(jobId);
        if (!job) return;

        setCurrentJob(job);

        if (job.status === 'completed') {
          setIsRunning(false);
          toast.success(`Discovery completed! Found ${job.discoveredKeywords} keywords`);
          loadRecentJobs();
          if (onKeywordsDiscovered) {
            // Trigger parent refresh
            onKeywordsDiscovered([]);
          }
          return;
        }

        if (job.status === 'failed') {
          setIsRunning(false);
          toast.error(`Discovery failed: ${job.error || 'Unknown error'}`);
          return;
        }

        attempts++;
        setTimeout(poll, 5000); // Poll every 5 seconds
      } catch (error) {
        console.error('Job polling error:', error);
        attempts++;
        setTimeout(poll, 5000);
      }
    };

    poll();
  };

  const getStatusIcon = (status: BulkDiscoveryJob['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running': return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: BulkDiscoveryJob['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'failed': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'running': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Discovery Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Bulk Keyword Discovery</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Automatically discover top 10, 30, or 100 keywords for your app
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Configuration Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Target Count */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Keywords to Find</label>
              <Select
                value={discoveryParams.targetCount?.toString() || '30'}
                onValueChange={(value) => setDiscoveryParams(prev => ({ ...prev, targetCount: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Top 10 Keywords
                    </div>
                  </SelectItem>
                  <SelectItem value="30">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Top 30 Keywords
                    </div>
                  </SelectItem>
                  <SelectItem value="100">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Top 100 Keywords
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Analysis Depth */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Analysis Depth</label>
              <Select
                value={discoveryParams.analysisDepth || 'standard'}
                onValueChange={(value: any) => setDiscoveryParams(prev => ({ ...prev, analysisDepth: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quick">Quick Scan</SelectItem>
                  <SelectItem value="standard">Standard Analysis</SelectItem>
                  <SelectItem value="comprehensive">Deep Analysis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Competitor Analysis */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Include Competitors</label>
              <Button
                variant={discoveryParams.includeCompetitors ? "default" : "outline"}
                size="sm"
                onClick={() => setDiscoveryParams(prev => ({ ...prev, includeCompetitors: !prev.includeCompetitors }))}
                className="w-full justify-start"
              >
                <Users className="w-4 h-4 mr-2" />
                {discoveryParams.includeCompetitors ? 'Enabled' : 'Disabled'}
              </Button>
            </div>

            {/* Country */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Market</label>
              <Select
                value={discoveryParams.country || 'us'}
                onValueChange={(value) => setDiscoveryParams(prev => ({ ...prev, country: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="us">🇺🇸 United States</SelectItem>
                  <SelectItem value="gb">🇬🇧 United Kingdom</SelectItem>
                  <SelectItem value="de">🇩🇪 Germany</SelectItem>
                  <SelectItem value="fr">🇫🇷 France</SelectItem>
                  <SelectItem value="es">🇪🇸 Spain</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Start Discovery Button */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {!targetAppId ? 'Select an app to start discovery' : 
               `Ready to discover ${discoveryParams.targetCount} keywords`}
            </div>
            <Button
              onClick={startBulkDiscovery}
              disabled={!targetAppId || isRunning}
              size="lg"
              className="min-w-[140px]"
            >
              {isRunning ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Discovering...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Start Discovery
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Job Progress */}
      {currentJob && isRunning && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500 animate-spin" />
                <h3 className="text-lg font-semibold">Discovery in Progress</h3>
              </div>
              <Badge className={getStatusColor(currentJob.status)}>
                {currentJob.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress 
              value={currentJob.progress.current} 
              max={currentJob.progress.total}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progress: {currentJob.progress.current}%</span>
              <span>Keywords found: {currentJob.discoveredKeywords}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Discovery Jobs */}
      {recentJobs.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Recent Discoveries</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-3 bg-card rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(job.status)}
                    <div>
                      <div className="font-medium text-sm">
                        App: {job.targetAppId}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(job.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-muted-foreground">
                      {job.discoveredKeywords} keywords
                    </div>
                    <Badge className={`${getStatusColor(job.status)} text-xs`}>
                      {job.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};