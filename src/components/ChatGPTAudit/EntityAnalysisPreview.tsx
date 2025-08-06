import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EntityIntelligence } from '@/types/topic-audit.types';
import { Building2, Users, Trophy, MapPin, Calendar, CheckCircle } from 'lucide-react';

interface EntityAnalysisPreviewProps {
  entityIntelligence: EntityIntelligence;
}

export const EntityAnalysisPreview: React.FC<EntityAnalysisPreviewProps> = ({
  entityIntelligence
}) => {
  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-400';
    if (score >= 0.6) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 0.8) return 'High Confidence';
    if (score >= 0.6) return 'Medium Confidence';
    return 'Low Confidence';
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-primary flex items-center space-x-2">
          <Building2 className="h-5 w-5" />
          <span>Entity Analysis Preview</span>
          <Badge 
            variant="outline" 
            className={`ml-auto ${getConfidenceColor(entityIntelligence.confidenceScore)}`}
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            {getConfidenceLabel(entityIntelligence.confidenceScore)}
          </Badge>
        </CardTitle>
        <CardDescription>
          Entity intelligence data that will enhance query generation
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-3">
          <h4 className="font-medium text-foreground flex items-center">
            <Building2 className="h-4 w-4 mr-2" />
            {entityIntelligence.entityName}
          </h4>
          {entityIntelligence.description && (
            <p className="text-sm text-muted-foreground">
              {entityIntelligence.description}
            </p>
          )}
        </div>

        {/* Services */}
        {entityIntelligence.services && entityIntelligence.services.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-sm font-medium text-foreground">Core Services</h5>
            <div className="flex flex-wrap gap-2">
              {entityIntelligence.services.slice(0, 6).map((service, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {service}
                </Badge>
              ))}
              {entityIntelligence.services.length > 6 && (
                <Badge variant="outline" className="text-xs">
                  +{entityIntelligence.services.length - 6} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Target Clients */}
        {entityIntelligence.targetClients && entityIntelligence.targetClients.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-sm font-medium text-foreground flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Target Clients
            </h5>
            <div className="flex flex-wrap gap-2">
              {entityIntelligence.targetClients.slice(0, 4).map((client, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {client}
                </Badge>
              ))}
              {entityIntelligence.targetClients.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{entityIntelligence.targetClients.length - 4} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Market Position */}
        {entityIntelligence.marketPosition && (
          <div className="space-y-2">
            <h5 className="text-sm font-medium text-foreground flex items-center">
              <Trophy className="h-4 w-4 mr-2" />
              Market Position
            </h5>
            <p className="text-sm text-muted-foreground">
              {entityIntelligence.marketPosition}
            </p>
          </div>
        )}

        {/* Industry Focus */}
        {entityIntelligence.industryFocus && entityIntelligence.industryFocus.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-sm font-medium text-foreground">Industry Focus</h5>
            <div className="flex flex-wrap gap-2">
              {entityIntelligence.industryFocus.slice(0, 3).map((industry, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {industry}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Competitors */}
        {entityIntelligence.competitors && entityIntelligence.competitors.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-sm font-medium text-foreground">Known Competitors</h5>
            <div className="flex flex-wrap gap-2">
              {entityIntelligence.competitors.slice(0, 5).map((competitor, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {typeof competitor === 'string' ? competitor : competitor.name}
                </Badge>
              ))}
              {entityIntelligence.competitors.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{entityIntelligence.competitors.length - 5} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Data Freshness */}
        <div className="pt-3 border-t border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center">
              <Calendar className="h-3 w-3 mr-1" />
              Data collected: {new Date(entityIntelligence.scrapedAt).toLocaleDateString()}
            </span>
            <span>
              Confidence: {Math.round(entityIntelligence.confidenceScore * 100)}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};