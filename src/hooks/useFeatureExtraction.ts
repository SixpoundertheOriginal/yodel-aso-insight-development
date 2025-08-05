import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ScrapedMetadata } from '@/types/aso';

interface FeatureExtractionResult {
  features: string[];
  confidence: number;
  extractionMethod: 'ai' | 'fallback';
}

interface UseFeatureExtractionReturn {
  extractFeatures: (appData: ScrapedMetadata, organizationId: string) => Promise<string[]>;
  isExtracting: boolean;
  extractionError: string | null;
}

export const useFeatureExtraction = (): UseFeatureExtractionReturn => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);

  const extractFeatures = useCallback(async (
    appData: ScrapedMetadata, 
    organizationId: string
  ): Promise<string[]> => {
    setIsExtracting(true);
    setExtractionError(null);

    try {
      console.log('🎯 [FEATURE-EXTRACTION] Starting feature extraction for:', appData.name);

      const { data, error } = await supabase.functions.invoke('ai-feature-extractor', {
        body: {
          appName: appData.name,
          description: appData.description || '',
          subtitle: appData.subtitle || '',
          category: appData.applicationCategory || '',
          organizationId
        }
      });

      if (error) {
        throw new Error(`Feature extraction failed: ${error.message}`);
      }

      const result: FeatureExtractionResult = data;
      
      console.log('✅ [FEATURE-EXTRACTION] Extraction successful:', {
        featuresCount: result.features.length,
        method: result.extractionMethod,
        confidence: result.confidence
      });

      return result.features;

    } catch (error: any) {
      console.error('❌ [FEATURE-EXTRACTION] Error:', error);
      setExtractionError(error.message);
      
      // Return basic fallback features on error
      return extractBasicFeatures(appData);
    } finally {
      setIsExtracting(false);
    }
  }, []);

  return {
    extractFeatures,
    isExtracting,
    extractionError
  };
};

// Simple fallback feature extraction
function extractBasicFeatures(appData: ScrapedMetadata): string[] {
  const features: string[] = [];
  const text = `${appData.name} ${appData.subtitle || ''} ${appData.description || ''}`.toLowerCase();

  // Basic keyword matching
  if (text.includes('learn') || text.includes('language')) features.push('learning platform');
  if (text.includes('offline')) features.push('offline mode');
  if (text.includes('audio') || text.includes('voice')) features.push('audio content');
  if (text.includes('video')) features.push('video lessons');
  if (text.includes('progress') || text.includes('track')) features.push('progress tracking');
  if (text.includes('quiz') || text.includes('test')) features.push('interactive quizzes');
  if (text.includes('game') || text.includes('fun')) features.push('gamified learning');
  if (text.includes('native')) features.push('native speakers');

  // Add category-based features
  if (appData.applicationCategory) {
    if (appData.applicationCategory.toLowerCase().includes('education')) {
      features.push('educational app');
    }
    if (appData.applicationCategory.toLowerCase().includes('language')) {
      features.push('language tools');
    }
  }

  return features.length > 0 ? features.slice(0, 6) : ['mobile app', 'user experience'];
}