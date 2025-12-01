/**
 * Analyze Keyword Ranking Edge Function
 *
 * Analyzes top-ranking apps for a specific keyword to understand
 * what helps them rank high in App Store search.
 *
 * Flow:
 * 1. Search iTunes for top N apps with keyword
 * 2. Fetch full metadata (HTML) for each app
 * 3. Run metadata audit on each
 * 4. Analyze patterns across all apps
 * 5. Generate actionable recommendations
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';
import { MetadataAuditEngine } from '../_shared/metadata-audit-engine.ts';

// iTunes Search API
const ITUNES_SEARCH_URL = 'https://itunes.apple.com/search';

interface iTunesSearchResult {
  resultCount: number;
  results: Array<{
    trackId: number;
    trackName: string;
    artistName: string;
    artworkUrl512: string;
  }>;
}

// Main handler
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request
    const { keyword, limit = 10, country = 'us', organizationId } = await req.json();

    console.log('[analyze-keyword-ranking] Request:', { keyword, limit, country, organizationId });

    if (!keyword || !organizationId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Missing required fields: keyword, organizationId',
          },
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Search iTunes for top apps
    console.log('[analyze-keyword-ranking] Searching iTunes for keyword:', keyword);

    const searchUrl = `${ITUNES_SEARCH_URL}?term=${encodeURIComponent(keyword)}&country=${country}&entity=software&limit=${limit}`;
    const searchResponse = await fetch(searchUrl);
    const searchData: iTunesSearchResult = await searchResponse.json();

    console.log('[analyze-keyword-ranking] Found apps:', searchData.resultCount);

    if (searchData.resultCount === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'NO_RESULTS',
            message: `No apps found for keyword "${keyword}"`,
          },
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: For each app, fetch metadata and run audit
    const topRankingApps = [];
    const failedApps = [];

    for (let i = 0; i < Math.min(limit, searchData.results.length); i++) {
      const app = searchData.results[i];
      const appStoreId = String(app.trackId);

      console.log(`[analyze-keyword-ranking] Processing app ${i + 1}/${limit}:`, app.trackName);

      try {
        // Fetch HTML metadata (for subtitle)
        const htmlFetchUrl = `${supabaseUrl}/functions/v1/appstore-html-fetch`;
        const htmlResponse = await fetch(htmlFetchUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            appId: appStoreId,
            country: country,
          }),
        });

        const htmlData = await htmlResponse.json();

        if (!htmlData.ok) {
          console.warn(`[analyze-keyword-ranking] HTML fetch failed for ${appStoreId}:`, htmlData.error);
          console.warn(`[analyze-keyword-ranking] Errors:`, htmlData.errors);
          failedApps.push({ appId: appStoreId, name: app.trackName, reason: htmlData.error });
          continue;
        }

        const title = htmlData.title || app.trackName;
        const subtitle = htmlData.subtitle || '';

        // Run metadata audit
        const audit = await MetadataAuditEngine.evaluate({
          title,
          subtitle,
          description: '', // Not needed for ranking analysis
          organizationId,
          appId: appStoreId,
          platform: 'ios' as const,
        });

        // Analyze keyword presence
        const keywordPresence = analyzeKeywordPresence(keyword, title, subtitle, audit);

        topRankingApps.push({
          rank: i + 1,
          appStoreId,
          name: app.trackName,
          iconUrl: app.artworkUrl512,
          developer: app.artistName,
          metadata: { title, subtitle },
          audit,
          keywordPresence,
        });
      } catch (error) {
        console.error(`[analyze-keyword-ranking] Error processing app ${appStoreId}:`, error);
        failedApps.push({ appId: appStoreId, name: app.trackName, reason: error instanceof Error ? error.message : 'Unknown error' });
        continue;
      }
    }

    console.log('[analyze-keyword-ranking] Successfully analyzed apps:', topRankingApps.length);

    if (failedApps.length > 0) {
      console.warn('[analyze-keyword-ranking] Failed apps:', failedApps);
    }

    // If no apps were successfully analyzed, return error
    if (topRankingApps.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'NO_APPS_ANALYZED',
            message: `Failed to analyze any apps for keyword "${keyword}". All ${searchData.resultCount} apps failed during processing.`,
            details: { failedApps },
          },
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Analyze patterns across all apps
    const patterns = analyzePatterns(keyword, topRankingApps);

    // Step 4: Generate recommendations
    const recommendations = generateRecommendations(keyword, patterns, topRankingApps);

    // Return results
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          keyword,
          analyzedAt: new Date().toISOString(),
          topRankingApps,
          patterns,
          recommendations,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[analyze-keyword-ranking] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'An unexpected error occurred',
          details: error,
        },
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper: Analyze keyword presence in metadata
function analyzeKeywordPresence(keyword: string, title: string, subtitle: string, audit: any) {
  const keywordLower = keyword.toLowerCase();

  // Check title
  const titleWords = title.toLowerCase().split(/\s+/);
  const titleIndex = titleWords.findIndex((word) => word.includes(keywordLower));
  const inTitle = titleIndex !== -1;
  const titlePosition = inTitle ? titleIndex + 1 : undefined;

  // Check subtitle
  const subtitleWords = subtitle.toLowerCase().split(/\s+/);
  const subtitleIndex = subtitleWords.findIndex((word) => word.includes(keywordLower));
  const inSubtitle = subtitleIndex !== -1;
  const subtitlePosition = inSubtitle ? subtitleIndex + 1 : undefined;

  // Count combos using this keyword
  const allCombos = audit.comboCoverage?.allCombinedCombos || [];
  const comboCount = allCombos.filter((combo: string) =>
    combo.toLowerCase().includes(keywordLower)
  ).length;

  return {
    inTitle,
    inSubtitle,
    titlePosition,
    subtitlePosition,
    comboCount,
  };
}

// Helper: Analyze patterns across all apps
function analyzePatterns(keyword: string, apps: any[]) {
  const keywordLower = keyword.toLowerCase();

  // Placement patterns
  let inTitleCount = 0;
  let inSubtitleCount = 0;
  let titleOnlyCount = 0;
  let subtitleOnlyCount = 0;
  let bothCount = 0;
  let titlePositionSum = 0;
  let titlePositionCount = 0;
  let subtitlePositionSum = 0;
  let subtitlePositionCount = 0;

  apps.forEach((app) => {
    const { inTitle, inSubtitle, titlePosition, subtitlePosition } = app.keywordPresence;

    if (inTitle) {
      inTitleCount++;
      if (titlePosition) {
        titlePositionSum += titlePosition;
        titlePositionCount++;
      }
    }

    if (inSubtitle) {
      inSubtitleCount++;
      if (subtitlePosition) {
        subtitlePositionSum += subtitlePosition;
        subtitlePositionCount++;
      }
    }

    if (inTitle && inSubtitle) bothCount++;
    else if (inTitle) titleOnlyCount++;
    else if (inSubtitle) subtitleOnlyCount++;
  });

  const placement = {
    inTitleCount,
    inSubtitleCount,
    avgTitlePosition: titlePositionCount > 0 ? Math.round(titlePositionSum / titlePositionCount) : 0,
    avgSubtitlePosition: subtitlePositionCount > 0 ? Math.round(subtitlePositionSum / subtitlePositionCount) : 0,
    titleOnlyCount,
    subtitleOnlyCount,
    bothCount,
  };

  // Co-occurring keywords
  const keywordFrequency = new Map<string, { count: number; totalCombos: number }>();

  apps.forEach((app) => {
    const allKeywords = [
      ...(app.audit.keywordCoverage?.titleKeywords || []),
      ...(app.audit.keywordCoverage?.subtitleNewKeywords || []),
    ];

    const uniqueKeywords = new Set(allKeywords.map((k: string) => k.toLowerCase()));

    uniqueKeywords.forEach((kw) => {
      if (kw === keywordLower) return; // Skip the search keyword itself

      if (!keywordFrequency.has(kw)) {
        keywordFrequency.set(kw, { count: 0, totalCombos: 0 });
      }

      const entry = keywordFrequency.get(kw)!;
      entry.count++;

      // Count combos with this keyword
      const combos = app.audit.comboCoverage?.allCombinedCombos || [];
      const comboCount = combos.filter((c: string) => c.toLowerCase().includes(kw)).length;
      entry.totalCombos += comboCount;
    });
  });

  const coOccurringKeywords = Array.from(keywordFrequency.entries())
    .map(([keyword, data]) => ({
      keyword,
      frequency: data.count,
      avgComboCount: Math.round((data.totalCombos / data.count) * 10) / 10,
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10);

  // Top combos
  const comboFrequency = new Map<string, number>();

  apps.forEach((app) => {
    const combos = app.audit.comboCoverage?.allCombinedCombos || [];
    combos.forEach((combo: string) => {
      const comboLower = combo.toLowerCase();
      if (comboLower.includes(keywordLower)) {
        comboFrequency.set(comboLower, (comboFrequency.get(comboLower) || 0) + 1);
      }
    });
  });

  const topCombos = Array.from(comboFrequency.entries())
    .map(([combo, frequency]) => ({ combo, frequency }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10);

  // Strategy stats
  let totalKeywords = 0;
  let totalCombos = 0;
  let totalDensity = 0;
  let totalCastingScore = 0;
  let totalTitleChars = 0;
  let totalSubtitleChars = 0;

  apps.forEach((app) => {
    totalKeywords += app.audit.keywordCoverage?.totalUniqueKeywords || 0;
    totalCombos += app.audit.comboCoverage?.totalCombos || 0;

    const titleChars = app.audit.elements?.title?.metadata?.characterUsage || 0;
    const subtitleChars = app.audit.elements?.subtitle?.metadata?.characterUsage || 0;
    const keywords = app.audit.keywordCoverage?.totalUniqueKeywords || 0;

    totalTitleChars += titleChars;
    totalSubtitleChars += subtitleChars;

    if (keywords > 0) {
      totalDensity += (titleChars + subtitleChars) / keywords;
    }

    // Casting score: sqrt(keywords) × log(combos)
    const combos = app.audit.comboCoverage?.totalCombos || 0;
    if (keywords > 0 && combos > 0) {
      totalCastingScore += Math.sqrt(keywords) * Math.log10(combos);
    }
  });

  const count = apps.length;
  const strategyStats = {
    avgKeywordCount: Math.round(totalKeywords / count),
    avgComboCount: Math.round(totalCombos / count),
    avgDensity: Math.round((totalDensity / count) * 10) / 10,
    avgCastingScore: Math.round((totalCastingScore / count) * 10) / 10,
    avgTitleChars: Math.round(totalTitleChars / count),
    avgSubtitleChars: Math.round(totalSubtitleChars / count),
  };

  return {
    placement,
    coOccurringKeywords,
    topCombos,
    strategyStats,
  };
}

// Helper: Generate recommendations
function generateRecommendations(keyword: string, patterns: any, apps: any[]): string[] {
  const recommendations: string[] = [];
  const { placement, coOccurringKeywords, topCombos, strategyStats } = patterns;
  const totalApps = apps.length;

  // Placement recommendations
  const titlePct = Math.round((placement.inTitleCount / totalApps) * 100);
  const subtitlePct = Math.round((placement.inSubtitleCount / totalApps) * 100);

  if (titlePct >= 70) {
    recommendations.push(
      `✅ Place "${keyword}" in your TITLE (${placement.inTitleCount}/${totalApps} top apps do this)`
    );

    if (placement.avgTitlePosition > 0) {
      recommendations.push(
        `✅ Position "${keyword}" early in title (avg position: ${placement.avgTitlePosition}${placement.avgTitlePosition === 1 ? 'st' : placement.avgTitlePosition === 2 ? 'nd' : placement.avgTitlePosition === 3 ? 'rd' : 'th'} word)`
      );
    }
  }

  if (subtitlePct >= 70) {
    recommendations.push(
      `✅ Include "${keyword}" in your SUBTITLE (${placement.inSubtitleCount}/${totalApps} top apps do this)`
    );
  }

  // Co-occurring keywords
  if (coOccurringKeywords.length > 0) {
    const topCoKeywords = coOccurringKeywords
      .filter((k) => k.frequency >= totalApps * 0.6)
      .slice(0, 3)
      .map((k) => `"${k.keyword}"`)
      .join(', ');

    if (topCoKeywords) {
      recommendations.push(`✅ Pair "${keyword}" with ${topCoKeywords} (highly common)`);
    }
  }

  // Combo count
  const avgComboCount = Math.round(
    apps.reduce((sum, app) => sum + app.keywordPresence.comboCount, 0) / totalApps
  );

  if (avgComboCount > 0) {
    recommendations.push(
      `✅ Create ${avgComboCount}+ combinations using "${keyword}" (top apps average: ${avgComboCount} combos)`
    );
  }

  // Strategy stats
  recommendations.push(
    `⚠️ Top apps average ${strategyStats.avgKeywordCount} keywords and ${strategyStats.avgComboCount} combos`
  );

  recommendations.push(
    `⚠️ Average casting score: ${strategyStats.avgCastingScore} (aim to match or exceed)`
  );

  return recommendations;
}
