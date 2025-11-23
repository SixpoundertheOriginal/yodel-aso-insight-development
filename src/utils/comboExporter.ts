/**
 * Combo Exporter Utility
 *
 * Exports keyword combinations to CSV and clipboard.
 */

import type { ClassifiedCombo } from '@/components/AppAudit/UnifiedMetadataAuditModule/types';
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
