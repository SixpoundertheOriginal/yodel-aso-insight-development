/**
 * useMetadataValidation Hook
 *
 * Real-time client-side validation for metadata fields.
 * Provides instant feedback without API calls (duplicate detection, character limits, warnings).
 */

import { useMemo } from 'react';
import { analyzeDuplicates } from '@/engine/metadata/utils/rankingTokenExtractor';
import type { MetadataValidationResult, ValidationWarning } from '@/types/metadataOptimization';

interface UseMetadataValidationParams {
  title: string;
  subtitle: string;
  keywords: string;
}

const CHAR_LIMITS = {
  ios: {
    title: 30,
    subtitle: 30,
    keywords: 100,
  },
  android: {
    title: 30,
    subtitle: 80,
    keywords: 100, // Not used on Android, but keeping for consistency
  },
};

export function useMetadataValidation(params: UseMetadataValidationParams, platform: 'ios' | 'android' = 'ios') {
  const { title, subtitle, keywords } = params;

  const validation = useMemo((): MetadataValidationResult => {
    const warnings: ValidationWarning[] = [];
    const limits = CHAR_LIMITS[platform];

    // Character usage
    const characterUsage = {
      title: { used: title.length, max: limits.title },
      subtitle: { used: subtitle.length, max: limits.subtitle },
      keywords: { used: keywords.length, max: limits.keywords },
    };

    // Check character limits
    if (title.length === 0) {
      warnings.push({
        field: 'title',
        severity: 'error',
        message: 'Title is required',
        suggestion: 'Add a descriptive title for your app',
      });
    } else if (title.length > limits.title) {
      warnings.push({
        field: 'title',
        severity: 'error',
        message: `Title exceeds ${limits.title} character limit`,
        suggestion: 'Shorten your title to fit the limit',
      });
    } else if (title.length < 15) {
      warnings.push({
        field: 'title',
        severity: 'warning',
        message: 'Title is very short',
        suggestion: 'Consider using more descriptive keywords in your title',
      });
    }

    if (subtitle.length > limits.subtitle) {
      warnings.push({
        field: 'subtitle',
        severity: 'error',
        message: `Subtitle exceeds ${limits.subtitle} character limit`,
        suggestion: 'Shorten your subtitle to fit the limit',
      });
    }

    if (keywords.length > limits.keywords) {
      warnings.push({
        field: 'keywords',
        severity: 'error',
        message: `Keywords exceed ${limits.keywords} character limit`,
        suggestion: 'Remove some keywords to fit the limit',
      });
    }

    // Duplicate detection (cross-field)
    const duplicateAnalysis = analyzeDuplicates(title, subtitle, keywords);
    const duplicates = {
      title: duplicateAnalysis.breakdown?.inTitle || [],
      subtitle: duplicateAnalysis.breakdown?.inSubtitle || [],
      keywords: duplicateAnalysis.breakdown?.inKeywords || [],
    };

    // Warn about duplicates
    if (duplicateAnalysis.duplicateCount > 0) {
      warnings.push({
        field: 'title',
        severity: 'warning',
        message: `${duplicateAnalysis.duplicateCount} duplicate keyword${duplicateAnalysis.duplicateCount > 1 ? 's' : ''} found across fields`,
        suggestion: duplicateAnalysis.recommendation || 'Remove duplicate keywords to maximize unique coverage',
      });
    }

    // ASO Best Practice Warnings
    if (title && subtitle) {
      const titleLower = title.toLowerCase();
      const subtitleLower = subtitle.toLowerCase();

      // Check if subtitle is identical to title
      if (titleLower === subtitleLower) {
        warnings.push({
          field: 'subtitle',
          severity: 'error',
          message: 'Subtitle is identical to title',
          suggestion: 'Use subtitle to expand on your title with different keywords',
        });
      }
    }

    // Keywords best practices
    if (keywords) {
      const keywordList = keywords.split(',').map(k => k.trim()).filter(Boolean);

      if (keywordList.length < 5) {
        warnings.push({
          field: 'keywords',
          severity: 'info',
          message: 'Consider adding more keywords',
          suggestion: 'You can fit more keywords in the 100-character limit',
        });
      }

      // Check for keywords with spaces (multi-word)
      const multiWordKeywords = keywordList.filter(k => k.includes(' '));
      if (multiWordKeywords.length > 0) {
        warnings.push({
          field: 'keywords',
          severity: 'info',
          message: 'Multi-word keywords detected',
          suggestion: 'Single words are often more effective. App Store combines words automatically.',
        });
      }
    }

    // Determine overall validity (only block on errors)
    const hasErrors = warnings.some(w => w.severity === 'error');
    const isValid = !hasErrors &&
      title.length > 0 &&
      title.length <= limits.title &&
      subtitle.length <= limits.subtitle &&
      keywords.length <= limits.keywords;

    return {
      isValid,
      warnings,
      duplicates,
      characterUsage,
    };
  }, [title, subtitle, keywords, platform]);

  return validation;
}
