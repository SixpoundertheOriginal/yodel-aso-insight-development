import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TopicAuditData } from '@/types/topic-audit.types';
import { Target, Plus, X, Brain, Sparkles } from 'lucide-react';

interface TopicAnalysisInterfaceProps {
  onTopicAnalysisGenerated: (topicData: TopicAuditData) => void;
}

export const TopicAnalysisInterface: React.FC<TopicAnalysisInterfaceProps> = ({
  onTopicAnalysisGenerated
}) => {
  const [topicData, setTopicData] = useState<TopicAuditData>({
    topic: '',
    industry: '',
    target_audience: '',
    known_players: [],
    entityToTrack: '',
    entityAliases: [],
    queryStrategy: 'mixed',
    competitorFocus: false,
    intentLevel: 'medium'
  });

  const [newPlayer, setNewPlayer] = useState('');
  const [newAlias, setNewAlias] = useState('');

  const addKnownPlayer = () => {
    if (newPlayer.trim() && !topicData.known_players.includes(newPlayer.trim())) {
      setTopicData({
        ...topicData,
        known_players: [...topicData.known_players, newPlayer.trim()]
      });
      setNewPlayer('');
    }
  };

  const removeKnownPlayer = (player: string) => {
    setTopicData({
      ...topicData,
      known_players: topicData.known_players.filter(p => p !== player)
    });
  };

  const addEntityAlias = () => {
    if (newAlias.trim() && !topicData.entityAliases?.includes(newAlias.trim())) {
      setTopicData({
        ...topicData,
        entityAliases: [...(topicData.entityAliases || []), newAlias.trim()]
      });
      setNewAlias('');
    }
  };

  const removeEntityAlias = (alias: string) => {
    setTopicData({
      ...topicData,
      entityAliases: topicData.entityAliases?.filter(a => a !== alias) || []
    });
  };

  const handleSubmit = () => {
    onTopicAnalysisGenerated(topicData);
  };

  const isFormValid = topicData.topic.trim() && topicData.industry && topicData.target_audience.trim() && topicData.entityToTrack?.trim();

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-primary flex items-center space-x-2">
          <Target className="h-5 w-5" />
          <span>Topic Visibility Analysis</span>
        </CardTitle>
        <CardDescription>
          Analyze how any topic, brand, or service appears in ChatGPT responses
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Core Setup - Required Fields */}
        <div className="space-y-6 p-6 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-lg border-2 border-primary/10">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-primary">Core Setup</h3>
            <p className="text-sm text-muted-foreground">Essential information for your analysis</p>
          </div>

          {/* Primary topic input */}
          <div className="space-y-3">
            <Label htmlFor="topic" className="text-sm font-semibold flex items-center gap-2">
              Topic to Analyze <span className="text-red-500 text-lg">*</span>
            </Label>
            <Input 
              id="topic"
              placeholder="e.g., marketing agencies, productivity tools, language learning platforms"
              value={topicData.topic}
              onChange={(e) => setTopicData({...topicData, topic: e.target.value})}
              className="bg-background/80 border-border h-11 text-base"
            />
            <p className="text-xs text-muted-foreground">
              What topic, service category, or market do you want to analyze?
            </p>
          </div>

          {/* Industry context */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold flex items-center gap-2">
              Industry Category <span className="text-red-500 text-lg">*</span>
            </Label>
            <Select 
              value={topicData.industry} 
              onValueChange={(value) => setTopicData({...topicData, industry: value})}
            >
              <SelectTrigger className="bg-background/80 border-border h-11">
                <SelectValue placeholder="Select industry category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="business-services">Business Services</SelectItem>
                <SelectItem value="software-tech">Software & Technology</SelectItem>
                <SelectItem value="education-training">Education & Training</SelectItem>
                <SelectItem value="health-wellness">Health & Wellness</SelectItem>
                <SelectItem value="finance-banking">Finance & Banking</SelectItem>
                <SelectItem value="marketing-advertising">Marketing & Advertising</SelectItem>
                <SelectItem value="ecommerce-retail">E-commerce & Retail</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Target audience */}
          <div className="space-y-3">
            <Label htmlFor="audience" className="text-sm font-semibold flex items-center gap-2">
              Target Audience <span className="text-red-500 text-lg">*</span>
            </Label>
            <Input 
              id="audience"
              placeholder="e.g., small businesses, enterprise companies, individual consumers"
              value={topicData.target_audience}
              onChange={(e) => setTopicData({...topicData, target_audience: e.target.value})}
              className="bg-background/80 border-border h-11 text-base"
            />
          </div>
        </div>

        {/* Entity Tracking Section - REQUIRED */}
        <div className="space-y-6 p-6 bg-gradient-to-br from-orange-500/5 to-amber-500/5 rounded-lg border-2 border-orange-200/20">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Target className="h-5 w-5 text-orange-500" />
              <h3 className="text-lg font-semibold text-primary">Entity Tracking</h3>
              <span className="text-red-500 text-xl">*</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Track how often a specific company/service is mentioned in responses
            </p>
          </div>
          
          {/* Entity to track */}
          <div className="space-y-3">
            <Label htmlFor="entityToTrack" className="text-sm font-semibold flex items-center gap-2">
              Company/Service to Track <span className="text-red-500 text-lg">*</span>
            </Label>
            <Input 
              id="entityToTrack"
              placeholder="e.g., Ogilvy, HubSpot, your company name"
              value={topicData.entityToTrack || ''}
              onChange={(e) => setTopicData({...topicData, entityToTrack: e.target.value})}
              className="bg-background/80 border-border h-11 text-base"
            />
          </div>
          
          {/* Entity aliases */}
          {topicData.entityToTrack && (
            <div className="space-y-3">
              <Label className="text-sm font-medium text-muted-foreground">
                Alternative Names (Optional)
              </Label>
              <div className="flex space-x-2">
                <Input 
                  placeholder="e.g., Ogilvy & Mather, Ogilvy Agency"
                  value={newAlias}
                  onChange={(e) => setNewAlias(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addEntityAlias();
                    }
                  }}
                  className="bg-background/60 border-border"
                />
                <Button 
                  type="button"
                  onClick={addEntityAlias}
                  variant="outline"
                  size="sm"
                  disabled={!newAlias.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {(topicData.entityAliases?.length || 0) > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {topicData.entityAliases?.map((alias) => (
                    <Badge key={alias} variant="outline" className="flex items-center space-x-1">
                      <span>{alias}</span>
                      <button
                        type="button"
                        onClick={() => removeEntityAlias(alias)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Query Strategy Configuration */}
        <div className="space-y-6 p-6 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-lg border-2 border-blue-200/20">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Brain className="h-5 w-5 text-blue-500" />
              <h3 className="text-lg font-semibold text-primary">Query Strategy</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Configure how queries are generated for competitive analysis
            </p>
          </div>

          {/* Query Strategy Type */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Analysis Focus</Label>
            <Select 
              value={topicData.queryStrategy} 
              onValueChange={(value: 'competitive_discovery' | 'market_research' | 'mixed') => 
                setTopicData({...topicData, queryStrategy: value})
              }
            >
              <SelectTrigger className="bg-background/80 border-border h-11">
                <SelectValue placeholder="Select analysis focus" />
              </SelectTrigger>
              <SelectContent className="bg-background border-border shadow-lg z-50">
                <SelectItem value="competitive_discovery">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Competitive Discovery</span>
                    <span className="text-xs text-muted-foreground">Focus on customer purchase intent</span>
                  </div>
                </SelectItem>
                <SelectItem value="market_research">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Market Research</span>
                    <span className="text-xs text-muted-foreground">General informational queries</span>
                  </div>
                </SelectItem>
                <SelectItem value="mixed">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Mixed Approach</span>
                    <span className="text-xs text-muted-foreground">Balanced mix of both types</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Intent Level */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Purchase Intent Level</Label>
            <Select 
              value={topicData.intentLevel} 
              onValueChange={(value: 'high' | 'medium' | 'low') => 
                setTopicData({...topicData, intentLevel: value})
              }
            >
              <SelectTrigger className="bg-background/80 border-border h-11">
                <SelectValue placeholder="Select intent level" />
              </SelectTrigger>
              <SelectContent className="bg-background border-border shadow-lg z-50">
                <SelectItem value="high">
                  <div className="flex flex-col items-start">
                    <span className="font-medium text-green-600">High Intent</span>
                    <span className="text-xs text-muted-foreground">Ready to hire/purchase queries</span>
                  </div>
                </SelectItem>
                <SelectItem value="medium">
                  <div className="flex flex-col items-start">
                    <span className="font-medium text-orange-600">Medium Intent</span>
                    <span className="text-xs text-muted-foreground">Comparing and evaluating options</span>
                  </div>
                </SelectItem>
                <SelectItem value="low">
                  <div className="flex flex-col items-start">
                    <span className="font-medium text-blue-600">Low Intent</span>
                    <span className="text-xs text-muted-foreground">Learning and research phase</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            
            {/* Intent Level Explanations */}
            <div className="mt-3 p-3 bg-background/50 rounded-md border border-border">
              <div className="text-sm space-y-2">
                <div className="font-medium text-foreground">Query Examples by Intent:</div>
                {topicData.intentLevel === 'high' && (
                  <div className="space-y-1">
                    <div className="text-green-600 font-medium">High Intent (Purchase Ready):</div>
                    <div className="text-xs text-muted-foreground pl-2 space-y-0.5">
                      <div>• "Best {topicData.topic || 'marketing agencies'} for hire"</div>
                      <div>• "Which {topicData.topic || 'marketing agency'} should I choose?"</div>
                      <div>• "{topicData.topic || 'Marketing agency'} pricing and services"</div>
                    </div>
                  </div>
                )}
                {topicData.intentLevel === 'medium' && (
                  <div className="space-y-1">
                    <div className="text-orange-600 font-medium">Medium Intent (Evaluating):</div>
                    <div className="text-xs text-muted-foreground pl-2 space-y-0.5">
                      <div>• "{topicData.topic || 'Marketing agency'} vs in-house team"</div>
                      <div>• "Compare {topicData.topic || 'marketing agencies'}"</div>
                      <div>• "Pros and cons of hiring {topicData.topic || 'marketing agencies'}"</div>
                    </div>
                  </div>
                )}
                {topicData.intentLevel === 'low' && (
                  <div className="space-y-1">
                    <div className="text-blue-600 font-medium">Low Intent (Research):</div>
                    <div className="text-xs text-muted-foreground pl-2 space-y-0.5">
                      <div>• "How to improve {topicData.industry || 'marketing'} performance"</div>
                      <div>• "{topicData.industry || 'Marketing'} best practices"</div>
                      <div>• "What is {topicData.topic || 'digital marketing'}?"</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Competitor Focus Toggle */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="competitorFocus"
                checked={topicData.competitorFocus || false}
                onChange={(e) => setTopicData({...topicData, competitorFocus: e.target.checked})}
                className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
              />
              <Label htmlFor="competitorFocus" className="text-sm font-medium cursor-pointer">
                Focus on competitive positioning queries
              </Label>
            </div>
            <p className="text-xs text-muted-foreground pl-7">
              Emphasize queries where customers compare different service providers
            </p>
          </div>
        </div>

        {/* Optional Fields - Expandable */}
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-base font-medium text-muted-foreground">Additional Context</h3>
            <p className="text-xs text-muted-foreground">Add more details for enhanced analysis</p>
          </div>

          {/* Optional context */}
        <div className="space-y-2">
          <Label htmlFor="context">Additional Context (Optional)</Label>
          <Textarea 
            id="context"
            placeholder="Any specific focus, use case, or context for this analysis?"
            value={topicData.context_description || ''}
            onChange={(e) => setTopicData({...topicData, context_description: e.target.value})}
            className="bg-background border-border"
            rows={3}
          />
        </div>

        {/* Known players */}
        <div className="space-y-2">
          <Label>Known Brands/Players (Optional)</Label>
          <div className="flex space-x-2">
            <Input 
              placeholder="Add known brands or companies..."
              value={newPlayer}
              onChange={(e) => setNewPlayer(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addKnownPlayer();
                }
              }}
              className="bg-background border-border"
            />
            <Button 
              type="button"
              onClick={addKnownPlayer}
              variant="outline"
              size="sm"
              disabled={!newPlayer.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {topicData.known_players.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {topicData.known_players.map((player) => (
                <Badge key={player} variant="secondary" className="flex items-center space-x-1">
                  <span>{player}</span>
                  <button
                    type="button"
                    onClick={() => removeKnownPlayer(player)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          
          <p className="text-xs text-muted-foreground">
            Help us understand the competitive landscape
          </p>
        </div>

          {/* Action button */}
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid}
            className="w-full"
          >
            <Brain className="h-4 w-4 mr-2" />
            Generate Topic Analysis
            <Sparkles className="h-4 w-4 ml-2" />
          </Button>
          
          {!isFormValid && (
            <p className="text-xs text-muted-foreground text-center">
              Please fill in the required fields to continue
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};