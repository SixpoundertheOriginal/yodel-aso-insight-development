import React, { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, Zap, ChevronLeft, Brain } from 'lucide-react';
import { CoreConfigurationSection } from './CoreConfigurationSection';
import { CollapsibleContextSection } from './CollapsibleContextSection';
import { CollapsibleAdvancedSection } from './CollapsibleAdvancedSection';
import { QueryPreviewSection } from './QueryPreviewSection';

interface TieredConfirmationScreenProps {
  autoPopulatedData: any;
  setAutoPopulatedData: (data: any) => void;
  setTopicData: (data: any) => void;
  enhancedEntityIntelligence: any;
  handleConfirmation: (data: any) => void;
  setCurrentStep: (step: 'mode' | 'entity' | 'auto-populate' | 'queries' | 'review') => void;
  isGeneratingQueries: boolean;
  queryGenerationProgress: { current: number; total: number; stage: string };
}

export const TieredConfirmationScreen: React.FC<TieredConfirmationScreenProps> = ({
  autoPopulatedData,
  setAutoPopulatedData,
  setTopicData,
  enhancedEntityIntelligence,
  handleConfirmation,
  setCurrentStep,
  isGeneratingQueries,
  queryGenerationProgress,
}) => {
  const [editingField, setEditingField] = useState<string | null>(null);

  const handleContinue = () => {
    setTopicData(autoPopulatedData);
    handleConfirmation({ entityIntelligence: enhancedEntityIntelligence });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-primary">Review Auto-Populated Fields</h3>
      </div>
      
      <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <Brain className="h-4 w-4" />
        <AlertDescription className="text-blue-700 dark:text-blue-300">
          Fields have been auto-populated based on entity analysis. Review the core configuration above, then expand optional sections below to fine-tune your audit.
        </AlertDescription>
      </Alert>

      <CoreConfigurationSection
        autoPopulatedData={autoPopulatedData}
        setAutoPopulatedData={setAutoPopulatedData}
        editingField={editingField}
        setEditingField={setEditingField}
      />

      <CollapsibleContextSection
        autoPopulatedData={autoPopulatedData}
        setAutoPopulatedData={setAutoPopulatedData}
        editingField={editingField}
        setEditingField={setEditingField}
      />

      <CollapsibleAdvancedSection
        autoPopulatedData={autoPopulatedData}
        setAutoPopulatedData={setAutoPopulatedData}
        editingField={editingField}
        setEditingField={setEditingField}
      />

      <QueryPreviewSection autoPopulatedData={autoPopulatedData} />

      <div className="flex space-x-3 pt-4">
        <Button
          onClick={handleContinue}
          className="flex-1"
          disabled={isGeneratingQueries}
        >
          {isGeneratingQueries ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating Queries...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              Continue to Query Generation
            </>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={() => setCurrentStep('entity')}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Entity Input
        </Button>
      </div>
      
      {isGeneratingQueries && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>{queryGenerationProgress.stage}</span>
            <span>{queryGenerationProgress.current}/{queryGenerationProgress.total}</span>
          </div>
          <div className="w-full bg-background/50 rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(queryGenerationProgress.current / queryGenerationProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};