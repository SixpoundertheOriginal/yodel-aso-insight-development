import React, { useMemo } from 'react';
import { useAsoData } from '@/context/AsoDataContext';
import { MainLayout } from '@/layouts';
import { ContextualInsightsSidebar } from '@/components/AiInsightsPanel/ContextualInsightsSidebar';
import type { TrafficSource, TimeSeriesPoint } from '@/hooks/useMockAsoData';
import { format, parseISO } from 'date-fns';

// Utility functions
const median = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
};

// View 1: Traffic Source Performance Matrix
const TrafficSourceMatrix: React.FC<{ trafficSources: TrafficSource[] }> = ({ trafficSources }) => {
  const medianValue = useMemo(() => median(trafficSources.map(s => s.value)), [trafficSources]);
  const categorized = useMemo(() => trafficSources.map(source => {
    const { value, delta } = source;
    const highVolume = value > medianValue;
    const positiveGrowth = delta > 0;
    if (highVolume && positiveGrowth) return { name: source.name, action: 'Scale', quadrant: 'top-right' };
    if (highVolume && !positiveGrowth) return { name: source.name, action: 'Optimize', quadrant: 'top-left' };
    if (!highVolume && !positiveGrowth) return { name: source.name, action: 'Investigate', quadrant: 'bottom-left' };
    return { name: source.name, action: 'Expand', quadrant: 'bottom-right' };
  }), [trafficSources, medianValue]);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Traffic Source Performance Matrix</h2>
      <div className="grid grid-cols-2 gap-2">
        {categorized.map(item => (
          <div key={item.name} className="p-2 border rounded">
            <span className="font-medium">{item.name}</span>: {item.action}
          </div>
        ))}
      </div>
    </div>
  );
};

// View 2: KPI Correlation Analysis
const KPICorrelationMatrix: React.FC<{ timeseriesData: TimeSeriesPoint[] }> = ({ timeseriesData }) => {
  const kpis = ['impressions', 'downloads', 'product_page_views', 'product_page_cvr', 'impressions_cvr'];
  const calculateCorrelation = (a: number[], b: number[]): number => {
    const n = a.length;
    const meanA = a.reduce((s, v) => s + v, 0) / n;
    const meanB = b.reduce((s, v) => s + v, 0) / n;
    let num = 0, denA = 0, denB = 0;
    for (let i = 0; i < n; i++) {
      num += (a[i] - meanA) * (b[i] - meanB);
      denA += (a[i] - meanA) ** 2;
      denB += (b[i] - meanB) ** 2;
    }
    const denom = Math.sqrt(denA * denB);
    return denom === 0 ? 0 : num / denom;
  };
  const matrix = useMemo(() => kpis.map(k1 => kpis.map(k2 => {
    const vals1 = timeseriesData.map(d => (d as any)[k1] as number);
    const vals2 = timeseriesData.map(d => (d as any)[k2] as number);
    return calculateCorrelation(vals1, vals2);
  })), [timeseriesData]);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">KPI Correlation Analysis</h2>
      <table className="min-w-full text-xs border">
        <thead>
          <tr>
            <th></th>
            {kpis.map(k => (<th key={k} className="p-1">{k}</th>))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={kpis[i]}>
              <th className="p-1 text-right">{kpis[i]}</th>
              {row.map((val, j) => (
                <td key={j} className="p-1 text-center">{val.toFixed(2)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// View 3: Traffic Source Efficiency Dashboard
const TrafficSourceEfficiency: React.FC<{ trafficSources: TrafficSource[] }> = ({ trafficSources }) => {
  const metrics = useMemo(() => trafficSources.map(source => {
    const impressions = source.metrics.impressions.value;
    const pageViews = source.metrics.product_page_views.value;
    const downloads = source.metrics.downloads.value;
    const impressionToPageView = pageViews / impressions || 0;
    const pageViewToDownload = downloads / pageViews || 0;
    const overallConversion = downloads / impressions || 0;
    const qualityScore = (impressionToPageView * 0.3) + (pageViewToDownload * 0.4) + (overallConversion * 0.3);
    return { name: source.name, impressionToPageView, pageViewToDownload, overallConversion, qualityScore };
  }).sort((a, b) => b.qualityScore - a.qualityScore), [trafficSources]);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Traffic Source Efficiency</h2>
      <table className="min-w-full text-xs border">
        <thead>
          <tr>
            <th className="p-1 text-left">Source</th>
            <th className="p-1">Imp→PV</th>
            <th className="p-1">PV→DL</th>
            <th className="p-1">Overall</th>
            <th className="p-1">Score</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map(m => (
            <tr key={m.name}>
              <td className="p-1">{m.name}</td>
              <td className="p-1 text-center">{(m.impressionToPageView * 100).toFixed(2)}%</td>
              <td className="p-1 text-center">{(m.pageViewToDownload * 100).toFixed(2)}%</td>
              <td className="p-1 text-center">{(m.overallConversion * 100).toFixed(2)}%</td>
              <td className="p-1 text-center">{(m.qualityScore * 100).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// View 4: Time-Based Pattern Recognition
const TimeBasedPatterns: React.FC<{ timeseriesData: TimeSeriesPoint[] }> = ({ timeseriesData }) => {
  const dayPatterns = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    timeseriesData.forEach(d => {
      const day = format(parseISO(d.date), 'EEEE');
      if (!map[day]) map[day] = { total: 0, count: 0 };
      map[day].total += d.product_page_cvr || 0;
      map[day].count += 1;
    });
    return Object.keys(map).map(day => ({ day, avgCVR: map[day].total / map[day].count }))
      .sort((a, b) => b.avgCVR - a.avgCVR);
  }, [timeseriesData]);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Time-Based Patterns</h2>
      <ul className="text-sm">
        {dayPatterns.map(p => (
          <li key={p.day}>{p.day}: {p.avgCVR.toFixed(2)}% avg CVR</li>
        ))}
      </ul>
    </div>
  );
};

// View 5: Anomaly Detection & Alerts
const AnomalyDetection: React.FC<{ timeseriesData: TimeSeriesPoint[] }> = ({ timeseriesData }) => {
  const anomalies = useMemo(() => {
    const values = timeseriesData.map(d => d.downloads);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((s, n) => s + Math.pow(n - mean, 2), 0) / values.length);
    return timeseriesData.map(point => {
      const zScore = Math.abs((point.downloads - mean) / stdDev);
      return { date: point.date, value: point.downloads, zScore, isAnomaly: zScore > 2 };
    }).filter(p => p.isAnomaly);
  }, [timeseriesData]);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Anomaly Detection</h2>
      {anomalies.length === 0 ? (
        <p className="text-sm">No anomalies detected</p>
      ) : (
        <ul className="text-sm">
          {anomalies.map(a => (
            <li key={a.date}>{a.date}: {a.value} (z={a.zScore.toFixed(2)})</li>
          ))}
        </ul>
      )}
    </div>
  );
};

const InsightsPage: React.FC = () => {
  const { data } = useAsoData();

  return (
    <MainLayout>
      <div className="flex">
        <main className="flex-1 p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <TrafficSourceMatrix trafficSources={data?.trafficSources || []} />
            </div>
            <div>
              <AnomalyDetection timeseriesData={data?.timeseriesData || []} />
            </div>
            <div className="lg:col-span-2">
              <KPICorrelationMatrix timeseriesData={data?.timeseriesData || []} />
            </div>
            <div>
              <TimeBasedPatterns timeseriesData={data?.timeseriesData || []} />
            </div>
            <div className="lg:col-span-2 xl:col-span-3">
              <TrafficSourceEfficiency trafficSources={data?.trafficSources || []} />
            </div>
          </div>
        </main>
        <ContextualInsightsSidebar metricsData={data} organizationId="demo" />
      </div>
    </MainLayout>
  );
};

export default InsightsPage;

