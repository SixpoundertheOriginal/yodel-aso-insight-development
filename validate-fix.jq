(.data | map(select(.traffic_source == "App Store Search")) | map(.impressions) | add) as $app_store |
(.data | map(select(.traffic_source == "Apple Search Ads")) | map(.impressions) | add) as $apple_ads |
{
  validation: {
    success: .success,
    isDemo: .isDemo,
    totalRecords: (.data | length),
    uniqueTrafficSources: (.data | map(.traffic_source) | unique | length),
    trafficSourcesList: (.data | map(.traffic_source) | unique | sort)
  },
  trueSearchValidation: {
    appStoreSearchTotal: $app_store,
    appleSearchAdsTotal: $apple_ads,
    trueSearchResult: ($app_store - $apple_ads),
    resultStatus: (if ($app_store - $apple_ads) > 1000 then "✅ POSITIVE & MEANINGFUL" else "❌ TOO LOW" end),
    percentageOfAppStoreSearch: (if $app_store > 0 then (($app_store - $apple_ads) / $app_store * 100 | floor) else 0 end)
  }
}