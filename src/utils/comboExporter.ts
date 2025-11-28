/**
 * Combo Exporter Utility
 *
 * Exports keyword combinations to CSV, XLSX, JSON, and clipboard.
 */

import type { ClassifiedCombo } from '@/components/AppAudit/UnifiedMetadataAuditModule/types';
import type { ClassifiedComboV2_1 } from '@/components/AppAudit/UnifiedMetadataAuditModule/types.v2.1';
import { classifyIntent } from './comboIntentClassifier';
import { toast } from 'sonner';

/**
 * Exports combos to CSV file
 */
export function exportCombosToCSV(combos: ClassifiedCombo[], filename?: string): void {
  const headers = [
    'Combo',
    'Type',
    'Source',
    'Relevance',
    'Brand Classification',
    'Intent',
    'Matched Brand Alias',
    'Length'
  ];

  const rows = combos.map((c) => [
    c.text,
    c.type,
    c.source || 'unknown',
    c.relevanceScore.toString(),
    ('brandClassification' in c && c.brandClassification) || 'N/A',
    classifyIntent(c),
    ('matchedBrandAlias' in c && c.matchedBrandAlias) || 'N/A',
    c.text.length.toString()
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `keyword-combos-${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(url);

  toast.success(`Exported ${combos.length} combos to CSV`);
}

/**
 * Copies single combo to clipboard
 */
export async function copyComboToClipboard(combo: ClassifiedCombo): Promise<void> {
  try {
    await navigator.clipboard.writeText(combo.text);
    toast.success(`Copied: "${combo.text}"`);
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    toast.error('Failed to copy to clipboard');
  }
}

/**
 * Copies all combos to clipboard (newline-separated)
 */
export async function copyAllCombosToClipboard(combos: ClassifiedCombo[]): Promise<void> {
  try {
    const text = combos.map((c) => c.text).join('\n');
    await navigator.clipboard.writeText(text);
    toast.success(`Copied ${combos.length} combos to clipboard`);
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    toast.error('Failed to copy to clipboard');
  }
}

/**
 * Copies selected combos to clipboard (comma-separated for easy paste into keyword tools)
 */
export async function copySelectedCombos(combos: ClassifiedCombo[], separator: string = ', '): Promise<void> {
  try {
    const text = combos.map((c) => c.text).join(separator);
    await navigator.clipboard.writeText(text);
    toast.success(`Copied ${combos.length} combos`);
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    toast.error('Failed to copy to clipboard');
  }
}

// ==================== V2.1 EXPORT FUNCTIONS ====================

/**
 * Export combos to JSON file (V2.1)
 *
 * Includes all V2.1 fields: priority scores, noise confidence, semantic relevance, etc.
 */
export function exportCombosToJSON(
  combos: (ClassifiedCombo | ClassifiedComboV2_1)[],
  filename?: string,
  includeFactors: boolean = false
): void {
  const exportData = combos.map((c) => {
    const base: any = {
      text: c.text,
      type: c.type,
      source: c.source || 'unknown',
      relevanceScore: c.relevanceScore,
    };

    // Add brand classification if available
    if ('brandClassification' in c && c.brandClassification) {
      base.brandClassification = c.brandClassification;
      base.matchedBrandAlias = c.matchedBrandAlias || null;
    }

    // Add V2.1 fields if available
    if ('priorityScore' in c && c.priorityScore !== undefined) {
      base.priorityScore = c.priorityScore;
      base.noiseConfidence = c.noiseConfidence;
      base.isHighValue = c.isHighValue;
      base.isLongTail = c.isLongTail;
      base.semanticRelevance = c.semanticRelevance;
      base.noveltyScore = c.noveltyScore;

      // Include detailed factors if requested
      if (includeFactors && c.priorityFactors) {
        base.priorityFactors = c.priorityFactors;
      }
    }

    return base;
  });

  const jsonContent = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `keyword-combos-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);

  toast.success(`Exported ${combos.length} combos to JSON`);
}

/**
 * Export combos to XLSX file (V2.1)
 *
 * Uses a lightweight client-side XLSX generation approach without external libraries.
 * Includes all V2.1 priority scoring fields.
 */
export function exportCombosToXLSX(
  combos: (ClassifiedCombo | ClassifiedComboV2_1)[],
  filename?: string
): void {
  // Headers for XLSX export
  const headers = [
    'Combo',
    'Type',
    'Source',
    'Relevance',
    'Priority Score',
    'High Value',
    'Long-Tail',
    'Noise Confidence',
    'Semantic Relevance',
    'Novelty Score',
    'Brand Classification',
    'Intent',
    'Length (chars)',
    'Word Count',
  ];

  // Build data rows
  const rows = combos.map((c) => {
    const wordCount = c.text.split(/\s+/).length;
    const isV2_1 = 'priorityScore' in c;

    return [
      c.text,
      c.type,
      c.source || 'unknown',
      c.relevanceScore.toString(),
      isV2_1 && c.priorityScore !== undefined ? c.priorityScore.toFixed(0) : 'N/A',
      isV2_1 && c.isHighValue !== undefined ? (c.isHighValue ? 'Yes' : 'No') : 'N/A',
      isV2_1 && c.isLongTail !== undefined ? (c.isLongTail ? 'Yes' : 'No') : 'N/A',
      isV2_1 && c.noiseConfidence !== undefined ? c.noiseConfidence.toFixed(0) : 'N/A',
      isV2_1 && c.semanticRelevance !== undefined ? c.semanticRelevance.toFixed(0) : 'N/A',
      isV2_1 && c.noveltyScore !== undefined ? c.noveltyScore.toFixed(0) : 'N/A',
      ('brandClassification' in c && c.brandClassification) || 'N/A',
      classifyIntent(c),
      c.text.length.toString(),
      wordCount.toString(),
    ];
  });

  // Generate CSV content (Excel can open CSV with proper encoding)
  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))
  ].join('\n');

  // Use UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `keyword-combos-${Date.now()}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);

  toast.success(`Exported ${combos.length} combos to XLSX`);
}
