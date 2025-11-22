#!/usr/bin/env npx tsx
/**
 * Test script for metadata-audit-v2 edge function
 */

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYmNxb2NwamFoZXdxam1sZ3ZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjgwNzA5OCwiZXhwIjoyMDYyMzgzMDk4fQ.vaBiZHIQ7Y5gsGPg2324rEu9InKtk9JDLz7L2mZp-Fo';

async function testMetadataAuditV2() {
  console.log('========================================');
  console.log('Testing metadata-audit-v2 Edge Function');
  console.log('========================================\n');

  // Test with Pimsleur app
  const appId = '1405735469';
  const platform = 'ios';
  const locale = 'us';

  console.log(`Testing with app: ${appId} (${platform}, ${locale})\n`);

  try {
    const url = `${SUPABASE_URL}/functions/v1/metadata-audit-v2`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        app_id: appId,
        platform,
        locale
      })
    });

    console.log(`Response Status: ${response.status} ${response.statusText}\n`);

    const data = await response.json();

    if (data.success) {
      console.log('✅ Audit completed successfully!\n');
      console.log('Overall Score:', data.data.overallScore);
      console.log('\nElement Scores:');
      console.log('  App Name:', data.data.elements.app_name.score);
      console.log('  Title:', data.data.elements.title.score);
      console.log('  Subtitle:', data.data.elements.subtitle.score);
      console.log('  Description:', data.data.elements.description.score);

      console.log('\nTop Recommendations:');
      data.data.topRecommendations.forEach((rec: string, i: number) => {
        console.log(`  ${i + 1}. ${rec}`);
      });

      console.log('\nKeyword Coverage:');
      console.log('  Total unique keywords:', data.data.keywordCoverage.totalUniqueKeywords);
      console.log('  Title keywords:', data.data.keywordCoverage.titleKeywords.length);
      console.log('  New subtitle keywords:', data.data.keywordCoverage.subtitleNewKeywords.length);

      console.log('\nCombo Coverage:');
      console.log('  Total combos:', data.data.comboCoverage.totalCombos);
      console.log('  Title combos:', data.data.comboCoverage.titleCombos.length);
      console.log('  New subtitle combos:', data.data.comboCoverage.subtitleNewCombos.length);

      console.log('\nMetadata:');
      console.log('  Source:', data._meta.source);
      console.log('  Execution time:', data._meta.executionTimeMs, 'ms');

      console.log('\n========================================');
      console.log('Full response saved to /tmp/metadata-audit-v2-response.json');
      console.log('========================================');

      // Save full response to file
      await Deno.writeTextFile(
        '/tmp/metadata-audit-v2-response.json',
        JSON.stringify(data, null, 2)
      );
    } else {
      console.log('❌ Audit failed');
      console.log('Error:', data.error);
    }
  } catch (error) {
    console.error('❌ Request failed:', error);
  }
}

testMetadataAuditV2().catch(console.error);
