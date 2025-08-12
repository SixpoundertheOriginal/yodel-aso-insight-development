import React, { useMemo } from 'react';
import { useAsoData } from '@/context/AsoDataContext';
import { MainLayout } from '@/layouts';
import InsightCard from '@/components/InsightCard';
import { Target, AlertTriangle } from 'lucide-react';

const median = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
};

const InsightsPage: React.FC = () => {
  const { data } = useAsoData();
  const trafficSources = useMemo(() => data?.trafficSources ?? [], [data]);

  const medianValue = useMemo(
    () => median(trafficSources.map((s) => s.value)),
    [trafficSources]
  );

  const categorized = useMemo(() => {
    const scale: typeof trafficSources = [];
    const optimize: typeof trafficSources = [];
    const investigate: typeof trafficSources = [];
    const expand: typeof trafficSources = [];

    trafficSources.forEach((source) => {
      const highVolume = source.value > medianValue;
      const positiveGrowth = source.delta > 0;
      if (highVolume && positiveGrowth) scale.push(source);
      else if (highVolume && !positiveGrowth) optimize.push(source);
      else if (!highVolume && !positiveGrowth) investigate.push(source);
      else expand.push(source);
    });

    return { scale, optimize, investigate, expand };
  }, [trafficSources, medianValue]);

  return (
    <MainLayout>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <InsightCard
            title="Traffic Performance Matrix"
            subtitle="Strategic positioning by volume and growth"
            preview={`${categorized.optimize.length} sources need optimization`}
            href="/insights/traffic-performance"
            icon={Target}
            status="optimization-needed"
            metrics={{
              scale: categorized.scale.length,
              optimize: categorized.optimize.length,
              investigate: categorized.investigate.length,
              expand: categorized.expand.length,
            }}
          />
          <InsightCard
            title="Anomaly Detection"
            subtitle="Performance outliers & alerts"
            preview="7 critical anomalies detected"
            href="/insights/anomalies"
            icon={AlertTriangle}
            status="critical"
          />
        </div>
      </div>
    </MainLayout>
  );
};

export default InsightsPage;

