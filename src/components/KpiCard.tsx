
import React, { useMemo } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { formatCVR, formatNumber } from "@/utils/format";
import { EnterpriseMetricCard } from "@/lib/design-system";

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
  precision = 1,
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

  // Convert to enterprise metric card format
  const deltaFormatted = useMemo(() => ({
    value: Math.abs(delta),
    period: 'previous period',
    trend: isPositive ? 'positive' : 'negative'
  }), [delta, isPositive]) as { value: number; period: string; trend: 'positive' | 'negative' };

  // Determine icon based on KPI type
  const getIcon = () => {
    if (title.toLowerCase().includes('download')) return <ArrowDown className="h-4 w-4" />;
    if (title.toLowerCase().includes('impression')) return <ArrowUp className="h-4 w-4" />;
    return undefined;
  };

  // Determine format based on isPercentage
  const format = isPercentage ? 'percentage' : 'number';

  return (
    <EnterpriseMetricCard
      title={title}
      value={displayValue}
      delta={deltaFormatted}
      icon={getIcon()}
      format={format}
      variant="default"
      className={className}
    />
  );
});

KpiCard.displayName = "KpiCard";
export default KpiCard;
