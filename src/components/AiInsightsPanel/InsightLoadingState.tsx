import React, { useState, useEffect } from 'react';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Brain, Loader2, TrendingUp, Target, Search, Calendar, Eye } from 'lucide-react';

interface InsightLoadingStateProps {
  actionType: string;
}

export const InsightLoadingState: React.FC<InsightLoadingStateProps> = ({ actionType }) => {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const getActionConfig = (type: string) => {
    const configs = {
      cvr_analysis: {
        title: 'Analyzing Conversion Rates',
        icon: TrendingUp,
        steps: [
          'Collecting conversion data...',
          'Analyzing traffic patterns...',
          'Identifying optimization opportunities...',
          'Generating recommendations...'
        ],
        tips: [
          'CVR improvements of 0.1% can significantly impact revenue',
          'Traffic source analysis reveals optimization opportunities',
          'Best performing apps have CVR between 15-30%'
        ]
      },
      impression_trends: {
        title: 'Examining Impression Patterns',
        icon: Eye,
        steps: [
          'Gathering impression data...',
          'Detecting trend patterns...',
          'Analyzing seasonal factors...',
          'Creating visibility insights...'
        ],
        tips: [
          'Impression trends reveal app store algorithm changes',
          'Seasonal patterns help predict future performance',
          'Visibility optimization can increase impressions by 40%+'
        ]
      },
      traffic_source_performance: {
        title: 'Evaluating Traffic Sources',
        icon: Target,
        steps: [
          'Analyzing traffic distribution...',
          'Comparing source performance...',
          'Calculating efficiency metrics...',
          'Building optimization strategy...'
        ],
        tips: [
          'Search traffic typically converts 2-3x better than browse',
          'Referral traffic often has the highest intent',
          'Balanced traffic sources reduce dependency risk'
        ]
      },
      keyword_optimization: {
        title: 'Optimizing Keywords',
        icon: Search,
        steps: [
          'Scanning keyword performance...',
          'Analyzing ranking positions...',
          'Identifying opportunity gaps...',
          'Crafting optimization plan...'
        ],
        tips: [
          'Long-tail keywords often have better conversion rates',
          'Keyword optimization can improve rankings within 2-4 weeks',
          'Focus on keywords with high volume and low competition'
        ]
      },
      seasonal_pattern: {
        title: 'Detecting Seasonal Trends',
        icon: Calendar,
        steps: [
          'Processing historical data...',
          'Identifying cyclical patterns...',
          'Correlating with market events...',
          'Forecasting future trends...'
        ],
        tips: [
          'Most apps see 20-40% seasonal variation',
          'Planning for seasonality can boost downloads by 25%',
          'Holiday periods often show unique user behavior'
        ]
      },
      comprehensive: {
        title: 'Comprehensive Analysis',
        icon: Brain,
        steps: [
          'Collecting all metrics...',
          'Cross-analyzing patterns...',
          'Identifying priority areas...',
          'Generating strategic insights...'
        ],
        tips: [
          'Comprehensive analysis reveals interconnected opportunities',
          'Most successful optimizations address multiple metrics',
          'Strategic insights often uncover hidden growth levers'
        ]
      }
    };

    return configs[type as keyof typeof configs] || configs.comprehensive;
  };

  const config = getActionConfig(actionType);
  const IconComponent = config.icon;

  useEffect(() => {
    const duration = 25000; // 25 seconds total
    const stepDuration = duration / config.steps.length;
    const progressInterval = 100; // Update every 100ms

    const interval = setInterval(() => {
      setProgress(prev => {
        const increment = (progressInterval / duration) * 100;
        const newProgress = Math.min(prev + increment, 95); // Cap at 95% until complete
        
        // Update current step based on progress
        const newStep = Math.floor((newProgress / 100) * config.steps.length);
        setCurrentStep(Math.min(newStep, config.steps.length - 1));
        
        return newProgress;
      });
    }, progressInterval);

    return () => clearInterval(interval);
  }, [config.steps.length]);

  const currentTip = config.tips[Math.floor(Math.random() * config.tips.length)];

  return (
    <>
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 animate-pulse">
          <IconComponent className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          {config.title}
        </CardTitle>
        <p className="text-muted-foreground">
          {config.steps[currentStep]}
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            Step {currentStep + 1} of {config.steps.length}
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 border-l-4 border-primary">
          <h4 className="font-medium text-sm mb-1">💡 Did you know?</h4>
          <p className="text-sm text-muted-foreground">{currentTip}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-background/50 rounded-lg p-3">
            <div className="text-2xl font-bold text-primary">25s</div>
            <div className="text-xs text-muted-foreground">Avg. Time</div>
          </div>
          <div className="bg-background/50 rounded-lg p-3">
            <div className="text-2xl font-bold text-primary">95%</div>
            <div className="text-xs text-muted-foreground">Accuracy</div>
          </div>
        </div>

        <div className="flex justify-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Brain className="h-4 w-4" />
            <span>AI Engine Processing...</span>
          </div>
        </div>
      </CardContent>
    </>
  );
};