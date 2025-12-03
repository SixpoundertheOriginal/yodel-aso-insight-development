-- Multi-Locale Metadata Storage
-- Stores 10-locale metadata for US market indexation analysis
-- Migration created: 2025-12-03

-- Add JSONB column to monitored_apps table
ALTER TABLE monitored_apps
ADD COLUMN IF NOT EXISTS multi_locale_metadata JSONB;

-- Add column comment
COMMENT ON COLUMN monitored_apps.multi_locale_metadata IS
'Multi-locale metadata for US App Store (10 locales: EN_US, ES_MX, RU, ZH_HANS, AR, FR_FR, PT_BR, ZH_HANT, VI, KO). Stores complete MultiLocaleIndexation object including locales, coverage, fusion, and recommendations.';

-- Create GIN index for efficient JSONB querying
CREATE INDEX IF NOT EXISTS idx_monitored_apps_multi_locale
ON monitored_apps USING GIN (multi_locale_metadata);

-- Create index for querying by app_id where multi_locale_metadata exists
CREATE INDEX IF NOT EXISTS idx_monitored_apps_multi_locale_app_id
ON monitored_apps (app_id)
WHERE multi_locale_metadata IS NOT NULL;

-- Create function to update updated_at timestamp when multi_locale_metadata changes
CREATE OR REPLACE FUNCTION update_multi_locale_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.multi_locale_metadata IS DISTINCT FROM NEW.multi_locale_metadata THEN
    NEW.updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update timestamp
DROP TRIGGER IF EXISTS trigger_multi_locale_updated_at ON monitored_apps;
CREATE TRIGGER trigger_multi_locale_updated_at
  BEFORE UPDATE ON monitored_apps
  FOR EACH ROW
  EXECUTE FUNCTION update_multi_locale_timestamp();

-- Example queries for reference:

-- Fetch multi-locale data for an app:
-- SELECT app_id, multi_locale_metadata FROM monitored_apps WHERE app_id = 'YOUR_APP_ID';

-- Find all apps with multi-locale metadata:
-- SELECT app_id, name, multi_locale_metadata->>'market' as market
-- FROM monitored_apps
-- WHERE multi_locale_metadata IS NOT NULL;

-- Query specific locale data:
-- SELECT app_id,
--        jsonb_array_elements(multi_locale_metadata->'locales')->>'locale' as locale,
--        jsonb_array_elements(multi_locale_metadata->'locales')->>'title' as title
-- FROM monitored_apps
-- WHERE multi_locale_metadata IS NOT NULL;

-- Example structure (stored as JSONB):
/*
{
  "appId": "1234567890",
  "market": "us",
  "locales": [
    {
      "locale": "EN_US",
      "title": "Self-Care App",
      "subtitle": "Daily Wellness",
      "keywords": "meditation,mindfulness,sleep",
      "fetchStatus": "fetched",
      "isAvailable": true,
      "tokens": {
        "title": ["self", "care", "app"],
        "subtitle": ["daily", "wellness"],
        "keywords": ["meditation", "mindfulness", "sleep"],
        "all": ["self", "care", "app", "daily", "wellness", "meditation", "mindfulness", "sleep"]
      },
      "combinations": [
        {
          "id": "EN_US-self-care",
          "text": "self care",
          "keywords": ["self", "care"],
          "length": 2,
          "tier": 1,
          "strengthScore": 100,
          "isConsecutive": true,
          "sourceLocale": "EN_US",
          "sourceFields": ["title"],
          "canStrengthen": false
        }
      ],
      "stats": {
        "uniqueTokens": 8,
        "totalCombos": 28,
        "tier1Combos": 10,
        "tier2Combos": 8,
        "tier3PlusCombos": 10,
        "duplicatedTokens": [],
        "wastedChars": 0
      }
    }
    // ... 9 more locales
  ],
  "totalUniqueKeywords": 45,
  "totalCombinations": 156,
  "coverage": {
    "locales": [ ... ],
    "duplicatedKeywords": [ ... ],
    "emptyLocales": [ ... ],
    "underutilizedLocales": [ ... ]
  },
  "fusedRankings": [
    {
      "keyword": "self",
      "bestScore": 100,
      "bestTier": 1,
      "bestLocale": "EN_US",
      "appearsIn": ["EN_US", "ES_MX"],
      "fusionStrategy": "primary_strongest",
      "fusionDetails": "Primary locale (EN_US) provides strongest rank (score: 100)"
    }
  ],
  "recommendations": [ ... ],
  "lastUpdated": "2025-12-03T00:00:00.000Z"
}
*/
