/**
 * AUDIT COLOR TOKENS
 *
 * Semantic color system for audit-specific UI states.
 * Provides consistent styling for scores, rules, keywords, and recommendations.
 */

export const auditColors = {
  // Score tier colors (0-100 scores)
  scoreTier: {
    exceptional: { // 90-100
      text: 'text-emerald-400',
      bg: 'bg-emerald-400/10',
      border: 'border-emerald-400/30',
      glow: '0 0 15px rgba(16, 185, 129, 0.4)',
      textShadow: '0 0 10px rgba(52, 211, 153, 0.5)',
      ring: 'ring-emerald-400/20',
      badge: 'bg-emerald-400/20 text-emerald-300 border-emerald-400/30',
    },
    excellent: { // 80-89
      text: 'text-emerald-400',
      bg: 'bg-emerald-400/10',
      border: 'border-emerald-400/30',
      glow: '0 0 15px rgba(16, 185, 129, 0.4)',
      textShadow: '0 0 10px rgba(52, 211, 153, 0.5)',
      ring: 'ring-emerald-400/20',
      badge: 'bg-emerald-400/20 text-emerald-300 border-emerald-400/30',
    },
    good: { // 70-79
      text: 'text-yellow-400',
      bg: 'bg-yellow-400/10',
      border: 'border-yellow-400/30',
      glow: '0 0 15px rgba(251, 191, 36, 0.4)',
      textShadow: '0 0 10px rgba(251, 191, 36, 0.5)',
      ring: 'ring-yellow-400/20',
      badge: 'bg-yellow-400/20 text-yellow-300 border-yellow-400/30',
    },
    fair: { // 60-69
      text: 'text-yellow-400',
      bg: 'bg-yellow-400/10',
      border: 'border-yellow-400/30',
      glow: '0 0 15px rgba(251, 191, 36, 0.4)',
      textShadow: '0 0 10px rgba(251, 191, 36, 0.5)',
      ring: 'ring-yellow-400/20',
      badge: 'bg-yellow-400/20 text-yellow-300 border-yellow-400/30',
    },
    poor: { // 0-59
      text: 'text-red-400',
      bg: 'bg-red-400/10',
      border: 'border-red-400/30',
      glow: '0 0 15px rgba(239, 68, 68, 0.4)',
      textShadow: '0 0 10px rgba(239, 68, 68, 0.5)',
      ring: 'ring-red-400/20',
      badge: 'bg-red-400/20 text-red-300 border-red-400/30',
    },
  },
  
  // Audit rule states
  ruleState: {
    passed: {
      text: 'text-emerald-400',
      bg: 'bg-emerald-400/10',
      border: 'border-emerald-400/30',
      icon: 'text-emerald-500',
    },
    failed: {
      text: 'text-red-400',
      bg: 'bg-red-400/10',
      border: 'border-red-400/30',
      icon: 'text-red-500',
    },
    warning: {
      text: 'text-yellow-400',
      bg: 'bg-yellow-400/10',
      border: 'border-yellow-400/30',
      icon: 'text-yellow-500',
    },
  },
  
  // Keyword/combo type colors
  keywordType: {
    title: {
      text: 'text-purple-400',
      bg: 'bg-purple-400/10',
      border: 'border-purple-400/30',
      badge: 'bg-purple-400/20 text-purple-300 border-purple-400/30',
    },
    subtitle: {
      text: 'text-emerald-400',
      bg: 'bg-emerald-400/10',
      border: 'border-emerald-400/30',
      badge: 'bg-emerald-400/20 text-emerald-300 border-emerald-400/30',
    },
    description: {
      text: 'text-cyan-400',
      bg: 'bg-cyan-400/10',
      border: 'border-cyan-400/30',
      badge: 'bg-cyan-400/20 text-cyan-300 border-cyan-400/30',
    },
    brand: {
      text: 'text-orange-400',
      bg: 'bg-orange-400/10',
      border: 'border-orange-400/30',
      badge: 'bg-orange-400/20 text-orange-300 border-orange-400/30',
    },
    generic: {
      text: 'text-blue-400',
      bg: 'bg-blue-400/10',
      border: 'border-blue-400/30',
      badge: 'bg-blue-400/20 text-blue-300 border-blue-400/30',
    },
    competitor: {
      text: 'text-red-400',
      bg: 'bg-red-400/10',
      border: 'border-red-400/30',
      badge: 'bg-red-400/20 text-red-300 border-red-400/30',
    },
  },
  
  // Recommendation priorities
  recommendationPriority: {
    high: {
      text: 'text-orange-400',
      bg: 'bg-orange-400/10',
      border: 'border-orange-400/30',
      number: 'bg-orange-400/20 text-orange-400',
      glow: '0 0 10px rgba(251, 146, 60, 0.4)',
      hoverBorder: 'hover:border-orange-500/30',
      hoverBg: 'hover:bg-zinc-800/50',
      hoverShadow: 'hover:shadow-[0_0_15px_rgba(251,146,60,0.1)]',
    },
    medium: {
      text: 'text-yellow-400',
      bg: 'bg-yellow-400/10',
      border: 'border-yellow-400/30',
      number: 'bg-yellow-400/20 text-yellow-400',
      glow: '0 0 10px rgba(251, 191, 36, 0.4)',
      hoverBorder: 'hover:border-yellow-500/30',
      hoverBg: 'hover:bg-zinc-800/50',
      hoverShadow: 'hover:shadow-[0_0_15px_rgba(251,191,36,0.1)]',
    },
    low: {
      text: 'text-blue-400',
      bg: 'bg-blue-400/10',
      border: 'border-blue-400/30',
      number: 'bg-blue-400/20 text-blue-400',
      glow: '0 0 10px rgba(59, 130, 246, 0.4)',
      hoverBorder: 'hover:border-blue-500/30',
      hoverBg: 'hover:bg-zinc-800/50',
      hoverShadow: 'hover:shadow-[0_0_15px_rgba(59,130,246,0.1)]',
    },
  },
} as const;

export type AuditColors = typeof auditColors;
export type ScoreTierColors = typeof auditColors.scoreTier[keyof typeof auditColors.scoreTier];
export type RuleStateColors = typeof auditColors.ruleState[keyof typeof auditColors.ruleState];
export type KeywordTypeColors = typeof auditColors.keywordType[keyof typeof auditColors.keywordType];
export type RecommendationPriorityColors = typeof auditColors.recommendationPriority[keyof typeof auditColors.recommendationPriority];
