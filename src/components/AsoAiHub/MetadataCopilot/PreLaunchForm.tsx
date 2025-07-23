import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Rocket, Target, Users, Lightbulb, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export interface PreLaunchFormData {
  appName: string;
  appConcept: string;
  targetCategory: string;
  targetAudience: string;
  keyFeatures: string;
  differentiators: string;
  targetCountry: string;
}

interface PreLaunchFormProps {
  onSubmit: (data: PreLaunchFormData) => void;
  isLoading?: boolean;
  loadingProgress?: number;
  loadingMessage?: string;
}

const APP_CATEGORIES = [
  { value: 'productivity', label: 'Productivity' },
  { value: 'social_networking', label: 'Social Networking' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'games', label: 'Games' },
  { value: 'health_fitness', label: 'Health & Fitness' },
  { value: 'education', label: 'Education' },
  { value: 'finance', label: 'Finance' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'travel', label: 'Travel' },
  { value: 'photo_video', label: 'Photo & Video' },
  { value: 'music', label: 'Music' },
  { value: 'news', label: 'News' },
  { value: 'business', label: 'Business' },
  { value: 'lifestyle', label: 'Lifestyle' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'food_drink', label: 'Food & Drink' },
  { value: 'sports', label: 'Sports' },
  { value: 'medical', label: 'Medical' },
  { value: 'weather', label: 'Weather' },
  { value: 'reference', label: 'Reference' }
];

const COUNTRIES = [
  { value: 'us', label: 'United States' },
  { value: 'gb', label: 'United Kingdom' },
  { value: 'ca', label: 'Canada' },
  { value: 'au', label: 'Australia' },
  { value: 'de', label: 'Germany' },
  { value: 'fr', label: 'France' },
  { value: 'es', label: 'Spain' },
  { value: 'it', label: 'Italy' },
  { value: 'jp', label: 'Japan' },
  { value: 'kr', label: 'South Korea' }
];

export const PreLaunchForm: React.FC<PreLaunchFormProps> = ({ 
  onSubmit, 
  isLoading = false,
  loadingProgress = 0,
  loadingMessage = ''
}) => {
  const [formData, setFormData] = useState<PreLaunchFormData>({
    appName: '',
    appConcept: '',
    targetCategory: '',
    targetAudience: '',
    keyFeatures: '',
    differentiators: '',
    targetCountry: 'us'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const updateField = (field: keyof PreLaunchFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isFormValid = formData.appName && formData.appConcept && formData.targetCategory;

  if (isLoading) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="w-5 h-5 animate-spin text-yodel-orange" />
              <span className="text-white font-medium">Analyzing Market & Generating Strategy</span>
            </div>
            
            <Progress value={loadingProgress} className="h-2" />
            
            <div className="text-center text-sm text-zinc-300">
              {loadingMessage || 'Building your strategic keyword foundation...'}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400">
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${loadingProgress > 25 ? 'bg-green-500' : 'bg-zinc-600'}`} />
                <span>Category Analysis</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${loadingProgress > 50 ? 'bg-green-500' : 'bg-zinc-600'}`} />
                <span>Competitor Research</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${loadingProgress > 75 ? 'bg-green-500' : 'bg-zinc-600'}`} />
                <span>Keyword Discovery</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${loadingProgress > 90 ? 'bg-green-500' : 'bg-zinc-600'}`} />
                <span>Strategy Generation</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-white">
            <Rocket className="w-5 h-5 text-yodel-orange" />
            <span>Pre-Launch Strategic Research</span>
            <Badge variant="secondary" className="bg-yodel-orange/20 text-yodel-orange border-yodel-orange/30">
              Beta
            </Badge>
          </CardTitle>
          <p className="text-sm text-zinc-400">
            Provide details about your upcoming app to generate strategic metadata based on market analysis
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic App Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="appName" className="text-zinc-300 flex items-center space-x-1">
                <span>App Name</span>
                <span className="text-red-400">*</span>
              </Label>
              <Input
                id="appName"
                value={formData.appName}
                onChange={(e) => updateField('appName', e.target.value)}
                placeholder="Enter your app name"
                className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-400"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetCategory" className="text-zinc-300 flex items-center space-x-1">
                <span>Target Category</span>
                <span className="text-red-400">*</span>
              </Label>
              <Select
                value={formData.targetCategory}
                onValueChange={(value) => updateField('targetCategory', value)}
                required
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue placeholder="Select app category" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {APP_CATEGORIES.map((category) => (
                    <SelectItem key={category.value} value={category.value} className="text-white">
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* App Concept */}
          <div className="space-y-2">
            <Label htmlFor="appConcept" className="text-zinc-300 flex items-center space-x-1">
              <Lightbulb className="w-4 h-4" />
              <span>App Concept & Purpose</span>
              <span className="text-red-400">*</span>
            </Label>
            <Textarea
              id="appConcept"
              value={formData.appConcept}
              onChange={(e) => updateField('appConcept', e.target.value)}
              placeholder="Describe what your app does, the problem it solves, and its main purpose. Be specific about functionality and user benefits."
              className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-400 min-h-24"
              required
            />
          </div>

          {/* Target Audience */}
          <div className="space-y-2">
            <Label htmlFor="targetAudience" className="text-zinc-300 flex items-center space-x-1">
              <Users className="w-4 h-4" />
              <span>Target Audience</span>
            </Label>
            <Input
              id="targetAudience"
              value={formData.targetAudience}
              onChange={(e) => updateField('targetAudience', e.target.value)}
              placeholder="e.g., Small business owners, College students, Fitness enthusiasts"
              className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-400"
            />
          </div>

          {/* Key Features */}
          <div className="space-y-2">
            <Label htmlFor="keyFeatures" className="text-zinc-300 flex items-center space-x-1">
              <Target className="w-4 h-4" />
              <span>Key Features</span>
            </Label>
            <Textarea
              id="keyFeatures"
              value={formData.keyFeatures}
              onChange={(e) => updateField('keyFeatures', e.target.value)}
              placeholder="List your app's main features and capabilities (comma-separated or bullet points)"
              className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-400 min-h-20"
            />
          </div>

          {/* Differentiators */}
          <div className="space-y-2">
            <Label htmlFor="differentiators" className="text-zinc-300">
              What Makes Your App Unique?
            </Label>
            <Textarea
              id="differentiators"
              value={formData.differentiators}
              onChange={(e) => updateField('differentiators', e.target.value)}
              placeholder="What sets your app apart from competitors? Unique features, better UX, novel approach, etc."
              className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-400 min-h-20"
            />
          </div>

          {/* Target Country */}
          <div className="space-y-2">
            <Label htmlFor="targetCountry" className="text-zinc-300">Target Market</Label>
            <Select
              value={formData.targetCountry}
              onValueChange={(value) => updateField('targetCountry', value)}
            >
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {COUNTRIES.map((country) => (
                  <SelectItem key={country.value} value={country.value} className="text-white">
                    {country.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            className="w-full bg-yodel-orange hover:bg-yodel-orange/90 text-white"
            disabled={!isFormValid}
          >
            Generate Strategic Metadata
            <Rocket className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </form>
  );
};