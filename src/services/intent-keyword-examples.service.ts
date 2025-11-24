/**
 * Intent Keyword Examples Service
 *
 * Fetches vertical-specific keyword examples from aso_intent_keyword_examples table.
 * Used to provide relevant recommendations in SearchIntentCoverageCard and other UI components.
 *
 * Phase 21: Vertical-Agnostic Architecture
 */

import { supabase } from '@/integrations/supabase/client';

export interface IntentKeywordExample {
  id: string;
  intent_type: 'informational' | 'commercial' | 'navigational' | 'transactional';
  vertical: string;
  example_phrase: string;
  display_order: number;
  market?: string;
  language: string;
  usage_context?: string;
}

export interface GetKeywordExamplesOptions {
  vertical: string;
  intentType?: string;
  usageContext?: string;
  market?: string;
  language?: string;
  limit?: number;
}

/**
 * Fetch keyword examples for a specific vertical and intent type
 *
 * @param options - Query options
 * @returns Array of example phrases
 *
 * @example
 * ```typescript
 * // Get informational examples for Education vertical
 * const examples = await getKeywordExamplesForVertical({
 *   vertical: 'Education',
 *   intentType: 'informational',
 *   limit: 3
 * });
 * // Returns: ['learn spanish', 'language lessons', 'study guide']
 * ```
 */
export async function getKeywordExamplesForVertical(
  options: GetKeywordExamplesOptions
): Promise<string[]> {
  const {
    vertical,
    intentType,
    usageContext = 'no_intent_found',
    market,
    language = 'en',
    limit = 3,
  } = options;

  try {
    let query = supabase
      .from('aso_intent_keyword_examples')
      .select('example_phrase, display_order')
      .eq('vertical', vertical)
      .eq('is_active', true)
      .eq('language', language)
      .or(`usage_context.eq.${usageContext},usage_context.is.null`)
      .order('display_order', { ascending: true })
      .limit(limit);

    // Filter by intent type if provided
    if (intentType) {
      query = query.eq('intent_type', intentType);
    }

    // Filter by market if provided (or include market-agnostic examples)
    if (market) {
      query = query.or(`market.eq.${market},market.is.null`);
    } else {
      query = query.is('market', null);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[INTENT-EXAMPLES] Supabase error:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.warn(`[INTENT-EXAMPLES] No examples found for vertical: ${vertical}`);
      return [];
    }

    console.log(`[INTENT-EXAMPLES] Found ${data.length} examples for ${vertical}`);
    return data.map((row) => row.example_phrase);
  } catch (error) {
    console.error('[INTENT-EXAMPLES] Unexpected error:', error);
    return [];
  }
}

/**
 * Fetch mixed examples across multiple intent types for a vertical
 *
 * @param vertical - App vertical/category
 * @param intentTypes - Array of intent types to include
 * @param limit - Total number of examples to return
 * @returns Array of example phrases
 *
 * @example
 * ```typescript
 * // Get mixed examples for Gaming vertical
 * const examples = await getMixedKeywordExamples('Games', ['informational', 'commercial'], 3);
 * // Returns: ['how to play', 'best games', 'game guide']
 * ```
 */
export async function getMixedKeywordExamples(
  vertical: string,
  intentTypes: string[] = ['informational', 'commercial', 'transactional'],
  limit: number = 3
): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('aso_intent_keyword_examples')
      .select('example_phrase, display_order, intent_type')
      .eq('vertical', vertical)
      .eq('is_active', true)
      .in('intent_type', intentTypes)
      .is('market', null) // Platform-wide examples only
      .order('intent_type', { ascending: true })
      .order('display_order', { ascending: true })
      .limit(limit * intentTypes.length); // Fetch more to ensure variety

    if (error) {
      console.error('[INTENT-EXAMPLES] Supabase error:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.warn(`[INTENT-EXAMPLES] No mixed examples found for vertical: ${vertical}`);
      return [];
    }

    // Get at least one example per intent type if possible
    const examplesByIntent = intentTypes.map((intentType) => {
      const examples = data.filter((row) => row.intent_type === intentType);
      return examples.length > 0 ? examples[0].example_phrase : null;
    }).filter((phrase): phrase is string => phrase !== null);

    // Fill remaining slots with any available examples
    const remaining = limit - examplesByIntent.length;
    if (remaining > 0) {
      const allPhrases = data.map((row) => row.example_phrase);
      const additionalPhrases = allPhrases
        .filter((phrase) => !examplesByIntent.includes(phrase))
        .slice(0, remaining);
      examplesByIntent.push(...additionalPhrases);
    }

    return examplesByIntent.slice(0, limit);
  } catch (error) {
    console.error('[INTENT-EXAMPLES] Unexpected error:', error);
    return [];
  }
}

/**
 * Get all examples for a vertical (admin/debugging)
 *
 * @param vertical - App vertical/category
 * @returns Full example records
 */
export async function getAllExamplesForVertical(
  vertical: string
): Promise<IntentKeywordExample[]> {
  try {
    const { data, error } = await supabase
      .from('aso_intent_keyword_examples')
      .select('*')
      .eq('vertical', vertical)
      .eq('is_active', true)
      .order('intent_type', { ascending: true })
      .order('display_order', { ascending: true });

    if (error) {
      console.error('[INTENT-EXAMPLES] Supabase error:', error);
      return [];
    }

    return (data || []) as IntentKeywordExample[];
  } catch (error) {
    console.error('[INTENT-EXAMPLES] Unexpected error:', error);
    return [];
  }
}

/**
 * Get available verticals with example counts
 *
 * @returns Map of vertical names to example counts
 */
export async function getAvailableVerticals(): Promise<Record<string, number>> {
  try {
    const { data, error } = await supabase
      .from('aso_intent_keyword_examples')
      .select('vertical')
      .eq('is_active', true);

    if (error) {
      console.error('[INTENT-EXAMPLES] Supabase error:', error);
      return {};
    }

    if (!data) return {};

    // Count examples per vertical
    const verticalCounts: Record<string, number> = {};
    data.forEach((row) => {
      verticalCounts[row.vertical] = (verticalCounts[row.vertical] || 0) + 1;
    });

    return verticalCounts;
  } catch (error) {
    console.error('[INTENT-EXAMPLES] Unexpected error:', error);
    return {};
  }
}

/**
 * Normalize app category to vertical
 *
 * Maps App Store categories to our vertical taxonomy
 *
 * @param category - App Store category (e.g., "Education", "Games", "Finance & Business")
 * @returns Normalized vertical name
 *
 * @example
 * ```typescript
 * normalizeVertical('Finance & Business') // Returns: 'Finance'
 * normalizeVertical('Health & Fitness') // Returns: 'Health'
 * ```
 */
export function normalizeVertical(category: string | undefined): string {
  if (!category) return 'Education'; // Default fallback

  const normalized = category.toLowerCase().trim();

  // Education
  if (normalized.includes('education')) return 'Education';

  // Gaming
  if (normalized.includes('game')) return 'Games';

  // Finance
  if (normalized.includes('finance') || normalized.includes('business')) return 'Finance';

  // Health & Fitness
  if (normalized.includes('health') || normalized.includes('fitness')) return 'Health';

  // Productivity
  if (normalized.includes('productivity') || normalized.includes('utilities')) return 'Productivity';

  // Social
  if (normalized.includes('social')) return 'Social';

  // Shopping
  if (normalized.includes('shopping') || normalized.includes('lifestyle')) return 'Shopping';

  // Travel
  if (normalized.includes('travel')) return 'Travel';

  // Entertainment & Music
  if (normalized.includes('entertainment') || normalized.includes('music')) return 'Entertainment';

  // Food & Drink
  if (normalized.includes('food') || normalized.includes('drink')) return 'Food';

  // Default fallback
  console.warn(`[INTENT-EXAMPLES] Unknown category: ${category}, defaulting to Education`);
  return 'Education';
}
