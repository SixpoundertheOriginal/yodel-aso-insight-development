/**
 * AUDIT SPACING TOKENS
 *
 * Standardized spacing patterns for audit components.
 * Provides consistent layout rhythm and breathing room.
 */

export const auditSpacing = {
  // Card containers
  card: {
    padding: 'p-6', // Standard card padding
    paddingCompact: 'p-4', // Compact card padding
    gap: 'space-y-6', // Main card content spacing
    gapCompact: 'space-y-4', // Compact content spacing
  },
  
  // Score displays
  score: {
    containerGap: 'gap-2', // Gap between score and tier badge
    elementGrid: 'gap-4', // Grid gap for element scores
    subsectionMargin: 'mb-3', // Space below subsection headers
    labelMargin: 'mt-1', // Space above label text
  },
  
  // Element detail cards
  element: {
    sectionGap: 'space-y-4', // Gap between card sections
    ruleGrid: 'gap-4', // Grid gap for rule cards
    contentPadding: 'p-4', // Rule card padding
    descriptionMargin: 'mb-2', // Space below labels
    evidenceMargin: 'mt-2', // Space above evidence
  },
  
  // Keywords and combos
  keyword: {
    badgeGrid: 'gap-2', // Gap between keyword badges
    sectionGap: 'space-y-4', // Gap between keyword sections
    labelMargin: 'mb-2', // Space below section labels
    containerPadding: 'pl-4', // Indent for keyword lists
    itemGap: 'gap-3', // Gap within keyword items
  },
  
  // Recommendations
  recommendation: {
    itemGap: 'space-y-3', // Gap between recommendation items
    numberGap: 'gap-3', // Space between number and text
    innerPadding: 'p-3', // Recommendation card padding
    descriptionMargin: 'mt-1', // Space above description
  },
  
  // Section headers
  section: {
    mainMargin: 'mb-3', // Space below main headers
    subsectionMargin: 'mb-3', // Space below subsections
    labelMargin: 'mb-3', // Space below label text
    dividerMargin: 'pt-4 border-t border-zinc-700', // Divider with spacing
  },
  
  // List and grid patterns
  layout: {
    gridCols2: 'grid grid-cols-2', // 2-column grid
    gridCols3: 'grid grid-cols-3', // 3-column grid
    flex: 'flex items-center', // Flex row
    flexCol: 'flex flex-col', // Flex column
    flexGap: 'gap-2', // Standard flex gap
    flexGapLarge: 'gap-4', // Large flex gap
  },
} as const;

export type AuditSpacing = typeof auditSpacing;
