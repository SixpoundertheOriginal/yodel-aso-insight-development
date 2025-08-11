
import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUp, ArrowDown } from "lucide-react";
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

  const displayDelta = useMemo(() => {
    const formattedDelta = Math.abs(delta).toFixed(1);
    const sign = delta >= 0 ? "+" : "-";
    const suffix = isPercentage ? "%" : "";
    return `${sign}${formattedDelta}${suffix}`;
  }, [delta, isPercentage]);

  return (
    <Card className={`border-l-4 border-l-orange-500 rounded-md shadow-md ${className}`}>
      <CardContent className="p-6">
        <div className="text-center">
          <h3 className="text-zinc-400 font-medium text-sm uppercase mb-2">{title}</h3>
          <div className="text-2xl font-bold mb-2">{displayValue}</div>
          <div className={`flex items-center justify-center text-sm ${isPositive ? "text-green-500" : "text-red-500"}`}>
            {isPositive ? (
              <ArrowUp className="h-4 w-4 mr-1" />
            ) : (
              <ArrowDown className="h-4 w-4 mr-1" />
            )}
            <span>{displayDelta}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

KpiCard.displayName = "KpiCard";
export default KpiCard;
