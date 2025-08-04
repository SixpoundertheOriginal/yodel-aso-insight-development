import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Palette, 
  Eye, 
  Sparkles, 
  Users, 
  Calendar,
  Download,
  ZoomIn,
  Star,
  Lightbulb,
  TrendingUp
} from 'lucide-react';
import { ScrapedMetadata } from '@/types/aso';

interface CreativeAnalysisPanelProps {
  metadata: ScrapedMetadata;
  competitorData?: any[];
  isLoading?: boolean;
}

export const CreativeAnalysisPanel: React.FC<CreativeAnalysisPanelProps> = ({
  metadata,
  competitorData = [],
  isLoading = false
}) => {
  const [selectedScreenshot, setSelectedScreenshot] = useState<number>(0);
  const [activeView, setActiveView] = useState('overview');

  // Mock creative analysis data (will be enhanced with real AI analysis)
  const creativeScore = 75;
  const screenshotAnalysis = metadata.screenshotAnalysis || [];
  const screenshots = screenshotAnalysis.map(s => s.url) || [];
  
  const visualTheme = {
    primaryColors: ['#007AFF', '#34C759', '#FF3B30'],
    colorPalette: ['#007AFF', '#34C759', '#FF3B30', '#FF9500', '#5856D6'],
    designStyle: 'Modern & Clean',
    uiElements: ['Rounded corners', 'Gradients', 'Bold typography', 'Card layouts'],
    consistency: 85
  };

  const inAppEvents = [
    {
      type: 'Seasonal Promotion',
      detected: true,
      confidence: 85,
      description: 'Holiday-themed banners detected in screenshots'
    },
    {
      type: 'New Feature Highlight',
      detected: true,
      confidence: 92,
      description: 'Feature callouts and onboarding elements visible'
    },
    {
      type: 'Special Offers',
      detected: false,
      confidence: 0,
      description: 'No promotional offers detected'
    }
  ];

  const competitiveVisualAnalysis = {
    visualPositioning: 'Premium Modern',
    differentiators: ['Unique color scheme', 'Clean layout', 'Professional imagery'],
    opportunities: ['More vibrant colors', 'Better contrast', 'Stronger CTAs'],
    marketAlignment: 78
  };

  const creativeSuggestions = [
    {
      category: 'Icon',
      priority: 'high',
      suggestion: 'Consider adding more vibrant colors to improve app store visibility',
      impact: 'High visibility boost'
    },
    {
      category: 'Screenshots',
      priority: 'medium',
      suggestion: 'Add value proposition text overlays to first 2 screenshots',
      impact: 'Better conversion'
    },
    {
      category: 'Visual Theme',
      priority: 'low',
      suggestion: 'Maintain current clean aesthetic while adding seasonal elements',
      impact: 'Enhanced engagement'
    }
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="h-16 bg-zinc-800 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Creative Score Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-400" />
              <span className="text-sm text-zinc-400">Creative Score</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {creativeScore}/100
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              {creativeScore >= 80 ? 'Excellent' : 
               creativeScore >= 60 ? 'Good' : 
               creativeScore >= 40 ? 'Fair' : 'Needs Work'}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-zinc-400">Visual Impact</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {visualTheme.consistency}%
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              Design Consistency
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-green-400" />
              <span className="text-sm text-zinc-400">Events Active</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {inAppEvents.filter(e => e.detected).length}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              In-App Promotions
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-400" />
              <span className="text-sm text-zinc-400">Market Position</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {competitiveVisualAnalysis.marketAlignment}%
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              Visual Alignment
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Creative Analysis Tabs */}
      <Tabs value={activeView} onValueChange={setActiveView} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 bg-zinc-900 border-zinc-800">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="screenshots">Screenshots</TabsTrigger>
          <TabsTrigger value="icon">Icon Analysis</TabsTrigger>
          <TabsTrigger value="competitors">Visual Compare</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Visual Theme Analysis */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center space-x-2">
                  <Palette className="h-5 w-5 text-purple-400" />
                  <span>Visual Theme</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-zinc-400 mb-2">Color Palette</h4>
                  <div className="flex space-x-2">
                    {visualTheme.colorPalette.map((color, index) => (
                      <div
                        key={index}
                        className="w-8 h-8 rounded-full border border-zinc-700"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-zinc-400 mb-2">Design Style</h4>
                  <Badge variant="outline" className="text-foreground border-zinc-600">
                    {visualTheme.designStyle}
                  </Badge>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-zinc-400 mb-2">UI Elements</h4>
                  <div className="flex flex-wrap gap-2">
                    {visualTheme.uiElements.map((element, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {element}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* In-App Events Detection */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-green-400" />
                  <span>In-App Events</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {inAppEvents.map((event, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-zinc-800/50 rounded-lg">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      event.detected ? 'bg-green-400' : 'bg-zinc-600'
                    }`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-foreground">{event.type}</h4>
                        <Badge variant={event.detected ? "default" : "secondary"}>
                          {event.confidence}% confidence
                        </Badge>
                      </div>
                      <p className="text-sm text-zinc-400 mt-1">{event.description}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Creative Recommendations */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center space-x-2">
                <Lightbulb className="h-5 w-5 text-yellow-400" />
                <span>Creative Recommendations</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {creativeSuggestions.map((suggestion, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-zinc-800/50 rounded-lg">
                    <Badge className={`mt-1 ${
                      suggestion.priority === 'high' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                      suggestion.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                      'bg-blue-500/20 text-blue-400 border-blue-500/30'
                    }`}>
                      {suggestion.priority}
                    </Badge>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-foreground">{suggestion.category}</h4>
                        <span className="text-xs text-zinc-500">{suggestion.impact}</span>
                      </div>
                      <p className="text-sm text-zinc-400 mt-1">{suggestion.suggestion}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="screenshots" className="space-y-6">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Eye className="h-5 w-5 text-blue-400" />
                  <span>Screenshot Analysis</span>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export Analysis
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {screenshots.length > 0 ? (
                <div className="space-y-4">
                  {/* Screenshot Gallery */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {screenshots.map((screenshot, index) => (
                      <div
                        key={index}
                        className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-colors ${
                          selectedScreenshot === index 
                            ? 'border-blue-400' 
                            : 'border-zinc-700 hover:border-zinc-600'
                        }`}
                        onClick={() => setSelectedScreenshot(index)}
                      >
                        <img
                          src={screenshot}
                          alt={`Screenshot ${index + 1}`}
                          className="w-full aspect-[9/16] object-cover"
                        />
                        <div className="absolute top-2 right-2 bg-black/50 rounded-full p-1">
                          <ZoomIn className="h-3 w-3 text-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Selected Screenshot Analysis */}
                  {screenshotAnalysis[selectedScreenshot] && (
                    <div className="p-4 bg-zinc-800/50 rounded-lg">
                      <h4 className="font-medium text-foreground mb-2">
                        Screenshot {selectedScreenshot + 1} Analysis
                      </h4>
                      <p className="text-sm text-zinc-400">
                        {typeof screenshotAnalysis[selectedScreenshot].analysis === 'string' 
                          ? screenshotAnalysis[selectedScreenshot].analysis
                          : 'AI analysis of visual elements, user flow, and design patterns'
                        }
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Eye className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                  <p className="text-zinc-400">No screenshots available for analysis</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="icon" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-foreground">App Icon</CardTitle>
              </CardHeader>
              <CardContent>
                {metadata.icon ? (
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <img
                        src={metadata.icon}
                        alt={metadata.name}
                        className="w-32 h-32 rounded-xl border border-zinc-700"
                      />
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Visual Impact</span>
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-400 mr-1" />
                          <span className="text-foreground">8.5/10</span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Brand Recognition</span>
                        <span className="text-foreground">85%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Store Visibility</span>
                        <span className="text-foreground">Good</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Sparkles className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                    <p className="text-zinc-400">No app icon available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-foreground">Icon Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-zinc-400 mb-2">Color Analysis</h4>
                    <p className="text-sm text-zinc-300">
                      Dominant colors align well with app's primary brand colors. Good contrast for visibility.
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-zinc-400 mb-2">Design Elements</h4>
                    <p className="text-sm text-zinc-300">
                      Clean, modern design with clear visual hierarchy. Icon is recognizable at small sizes.
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-zinc-400 mb-2">Competitive Position</h4>
                    <p className="text-sm text-zinc-300">
                      Stands out well in category. Unique enough to be memorable while fitting market expectations.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="competitors" className="space-y-6">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center space-x-2">
                <Users className="h-5 w-5 text-purple-400" />
                <span>Competitive Visual Analysis</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-zinc-800/50 rounded-lg">
                    <h4 className="font-medium text-foreground mb-2">Visual Positioning</h4>
                    <p className="text-2xl font-bold text-blue-400">
                      {competitiveVisualAnalysis.visualPositioning}
                    </p>
                    <p className="text-sm text-zinc-400">Market perception</p>
                  </div>
                  <div className="p-4 bg-zinc-800/50 rounded-lg">
                    <h4 className="font-medium text-foreground mb-2">Differentiation</h4>
                    <p className="text-2xl font-bold text-green-400">
                      {competitiveVisualAnalysis.differentiators.length}
                    </p>
                    <p className="text-sm text-zinc-400">Unique elements</p>
                  </div>
                  <div className="p-4 bg-zinc-800/50 rounded-lg">
                    <h4 className="font-medium text-foreground mb-2">Opportunities</h4>
                    <p className="text-2xl font-bold text-orange-400">
                      {competitiveVisualAnalysis.opportunities.length}
                    </p>
                    <p className="text-sm text-zinc-400">Improvement areas</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-foreground">Key Differentiators</h4>
                  {competitiveVisualAnalysis.differentiators.map((diff, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full" />
                      <span className="text-zinc-300">{diff}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-foreground">Improvement Opportunities</h4>
                  {competitiveVisualAnalysis.opportunities.map((opp, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-orange-400 rounded-full" />
                      <span className="text-zinc-300">{opp}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};