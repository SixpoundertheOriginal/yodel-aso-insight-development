
import React from "react";
import { MetricCard } from "@/components/ui/design-system/MetricCard";
import { ArrowUp, ArrowDown } from "lucide-react";
import { formatPercentage } from "@/utils/format";

interface KpiCardProps {
  title: string;
  value: number;
  delta: number;
  accentColor?: 'orange' | 'blue' | 'green' | 'red' | 'purple' | 'gray';
}

const KpiCard: React.FC<KpiCardProps> = React.memo(({ 
  title, 
  value, 
  delta,
  accentColor = delta >= 0 ? 'green' : 'red'
}) => {
  const getChangeLabel = () => {
    return `${formatPercentage(Math.abs(delta))}% vs previous period`;
  };
  
  const icon = delta >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  
  return (
    <MetricCard
      title={title}
      value={value}
      change={delta}
      changeLabel={getChangeLabel()}
      accentColor={accentColor}
      icon={icon}
      withHover={true}
    />
  );
});

KpiCard.displayName = "KpiCard";
export default KpiCard;
