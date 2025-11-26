-- ============================================================================
-- Phase 2A: Category-Based RuleSet Assignment - Template Seeding
-- Migration: Seed vertical_template_meta for all 14 categories
-- Date: 2025-01-25
-- ============================================================================

-- Entertainment Category Template
UPDATE aso_ruleset_category
SET vertical_template_meta = '{
  "schema_version": "1.0.0",
  "overview": {
    "category_keywords": ["stream", "watch", "video", "content", "entertainment", "media", "show", "movie"],
    "discovery_drivers": ["streaming", "unlimited content", "watch anywhere", "premium content", "exclusive"],
    "retention_hooks": ["new releases", "binge-worthy", "personalized", "ad-free", "original content"],
    "description": "Entertainment apps focus on content variety, streaming quality, and exclusive offerings."
  },
  "benchmarks": {
    "generic_combo_count": { "excellent": 6, "good": 4, "moderate": 2 },
    "intent_balance_targets": {
      "informational": 0.25,
      "commercial": 0.35,
      "transactional": 0.30
    }
  },
  "kpi_modifiers": {
    "vertical_legitimacy_signal": {
      "tokens": ["verified", "official", "licensed", "original", "certified"],
      "weight": 1.1,
      "enabled": true
    },
    "vertical_speed_signal": {
      "tokens": ["instant", "stream", "watch now", "live", "real-time"],
      "weight": 1.0,
      "enabled": true
    },
    "vertical_benefit_specificity": {
      "tokens": ["unlimited", "ad-free", "hd", "4k", "exclusive", "premium"],
      "weight": 1.2,
      "enabled": true
    },
    "vertical_trust_reassurance": {
      "tokens": ["secure", "safe", "trusted", "reliable", "protected"],
      "weight": 1.0,
      "enabled": true
    },
    "vertical_effort_ratio": {
      "tokens": ["easy", "simple", "anywhere", "anytime", "on-the-go"],
      "weight": 1.0,
      "enabled": true
    },
    "vertical_feature_clarity": {
      "tokens": ["streaming", "video", "content", "library", "catalog", "episodes"],
      "weight": 1.1,
      "enabled": true
    }
  }
}'::jsonb
WHERE category_id = 'category_entertainment';

-- Games Category Template
UPDATE aso_ruleset_category
SET vertical_template_meta = '{
  "schema_version": "1.0.0",
  "overview": {
    "category_keywords": ["play", "game", "fun", "challenge", "compete", "levels", "adventure"],
    "discovery_drivers": ["addictive gameplay", "multiplayer", "free to play", "leaderboards", "daily challenges"],
    "retention_hooks": ["new levels", "events", "tournaments", "rewards", "social play"],
    "description": "Gaming apps emphasize fun factor, engagement mechanics, and social competition."
  },
  "benchmarks": {
    "generic_combo_count": { "excellent": 8, "good": 6, "moderate": 4 },
    "intent_balance_targets": {
      "informational": 0.20,
      "commercial": 0.40,
      "transactional": 0.35
    }
  },
  "kpi_modifiers": {
    "vertical_legitimacy_signal": {
      "tokens": ["award-winning", "top-rated", "trending", "#1", "best"],
      "weight": 1.0,
      "enabled": true
    },
    "vertical_speed_signal": {
      "tokens": ["instant", "fast-paced", "quick", "action-packed", "real-time"],
      "weight": 1.1,
      "enabled": true
    },
    "vertical_benefit_specificity": {
      "tokens": ["unlimited", "free", "multiplayer", "pvp", "leaderboards", "tournaments"],
      "weight": 1.3,
      "enabled": true
    },
    "vertical_trust_reassurance": {
      "tokens": ["safe", "family-friendly", "secure", "fair play"],
      "weight": 1.0,
      "enabled": true
    },
    "vertical_effort_ratio": {
      "tokens": ["easy", "casual", "fun", "addictive", "quick games", "one-tap"],
      "weight": 1.2,
      "enabled": true
    },
    "vertical_feature_clarity": {
      "tokens": ["levels", "missions", "gameplay", "characters", "worlds", "modes"],
      "weight": 1.1,
      "enabled": true
    }
  }
}'::jsonb
WHERE category_id = 'category_games';

-- Education Category Template
UPDATE aso_ruleset_category
SET vertical_template_meta = '{
  "schema_version": "1.0.0",
  "overview": {
    "category_keywords": ["learn", "study", "education", "course", "knowledge", "skill", "practice"],
    "discovery_drivers": ["effective learning", "expert-led", "structured courses", "practice exercises", "progress tracking"],
    "retention_hooks": ["daily lessons", "achievements", "personalized path", "study reminders", "progress reports"],
    "description": "Educational apps focus on learning outcomes, structured content, and measurable progress."
  },
  "benchmarks": {
    "generic_combo_count": { "excellent": 7, "good": 5, "moderate": 3 },
    "intent_balance_targets": {
      "informational": 0.40,
      "commercial": 0.30,
      "transactional": 0.25
    }
  },
  "kpi_modifiers": {
    "vertical_legitimacy_signal": {
      "tokens": ["certified", "accredited", "expert", "professional", "proven method"],
      "weight": 1.2,
      "enabled": true
    },
    "vertical_speed_signal": {
      "tokens": ["fast", "quick", "accelerated", "rapid", "efficient"],
      "weight": 1.1,
      "enabled": true
    },
    "vertical_benefit_specificity": {
      "tokens": ["mastery", "fluency", "certification", "skills", "knowledge", "proficiency"],
      "weight": 1.3,
      "enabled": true
    },
    "vertical_trust_reassurance": {
      "tokens": ["trusted", "reliable", "proven", "effective", "results"],
      "weight": 1.1,
      "enabled": true
    },
    "vertical_effort_ratio": {
      "tokens": ["easy", "simple", "bite-sized", "minutes", "daily", "fun"],
      "weight": 1.2,
      "enabled": true
    },
    "vertical_feature_clarity": {
      "tokens": ["lessons", "courses", "exercises", "quizzes", "practice", "study"],
      "weight": 1.2,
      "enabled": true
    }
  }
}'::jsonb
WHERE category_id = 'category_education';

-- Finance Category Template
UPDATE aso_ruleset_category
SET vertical_template_meta = '{
  "schema_version": "1.0.0",
  "overview": {
    "category_keywords": ["money", "finance", "invest", "bank", "save", "budget", "wealth"],
    "discovery_drivers": ["secure banking", "smart investing", "save money", "track spending", "financial freedom"],
    "retention_hooks": ["real-time alerts", "insights", "automated savings", "investment performance", "budgeting tools"],
    "description": "Finance apps emphasize security, trust, and tangible financial benefits."
  },
  "benchmarks": {
    "generic_combo_count": { "excellent": 7, "good": 5, "moderate": 3 },
    "intent_balance_targets": {
      "informational": 0.30,
      "commercial": 0.35,
      "transactional": 0.30
    }
  },
  "kpi_modifiers": {
    "vertical_legitimacy_signal": {
      "tokens": ["fdic insured", "regulated", "licensed", "certified", "trusted", "secure"],
      "weight": 1.4,
      "enabled": true
    },
    "vertical_speed_signal": {
      "tokens": ["instant", "fast", "quick", "real-time", "immediate"],
      "weight": 1.0,
      "enabled": true
    },
    "vertical_benefit_specificity": {
      "tokens": ["savings", "returns", "interest", "cashback", "rewards", "growth"],
      "weight": 1.3,
      "enabled": true
    },
    "vertical_trust_reassurance": {
      "tokens": ["secure", "encrypted", "protected", "safe", "privacy", "insured"],
      "weight": 1.5,
      "enabled": true
    },
    "vertical_effort_ratio": {
      "tokens": ["easy", "simple", "automated", "effortless", "automatic"],
      "weight": 1.1,
      "enabled": true
    },
    "vertical_feature_clarity": {
      "tokens": ["banking", "investing", "budgeting", "tracking", "transfers", "payments"],
      "weight": 1.2,
      "enabled": true
    }
  }
}'::jsonb
WHERE category_id = 'category_finance';

-- Health & Fitness Category Template
UPDATE aso_ruleset_category
SET vertical_template_meta = '{
  "schema_version": "1.0.0",
  "overview": {
    "category_keywords": ["health", "fitness", "workout", "exercise", "wellness", "track", "train"],
    "discovery_drivers": ["personalized workouts", "health tracking", "fitness goals", "expert coaching", "results-driven"],
    "retention_hooks": ["daily challenges", "progress tracking", "community support", "achievements", "streaks"],
    "description": "Health and fitness apps focus on personalization, progress tracking, and tangible wellness outcomes."
  },
  "benchmarks": {
    "generic_combo_count": { "excellent": 7, "good": 5, "moderate": 3 },
    "intent_balance_targets": {
      "informational": 0.30,
      "commercial": 0.35,
      "transactional": 0.30
    }
  },
  "kpi_modifiers": {
    "vertical_legitimacy_signal": {
      "tokens": ["certified", "expert", "professional", "clinically proven", "science-based"],
      "weight": 1.2,
      "enabled": true
    },
    "vertical_speed_signal": {
      "tokens": ["quick", "fast", "efficient", "high-intensity", "rapid"],
      "weight": 1.1,
      "enabled": true
    },
    "vertical_benefit_specificity": {
      "tokens": ["lose weight", "build muscle", "improve health", "get fit", "results"],
      "weight": 1.4,
      "enabled": true
    },
    "vertical_trust_reassurance": {
      "tokens": ["safe", "trusted", "proven", "effective", "reliable"],
      "weight": 1.1,
      "enabled": true
    },
    "vertical_effort_ratio": {
      "tokens": ["easy", "simple", "guided", "anywhere", "no equipment", "home workouts"],
      "weight": 1.2,
      "enabled": true
    },
    "vertical_feature_clarity": {
      "tokens": ["workouts", "exercises", "tracking", "plans", "coaching", "nutrition"],
      "weight": 1.2,
      "enabled": true
    }
  }
}'::jsonb
WHERE category_id = 'category_health_fitness';

-- Add simplified templates for remaining 9 categories
UPDATE aso_ruleset_category
SET vertical_template_meta = '{
  "schema_version": "1.0.0",
  "benchmarks": {
    "generic_combo_count": { "excellent": 6, "good": 4, "moderate": 2 },
    "intent_balance_targets": {
      "informational": 0.30,
      "commercial": 0.35,
      "transactional": 0.30
    }
  },
  "kpi_modifiers": {
    "vertical_legitimacy_signal": { "tokens": [], "weight": 1.0, "enabled": false },
    "vertical_speed_signal": { "tokens": [], "weight": 1.0, "enabled": false },
    "vertical_benefit_specificity": { "tokens": [], "weight": 1.0, "enabled": false },
    "vertical_trust_reassurance": { "tokens": [], "weight": 1.0, "enabled": false },
    "vertical_effort_ratio": { "tokens": [], "weight": 1.0, "enabled": false },
    "vertical_feature_clarity": { "tokens": [], "weight": 1.0, "enabled": false }
  }
}'::jsonb
WHERE category_id IN (
  'category_lifestyle',
  'category_utilities',
  'category_social_networking',
  'category_productivity',
  'category_travel',
  'category_shopping',
  'category_photo_video',
  'category_music',
  'category_news'
);

-- Verification query
SELECT
  category_id,
  category_name,
  jsonb_array_length(vertical_template_meta->'overview'->'category_keywords') as num_keywords,
  jsonb_typeof(vertical_template_meta->'kpi_modifiers') as has_kpi_modifiers
FROM aso_ruleset_category
ORDER BY category_name;
