import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScreenshotAnalysis } from '@/services/creative-analysis.service';
import { ColorPaletteDisplay } from './ColorPaletteDisplay';
import { MessageAnalysisPanel } from './MessageAnalysisPanel';
import { Eye, Palette, MessageSquare, Layout, Target, Lightbulb, Zap } from 'lucide-react';

interface ScreenshotAnalysisCardProps {
  analysis: ScreenshotAnalysis;
  index: number;
}

export const ScreenshotAnalysisCard: React.FC<ScreenshotAnalysisCardProps> = ({
  analysis,
  index
}) => {
  const [activeTab, setActiveTab] = useState("overview");

  const getPsychologyIcon = (trigger: string) => {
    switch (trigger) {
      case 'trust': return '🛡️';
      case 'curiosity': return '🤔';
      case 'urgency': return '⚡';
      case 'fear': return '⚠️';
      case 'desire': return '💫';
      case 'social_validation': return '👥';
      default: return '🎯';
    }
  };

  const getFlowRoleBadge = (role: string) => {
    const roleConfig = {
      hook: { color: 'bg-red-500', label: 'Hook' },
      feature: { color: 'bg-blue-500', label: 'Feature' },
      proof: { color: 'bg-green-500', label: 'Social Proof' },
      CTA: { color: 'bg-orange-500', label: 'Call to Action' },
      onboarding: { color: 'bg-purple-500', label: 'Onboarding' }
    };
    const config = roleConfig[role as keyof typeof roleConfig] || { color: 'bg-gray-500', label: role };
    return (
      <Badge className={`${config.color} text-white border-0`}>
        {config.label}
      </Badge>
    );
  };

  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-zinc-100">
          <Eye className="w-5 h-5" />
          {analysis.appName} - ASO Creative Intelligence
          <Badge variant="secondary" className="ml-auto">
            {Math.round(analysis.confidence * 100)}% confidence
          </Badge>
        </CardTitle>
        <div className="flex items-center gap-2 mt-2">
          {getFlowRoleBadge(analysis.flowRole)}
          <Badge variant="outline" className="text-zinc-300 border-zinc-600">
            {getPsychologyIcon(analysis.messageAnalysis.psychologicalTrigger)} {analysis.messageAnalysis.psychologicalTrigger}
          </Badge>
          <Badge variant="outline" className="text-zinc-300 border-zinc-600">
            Attention: {analysis.messageAnalysis.attentionScore}/100
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Screenshot Image */}
        <div className="flex justify-center">
          <img
            src={analysis.screenshotUrl}
            alt={`${analysis.appName} screenshot`}
            className="rounded-lg border border-zinc-700 max-w-[200px] h-auto"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-zinc-800">
            <TabsTrigger value="overview" className="data-[state=active]:bg-zinc-700">
              Overview
            </TabsTrigger>
            <TabsTrigger value="flow" className="data-[state=active]:bg-zinc-700">
              Screenshot Flow
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="data-[state=active]:bg-zinc-700">
              ASO Recommendations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Color Palette */}
              <div className="space-y-3">
                <h4 className="flex items-center gap-2 font-medium text-zinc-200">
                  <Palette className="w-4 h-4" />
                  Color Palette
                </h4>
                <ColorPaletteDisplay colorPalette={analysis.colorPalette} />
              </div>

              {/* Message Analysis */}
              <div className="space-y-3">
                <h4 className="flex items-center gap-2 font-medium text-zinc-200">
                  <MessageSquare className="w-4 h-4" />
                  Message Analysis
                </h4>
                <MessageAnalysisPanel messageAnalysis={analysis.messageAnalysis} />
              </div>
            </div>

            {/* Visual Hierarchy */}
            <div className="space-y-3">
              <h4 className="flex items-center gap-2 font-medium text-zinc-200">
                <Layout className="w-4 h-4" />
                Visual Hierarchy & Layout
              </h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-zinc-400 mb-2">Focal Point:</p>
                  <p className="text-zinc-300">{analysis.visualHierarchy.focal_point}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-400 mb-2">Layout Type:</p>
                  <Badge variant="outline" className="text-zinc-300 border-zinc-600">
                    {analysis.visualHierarchy.layout_type}
                  </Badge>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-zinc-400 mb-2">Visual Flow:</p>
                <div className="flex flex-wrap gap-2">
                  {analysis.visualHierarchy.visual_flow.map((step, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {i + 1}. {step}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Design Patterns & UI Elements */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-zinc-400 mb-2">Design Patterns:</p>
                <div className="flex flex-wrap gap-2">
                  {analysis.designPatterns.map((pattern, i) => (
                    <Badge key={i} variant="outline" className="text-xs text-zinc-300 border-zinc-600">
                      {pattern}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <p className="text-sm text-zinc-400 mb-2">UI Elements:</p>
                <div className="flex flex-wrap gap-2">
                  {analysis.visualHierarchy.ui_elements.map((element, i) => (
                    <Badge key={i} variant="outline" className="text-xs text-zinc-300 border-zinc-600">
                      {element}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Extracted Text */}
            {analysis.textContent.length > 0 && (
              <div>
                <p className="text-sm text-zinc-400 mb-2">Extracted Text:</p>
                <div className="bg-zinc-800 rounded-lg p-3">
                  <div className="flex flex-wrap gap-2">
                    {analysis.textContent.map((text, i) => (
                      <span key={i} className="text-sm text-zinc-300 bg-zinc-700 px-2 py-1 rounded">
                        "{text}"
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="flow" className="space-y-4 mt-6">
            <div className="bg-zinc-800 rounded-lg p-4">
              <h4 className="flex items-center gap-2 font-medium text-zinc-200 mb-3">
                <Target className="w-4 h-4" />
                Screenshot Role in App Store Flow
              </h4>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-zinc-400">Primary Message:</span>
                  <p className="text-zinc-300 mt-1">{analysis.messageAnalysis.primaryMessage}</p>
                </div>
                <div>
                  <span className="text-sm text-zinc-400">Psychological Trigger:</span>
                  <p className="text-zinc-300 mt-1">
                    {getPsychologyIcon(analysis.messageAnalysis.psychologicalTrigger)} 
                    {analysis.messageAnalysis.psychologicalTrigger.replace('_', ' ')}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-zinc-400">Flow Position:</span>
                  <p className="text-zinc-300 mt-1">{getFlowRoleBadge(analysis.flowRole)}</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-4 mt-6">
            <div className="space-y-3">
              <h4 className="flex items-center gap-2 font-medium text-zinc-200">
                <Lightbulb className="w-4 h-4" />
                ASO Optimization Recommendations
              </h4>
              <div className="space-y-3">
                {analysis.recommendations.map((rec, i) => (
                  <div key={i} className="bg-zinc-800 rounded-lg p-4 border-l-4 border-blue-500">
                    <div className="flex items-start gap-3">
                      <Zap className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <p className="text-zinc-300 text-sm">{rec}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* App-Specific Analysis Indicator */}
        <div className="text-center mt-4">
          <Badge variant="outline" className="text-xs text-zinc-400 border-zinc-600">
            ✓ Analysis specific to {analysis.appName}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};