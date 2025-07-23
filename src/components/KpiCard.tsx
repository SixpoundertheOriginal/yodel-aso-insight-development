
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUp, ArrowDown } from "lucide-react";
import { formatPercentage } from "@/utils/format";

interface KpiCardProps {
  title: string;
  value: number;
  delta: number;
}

const KpiCard: React.FC<KpiCardProps> = React.memo(({ 
  title, 
  value, 
  delta 
}) => {
  const isPositive = delta >= 0;
  
  return (
    <Card className="border-l-4 border-l-orange-500 rounded-md shadow-md">
      <CardContent className="p-6">
        <div className="text-center">
          <h3 className="text-zinc-400 font-medium text-sm uppercase mb-2">{title}</h3>
          <div className="text-2xl font-bold mb-2">{value.toLocaleString()}</div>
          <div className={`flex items-center justify-center text-sm ${isPositive ? "text-green-500" : "text-red-500"}`}>
            {isPositive ? (
              <ArrowUp className="h-4 w-4 mr-1" />
            ) : (
              <ArrowDown className="h-4 w-4 mr-1" />
            )}
            <span>{formatPercentage(Math.abs(delta))}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

KpiCard.displayName = "KpiCard";
export default KpiCard;
