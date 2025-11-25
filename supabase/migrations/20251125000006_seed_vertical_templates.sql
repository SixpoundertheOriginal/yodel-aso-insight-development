-- ============================================================================
-- Vertical Intelligence Layer - Seed Test Data
-- Migration: Seed vertical_template_meta for Rewards and Language Learning
-- Phase: 21 - Vertical Intelligence Layer
-- Date: 2025-01-25
-- ============================================================================

-- Seed Rewards Vertical Template
UPDATE aso_ruleset_vertical
SET vertical_template_meta = '{
  "schema_version": "1.0.0",
  "overview": {
    "category_keywords": ["rewards", "cash", "earn", "money", "points", "gift cards"],
    "discovery_drivers": ["free rewards", "earn money", "play games", "cash back", "gift cards"],
    "retention_hooks": ["daily rewards", "bonus points", "instant cash out", "easy money", "no purchase necessary"],
    "description": "Rewards apps focus on earning mechanics, legitimacy signals, and instant gratification. Key to success is balancing trust reassurance with effortless earning claims."
  },
  "benchmarks": {
    "generic_combo_count": {
      "excellent": 7,
      "good": 5,
      "moderate": 3
    },
    "intent_balance_targets": {
      "informational": 0.20,
      "commercial": 0.40,
      "transactional": 0.30,
      "navigational": 0.10
    },
    "custom": {
      "trust_signal_ratio": {
        "min": 0.15,
        "max": 0.30,
        "target": 0.20
      },
      "earning_keyword_density": {
        "min": 0.25,
        "max": 0.45,
        "target": 0.35
      }
    }
  },
  "keyword_clusters": [
    {
      "cluster_name": "Earning Mechanisms",
      "keywords": ["earn", "rewards", "cash", "money", "points", "coins", "credits"],
      "intent_type": "commercial",
      "weight": 1.5,
      "examples": ["Earn Cash Rewards Playing Games", "Get Money for Surveys"]
    },
    {
      "cluster_name": "Redemption Options",
      "keywords": ["gift cards", "paypal", "amazon", "visa", "cash out", "redeem"],
      "intent_type": "transactional",
      "weight": 1.3,
      "examples": ["Cash Out to PayPal Instantly", "Redeem for Amazon Gift Cards"]
    },
    {
      "cluster_name": "Trust Signals",
      "keywords": ["real", "legit", "verified", "trusted", "secure", "safe", "guaranteed"],
      "intent_type": "informational",
      "weight": 1.4,
      "examples": ["Real Cash Rewards - Verified", "Trusted by Millions"]
    },
    {
      "cluster_name": "Ease Claims",
      "keywords": ["easy", "simple", "fast", "quick", "instant", "effortless", "fun"],
      "intent_type": "commercial",
      "weight": 1.2,
      "examples": ["Easy Money Just by Playing", "Quick Cash Rewards"]
    }
  ],
  "conversion_drivers": [
    {
      "hook_category": "Instant Gratification",
      "weight_multiplier": 1.5,
      "examples": [
        "Get Paid Instantly",
        "Cash Out Today",
        "Earn Rewards Now"
      ],
      "keywords": ["instant", "now", "today", "immediate", "fast"]
    },
    {
      "hook_category": "Legitimacy Proof",
      "weight_multiplier": 1.4,
      "examples": [
        "Real Money, Real Rewards",
        "Verified by Millions",
        "Trusted Rewards Platform"
      ],
      "keywords": ["real", "verified", "trusted", "legit", "guaranteed"]
    },
    {
      "hook_category": "Effortless Earning",
      "weight_multiplier": 1.3,
      "examples": [
        "Earn Money Playing Games",
        "Easy Rewards - No Purchase Required",
        "Simple Way to Make Money"
      ],
      "keywords": ["easy", "simple", "fun", "free", "no purchase"]
    },
    {
      "hook_category": "High Value Promise",
      "weight_multiplier": 1.2,
      "examples": [
        "$100+ Gift Cards Available",
        "Top Rewards & Cash Back",
        "Maximize Your Earnings"
      ],
      "keywords": ["maximize", "top", "best", "most", "high"]
    }
  ],
  "kpi_modifiers": {
    "vertical_legitimacy_signal": {
      "tokens": ["real", "verified", "legit", "trusted", "secure", "safe", "guaranteed", "certified", "authentic"],
      "weight": 1.4,
      "description": "Legitimacy signals are critical for rewards apps due to scam concerns",
      "enabled": true
    },
    "vertical_speed_signal": {
      "tokens": ["instant", "fast", "quick", "immediate", "now", "today", "rapid", "express"],
      "weight": 1.3,
      "description": "Speed signals emphasize instant gratification - key conversion driver",
      "enabled": true
    },
    "vertical_benefit_specificity": {
      "tokens": ["cash", "money", "gift cards", "paypal", "amazon", "visa", "rewards", "earnings"],
      "weight": 1.5,
      "description": "Concrete benefit tokens show specific value propositions",
      "enabled": true
    },
    "vertical_trust_reassurance": {
      "tokens": ["secure", "safe", "protected", "privacy", "no scam", "trusted", "reliable"],
      "weight": 1.2,
      "description": "Trust reassurance mitigates skepticism about earning apps",
      "enabled": true
    },
    "vertical_effort_ratio": {
      "tokens": ["easy", "simple", "effortless", "fun", "free", "no purchase", "just play"],
      "weight": 1.3,
      "description": "Low-effort claims reduce perceived friction to start earning",
      "enabled": true
    },
    "vertical_feature_clarity": {
      "tokens": ["surveys", "games", "cashback", "shopping", "videos", "offers", "tasks"],
      "weight": 1.1,
      "description": "Feature clarity tokens specify earning mechanisms",
      "enabled": true
    }
  }
}'::jsonb
WHERE vertical = 'rewards';

-- Seed Language Learning Vertical Template
UPDATE aso_ruleset_vertical
SET vertical_template_meta = '{
  "schema_version": "1.0.0",
  "overview": {
    "category_keywords": ["learn", "language", "speak", "fluency", "lessons", "practice"],
    "discovery_drivers": ["learn spanish", "speak english", "language lessons", "fluent fast", "conversational practice"],
    "retention_hooks": ["daily lessons", "bite-sized practice", "real conversations", "proven method", "personalized learning"],
    "description": "Language learning apps focus on learning outcomes, method effectiveness, and speed to fluency. Balance aspirational goals with proven pedagogy signals."
  },
  "benchmarks": {
    "generic_combo_count": {
      "excellent": 8,
      "good": 6,
      "moderate": 4
    },
    "intent_balance_targets": {
      "informational": 0.35,
      "commercial": 0.30,
      "transactional": 0.25,
      "navigational": 0.10
    },
    "custom": {
      "outcome_keyword_ratio": {
        "min": 0.20,
        "max": 0.40,
        "target": 0.30
      },
      "method_credibility_score": {
        "min": 0.15,
        "max": 0.35,
        "target": 0.25
      }
    }
  },
  "keyword_clusters": [
    {
      "cluster_name": "Target Languages",
      "keywords": ["spanish", "english", "french", "german", "italian", "chinese", "japanese", "korean"],
      "intent_type": "informational",
      "weight": 1.6,
      "examples": ["Learn Spanish Fast", "Speak English Fluently"]
    },
    {
      "cluster_name": "Learning Outcomes",
      "keywords": ["speak", "fluency", "fluent", "conversation", "understand", "master", "proficiency"],
      "intent_type": "commercial",
      "weight": 1.5,
      "examples": ["Achieve Fluency Faster", "Speak with Confidence"]
    },
    {
      "cluster_name": "Learning Methods",
      "keywords": ["lessons", "practice", "exercises", "courses", "training", "immersion", "grammar"],
      "intent_type": "informational",
      "weight": 1.3,
      "examples": ["Interactive Lessons", "Daily Practice Exercises"]
    },
    {
      "cluster_name": "Speed & Ease",
      "keywords": ["fast", "quick", "easy", "simple", "minutes", "daily", "bite-sized"],
      "intent_type": "commercial",
      "weight": 1.4,
      "examples": ["Learn Fast with 10-Minute Lessons", "Easy Language Learning"]
    }
  ],
  "conversion_drivers": [
    {
      "hook_category": "Outcome Specificity",
      "weight_multiplier": 1.5,
      "examples": [
        "Speak Spanish in 3 Weeks",
        "Achieve Conversational Fluency",
        "Master Real-Life Conversations"
      ],
      "keywords": ["speak", "fluency", "fluent", "conversation", "mastery"]
    },
    {
      "hook_category": "Method Credibility",
      "weight_multiplier": 1.4,
      "examples": [
        "Proven Method by Linguists",
        "Science-Based Learning",
        "Trusted by 100M+ Learners"
      ],
      "keywords": ["proven", "science", "expert", "trusted", "effective"]
    },
    {
      "hook_category": "Ease & Speed",
      "weight_multiplier": 1.3,
      "examples": [
        "Learn in Just 10 Minutes a Day",
        "Fun & Easy Lessons",
        "Fast-Track to Fluency"
      ],
      "keywords": ["easy", "fast", "quick", "minutes", "fun"]
    },
    {
      "hook_category": "Personalization",
      "weight_multiplier": 1.2,
      "examples": [
        "Personalized Learning Path",
        "Lessons Tailored to You",
        "Your Pace, Your Goals"
      ],
      "keywords": ["personalized", "custom", "tailored", "your", "adaptive"]
    }
  ],
  "kpi_modifiers": {
    "vertical_legitimacy_signal": {
      "tokens": ["proven", "certified", "accredited", "recognized", "expert", "professional", "trusted"],
      "weight": 1.3,
      "description": "Legitimacy signals build credibility for learning method effectiveness",
      "enabled": true
    },
    "vertical_speed_signal": {
      "tokens": ["fast", "quick", "rapid", "accelerated", "minutes", "weeks", "shortcut"],
      "weight": 1.4,
      "description": "Speed signals address time investment concerns",
      "enabled": true
    },
    "vertical_benefit_specificity": {
      "tokens": ["fluency", "fluent", "conversation", "speak", "understand", "mastery", "proficiency"],
      "weight": 1.6,
      "description": "Outcome-specific tokens show concrete learning results",
      "enabled": true
    },
    "vertical_trust_reassurance": {
      "tokens": ["proven", "effective", "results", "success", "guarantee", "trusted", "reliable"],
      "weight": 1.2,
      "description": "Trust signals reassure about method effectiveness",
      "enabled": true
    },
    "vertical_effort_ratio": {
      "tokens": ["easy", "simple", "fun", "enjoyable", "effortless", "natural", "intuitive"],
      "weight": 1.3,
      "description": "Low-effort framing reduces perceived learning difficulty",
      "enabled": true
    },
    "vertical_feature_clarity": {
      "tokens": ["lessons", "courses", "exercises", "practice", "grammar", "vocabulary", "pronunciation"],
      "weight": 1.2,
      "description": "Feature clarity specifies learning components and structure",
      "enabled": true
    }
  }
}'::jsonb
WHERE vertical = 'language_learning';

-- Verify the seeds
SELECT vertical, jsonb_pretty(vertical_template_meta) AS template_metadata
FROM aso_ruleset_vertical
WHERE vertical IN ('rewards', 'language_learning');
