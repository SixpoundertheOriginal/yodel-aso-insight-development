import React, { useState, useCallback, useEffect } from 'react';
import BenchmarkCards from './BenchmarkCards';
import BenchmarkGraph from './BenchmarkGraph';
import { useBenchmarkData, BenchmarkMetric, GraphDataPoint } from '@/hooks/useBigQueryData';

const ALLOWED_METRICS = ['product_page_cvr', 'impressions_cvr', 'search_cvr', 'browse_cvr'] as const;
const METRIC_WHITELIST = new Set(ALLOWED_METRICS);

const validateMetricSelection = (metric: string): metric is BenchmarkMetric['id'] => {
  return METRIC_WHITELIST.has(metric as BenchmarkMetric['id']);
};

const sanitizeMetricName = (name: string): string => {
  return name.replace(/[<>"'&]/g, (match) => {
    const escapeMap: Record<string, string> = {
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '&': '&amp;'
    };
    return escapeMap[match];
  });
};

interface BenchmarkTabProps {
  organizationId: string;
  dateRange: { startDate: string; endDate: string };
  trafficSources?: string[];
}

const BenchmarkTab: React.FC<BenchmarkTabProps> = ({
  organizationId,
  dateRange,
  trafficSources = []
}) => {
  const [selectedMetric, setSelectedMetric] = useState<BenchmarkMetric['id']>('product_page_cvr');
  const [metricsData, setMetricsData] = useState<BenchmarkMetric[]>([]);
  const [graphData, setGraphData] = useState<GraphDataPoint[]>([]);
  const [loading, setLoading] = useState(false);

  const { data, metrics, loading: hookLoading, refetch } = useBenchmarkData({
    organizationId,
    selectedMetric,
    dateRange,
    trafficSources
  });

  useEffect(() => {
    setMetricsData(metrics.map(m => ({ ...m, name: sanitizeMetricName(m.name) })));
  }, [metrics]);

  useEffect(() => {
    setGraphData(data);
  }, [data]);

  useEffect(() => {
    setLoading(hookLoading);
  }, [hookLoading]);

  const fetchBenchmarkGraphData = useCallback((metricId: BenchmarkMetric['id']) => {
    refetch(metricId);
  }, [refetch]);

  const handleMetricSelection = useCallback((metricId: BenchmarkMetric['id']) => {
    if (validateMetricSelection(metricId)) {
      setSelectedMetric(metricId);
      fetchBenchmarkGraphData(metricId);
    } else {
      console.warn('Invalid metric selection attempted:', metricId);
    }
  }, [fetchBenchmarkGraphData]);

  const currentMetric = metricsData.find(m => m.id === selectedMetric);

  return (
    <div>
      <BenchmarkCards
        metrics={metricsData}
        selectedMetric={selectedMetric}
        onMetricSelect={handleMetricSelection}
        loading={loading}
      />
      {currentMetric && (
        <BenchmarkGraph
          data={graphData}
          selectedMetric={currentMetric}
          loading={loading}
          dateRange={dateRange}
        />
      )}
    </div>
  );
};

export default BenchmarkTab;
