/**
 * Anomaly Detection Utility
 *
 * Statistical anomaly detection using Z-score method
 * Identifies unusual spikes and drops in time-series data
 */

export interface Anomaly {
  date: string;
  value: number;
  expectedValue: number;
  deviation: number; // Z-score (standard deviations from mean)
  severity: 'high' | 'medium' | 'low';
  type: 'spike' | 'drop';
  explanation: string;
}

interface DataPoint {
  date: string;
  value: number;
}

/**
 * Calculate mean (average) of values
 */
function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}

/**
 * Calculate standard deviation
 */
function calculateStdDev(values: number[], mean: number): number {
  if (values.length === 0) return 0;
  const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Generate human-readable explanation for anomaly
 */
function generateExplanation(
  metric: string,
  type: 'spike' | 'drop',
  deviation: number,
  actualValue: number,
  expectedValue: number
): string {
  const direction = type === 'spike' ? 'spiked' : 'dropped';
  const percentageChange = expectedValue > 0
    ? Math.abs(((actualValue - expectedValue) / expectedValue) * 100)
    : 0;

  const formattedMetric = metric.charAt(0).toUpperCase() + metric.slice(1);

  let explanation = `${formattedMetric} ${direction} ${percentageChange.toFixed(0)}% ${type === 'spike' ? 'above' : 'below'} the 7-day average. `;

  if (type === 'spike') {
    explanation += 'Check for featuring, press coverage, external campaigns, or other traffic drivers.';
  } else {
    explanation += 'Investigate metadata changes, competitor activity, or technical issues.';
  }

  return explanation;
}

/**
 * Detect anomalies in time-series data using Z-score method
 *
 * @param data - Array of data points with date and value
 * @param metricName - Name of the metric for explanation text
 * @param threshold - Z-score threshold (default: 2.5 = ~98.8% confidence)
 * @param windowSize - Rolling window size for baseline calculation (default: 7 days)
 * @returns Array of detected anomalies
 */
export function detectAnomalies(
  data: DataPoint[],
  metricName: string = 'Metric',
  threshold: number = 2.5,
  windowSize: number = 7
): Anomaly[] {
  // Need at least windowSize + 1 days of data
  if (data.length < windowSize + 1) {
    console.log(`[ANOMALY-DETECTION] Insufficient data: ${data.length} points (need ${windowSize + 1})`);
    return [];
  }

  const anomalies: Anomaly[] = [];

  // Calculate rolling statistics with a sliding window
  for (let i = windowSize; i < data.length; i++) {
    // Get previous windowSize days as baseline
    const window = data.slice(i - windowSize, i);
    const windowValues = window.map(d => d.value);

    const mean = calculateMean(windowValues);
    const stdDev = calculateStdDev(windowValues, mean);

    // Skip if no variation (stdDev = 0)
    if (stdDev === 0) {
      continue;
    }

    const currentValue = data[i].value;
    const zScore = (currentValue - mean) / stdDev;

    // Detect anomaly if |Z-score| > threshold
    if (Math.abs(zScore) > threshold) {
      const isSpike = zScore > 0;

      // Determine severity based on Z-score magnitude
      let severity: Anomaly['severity'];
      if (Math.abs(zScore) > 3.5) {
        severity = 'high';
      } else if (Math.abs(zScore) > 2.5) {
        severity = 'medium';
      } else {
        severity = 'low';
      }

      anomalies.push({
        date: data[i].date,
        value: currentValue,
        expectedValue: mean,
        deviation: zScore,
        severity,
        type: isSpike ? 'spike' : 'drop',
        explanation: generateExplanation(
          metricName,
          isSpike ? 'spike' : 'drop',
          zScore,
          currentValue,
          mean
        )
      });
    }
  }

  console.log(`[ANOMALY-DETECTION] Detected ${anomalies.length} anomalies in ${data.length} data points`);
  return anomalies;
}

/**
 * Format anomaly for display
 */
export function formatAnomaly(anomaly: Anomaly): string {
  const date = new Date(anomaly.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });

  const deviation = anomaly.deviation > 0 ? `+${anomaly.deviation.toFixed(1)}σ` : `${anomaly.deviation.toFixed(1)}σ`;

  return `${date}: ${anomaly.type === 'spike' ? '↑' : '↓'} ${deviation} (${anomaly.severity})`;
}

/**
 * Get color for anomaly severity
 */
export function getAnomalyColor(anomaly: Anomaly): string {
  if (anomaly.type === 'spike') {
    return anomaly.severity === 'high' ? '#fbbf24' : '#fcd34d'; // Yellow shades
  } else {
    return anomaly.severity === 'high' ? '#ef4444' : '#f87171'; // Red shades
  }
}
