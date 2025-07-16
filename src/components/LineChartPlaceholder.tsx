
import React from "react";
import { Card, CardContent } from "@/components/ui/card";

interface LineChartPlaceholderProps {
  title?: string;
}

const LineChartPlaceholder: React.FC<LineChartPlaceholderProps> = React.memo(({ 
  title = "Performance Over Time"
}) => {
  return (
    <Card className="shadow-md mt-6">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium">{title}</h3>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
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
        </div>
        
        <div className="h-64 w-full bg-zinc-800 rounded-md flex items-center justify-center">
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
      </CardContent>
    </Card>
  );
});

LineChartPlaceholder.displayName = "LineChartPlaceholder";
export default LineChartPlaceholder;
