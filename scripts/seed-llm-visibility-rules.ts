/**
 * Seed LLM Visibility Rules
 *
 * Populates llm_visibility_rule_overrides table with vertical-specific rules
 * that were previously hardcoded in llmVisibilityRuleLoader.ts
 *
 * Usage:
 *   npx tsx scripts/seed-llm-visibility-rules.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================================================
// Vertical Rule Overrides (from getVerticalClusters function)
// ============================================================================

const VERTICAL_OVERRIDES = [
  {
    vertical: 'language_learning',
    label: 'Language Learning Apps',
    notes: 'Emphasizes educational methodology, language coverage, age targeting, and offline capabilities',
    rules_override: {
      weights: {
        factual_grounding: 0.30,  // Higher importance for age ranges, offline mode
        safety_credibility: 0.15,  // Parents care about safety
      },
      clusters: {
        core_functionality: {
          keywords: ['learn', 'study', 'practice', 'lesson', 'course', 'fluency', 'pronunciation'],
          weight: 1.0,
        },
        educational_method: {
          keywords: ['phonics', 'immersion', 'spaced repetition', 'games', 'quizzes', 'interactive'],
          weight: 0.95,
        },
        languages: {
          keywords: ['spanish', 'french', 'german', 'italian', 'chinese', 'japanese', 'english'],
          weight: 0.9,
        },
        target_audience: {
          keywords: ['kids', 'children', 'toddler', 'preschool', 'ages', 'adults', 'beginners'],
          weight: 0.85,
        },
        offline_mode: {
          keywords: ['offline', 'no wifi', 'download', 'airplane mode', 'travel'],
          weight: 0.75,
        },
        trust_safety: {
          keywords: ['safe', 'ad-free', 'privacy', 'family-friendly', 'kid-safe'],
          weight: 0.8,
        },
      },
    },
  },
  {
    vertical: 'rewards',
    label: 'Rewards & Cashback Apps',
    notes: 'Focuses on earning mechanisms, redemption options, legitimacy signals, and ease of use',
    rules_override: {
      weights: {
        factual_grounding: 0.28,  // Specific earnings amounts matter
        safety_credibility: 0.18,  // Avoiding scam perception is critical
      },
      clusters: {
        earning_mechanism: {
          keywords: ['earn', 'reward', 'cashback', 'points', 'money', 'cash'],
          weight: 1.0,
        },
        redemption: {
          keywords: ['redeem', 'gift card', 'paypal', 'withdraw', 'payout', 'prizes'],
          weight: 0.95,
        },
        activities: {
          keywords: ['play games', 'shop', 'surveys', 'watch videos', 'tasks', 'offers'],
          weight: 0.9,
        },
        legitimacy: {
          keywords: ['legitimate', 'real', 'verified', 'trusted', 'established', 'users'],
          weight: 0.85,
        },
        ease_of_use: {
          keywords: ['easy', 'simple', 'quick', 'fast', 'instant', 'no minimum'],
          weight: 0.75,
        },
        trust_safety: {
          keywords: ['safe', 'secure', 'privacy', 'no scam', 'trustworthy'],
          weight: 0.8,
        },
      },
    },
  },
  {
    vertical: 'health',
    label: 'Fitness & Health Apps',
    notes: 'Emphasizes workout types, fitness goals, tracking capabilities, and personalization',
    rules_override: {
      weights: {
        factual_grounding: 0.28,  // Specific workout details matter
        structure_readability: 0.18,  // Clear instructions are critical
      },
      clusters: {
        fitness_goals: {
          keywords: ['lose weight', 'build muscle', 'get fit', 'healthy', 'wellness', 'strength'],
          weight: 1.0,
        },
        workout_types: {
          keywords: ['cardio', 'yoga', 'hiit', 'strength training', 'running', 'cycling'],
          weight: 0.95,
        },
        tracking: {
          keywords: ['track', 'log', 'monitor', 'progress', 'calories', 'steps', 'heart rate'],
          weight: 0.9,
        },
        personalization: {
          keywords: ['custom', 'personalized', 'tailored', 'beginner', 'advanced', 'your level'],
          weight: 0.85,
        },
        convenience: {
          keywords: ['home', 'no equipment', 'short', 'quick', 'anytime', 'anywhere'],
          weight: 0.8,
        },
        trust_safety: {
          keywords: ['certified', 'expert', 'professional', 'safe', 'injury prevention'],
          weight: 0.75,
        },
      },
    },
  },
];

// ============================================================================
// Seeding Function
// ============================================================================

async function seedLLMVisibilityRules() {
  console.log('🌱 Seeding LLM Visibility Rules...\n');

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const override of VERTICAL_OVERRIDES) {
    try {
      console.log(`Processing: ${override.label} (${override.vertical})`);

      // Check if override already exists
      const { data: existing, error: checkError } = await supabase
        .from('llm_visibility_rule_overrides')
        .select('id, version')
        .eq('scope', 'vertical')
        .eq('vertical', override.vertical)
        .eq('is_active', true)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existing) {
        console.log(`  ⏭️  Already exists (v${existing.version}) - skipping`);
        skipCount++;
        continue;
      }

      // Insert new override
      const { error: insertError } = await supabase
        .from('llm_visibility_rule_overrides')
        .insert({
          scope: 'vertical',
          vertical: override.vertical,
          rules_override: override.rules_override,
          notes: override.notes,
          version: 1,
          is_active: true,
        });

      if (insertError) {
        throw insertError;
      }

      console.log(`  ✅ Created v1`);
      successCount++;
    } catch (error) {
      console.error(`  ❌ Error:`, error);
      errorCount++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`  ✅ Created: ${successCount}`);
  console.log(`  ⏭️  Skipped: ${skipCount}`);
  console.log(`  ❌ Errors: ${errorCount}`);
  console.log(`  📋 Total: ${VERTICAL_OVERRIDES.length}`);

  if (successCount > 0) {
    console.log('\n🎉 Seeding complete!');
    console.log('\n📍 View overrides at: /admin/aso-bible/llm-rules');
    console.log('\n💡 Next steps:');
    console.log('  1. Navigate to /admin/aso-bible/llm-rules');
    console.log('  2. Edit overrides to customize for your needs');
    console.log('  3. Analyze language learning apps to see overrides in action');
  }
}

// ============================================================================
// Main Execution
// ============================================================================

seedLLMVisibilityRules()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
