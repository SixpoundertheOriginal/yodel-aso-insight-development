import type { TimeSeriesPoint } from '@/hooks/useMockAsoData';

export interface DayPerformance {
  dayName: string;
  dayIndex: number;
  avgCVR: number;
  totalDownloads: number;
  totalImpressions: number;
  vsOverallAvg: number;
  trend: 'above' | 'below' | 'average';
}

export interface ComparisonStats {
  weekend: {
    avgCVR: number;
    totalDownloads: number;
    totalImpressions: number;
  };
  weekday: {
    avgCVR: number;
    totalDownloads: number;
    totalImpressions: number;
  };
  deltaCVR: number;
}

export interface TimePatternResult {
  dayPerformance: DayPerformance[];
  bestDay: string;
  worstDay: string;
  weekendVsWeekday: ComparisonStats;
}

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const processTimeBasedPatterns = (timeseriesData: TimeSeriesPoint[]): TimePatternResult => {
  if (!timeseriesData || timeseriesData.length === 0) {
    return {
      dayPerformance: [],
      bestDay: '',
      worstDay: '',
      weekendVsWeekday: {
        weekend: { avgCVR: 0, totalDownloads: 0, totalImpressions: 0 },
        weekday: { avgCVR: 0, totalDownloads: 0, totalImpressions: 0 },
        deltaCVR: 0,
      },
    };
  }

  const dayMap: Record<number, { downloads: number; impressions: number }> = {};

  timeseriesData.forEach((point) => {
    const dayIndex = new Date(`${point.date}T00:00:00Z`).getUTCDay();
    if (!dayMap[dayIndex]) dayMap[dayIndex] = { downloads: 0, impressions: 0 };
    dayMap[dayIndex].downloads += point.downloads;
    dayMap[dayIndex].impressions += point.impressions;
  });

  const overallTotals = Object.values(dayMap).reduce(
    (acc, cur) => {
      acc.downloads += cur.downloads;
      acc.impressions += cur.impressions;
      return acc;
    },
    { downloads: 0, impressions: 0 }
  );

  const overallAvg =
    overallTotals.impressions > 0
      ? (overallTotals.downloads / overallTotals.impressions) * 100
      : 0;

  const dayPerformance: DayPerformance[] = [];
  for (let i = 0; i < 7; i++) {
    const stats = dayMap[i] || { downloads: 0, impressions: 0 };
    const avgCVR =
      stats.impressions > 0 ? (stats.downloads / stats.impressions) * 100 : 0;
    const vsOverallAvg =
      overallAvg === 0 ? 0 : ((avgCVR - overallAvg) / overallAvg) * 100;
    let trend: 'above' | 'below' | 'average';
    if (Math.abs(vsOverallAvg) < 5) trend = 'average';
    else trend = vsOverallAvg > 0 ? 'above' : 'below';

    dayPerformance.push({
      dayName: dayNames[i],
      dayIndex: i,
      avgCVR,
      totalDownloads: stats.downloads,
      totalImpressions: stats.impressions,
      vsOverallAvg,
      trend,
    });
  }

  const sortedByCVR = [...dayPerformance].sort((a, b) => b.avgCVR - a.avgCVR);
  const bestDay = sortedByCVR[0]?.dayName || '';
  const worstDay = sortedByCVR[sortedByCVR.length - 1]?.dayName || '';

  const weekendIndices = [0, 6];
  const weekdayIndices = [1, 2, 3, 4, 5];

  const weekendTotals = weekendIndices.reduce(
    (acc, idx) => {
      const stats = dayMap[idx] || { downloads: 0, impressions: 0 };
      acc.downloads += stats.downloads;
      acc.impressions += stats.impressions;
      return acc;
    },
    { downloads: 0, impressions: 0 }
  );

  const weekdayTotals = weekdayIndices.reduce(
    (acc, idx) => {
      const stats = dayMap[idx] || { downloads: 0, impressions: 0 };
      acc.downloads += stats.downloads;
      acc.impressions += stats.impressions;
      return acc;
    },
    { downloads: 0, impressions: 0 }
  );

  const weekendAvgCVR =
    weekendTotals.impressions > 0
      ? (weekendTotals.downloads / weekendTotals.impressions) * 100
      : 0;
  const weekdayAvgCVR =
    weekdayTotals.impressions > 0
      ? (weekdayTotals.downloads / weekdayTotals.impressions) * 100
      : 0;

  const weekendVsWeekday: ComparisonStats = {
    weekend: {
      avgCVR: weekendAvgCVR,
      totalDownloads: weekendTotals.downloads,
      totalImpressions: weekendTotals.impressions,
    },
    weekday: {
      avgCVR: weekdayAvgCVR,
      totalDownloads: weekdayTotals.downloads,
      totalImpressions: weekdayTotals.impressions,
    },
    deltaCVR: weekendAvgCVR - weekdayAvgCVR,
  };

  return { dayPerformance, bestDay, worstDay, weekendVsWeekday };
};

export interface AnomalyPoint {
  date: string;
  metric: 'downloads' | 'impressions' | 'cvr';
  actualValue: number;
  expectedValue: number;
  deviationPercent: number;
  zScore: number;
  severity: 'medium' | 'high' | 'critical';
  explanation: string;
}

export interface AnomalySummary {
  totalAnomalies: number;
  bySeverity: { medium: number; high: number; critical: number };
  mostRecentAnomaly: AnomalyPoint | null;
  trendsDetected: string[];
}

export interface AnomalyResult {
  anomalies: AnomalyPoint[];
  summary: AnomalySummary;
  hasAnomalies: boolean;
}

const severityRank: Record<AnomalyPoint['severity'], number> = {
  medium: 1,
  high: 2,
  critical: 3,
};

export const detectAnomalies = (timeseriesData: TimeSeriesPoint[]): AnomalyResult => {
  if (!timeseriesData || timeseriesData.length < 8) {
    return {
      anomalies: [],
      summary: {
        totalAnomalies: 0,
        bySeverity: { medium: 0, high: 0, critical: 0 },
        mostRecentAnomaly: null,
        trendsDetected: [],
      },
      hasAnomalies: false,
    };
  }

  const window = 7;
  const anomalies: AnomalyPoint[] = [];
  for (let i = window; i < timeseriesData.length; i++) {
    const slice = timeseriesData.slice(i - window, i);
    const point = timeseriesData[i];

    const metrics: AnomalyPoint['metric'][] = ['downloads', 'impressions', 'cvr'];

    metrics.forEach((metric) => {
      const values = slice.map((p) => {
        if (metric === 'cvr') {
          return p.impressions > 0 ? (p.downloads / p.impressions) * 100 : 0;
        }
        return p[metric];
      });

      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const stdDev = Math.sqrt(
        values.reduce((s, n) => s + Math.pow(n - mean, 2), 0) / values.length
      );

      const actualValue =
        metric === 'cvr'
          ? point.impressions > 0
            ? (point.downloads / point.impressions) * 100
            : 0
          : point[metric];

      if (stdDev === 0) return;
      const zScore = (actualValue - mean) / stdDev;
      const absZ = Math.abs(zScore);
      if (absZ > 2) {
        let severity: AnomalyPoint['severity'];
        if (absZ >= 3) severity = 'critical';
        else if (absZ >= 2.5) severity = 'high';
        else severity = 'medium';
        const deviationPercent =
          mean === 0 ? 0 : ((actualValue - mean) / mean) * 100;
        const direction = actualValue >= mean ? 'spiked' : 'dropped';
        const metricLabel =
          metric === 'cvr'
            ? 'CVR'
            : metric.charAt(0).toUpperCase() + metric.slice(1);
        const explanation = `${metricLabel} ${direction} ${Math.abs(
          deviationPercent
        ).toFixed(1)}% ${direction === 'spiked' ? 'above' : 'below'} normal`;

        anomalies.push({
          date: point.date,
          metric,
          actualValue,
          expectedValue: mean,
          deviationPercent,
          zScore,
          severity,
          explanation,
        });
      }
    });
  }

  anomalies.sort((a, b) => {
    if (severityRank[b.severity] !== severityRank[a.severity]) {
      return severityRank[b.severity] - severityRank[a.severity];
    }
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const bySeverity = { medium: 0, high: 0, critical: 0 };
  anomalies.forEach((a) => {
    bySeverity[a.severity]++;
  });

  const mostRecentAnomaly = anomalies.length
    ? [...anomalies].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0]
    : null;

  const trendsDetected: string[] = [];
  ['downloads', 'impressions', 'cvr'].forEach((metric) => {
    const metricAnoms = anomalies
      .filter((a) => a.metric === metric)
      .sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    for (let i = 1; i < metricAnoms.length; i++) {
      const prev = metricAnoms[i - 1];
      const curr = metricAnoms[i];
      const prevDir = prev.actualValue - prev.expectedValue;
      const currDir = curr.actualValue - curr.expectedValue;
      const prevDate = new Date(prev.date).getTime();
      const currDate = new Date(curr.date).getTime();
      if (
        currDate - prevDate <= 24 * 60 * 60 * 1000 &&
        (prevDir > 0) === (currDir > 0)
      ) {
        const direction = currDir > 0 ? 'increase' : 'decrease';
        const label =
          metric === 'cvr'
            ? 'CVR'
            : metric.charAt(0).toUpperCase() + metric.slice(1);
        const msg = `${label} showed sustained ${direction}`;
        if (!trendsDetected.includes(msg)) trendsDetected.push(msg);
      }
    }
  });

  return {
    anomalies,
    summary: {
      totalAnomalies: anomalies.length,
      bySeverity,
      mostRecentAnomaly,
      trendsDetected,
    },
    hasAnomalies: anomalies.length > 0,
  };
};

