import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { Anomaly, getAnomalyColor } from '@/utils/anomalyDetection';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AnomalyMarkerProps {
  anomaly: Anomaly;
  cx?: number;
  cy?: number;
  size?: number;
}

/**
 * Visual marker for anomalies on charts
 *
 * Used as a custom dot component in Recharts:
 * <Line dot={<AnomalyMarker anomaly={anomaly} />} />
 */
export function AnomalyMarker({
  anomaly,
  cx = 0,
  cy = 0,
  size = 20
}: AnomalyMarkerProps) {
  const color = getAnomalyColor(anomaly);
  const Icon = anomaly.type === 'spike' ? TrendingUp : TrendingDown;

  // Severity determines visual intensity
  const opacity = anomaly.severity === 'high' ? 1 : anomaly.severity === 'medium' ? 0.8 : 0.6;
  const pulseSize = anomaly.severity === 'high' ? size + 8 : size + 4;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <g className="cursor-help">
            {/* Pulsing ring for high severity */}
            {anomaly.severity === 'high' && (
              <circle
                cx={cx}
                cy={cy}
                r={pulseSize / 2}
                fill="none"
                stroke={color}
                strokeWidth={2}
                opacity={0.3}
                className="animate-ping"
              />
            )}

            {/* Background circle */}
            <circle
              cx={cx}
              cy={cy}
              r={size / 2}
              fill={color}
              opacity={opacity * 0.2}
              stroke={color}
              strokeWidth={2}
            />

            {/* Icon */}
            <foreignObject
              x={cx - size / 2}
              y={cy - size / 2}
              width={size}
              height={size}
            >
              <div className="flex items-center justify-center h-full">
                <Icon
                  style={{ color }}
                  className="w-3 h-3"
                  strokeWidth={3}
                />
              </div>
            </foreignObject>

            {/* Warning indicator for high severity */}
            {anomaly.severity === 'high' && (
              <foreignObject
                x={cx + size / 3}
                y={cy - size / 2}
                width={size / 2}
                height={size / 2}
              >
                <div className="flex items-center justify-center">
                  <AlertTriangle
                    className="w-2 h-2 text-yellow-400"
                    fill="currentColor"
                  />
                </div>
              </foreignObject>
            )}
          </g>
        </TooltipTrigger>

        <TooltipContent
          side="top"
          className="max-w-xs bg-zinc-900 border-zinc-700 p-3"
        >
          <div className="space-y-2">
            {/* Header */}
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4" style={{ color }} />
              <span className="font-semibold text-sm capitalize">
                {anomaly.type} Detected
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${color}20`,
                  color: color
                }}
              >
                {anomaly.severity}
              </span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-zinc-500">Actual</div>
                <div className="font-medium">{anomaly.value.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-zinc-500">Expected</div>
                <div className="font-medium">{anomaly.expectedValue.toLocaleString()}</div>
              </div>
            </div>

            {/* Deviation */}
            <div className="text-xs">
              <span className="text-zinc-500">Deviation: </span>
              <span className="font-medium" style={{ color }}>
                {anomaly.deviation > 0 ? '+' : ''}{anomaly.deviation.toFixed(1)}σ
              </span>
            </div>

            {/* Explanation */}
            <p className="text-xs text-zinc-400 border-t border-zinc-700 pt-2">
              {anomaly.explanation}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Render anomaly markers on chart data
 *
 * Usage in Recharts:
 * <Line
 *   dataKey="value"
 *   dot={(props) => {
 *     const anomaly = anomalies.find(a => a.date === props.payload.date);
 *     return anomaly ? <AnomalyMarker anomaly={anomaly} {...props} /> : <Dot {...props} />;
 *   }}
 * />
 */
export function renderAnomalyDot(
  anomalies: Anomaly[],
  props: any,
  defaultDot: React.ReactNode = null
) {
  const anomaly = anomalies.find(a => a.date === props.payload?.date);

  if (anomaly) {
    return <AnomalyMarker anomaly={anomaly} cx={props.cx} cy={props.cy} />;
  }

  return defaultDot;
}
