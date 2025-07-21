
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, History, Zap, TrendingUp } from 'lucide-react';
import { useUnifiedAso } from '@/context/UnifiedAsoContext';

export const ModeSelector: React.FC = () => {
  const { currentMode, setCurrentMode } = useUnifiedAso();

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Analysis Mode</h3>
          <Badge variant="outline" className="text-yodel-orange border-yodel-orange">
            {currentMode === 'parser' ? 'Live Parse' : 'Historical Tracking'}
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            variant={currentMode === 'parser' ? 'default' : 'outline'}
            onClick={() => setCurrentMode('parser')}
            className={`h-auto p-4 flex flex-col items-start text-left space-y-2 ${
              currentMode === 'parser' 
                ? 'bg-yodel-orange hover:bg-yodel-orange/90 text-white' 
                : 'border-zinc-700 hover:border-zinc-600'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Search className="h-5 w-5" />
              <span className="font-medium">Parse New App</span>
              <Zap className="h-4 w-4 text-yodel-orange" />
            </div>
            <p className="text-sm opacity-80">
              Import app data from App Store URL or paste metadata for instant analysis
            </p>
          </Button>
          
          <Button
            variant={currentMode === 'tracking' ? 'default' : 'outline'}
            onClick={() => setCurrentMode('tracking')}
            className={`h-auto p-4 flex flex-col items-start text-left space-y-2 ${
              currentMode === 'tracking' 
                ? 'bg-yodel-orange hover:bg-yodel-orange/90 text-white' 
                : 'border-zinc-700 hover:border-zinc-600'
            }`}
          >
            <div className="flex items-center space-x-2">
              <History className="h-5 w-5" />
              <span className="font-medium">Track Saved Apps</span>
              <TrendingUp className="h-4 w-4 text-blue-400" />
            </div>
            <p className="text-sm opacity-80">
              Monitor approved apps with historical keyword trends and performance data
            </p>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
