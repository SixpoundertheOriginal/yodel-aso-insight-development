/**
 * DESIGN REGISTRY: Class Builder Utilities
 *
 * Enhanced utilities for building Tailwind class strings.
 * Re-exports the standard cn() helper and adds design system utilities.
 *
 * @packageDocumentation
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Enhanced cn() utility - merges Tailwind classes intelligently
 * Combines clsx for conditional classes + twMerge for deduplication
 *
 * @param inputs - Class values to merge
 * @returns Merged class string
 *
 * @example
 * ```ts
 * cn('text-sm', 'text-lg') // "text-lg" (twMerge removes conflicting text-sm)
 * cn('p-4', { 'p-6': isLarge }) // "p-6" if isLarge is true
 * cn('bg-red-500', undefined, 'text-white') // "bg-red-500 text-white" (handles undefined)
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Apply semantic color classes from design registry
 *
 * @param semantic - Semantic color key (e.g., 'delta.positive')
 * @param type - Type of class to apply ('text', 'bg', 'border', 'all')
 * @returns Tailwind class string
 *
 * @example
 * ```ts
 * applySemanticColor('delta.positive', 'text') // "text-green-400"
 * applySemanticColor('delta.positive', 'all') // "text-green-400 bg-green-500/10 border-green-500/30"
 * ```
 */
export function applySemanticColor(
  semantic: string,
  type: 'text' | 'bg' | 'border' | 'all' = 'all'
): string {
  // This is a placeholder - actual implementation would import from colors.ts
  // For now, return empty string to avoid circular dependencies
  // In Phase 2, this will be expanded with proper color resolution
  return '';
}

/**
 * Build responsive class string
 *
 * @param base - Base classes
 * @param responsive - Responsive variant classes
 * @returns Merged responsive class string
 *
 * @example
 * ```ts
 * responsive('text-sm', { md: 'text-base', lg: 'text-lg' })
 * // "text-sm md:text-base lg:text-lg"
 * ```
 */
export function responsive(
  base: string,
  responsive?: Partial<Record<'sm' | 'md' | 'lg' | 'xl' | '2xl', string>>
): string {
  if (!responsive) return base;

  const classes = [base];
  if (responsive.sm) classes.push(`sm:${responsive.sm}`);
  if (responsive.md) classes.push(`md:${responsive.md}`);
  if (responsive.lg) classes.push(`lg:${responsive.lg}`);
  if (responsive.xl) classes.push(`xl:${responsive.xl}`);
  if (responsive['2xl']) classes.push(`2xl:${responsive['2xl']}`);

  return classes.join(' ');
}

/**
 * Build state-based class string
 *
 * @param base - Base classes
 * @param states - State variant classes
 * @returns Merged state class string
 *
 * @example
 * ```ts
 * states('bg-blue-500', { hover: 'bg-blue-600', active: 'bg-blue-700' })
 * // "bg-blue-500 hover:bg-blue-600 active:bg-blue-700"
 * ```
 */
export function states(
  base: string,
  states?: Partial<Record<'hover' | 'focus' | 'active' | 'disabled', string>>
): string {
  if (!states) return base;

  const classes = [base];
  if (states.hover) classes.push(`hover:${states.hover}`);
  if (states.focus) classes.push(`focus:${states.focus}`);
  if (states.active) classes.push(`active:${states.active}`);
  if (states.disabled) classes.push(`disabled:${states.disabled}`);

  return classes.join(' ');
}
