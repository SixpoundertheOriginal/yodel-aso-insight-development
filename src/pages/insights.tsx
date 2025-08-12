import React, { useMemo, useState } from 'react';
import { useAsoData } from '@/context/AsoDataContext';
import { MainLayout } from '@/layouts';
import { ContextualInsightsSidebar } from '@/components/AiInsightsPanel/ContextualInsightsSidebar';
import type { TrafficSource, TimeSeriesPoint } from '@/hooks/useMockAsoData';
import { processTimeBasedPatterns, detectAnomalies } from '@/utils/insightCalculations';
import { ArrowRight, TrendingUp } from 'lucide-react';
import TrafficSourceCard from '@/components/TrafficSourceCard';

// Utility functions
const median = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
};

const KPI_KEYS = ['impressions', 'downloads', 'product_page_views', 'product_page_cvr', 'impressions_cvr'] as const;

// View 1: Traffic Source Performance Matrix with quadrant layout
const TrafficSourceMatrix: React.FC<{ trafficSources: TrafficSource[] }> = ({ trafficSources }) => {
  const medianValue = useMemo(
    () => median(trafficSources.map((s) => s.value)),
    [trafficSources]
  );

  const categorized = useMemo(() => {
    const scale: TrafficSource[] = [];
    const optimize: TrafficSource[] = [];
    const investigate: TrafficSource[] = [];
    const expand: TrafficSource[] = [];

    trafficSources.forEach((source) => {
      const { value, delta } = source;
      const highVolume = value > medianValue;
      const positiveGrowth = delta > 0;
      if (highVolume && positiveGrowth) scale.push(source);
      else if (highVolume && !positiveGrowth) optimize.push(source);
      else if (!highVolume && !positiveGrowth) investigate.push(source);
      else expand.push(source);
    });

    return { scale, optimize, investigate, expand };
  }, [trafficSources, medianValue]);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <TrendingUp className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Traffic Source Performance Matrix
            </h3>
            <p className="text-sm text-gray-500">
              Strategic positioning by volume and growth
            </p>
          </div>
        </div>
        <button className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
          View Details <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <div className="relative grid grid-cols-2 gap-4 h-80 mb-4">
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-sm font-medium text-gray-600">
          High Growth →
        </div>
        <div className="absolute -left-16 top-1/2 transform -translate-y-1/2 -rotate-90 text-sm font-medium text-gray-600">
          High Volume ↑
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg p-4 border-2 border-green-200 relative">
          <div className="absolute top-2 left-2 px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full">
            SCALE
          </div>
          {categorized.scale.map((source) => (
            <TrafficSourceCard
              key={source.name}
              source={{
                name: source.name,
                downloads: source.value,
                trend: source.delta,
              }}
              quadrant="scale"
            />
          ))}
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-amber-100 rounded-lg p-4 border-2 border-yellow-200 relative">
          <div className="absolute top-2 left-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full">
            OPTIMIZE
          </div>
          {categorized.optimize.map((source) => (
            <TrafficSourceCard
              key={source.name}
              source={{
                name: source.name,
                downloads: source.value,
                trend: source.delta,
              }}
              quadrant="optimize"
            />
          ))}
        </div>

        <div className="bg-gradient-to-br from-red-50 to-rose-100 rounded-lg p-4 border-2 border-red-200 relative">
          <div className="absolute top-2 left-2 px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full">
            INVESTIGATE
          </div>
          {categorized.investigate.map((source) => (
            <TrafficSourceCard
              key={source.name}
              source={{
                name: source.name,
                downloads: source.value,
                trend: source.delta,
              }}
              quadrant="investigate"
            />
          ))}
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-cyan-100 rounded-lg p-4 border-2 border-blue-200 relative">
          <div className="absolute top-2 left-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
            EXPAND
          </div>
          {categorized.expand.map((source) => (
            <TrafficSourceCard
              key={source.name}
              source={{
                name: source.name,
                downloads: source.value,
                trend: source.delta,
              }}
              quadrant="expand"
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// View 2: KPI Correlation Analysis with heatmap
const KPICorrelationMatrix: React.FC<{ timeseriesData: TimeSeriesPoint[] }> = ({ timeseriesData }) => {
  const kpis = KPI_KEYS;

  const calculateCorrelation = (a: number[], b: number[]): number => {
    const n = a.length;
    const meanA = a.reduce((s, v) => s + v, 0) / n;
    const meanB = b.reduce((s, v) => s + v, 0) / n;
    let num = 0;
    let denA = 0;
    let denB = 0;
    for (let i = 0; i < n; i++) {
      num += (a[i] - meanA) * (b[i] - meanB);
      denA += (a[i] - meanA) ** 2;
      denB += (b[i] - meanB) ** 2;
    }
    const denom = Math.sqrt(denA * denB);
    return denom === 0 ? 0 : num / denom;
  };

  const matrix = useMemo(
    () =>
      kpis.map((k1) =>
        kpis.map((k2) => {
          const vals1 = timeseriesData.map(
            (d) => d[k1 as keyof TimeSeriesPoint] as number
          );
          const vals2 = timeseriesData.map(
            (d) => d[k2 as keyof TimeSeriesPoint] as number
          );
          return calculateCorrelation(vals1, vals2);
        })
      ),
    [timeseriesData, kpis]
  );

  const getCorrelationColor = (correlation: number) => {
    if (correlation >= 0.8) return 'bg-green-500 text-white';
    if (correlation >= 0.5) return 'bg-green-300 text-green-900';
    if (correlation >= 0.2) return 'bg-green-100 text-green-800';
    if (correlation >= -0.2) return 'bg-gray-100 text-gray-700';
    if (correlation >= -0.5) return 'bg-red-100 text-red-800';
    if (correlation >= -0.8) return 'bg-red-300 text-red-900';
    return 'bg-red-500 text-white';
  };

  const [, setHovered] = useState<{
    row: number;
    col: number;
    value: number;
  } | null>(null);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          KPI Correlation Analysis
        </h3>
        <p className="text-sm text-gray-500">
          Understanding metric relationships and leading indicators
        </p>
      </div>

      <div className="grid grid-cols-6 gap-1 mb-4">
        <div className="text-xs font-medium text-gray-600 p-2"></div>
        {kpis.map((kpi) => (
          <div
            key={kpi}
            className="text-xs font-medium text-gray-600 p-2 text-center"
          >
            {kpi}
          </div>
        ))}

        {matrix.map((row, rowIndex) => (
          <React.Fragment key={rowIndex}>
            <div className="text-xs font-medium text-gray-600 p-2">
              {kpis[rowIndex]}
            </div>
            {row.map((correlation, colIndex) => (
              <div
                key={colIndex}
                className={`relative p-2 rounded-md text-center text-xs font-bold transition-all duration-200 hover:scale-110 cursor-pointer ${getCorrelationColor(
                  correlation
                )}`}
                onMouseEnter={() =>
                  setHovered({ row: rowIndex, col: colIndex, value: correlation })
                }
              >
                {correlation.toFixed(2)}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
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
  const { dayPerformance, bestDay, worstDay, weekendVsWeekday } = useMemo(
    () => processTimeBasedPatterns(timeseriesData),
    [timeseriesData]
  );

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Time-Based Patterns</h2>
      {dayPerformance.length === 0 ? (
        <p className="text-sm">Not enough data</p>
      ) : (
        <>
          <ul className="text-sm">
            {dayPerformance.map((p) => (
              <li key={p.dayIndex}>
                {p.dayName}: {p.avgCVR.toFixed(2)}% avg CVR ({p.trend})
              </li>
            ))}
          </ul>
          <p className="text-sm mt-2">
            Best day: {bestDay}, Worst day: {worstDay}
          </p>
          <p className="text-sm">
            Weekend vs Weekday CVR: {weekendVsWeekday.weekend.avgCVR.toFixed(2)}% vs {weekendVsWeekday.weekday.avgCVR.toFixed(2)}% (Δ {weekendVsWeekday.deltaCVR.toFixed(2)} pts)
          </p>
        </>
      )}
    </div>
  );
};

// View 5: Anomaly Detection & Alerts
const AnomalyDetection: React.FC<{ timeseriesData: TimeSeriesPoint[] }> = ({ timeseriesData }) => {
  const { anomalies, summary, hasAnomalies } = useMemo(
    () => detectAnomalies(timeseriesData),
    [timeseriesData]
  );

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Anomaly Detection</h2>
      {!hasAnomalies ? (
        <p className="text-sm">No anomalies detected</p>
      ) : (
        <div className="text-sm">
          <ul>
            {anomalies.map((a, idx) => (
              <li key={`${a.date}-${a.metric}-${idx}`}>
                {a.date}: {a.metric} {a.explanation} (z={a.zScore.toFixed(2)}) [{a.severity}]
              </li>
            ))}
          </ul>
          <p className="mt-2">
            Total anomalies: {summary.totalAnomalies} (medium: {summary.bySeverity.medium}, high: {summary.bySeverity.high}, critical: {summary.bySeverity.critical})
          </p>
        </div>
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

