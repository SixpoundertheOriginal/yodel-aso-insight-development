import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Rocket, Search, Sparkles, TrendingUp } from 'lucide-react';

interface PreLaunchModeSelectorProps {
  onModeSelect: (mode: 'existing' | 'pre-launch') => void;
}

export const PreLaunchModeSelector: React.FC<PreLaunchModeSelectorProps> = ({ onModeSelect }) => {
  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold text-foreground">Choose Your App Stage</h3>
        <p className="text-sm text-zinc-400">
          Select whether you're working with an existing app or planning a pre-launch strategy
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Existing App Mode */}
        <Card 
          className="bg-zinc-900/50 border-zinc-700 hover:border-blue-500/50 transition-colors cursor-pointer group"
          onClick={() => onModeSelect('existing')}
        >
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-foreground">
              <Search className="w-5 h-5 text-blue-500" />
              <span>Existing App</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-zinc-300">
              Your app is already live on the App Store. Import existing metadata and optimize based on real performance data.
            </p>
            
            <div className="space-y-2">
              <div className="text-xs font-medium text-zinc-400">Features:</div>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-xs">Real App Data</Badge>
                <Badge variant="outline" className="text-xs">Performance Analysis</Badge>
                <Badge variant="outline" className="text-xs">Competitor Research</Badge>
                <Badge variant="outline" className="text-xs">Keyword Tracking</Badge>
              </div>
            </div>
            
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700 text-foreground group-hover:bg-blue-600"
              onClick={(e) => {
                e.stopPropagation();
                onModeSelect('existing');
              }}
            >
              Import Existing App
            </Button>
          </CardContent>
        </Card>

        {/* Pre-Launch Mode */}
        <Card 
          className="bg-zinc-900/50 border-zinc-700 hover:border-yodel-orange/50 transition-colors cursor-pointer group"
          onClick={() => onModeSelect('pre-launch')}
        >
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-foreground">
              <Rocket className="w-5 h-5 text-yodel-orange" />
              <span>Pre-Launch App</span>
              <Badge variant="secondary" className="bg-yodel-orange/20 text-yodel-orange border-yodel-orange/30">
                Strategic
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-zinc-300">
              Your app is still in development. Use strategic keyword research and category analysis to craft optimal metadata.
            </p>
            
            <div className="space-y-2">
              <div className="text-xs font-medium text-zinc-400">Features:</div>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-xs">Category Analysis</Badge>
                <Badge variant="outline" className="text-xs">Strategic Keywords</Badge>
                <Badge variant="outline" className="text-xs">Market Research</Badge>
                <Badge variant="outline" className="text-xs">AI Positioning</Badge>
              </div>
            </div>
            
            <div className="flex items-center space-x-1 text-xs text-yodel-orange">
              <TrendingUp className="w-3 h-3" />
              <span>Perfect for pre-launch optimization</span>
            </div>
            
            <Button 
              className="w-full bg-yodel-orange hover:bg-yodel-orange/90 text-foreground group-hover:bg-yodel-orange"
              onClick={(e) => {
                e.stopPropagation();
                onModeSelect('pre-launch');
              }}
            >
              Start Strategic Research
              <Sparkles className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
