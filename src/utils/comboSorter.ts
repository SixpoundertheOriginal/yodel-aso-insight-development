/**
 * Combo Sorter Utility
 *
 * Sorts keyword combinations by various columns.
 */

import type { ClassifiedCombo } from '@/components/AppAudit/UnifiedMetadataAuditModule/types';

export type SortColumn = 'text' | 'source' | 'type' | 'relevance' | 'length';
export type SortDirection = 'asc' | 'desc';

/**
 * Sorts combos by specified column and direction
 */
export function sortCombos(
  combos: ClassifiedCombo[],
  column: SortColumn,
  direction: SortDirection
): ClassifiedCombo[] {
  const sorted = [...combos].sort((a, b) => {
    switch (column) {
      case 'text':
        return a.text.localeCompare(b.text);

      case 'source': {
        const sourceA = a.source || 'unknown';
        const sourceB = b.source || 'unknown';
        // Sort order: title < subtitle < title+subtitle
        const order = { title: 1, subtitle: 2, 'title+subtitle': 3, unknown: 4 };
        return (order[sourceA as keyof typeof order] || 4) - (order[sourceB as keyof typeof order] || 4);
      }

      case 'type': {
        // Sort order: branded < generic < low_value
        const order = { branded: 1, generic: 2, low_value: 3 };
        return (order[a.type] || 99) - (order[b.type] || 99);
      }

      case 'relevance':
        return a.relevanceScore - b.relevanceScore;

      case 'length':
        return a.text.length - b.text.length;

      default:
        return 0;
    }
  });

  return direction === 'desc' ? sorted.reverse() : sorted;
}
