
import React from "react";
import { YodelCard, YodelCardHeader, YodelCardContent } from "@/components/ui/design-system/YodelCard";
import { Heading4 } from "@/components/ui/design-system/Typography";

interface LineChartPlaceholderProps {
  title?: string;
}

const LineChartPlaceholder: React.FC<LineChartPlaceholderProps> = React.memo(({ 
  title = "Performance Over Time"
}) => {
  return (
    <YodelCard variant="elevated" className="mt-6" withHover>
      <YodelCardHeader className="flex justify-between items-center mb-6" withBorder>
        <Heading4>{title}</Heading4>
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yodel-blue rounded-full mr-2"></div>
            <span className="text-sm text-zinc-400">Impressions</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span className="text-sm text-zinc-400">Downloads</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
            <span className="text-sm text-zinc-400">Page Views</span>
          </div>
        </div>
      </YodelCardHeader>
      
      <YodelCardContent>
        <div className="h-64 w-full bg-zinc-800/50 rounded-md flex items-center justify-center border border-zinc-700/50">
          <span className="text-zinc-500">Chart visualization will be displayed here</span>
        </div>
        
        <div className="mt-4 flex justify-between">
          <span className="text-xs text-zinc-500">Jan 1</span>
          <span className="text-xs text-zinc-500">Jan 15</span>
          <span className="text-xs text-zinc-500">Jan 30</span>
        </div>
        
        <div className="absolute left-6 top-1/2 -rotate-90 origin-left text-xs text-zinc-500">
          Metrics
        </div>
      </YodelCardContent>
    </YodelCard>
  );
});

LineChartPlaceholder.displayName = "LineChartPlaceholder";
export default LineChartPlaceholder;
