import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, Eye, MousePointer, Download, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConversionFunnelChartProps {
  data: any[];
  isLoading?: boolean;
}

export function ConversionFunnelChart({ data = [], isLoading = false }: ConversionFunnelChartProps) {

  const funnelData = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        impressions: 0,
        product_page_views: 0,
        downloads: 0,
        impression_to_ppv: 0,
        ppv_to_download: 0,
        overall_cvr: 0
      };
    }

    const totals = data.reduce((acc, row) => ({
      impressions: acc.impressions + (row.impressions || 0),
      product_page_views: acc.product_page_views + (row.product_page_views || 0),
      downloads: acc.downloads + (row.downloads || row.installs || 0)
    }), { impressions: 0, product_page_views: 0, downloads: 0 });

    const impression_to_ppv = totals.impressions > 0
      ? (totals.product_page_views / totals.impressions) * 100
      : 0;

    const ppv_to_download = totals.product_page_views > 0
      ? (totals.downloads / totals.product_page_views) * 100
      : 0;

    const overall_cvr = totals.impressions > 0
      ? (totals.downloads / totals.impressions) * 100
      : 0;

    return {
      impressions: totals.impressions,
      product_page_views: totals.product_page_views,
      downloads: totals.downloads,
      impression_to_ppv,
      ppv_to_download,
      overall_cvr
    };
  }, [data]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const stages = [
    {
      label: 'Impressions',
      value: funnelData.impressions,
      icon: Eye,
      color: 'from-blue-500 to-blue-600',
      percentage: 100
    },
    {
      label: 'Product Page Views',
      value: funnelData.product_page_views,
      icon: MousePointer,
      color: 'from-purple-500 to-purple-600',
      percentage: funnelData.impressions > 0 ? (funnelData.product_page_views / funnelData.impressions) * 100 : 0
    },
    {
      label: 'Downloads',
      value: funnelData.downloads,
      icon: Download,
      color: 'from-green-500 to-green-600',
      percentage: funnelData.impressions > 0 ? (funnelData.downloads / funnelData.impressions) * 100 : 0
    }
  ];

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="h-[400px] animate-pulse bg-muted rounded-lg" />
      </Card>
    );
  }

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Conversion Funnel</h3>
        </div>
        <Badge variant="secondary" className="text-green-600">
          {funnelData.overall_cvr.toFixed(2)}% Overall CVR
        </Badge>
      </div>

      {/* Funnel Visualization */}
      <div className="space-y-4">
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          const nextStage = stages[index + 1];
          const dropOffRate = nextStage
            ? ((stage.value - nextStage.value) / stage.value) * 100
            : 0;

          return (
            <div key={stage.label} className="space-y-2">
              {/* Stage Bar */}
              <div
                className={cn(
                  "relative rounded-lg p-4 transition-all hover:scale-[1.02]",
                  `bg-gradient-to-r ${stage.color}`
                )}
                style={{
                  width: `${stage.percentage}%`,
                  minWidth: '40%'
                }}
              >
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5" />
                    <span className="font-semibold">{stage.label}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{formatNumber(stage.value)}</div>
                    <div className="text-xs opacity-90">{stage.percentage.toFixed(1)}% of impressions</div>
                  </div>
                </div>
              </div>

              {/* Drop-off indicator */}
              {nextStage && (
                <div className="flex items-center gap-2 pl-4 text-sm text-muted-foreground">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  <span>
                    {dropOffRate.toFixed(1)}% drop-off to {nextStage.label.toLowerCase()}
                  </span>
                  <span className="text-xs">
                    ({formatNumber(stage.value - nextStage.value)} lost)
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Insights */}
      <div className="mt-6 pt-6 border-t">
        <h4 className="text-sm font-semibold mb-3">Key Insights</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Impression → PPV Rate</p>
            <p className="text-xl font-bold">{funnelData.impression_to_ppv.toFixed(2)}%</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">PPV → Download Rate</p>
            <p className="text-xl font-bold">{funnelData.ppv_to_download.toFixed(2)}%</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
