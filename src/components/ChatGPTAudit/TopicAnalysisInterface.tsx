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
  });

  const [newPlayer, setNewPlayer] = useState('');

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

  const handleSubmit = () => {
    onTopicAnalysisGenerated(topicData);
  };

  const isFormValid = topicData.topic.trim() && topicData.industry && topicData.target_audience.trim();

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-primary flex items-center space-x-2">
          <Target className="h-5 w-5" />
          <span>🎯 Topic Visibility Analysis</span>
        </CardTitle>
        <CardDescription>
          Analyze how any topic, brand, or service appears in ChatGPT responses
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Primary topic input */}
        <div className="space-y-2">
          <Label htmlFor="topic">Topic to Analyze</Label>
          <Input 
            id="topic"
            placeholder="e.g., marketing agencies, productivity tools, language learning platforms"
            value={topicData.topic}
            onChange={(e) => setTopicData({...topicData, topic: e.target.value})}
            className="bg-background border-border"
          />
          <p className="text-xs text-muted-foreground">
            What topic, service category, or market do you want to analyze?
          </p>
        </div>

        {/* Industry context */}
        <div className="space-y-2">
          <Label>Industry Category</Label>
          <Select 
            value={topicData.industry} 
            onValueChange={(value) => setTopicData({...topicData, industry: value})}
          >
            <SelectTrigger className="bg-background border-border">
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
        <div className="space-y-2">
          <Label htmlFor="audience">Target Audience</Label>
          <Input 
            id="audience"
            placeholder="e.g., small businesses, enterprise companies, individual consumers"
            value={topicData.target_audience}
            onChange={(e) => setTopicData({...topicData, target_audience: e.target.value})}
            className="bg-background border-border"
          />
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
      </CardContent>
    </Card>
  );
};