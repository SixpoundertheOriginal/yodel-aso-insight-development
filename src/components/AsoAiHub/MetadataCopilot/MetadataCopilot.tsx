import React, { useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { MetadataImporter } from './MetadataImporter';
import { MetadataWorkspace } from './MetadataWorkspace';
import { MetadataErrorBoundary } from './MetadataErrorBoundary';
import { CompetitorAnalysisDashboard } from '../CompetitorAnalysisDashboard';
import { useCompetitiveAnalysis } from '@/hooks/useCompetitiveAnalysis';
import { ScrapedMetadata } from '@/types/aso';

export const MetadataCopilot: React.FC = () => {
  const [importedData, setImportedData] = useState<ScrapedMetadata | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [currentAnalysisType, setCurrentAnalysisType] = useState<{
    searchTerm: string;
    analysisType: 'brand' | 'keyword' | 'category';
  } | null>(null);

  const competitiveAnalysis = useCompetitiveAnalysis({ 
    organizationId: organizationId || '' 
  });

  const handleImportSuccess = (data: ScrapedMetadata, orgId: string) => {
    console.log('🎯 [COPILOT] Received imported data:', data, 'for org:', orgId);
    setImportedData(data);
    setOrganizationId(orgId);
    // Clear any competitive analysis when importing new data
    competitiveAnalysis.clearCurrentAnalysis();
    setCurrentAnalysisType(null);
  };

  const handleReset = () => {
    console.log('🔄 [COPILOT] Resetting copilot state');
    setImportedData(null);
    setOrganizationId(null);
    competitiveAnalysis.clearCurrentAnalysis();
    setCurrentAnalysisType(null);
  };

  const handleCompetitorAnalysis = async (searchTerm: string, analysisType: 'brand' | 'keyword' | 'category') => {
    if (!organizationId) return;
    
    setCurrentAnalysisType({ searchTerm, analysisType });
    
    try {
      await competitiveAnalysis.runAnalysis(searchTerm, analysisType, 10);
    } catch (error) {
      console.error('Failed to run competitive analysis:', error);
      setCurrentAnalysisType(null);
    }
  };

  // Show competitive analysis dashboard if active
  if (competitiveAnalysis.showDashboard && currentAnalysisType && organizationId) {
    return (
      <MetadataErrorBoundary onReset={handleReset}>
        <div className="space-y-6">
          <CompetitorAnalysisDashboard
            searchTerm={currentAnalysisType.searchTerm}
            analysisType={currentAnalysisType.analysisType}
            organizationId={organizationId}
            onClose={() => {
              competitiveAnalysis.closeDashboard();
              setCurrentAnalysisType(null);
            }}
          />
        </div>
      </MetadataErrorBoundary>
    );
  }

  return (
    <MetadataErrorBoundary onReset={handleReset}>
      <div className="space-y-6">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white flex items-center space-x-2">
              <span className="text-2xl">📝</span>
              <span>Metadata Co-Pilot</span>
            </CardTitle>
            {importedData && (
               <button onClick={handleReset} className="text-sm text-zinc-400 hover:text-white">Start Over</button>
            )}
          </CardHeader>
        </Card>
        
        {!importedData || !organizationId ? (
          <MetadataImporter 
            onImportSuccess={handleImportSuccess}
            onCompetitorAnalysis={handleCompetitorAnalysis}
          />
        ) : (
          <MetadataWorkspace initialData={importedData} organizationId={organizationId} />
        )}
      </div>
    </MetadataErrorBoundary>
  );
};
