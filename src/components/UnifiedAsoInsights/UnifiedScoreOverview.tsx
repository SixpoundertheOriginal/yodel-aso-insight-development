
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Brain, FileText, Target, Users, Zap } from 'lucide-react';
import { useUnifiedAso } from '@/context/UnifiedAsoContext';

export const UnifiedScoreOverview: React.FC = () => {
  const { analysis } = useUnifiedAso();
  const auditData = analysis.auditData;

  if (!auditData) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-yodel-orange" />
            <span className="text-sm text-zinc-400">Overall Score</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {auditData.overallScore}/100
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            {auditData.overallScore >= 80 ? 'Excellent' : 
             auditData.overallScore >= 60 ? 'Good' : 
             auditData.overallScore >= 40 ? 'Fair' : 'Needs Work'}
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-green-400" />
            <span className="text-sm text-zinc-400">Metadata</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {auditData.metadataScore}/100
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-blue-400" />
            <span className="text-sm text-zinc-400">Keywords</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {auditData.keywordScore}/100
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-purple-400" />
            <span className="text-sm text-zinc-400">Competitive</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {auditData.competitorScore}/100
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-yodel-orange" />
            <span className="text-sm text-zinc-400">Opportunities</span>
          </div>
          <div className="text-2xl font-bold text-yodel-orange">
            {auditData.opportunityCount}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
