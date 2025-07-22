
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Search, 
  Target, 
  BarChart, 
  Trophy, 
  Zap, 
  TrendingUp,
  Users,
  Star,
  Globe,
  Lightbulb
} from 'lucide-react';

interface QuickActionButtonsProps {
  onAction: (action: string, prompt: string) => void;
}

export const QuickActionButtons: React.FC<QuickActionButtonsProps> = ({ onAction }) => {
  const quickActions = [
    {
      id: 'keyword-research',
      title: 'Keyword Research',
      icon: <Search className="w-4 h-4" />,
      prompt: 'Help me find high-volume, low-competition keywords for my app category. Analyze my current keyword performance and suggest opportunities.',
      color: 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
    },
    {
      id: 'competitive-analysis',
      title: 'Competitive Analysis',
      icon: <Target className="w-4 h-4" />,
      prompt: 'Analyze my top competitors and identify their ASO strategies. Show me keyword gaps and positioning opportunities.',
      color: 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
    },
    {
      id: 'metadata-review',
      title: 'Metadata Review',
      icon: <BarChart className="w-4 h-4" />,
      prompt: 'Review my current app store listing metadata. Provide optimization suggestions for title, subtitle, description, and keywords.',
      color: 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
    },
    {
      id: 'performance-analysis',
      title: 'Performance Analysis',
      icon: <TrendingUp className="w-4 h-4" />,
      prompt: 'Analyze my keyword ranking changes and visibility trends. Explain what factors might be influencing my performance.',
      color: 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
    },
    {
      id: 'growth-strategy',
      title: 'Growth Strategy',
      icon: <Trophy className="w-4 h-4" />,
      prompt: 'Create a comprehensive ASO growth strategy for the next quarter. Include keyword targeting, competitive positioning, and optimization roadmap.',
      color: 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30'
    },
    {
      id: 'featuring-opportunities',
      title: 'Featuring Opportunities',
      icon: <Star className="w-4 h-4" />,
      prompt: 'How can I improve my chances of getting featured in app stores? Analyze my current positioning and suggest improvements.',
      color: 'bg-orange-500/20 text-orange-300 hover:bg-orange-500/30'
    },
    {
      id: 'localization-strategy',
      title: 'Localization Strategy',
      icon: <Globe className="w-4 h-4" />,
      prompt: 'Help me develop a localization strategy for international markets. Which regions should I target and how should I adapt my metadata?',
      color: 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30'
    },
    {
      id: 'conversion-optimization',
      title: 'Conversion Optimization',
      icon: <Zap className="w-4 h-4" />,
      prompt: 'Analyze my app store conversion funnel and suggest improvements for screenshots, description, and overall listing optimization.',
      color: 'bg-pink-500/20 text-pink-300 hover:bg-pink-500/30'
    }
  ];

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-2">
          <Lightbulb className="w-5 h-5 text-yellow-400" />
          <span>Quick ASO Actions</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <Button
              key={action.id}
              variant="ghost"
              className={`h-auto p-3 flex flex-col items-center space-y-2 ${action.color} border border-zinc-700`}
              onClick={() => onAction(action.id, action.prompt)}
            >
              {action.icon}
              <span className="text-xs text-center leading-tight">
                {action.title}
              </span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
