
import React, { useMemo } from "react";
import { formatCVR, formatNumber } from "@/utils/format";

interface KpiCardProps {
  title: string;
  value: number | string;
  delta: number;
  isPercentage?: boolean;
  precision?: number;
  className?: string;
}

const KpiCard: React.FC<KpiCardProps> = React.memo(({
  title,
  value,
  delta,
  isPercentage = false,
  precision = 2,
  className = ""
}) => {
  const isPositive = delta >= 0;

  const displayValue = useMemo(() => {
    if (typeof value === "string") {
      return value;
    }
    if (isPercentage) {
      return formatCVR(value, precision);
    }
    return formatNumber(value);
  }, [value, isPercentage, precision]);

  const displayDelta = useMemo(() => {
    const formattedDelta = Math.abs(delta).toFixed(1);
    const sign = delta >= 0 ? "+" : "-";
    const suffix = isPercentage ? "%" : "";
    return `${sign}${formattedDelta}${suffix} vs previous period`;
  }, [delta, isPercentage]);

  return (
    <div className={`analytics-card-container ${className}`}>
      <div className="text-center">
        <h3 className="analytics-card-title">{title}</h3>
        <div className="analytics-card-value">{displayValue}</div>
        <div className={`analytics-card-delta ${isPositive ? "positive" : "negative"}`}>
          {displayDelta}
        </div>
      </div>
    </div>
  );
});

KpiCard.displayName = "KpiCard";
export default KpiCard;
