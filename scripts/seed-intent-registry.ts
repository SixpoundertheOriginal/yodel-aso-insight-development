/**
 * Phase 16: Intent Intelligence Registry - Seeding Script
 *
 * Seeds default intent patterns for search intent classification
 *
 * Intent Types:
 * - Informational: Learning, tutorials, guides, practice
 * - Commercial: Best, top, recommended, comparisons
 * - Navigational: Brand names, app names, specific products
 * - Transactional: Download, buy, get, install, subscribe
 *
 * Usage:
 *   tsx scripts/seed-intent-registry.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================================================
// Intent Pattern Seed Data
// ============================================================================

interface IntentPatternSeed {
  pattern: string;
  intent_type: 'informational' | 'commercial' | 'navigational' | 'transactional';
  example: string;
  description?: string;
  scope: 'base';
  weight: number;
  is_regex: boolean;
  case_sensitive: boolean;
  word_boundary: boolean;
  priority: number;
  admin_tags?: string[];
}

const INTENT_PATTERNS: IntentPatternSeed[] = [
  // ========================================================================
  // INFORMATIONAL INTENT
  // ========================================================================
  {
    pattern: 'learn',
    intent_type: 'informational',
    example: 'learn spanish',
    description: 'User wants to learn or study something',
    scope: 'base',
    weight: 1.2,
    is_regex: false,
    case_sensitive: false,
    word_boundary: true,
    priority: 100,
    admin_tags: ['education', 'core']
  },
  {
    pattern: 'how to',
    intent_type: 'informational',
    example: 'how to speak french',
    description: 'User seeking instructions or guidance',
    scope: 'base',
    weight: 1.3,
    is_regex: false,
    case_sensitive: false,
    word_boundary: false,
    priority: 110,
    admin_tags: ['education', 'query']
  },
  {
    pattern: 'tutorial',
    intent_type: 'informational',
    example: 'language tutorial',
    description: 'User seeking educational content',
    scope: 'base',
    weight: 1.1,
    is_regex: false,
    case_sensitive: false,
    word_boundary: true,
    priority: 90,
    admin_tags: ['education']
  },
  {
    pattern: 'guide',
    intent_type: 'informational',
    example: 'beginner guide',
    description: 'User seeking step-by-step instructions',
    scope: 'base',
    weight: 1.1,
    is_regex: false,
    case_sensitive: false,
    word_boundary: true,
    priority: 90,
    admin_tags: ['education']
  },
  {
    pattern: 'practice',
    intent_type: 'informational',
    example: 'practice speaking',
    description: 'User wants to practice skills',
    scope: 'base',
    weight: 1.0,
    is_regex: false,
    case_sensitive: false,
    word_boundary: true,
    priority: 80,
    admin_tags: ['education', 'skill-building']
  },
  {
    pattern: 'study',
    intent_type: 'informational',
    example: 'study vocabulary',
    description: 'User wants to study or review material',
    scope: 'base',
    weight: 1.0,
    is_regex: false,
    case_sensitive: false,
    word_boundary: true,
    priority: 80,
    admin_tags: ['education']
  },
  {
    pattern: 'tips',
    intent_type: 'informational',
    example: 'language learning tips',
    description: 'User seeking advice or tips',
    scope: 'base',
    weight: 0.9,
    is_regex: false,
    case_sensitive: false,
    word_boundary: true,
    priority: 70,
    admin_tags: ['advice']
  },
  {
    pattern: 'grammar',
    intent_type: 'informational',
    example: 'spanish grammar',
    description: 'User seeking grammar instruction',
    scope: 'base',
    weight: 1.0,
    is_regex: false,
    case_sensitive: false,
    word_boundary: true,
    priority: 85,
    admin_tags: ['education', 'language']
  },
  {
    pattern: 'vocabulary',
    intent_type: 'informational',
    example: 'build vocabulary',
    description: 'User wants to expand vocabulary',
    scope: 'base',
    weight: 1.0,
    is_regex: false,
    case_sensitive: false,
    word_boundary: true,
    priority: 85,
    admin_tags: ['education', 'language']
  },
  {
    pattern: 'pronunciation',
    intent_type: 'informational',
    example: 'improve pronunciation',
    description: 'User wants to improve pronunciation',
    scope: 'base',
    weight: 1.0,
    is_regex: false,
    case_sensitive: false,
    word_boundary: true,
    priority: 85,
    admin_tags: ['education', 'language']
  },

  // ========================================================================
  // COMMERCIAL INTENT
  // ========================================================================
  {
    pattern: 'best',
    intent_type: 'commercial',
    example: 'best language app',
    description: 'User comparing options, high conversion intent',
    scope: 'base',
    weight: 1.5,
    is_regex: false,
    case_sensitive: false,
    word_boundary: true,
    priority: 120,
    admin_tags: ['comparison', 'high-intent', 'core']
  },
  {
    pattern: 'top',
    intent_type: 'commercial',
    example: 'top 10 apps',
    description: 'User seeking ranked comparisons',
    scope: 'base',
    weight: 1.4,
    is_regex: false,
    case_sensitive: false,
    word_boundary: true,
    priority: 115,
    admin_tags: ['comparison', 'high-intent']
  },
  {
    pattern: 'recommended',
    intent_type: 'commercial',
    example: 'recommended language apps',
    description: 'User seeking recommendations',
    scope: 'base',
    weight: 1.3,
    is_regex: false,
    case_sensitive: false,
    word_boundary: true,
    priority: 110,
    admin_tags: ['comparison']
  },
  {
    pattern: 'review',
    intent_type: 'commercial',
    example: 'app reviews',
    description: 'User researching via reviews',
    scope: 'base',
    weight: 1.2,
    is_regex: false,
    case_sensitive: false,
    word_boundary: true,
    priority: 105,
    admin_tags: ['comparison', 'research']
  },
  {
    pattern: 'compare',
    intent_type: 'commercial',
    example: 'compare language apps',
    description: 'Direct comparison intent',
    scope: 'base',
    weight: 1.4,
    is_regex: false,
    case_sensitive: false,
    word_boundary: true,
    priority: 115,
    admin_tags: ['comparison', 'high-intent']
  },
  {
    pattern: 'vs',
    intent_type: 'commercial',
    example: 'duolingo vs babbel',
    description: 'Head-to-head comparison',
    scope: 'base',
    weight: 1.5,
    is_regex: false,
    case_sensitive: false,
    word_boundary: false,
    priority: 120,
    admin_tags: ['comparison', 'high-intent']
  },
  {
    pattern: 'alternative',
    intent_type: 'commercial',
    example: 'duolingo alternative',
    description: 'User seeking alternatives',
    scope: 'base',
    weight: 1.3,
    is_regex: false,
    case_sensitive: false,
    word_boundary: true,
    priority: 110,
    admin_tags: ['comparison']
  },
  {
    pattern: 'worth it',
    intent_type: 'commercial',
    example: 'is duolingo worth it',
    description: 'Value assessment query',
    scope: 'base',
    weight: 1.2,
    is_regex: false,
    case_sensitive: false,
    word_boundary: false,
    priority: 105,
    admin_tags: ['comparison', 'research']
  },
  {
    pattern: 'popular',
    intent_type: 'commercial',
    example: 'most popular language app',
    description: 'User seeking popular options',
    scope: 'base',
    weight: 1.1,
    is_regex: false,
    case_sensitive: false,
    word_boundary: true,
    priority: 100,
    admin_tags: ['comparison']
  },

  // ========================================================================
  // TRANSACTIONAL INTENT
  // ========================================================================
  {
    pattern: 'download',
    intent_type: 'transactional',
    example: 'download language app',
    description: 'High conversion intent - ready to download',
    scope: 'base',
    weight: 2.0,
    is_regex: false,
    case_sensitive: false,
    word_boundary: true,
    priority: 150,
    admin_tags: ['conversion', 'high-intent', 'core']
  },
  {
    pattern: 'free',
    intent_type: 'transactional',
    example: 'free language learning',
    description: 'Price-conscious, ready to try',
    scope: 'base',
    weight: 1.8,
    is_regex: false,
    case_sensitive: false,
    word_boundary: true,
    priority: 140,
    admin_tags: ['conversion', 'high-intent', 'pricing']
  },
  {
    pattern: 'get',
    intent_type: 'transactional',
    example: 'get language app',
    description: 'Acquisition intent',
    scope: 'base',
    weight: 1.5,
    is_regex: false,
    case_sensitive: false,
    word_boundary: true,
    priority: 130,
    admin_tags: ['conversion']
  },
  {
    pattern: 'install',
    intent_type: 'transactional',
    example: 'install app',
    description: 'Ready to install',
    scope: 'base',
    weight: 1.8,
    is_regex: false,
    case_sensitive: false,
    word_boundary: true,
    priority: 145,
    admin_tags: ['conversion', 'high-intent']
  },
  {
    pattern: 'buy',
    intent_type: 'transactional',
    example: 'buy premium',
    description: 'Purchase intent',
    scope: 'base',
    weight: 2.0,
    is_regex: false,
    case_sensitive: false,
    word_boundary: true,
    priority: 150,
    admin_tags: ['conversion', 'high-intent', 'monetization']
  },
  {
    pattern: 'subscribe',
    intent_type: 'transactional',
    example: 'subscribe to premium',
    description: 'Subscription intent',
    scope: 'base',
    weight: 1.9,
    is_regex: false,
    case_sensitive: false,
    word_boundary: true,
    priority: 145,
    admin_tags: ['conversion', 'high-intent', 'monetization']
  },
  {
    pattern: 'trial',
    intent_type: 'transactional',
    example: 'free trial',
    description: 'User wants to try before buying',
    scope: 'base',
    weight: 1.6,
    is_regex: false,
    case_sensitive: false,
    word_boundary: true,
    priority: 135,
    admin_tags: ['conversion', 'pricing']
  },
  {
    pattern: 'app store',
    intent_type: 'transactional',
    example: 'duolingo app store',
    description: 'Looking for download location',
    scope: 'base',
    weight: 1.7,
    is_regex: false,
    case_sensitive: false,
    word_boundary: false,
    priority: 140,
    admin_tags: ['conversion', 'store']
  },
  {
    pattern: 'ios',
    intent_type: 'transactional',
    example: 'language app ios',
    description: 'Platform-specific download intent',
    scope: 'base',
    weight: 1.4,
    is_regex: false,
    case_sensitive: false,
    word_boundary: true,
    priority: 125,
    admin_tags: ['conversion', 'platform']
  },
  {
    pattern: 'android',
    intent_type: 'transactional',
    example: 'language app android',
    description: 'Platform-specific download intent',
    scope: 'base',
    weight: 1.4,
    is_regex: false,
    case_sensitive: false,
    word_boundary: true,
    priority: 125,
    admin_tags: ['conversion', 'platform']
  },
  {
    pattern: 'iphone',
    intent_type: 'transactional',
    example: 'language app iphone',
    description: 'Device-specific download intent',
    scope: 'base',
    weight: 1.4,
    is_regex: false,
    case_sensitive: false,
    word_boundary: true,
    priority: 125,
    admin_tags: ['conversion', 'platform']
  },

  // ========================================================================
  // NAVIGATIONAL INTENT
  // ========================================================================
  {
    pattern: 'app',
    intent_type: 'navigational',
    example: 'duolingo app',
    description: 'Direct app search',
    scope: 'base',
    weight: 1.0,
    is_regex: false,
    case_sensitive: false,
    word_boundary: true,
    priority: 50,
    admin_tags: ['brand', 'generic']
  },
  {
    pattern: 'official',
    intent_type: 'navigational',
    example: 'official duolingo app',
    description: 'Seeking official/authentic version',
    scope: 'base',
    weight: 1.2,
    is_regex: false,
    case_sensitive: false,
    word_boundary: true,
    priority: 80,
    admin_tags: ['brand', 'authentic']
  },
  {
    pattern: 'by',
    intent_type: 'navigational',
    example: 'app by duolingo',
    description: 'Developer-specific search',
    scope: 'base',
    weight: 1.1,
    is_regex: false,
    case_sensitive: false,
    word_boundary: true,
    priority: 70,
    admin_tags: ['brand', 'developer']
  },
  {
    pattern: 'inc',
    intent_type: 'navigational',
    example: 'duolingo inc',
    description: 'Company name search',
    scope: 'base',
    weight: 1.3,
    is_regex: false,
    case_sensitive: false,
    word_boundary: false,
    priority: 85,
    admin_tags: ['brand', 'company']
  },
  {
    pattern: 'ltd',
    intent_type: 'navigational',
    example: 'company ltd',
    description: 'Company name search',
    scope: 'base',
    weight: 1.3,
    is_regex: false,
    case_sensitive: false,
    word_boundary: false,
    priority: 85,
    admin_tags: ['brand', 'company']
  },
  {
    pattern: 'llc',
    intent_type: 'navigational',
    example: 'company llc',
    description: 'Company name search',
    scope: 'base',
    weight: 1.3,
    is_regex: false,
    case_sensitive: false,
    word_boundary: false,
    priority: 85,
    admin_tags: ['brand', 'company']
  },
];

// ============================================================================
// Seeding Functions
// ============================================================================

async function clearExistingPatterns(): Promise<void> {
  console.log('🗑️  Clearing existing base patterns...');

  const { error } = await supabase
    .from('aso_intent_patterns')
    .delete()
    .eq('scope', 'base');

  if (error) {
    console.error('❌ Error clearing patterns:', error);
    throw error;
  }

  console.log('✅ Existing patterns cleared');
}

async function seedIntentPatterns(): Promise<void> {
  console.log(`\n📝 Seeding ${INTENT_PATTERNS.length} intent patterns...`);

  let successCount = 0;
  let errorCount = 0;

  for (const pattern of INTENT_PATTERNS) {
    const { error } = await supabase
      .from('aso_intent_patterns')
      .insert({
        pattern: pattern.pattern,
        intent_type: pattern.intent_type,
        example: pattern.example,
        description: pattern.description,
        scope: pattern.scope,
        weight: pattern.weight,
        is_regex: pattern.is_regex,
        case_sensitive: pattern.case_sensitive,
        word_boundary: pattern.word_boundary,
        priority: pattern.priority,
        admin_tags: pattern.admin_tags,
        is_active: true,
      });

    if (error) {
      console.error(`  ❌ Failed to seed pattern "${pattern.pattern}":`, error.message);
      errorCount++;
    } else {
      successCount++;
      console.log(`  ✓ ${pattern.intent_type.padEnd(15)} | ${pattern.pattern.padEnd(20)} | weight: ${pattern.weight} | priority: ${pattern.priority}`);
    }
  }

  console.log(`\n✅ Seeded ${successCount} patterns`);
  if (errorCount > 0) {
    console.log(`⚠️  ${errorCount} patterns failed`);
  }
}

async function printStats(): Promise<void> {
  console.log('\n📊 Intent Pattern Statistics:');

  // Count by intent type
  const { data: byType, error: typeError } = await supabase
    .from('aso_intent_patterns')
    .select('intent_type')
    .eq('scope', 'base')
    .eq('is_active', true);

  if (!typeError && byType) {
    const counts = byType.reduce((acc, row) => {
      acc[row.intent_type] = (acc[row.intent_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\nBy Intent Type:');
    Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .forEach(([type, count]) => {
        console.log(`  ${type.padEnd(20)}: ${count}`);
      });
  }

  // Total active patterns
  const { count, error: countError } = await supabase
    .from('aso_intent_patterns')
    .select('*', { count: 'exact', head: true })
    .eq('scope', 'base')
    .eq('is_active', true);

  if (!countError) {
    console.log(`\nTotal Active Base Patterns: ${count}`);
  }
}

// ============================================================================
// Main Execution
// ============================================================================

async function main(): Promise<void> {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     Phase 16: Intent Intelligence Registry Seeding       ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  try {
    // Clear existing patterns
    await clearExistingPatterns();

    // Seed new patterns
    await seedIntentPatterns();

    // Print statistics
    await printStats();

    console.log('\n✅ Intent registry seeding complete!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

main();
