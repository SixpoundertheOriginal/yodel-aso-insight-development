/**
 * Scoring Utilities
 *
 * Centralized scoring logic, thresholds, colors, and labels.
 * Used across all audit components to ensure consistency.
 */

// ============================================
// Score Thresholds
// ============================================

export const SCORE_THRESHOLDS = {
  EXCELLENT: 80,
  GOOD: 60,
  FAIR: 40,
  POOR: 0,
} as const;

// ============================================
// Score Color Utilities
// ============================================

/**
 * Get Tailwind color class for a given score
 */
export function getScoreColor(score: number): string {
  if (score >= SCORE_THRESHOLDS.EXCELLENT) return 'text-green-400';
  if (score >= SCORE_THRESHOLDS.GOOD) return 'text-blue-400';
  if (score >= SCORE_THRESHOLDS.FAIR) return 'text-yellow-400';
  return 'text-red-400';
}

/**
 * Get background color class (with opacity) for a given score
 */
export function getScoreBgColor(score: number): string {
  if (score >= SCORE_THRESHOLDS.EXCELLENT) return 'bg-green-500/20 text-green-400 border-green-500/30';
  if (score >= SCORE_THRESHOLDS.GOOD) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  if (score >= SCORE_THRESHOLDS.FAIR) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  return 'bg-red-500/20 text-red-400 border-red-500/30';
}

// ============================================
// Score Label Utilities
// ============================================

/**
 * Get human-readable label for a given score
 */
export function getScoreLabel(score: number): string {
  if (score >= SCORE_THRESHOLDS.EXCELLENT) return 'Excellent';
  if (score >= SCORE_THRESHOLDS.GOOD) return 'Good';
  if (score >= SCORE_THRESHOLDS.FAIR) return 'Fair';
  return 'Needs Work';
}

// ============================================
// Priority Color Utilities
// ============================================

export type Priority = 'high' | 'medium' | 'low';

/**
 * Get color class for priority badge
 */
export function getPriorityColor(priority: Priority): string {
  if (priority === 'high') return 'bg-red-500/20 text-red-400 border-red-500/30';
  if (priority === 'medium') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
}

/**
 * Get text color for priority
 */
export function getPriorityTextColor(priority: Priority): string {
  if (priority === 'high') return 'text-red-400';
  if (priority === 'medium') return 'text-yellow-400';
  return 'text-blue-400';
}

/**
 * Get gradient color for priority progress bar
 */
export function getPriorityGradient(priority: Priority): string {
  if (priority === 'high') return 'bg-gradient-to-r from-red-500 to-red-400 shadow-red-500/20';
  if (priority === 'medium') return 'bg-gradient-to-r from-yellow-500 to-yellow-400 shadow-yellow-500/20';
  return 'bg-gradient-to-r from-blue-500 to-blue-400 shadow-blue-500/20';
}

// ============================================
// Risk Level Utilities
// ============================================

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Get color class for risk level badge
 */
export function getRiskLevelColor(riskLevel: RiskLevel): string {
  if (riskLevel === 'LOW') return 'bg-green-500/20 text-green-400 border-green-500/30';
  if (riskLevel === 'MEDIUM') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  if (riskLevel === 'HIGH') return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
  return 'bg-red-500/20 text-red-400 border-red-500/30';
}

/**
 * Get icon color for risk level
 */
export function getRiskLevelIconColor(riskLevel: RiskLevel): string {
  if (riskLevel === 'LOW') return 'text-green-400';
  if (riskLevel === 'MEDIUM') return 'text-yellow-400';
  if (riskLevel === 'HIGH') return 'text-orange-400';
  return 'text-red-400';
}

// ============================================
// Keyword Score Utilities
// ============================================

/**
 * Get color for keyword visibility score
 */
export function getKeywordScoreColor(score: number): string {
  if (score >= 70) return 'text-green-400';
  if (score >= 50) return 'text-blue-400';
  if (score >= 30) return 'text-yellow-400';
  return 'text-red-400';
}
