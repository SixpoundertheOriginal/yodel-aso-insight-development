
import React, { useState } from 'react';
import { CurrentMetadataPanel } from './CurrentMetadataPanel';
import { UnifiedMetadataEditor } from './UnifiedMetadataEditor';
import { CompetitiveAnalysisPanel } from './CompetitiveAnalysisPanel';
import { LongDescriptionPanel } from './LongDescriptionPanel';
import { MetadataOptimizationHints } from './MetadataOptimizationHints';
import { DataIntegrityChecker } from './DataIntegrityChecker';
import { Button } from '@/components/ui/button';
import { Users, FileText } from 'lucide-react';
import { ScrapedMetadata } from '@/types/aso';

interface MetadataWorkspaceProps {
  initialData: ScrapedMetadata;
  organizationId: string;
}

export const MetadataWorkspace: React.FC<MetadataWorkspaceProps> = React.memo(({ initialData, organizationId }) => {
  const [viewMode, setViewMode] = useState<'editor' | 'competitors' | 'description'>('editor');

  // Memoize debug data to prevent JSON.stringify on every render
  const debugData = React.useMemo(() => {
    return {
      appId: initialData.appId,
      name: initialData.name,
      hasDescription: !!initialData.description,
      organizationId,
      viewMode
    };
  }, [initialData.appId, initialData.name, initialData.description, organizationId, viewMode]);

  React.useEffect(() => {
    console.log('🏗️ [WORKSPACE] Unified workspace initialized:', debugData);
  }, [debugData]);
  
  return (
    <div className="space-y-6">
      {/* Data Quality Report - Development Only */}
      {process.env.NODE_ENV === 'development' && (
        <DataIntegrityChecker metadata={initialData} />
      )}

      {/* App Store Optimization Rules */}
      <MetadataOptimizationHints />

      {/* Optional View Selector */}
      <div className="flex justify-center gap-2 bg-zinc-800 rounded-lg p-1 w-fit mx-auto">
        <Button
          variant={viewMode === 'editor' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setViewMode('editor')}
          className={viewMode === 'editor' ? 'bg-yodel-orange hover:bg-yodel-orange/90' : ''}
        >
          Metadata Editor
        </Button>
        <Button
          variant={viewMode === 'competitors' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setViewMode('competitors')}
          className={viewMode === 'competitors' ? 'bg-yodel-orange hover:bg-yodel-orange/90' : ''}
        >
          <Users className="w-4 h-4 mr-1" />
          Competitors
        </Button>
        <Button
          variant={viewMode === 'description' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setViewMode('description')}
          className={viewMode === 'description' ? 'bg-yodel-orange hover:bg-yodel-orange/90' : ''}
        >
          <FileText className="w-4 h-4 mr-1" />
          Long Description
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Current Metadata */}
        <div>
          <CurrentMetadataPanel metadata={initialData} />
        </div>

        {/* Right Column: Unified Editor or Other Views */}
        <div>
          {viewMode === 'editor' ? (
            <UnifiedMetadataEditor
              initialData={initialData}
              organizationId={organizationId}
            />
          ) : viewMode === 'description' ? (
            <LongDescriptionPanel
              initialData={initialData}
              organizationId={organizationId}
            />
          ) : (
            <CompetitiveAnalysisPanel
              initialData={initialData}
              organizationId={organizationId}
              onApplyInsight={(insight, field) => {
                console.log('Apply insight:', insight, 'to field:', field);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.organizationId === nextProps.organizationId &&
    prevProps.initialData.appId === nextProps.initialData.appId &&
    prevProps.initialData.name === nextProps.initialData.name &&
    prevProps.initialData.description === nextProps.initialData.description
  );
});
