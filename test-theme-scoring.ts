/**
 * Quick test script to verify theme scoring service works
 *
 * Usage:
 * 1. Get a monitored_app_id from your database
 * 2. Run: npx tsx test-theme-scoring.ts <monitored_app_id>
 */

import { themeImpactScoringService } from './src/services/theme-impact-scoring.service';

async function main() {
  const appId = process.argv[2];

  if (!appId) {
    console.error('❌ Usage: npx tsx test-theme-scoring.ts <monitored_app_id>');
    console.log('\nTo get a monitored app ID, run this SQL query:');
    console.log('SELECT id, app_name FROM monitored_apps LIMIT 5;');
    process.exit(1);
  }

  console.log('🎯 Testing Theme Impact Scoring Service...\n');
  console.log(`App ID: ${appId}`);
  console.log(`Analysis Period: Last 30 days\n`);

  try {
    console.log('📊 Running analysis...');
    const result = await themeImpactScoringService.analyzeThemes({
      monitoredAppId: appId,
      periodDays: 30
    });

    console.log('\n✅ Analysis Complete!\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📈 SUMMARY:');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Total Themes Found:      ${result.summary.totalThemes}`);
    console.log(`Critical Themes:         ${result.summary.criticalThemes}`);
    console.log(`High Impact Themes:      ${result.summary.highImpactThemes}`);
    console.log(`Rising Trends:           ${result.summary.risingThemes}`);
    console.log(`Average Impact Score:    ${result.summary.averageImpactScore}/100`);

    if (result.topPriorities.length > 0) {
      console.log('\n═══════════════════════════════════════════════════════');
      console.log('🔴 TOP PRIORITIES:');
      console.log('═══════════════════════════════════════════════════════');
      result.topPriorities.forEach((theme, index) => {
        console.log(`\n${index + 1}. ${theme.theme.toUpperCase()}`);
        console.log(`   Impact Score: ${theme.impactScore}/100 (${theme.impactLevel})`);
        console.log(`   Urgency: ${theme.urgency}`);
        console.log(`   Mentions: ${theme.mentionCount} reviews`);
        console.log(`   Sentiment: ${theme.avgSentiment.toFixed(2)} (${theme.sentimentIntensity})`);
        console.log(`   Trend: ${theme.trendDirection}`);
        console.log(`   📝 Action: ${theme.recommendedAction}`);
        if (theme.potentialRatingImpact) {
          console.log(`   ⭐ Potential Impact: +${theme.potentialRatingImpact}★`);
        }
      });
    }

    if (result.trends.length > 0) {
      console.log('\n═══════════════════════════════════════════════════════');
      console.log('📊 TRENDING THEMES:');
      console.log('═══════════════════════════════════════════════════════');
      result.trends.slice(0, 5).forEach(trend => {
        const arrow = trend.direction === 'up' ? '↗️' : trend.direction === 'down' ? '↘️' : '→';
        const sign = trend.scoreChange > 0 ? '+' : '';
        console.log(`${arrow} ${trend.theme}: ${sign}${trend.scoreChange} points`);
      });
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('💾 Data saved to database!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('\nQuery your results:');
    console.log(`SELECT * FROM theme_impact_scores WHERE monitored_app_id = '${appId}';`);
    console.log(`SELECT * FROM vw_critical_themes WHERE monitored_app_id = '${appId}';`);

  } catch (error) {
    console.error('\n❌ Error running analysis:', error);
    console.error('\nTroubleshooting:');
    console.error('1. Check the app ID exists: SELECT * FROM monitored_apps WHERE id = \'' + appId + '\';');
    console.error('2. Check for reviews: SELECT COUNT(*) FROM monitored_app_reviews WHERE monitored_app_id = \'' + appId + '\';');
    console.error('3. Check database connection: echo $VITE_SUPABASE_URL');
    process.exit(1);
  }
}

main();
