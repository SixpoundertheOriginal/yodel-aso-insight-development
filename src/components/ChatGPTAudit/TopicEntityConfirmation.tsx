import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { EntityIntelligenceAnalyzer } from './EntityIntelligenceAnalyzer';
import { EditableEntityDetails } from './EditableEntityDetails';
import { TopicAuditData, EntityIntelligence } from '@/types/topic-audit.types';
import { 
  Target, 
  Brain, 
  CheckCircle, 
  Edit3, 
  Users, 
  Building2, 
  MapPin,
  AlertCircle,
  
  ArrowRight
} from 'lucide-react';

interface TopicEntityConfirmationProps {
  topicData: TopicAuditData;
  entityIntelligence?: EntityIntelligence;
  onConfirm: (confirmedData: {
    topicData: TopicAuditData;
    entityIntelligence?: any;
  }) => void;
  onEdit: () => void;
}

export const TopicEntityConfirmation: React.FC<TopicEntityConfirmationProps> = ({
  topicData,
  entityIntelligence,
  onConfirm,
  onEdit
}) => {
  const [showEntityAnalyzer, setShowEntityAnalyzer] = useState(true); // Always start with enhanced analysis
  const [enhancedEntityIntelligence, setEnhancedEntityIntelligence] = useState<any>(null);
  const [isEditingEntity, setIsEditingEntity] = useState(false);
  const [editedEntityData, setEditedEntityData] = useState<any>(null);

  const handleEnhanceAnalysis = () => {
    setShowEntityAnalyzer(true);
  };

  const handleEnhancedAnalysisComplete = () => {
    setShowEntityAnalyzer(false);
  };

  const handleConfirm = () => {
    const confirmedData = {
      topicData,
      entityIntelligence: editedEntityData || enhancedEntityIntelligence || entityIntelligence
    };
    onConfirm(confirmedData);
  };

  const handleEditEntity = () => {
    setIsEditingEntity(true);
    // Initialize with existing data
    const currentData = enhancedEntityIntelligence || entityIntelligence;
    if (currentData) {
      setEditedEntityData({
        entityName: currentData.entityName || topicData.entityToTrack,
        description: currentData.description || '',
        services: currentData.services || [],
        competitors: currentData.competitors || [],
        targetClients: currentData.targetClients || [],
        confidence: currentData.confidence_score || 0.5
      });
    } else {
      setEditedEntityData({
        entityName: topicData.entityToTrack,
        description: '',
        services: [],
        competitors: [],
        targetClients: [],
        confidence: 0.5
      });
    }
  };

  const handleSaveEntityEdits = (updatedData: any) => {
    setEditedEntityData(updatedData);
    setIsEditingEntity(false);
  };

  const getDataQualityScore = () => {
    let score = 0;
    let maxScore = 6;

    if (topicData.topic) score += 1;
    if (topicData.industry) score += 1;
    if (topicData.target_audience) score += 1;
    if (topicData.entityToTrack) score += 1;
    if (entityIntelligence) score += 1;
    if (enhancedEntityIntelligence) score += 1;

    return { score, maxScore, percentage: Math.round((score / maxScore) * 100) };
  };

  const dataQuality = getDataQualityScore();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold text-primary flex items-center justify-center gap-2">
          <CheckCircle className="h-6 w-6" />
          Topic & Entity Confirmation
        </h3>
        <p className="text-muted-foreground">
          Review and confirm the analysis data before generating queries
        </p>
      </div>

      {/* Data Quality Indicator */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Data Quality Assessment
            </span>
            <Badge variant={dataQuality.percentage >= 80 ? 'default' : dataQuality.percentage >= 60 ? 'secondary' : 'destructive'}>
              {dataQuality.score}/{dataQuality.maxScore} Complete ({dataQuality.percentage}%)
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${
                  dataQuality.percentage >= 80 ? 'bg-green-500' : 
                  dataQuality.percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${dataQuality.percentage}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {dataQuality.percentage >= 80 ? 'Excellent data quality - ready for high-quality query generation' :
               dataQuality.percentage >= 60 ? 'Good data quality - queries will be relevant' :
               'Basic data quality - consider enhancing entity analysis'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Topic Data Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Topic Analysis Summary
            </span>
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit3 className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Topic</h4>
                <p className="text-sm font-medium">{topicData.topic}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Industry</h4>
                <Badge variant="secondary">{topicData.industry}</Badge>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Target Audience
                </h4>
                <p className="text-sm">{topicData.target_audience}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Entity to Track
                </h4>
                <p className="text-sm font-medium">{topicData.entityToTrack}</p>
                {topicData.entityAliases && topicData.entityAliases.length > 0 && (
                  <div className="mt-1">
                    <span className="text-xs text-muted-foreground">Aliases: </span>
                    {topicData.entityAliases.map((alias, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs mr-1">
                        {alias}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {topicData.geographic_focus && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Geographic Focus
                  </h4>
                  <Badge variant="outline">{topicData.geographic_focus}</Badge>
                </div>
              )}

              {topicData.known_players && topicData.known_players.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Known Players</h4>
                  <div className="flex flex-wrap gap-1">
                    {topicData.known_players.slice(0, 4).map((player, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {player}
                      </Badge>
                    ))}
                    {topicData.known_players.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{topicData.known_players.length - 4} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {topicData.context_description && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Context Description</h4>
                <p className="text-sm text-muted-foreground italic">{topicData.context_description}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Entity Intelligence Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Entity Intelligence
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!entityIntelligence && !showEntityAnalyzer && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No entity intelligence available. Consider running analysis for better query generation.
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2" 
                  onClick={handleEnhanceAnalysis}
                >
                  <Brain className="h-4 w-4 mr-1" />
                  Run Analysis
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Editable Entity Details */}
          {isEditingEntity && (
            <EditableEntityDetails
              entityData={editedEntityData}
              onSave={handleSaveEntityEdits}
              onCancel={() => setIsEditingEntity(false)}
            />
          )}


          {/* Show edited entity data */}
          {editedEntityData && !isEditingEntity && !showEntityAnalyzer && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="default" className="mb-2">User Edited</Badge>
                <Button variant="outline" size="sm" onClick={handleEditEntity}>
                  <Edit3 className="h-4 w-4 mr-1" />
                  Edit Details
                </Button>
              </div>
              <EditableEntityDetails
                entityData={editedEntityData}
                onSave={handleSaveEntityEdits}
                onCancel={() => {}}
              />
            </div>
          )}

          {/* Enhanced Entity Intelligence Analyzer */}
          {showEntityAnalyzer && (
            <div className="space-y-3">
              <Badge variant="default" className="mb-2">Analysis</Badge>
              <EntityIntelligenceAnalyzer
                entityData={{
                  entityName: topicData.entityToTrack,
                  context: topicData.context_description,
                  auditContext: {
                    industry: topicData.industry,
                    topic: topicData.topic,
                    target_audience: topicData.target_audience,
                    known_competitors: topicData.known_players || [],
                    geographic_focus: topicData.geographic_focus,
                    queryStrategy: topicData.queryStrategy
                  }
                }}
                onIntelligenceGenerated={(intelligence) => {
                  setEnhancedEntityIntelligence(intelligence);
                }}
                onAnalysisComplete={handleEnhancedAnalysisComplete}
              />
            </div>
          )}

          {/* Enhanced Intelligence Display */}
          {enhancedEntityIntelligence && !showEntityAnalyzer && !isEditingEntity && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="default">Analysis Complete</Badge>
                  <Badge variant="outline">
                    {Math.round(enhancedEntityIntelligence.confidence_score * 100)}% Confidence
                  </Badge>
                </div>
                <Button variant="outline" size="sm" onClick={handleEditEntity}>
                  <Edit3 className="h-4 w-4 mr-1" />
                  Edit Details
                </Button>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground mb-3">
                  Enhanced entity intelligence with {enhancedEntityIntelligence.target_personas?.length || 0} personas,
                  {enhancedEntityIntelligence.services?.length || 0} services, and 
                  {enhancedEntityIntelligence.competitors?.length || 0} competitors identified.
                </p>
                <div className="text-xs text-muted-foreground">
                  This enhanced data will be used to generate more realistic and contextually relevant queries 
                  that simulate authentic user behavior patterns.
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quality Recommendations */}
      {dataQuality.percentage < 80 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Recommendations to improve data quality:</p>
              <ul className="text-sm space-y-1">
                {!entityIntelligence && (
                  <li>• Run entity intelligence analysis for better query generation</li>
                )}
                {entityIntelligence && !enhancedEntityIntelligence && (
                  <li>• Use analysis for more realistic user behavior simulation</li>
                )}
                {!topicData.context_description && (
                  <li>• Add context description for more targeted queries</li>
                )}
                {!topicData.geographic_focus && (
                  <li>• Specify geographic focus for localized queries</li>
                )}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onEdit} className="flex-1">
          <Edit3 className="h-4 w-4 mr-2" />
          Edit Setup
        </Button>
        <Button 
          onClick={handleConfirm} 
          className="flex-1"
          disabled={showEntityAnalyzer || isEditingEntity}
        >
          <ArrowRight className="h-4 w-4 mr-2" />
          Proceed to Query Generation
        </Button>
      </div>
    </div>
  );
};