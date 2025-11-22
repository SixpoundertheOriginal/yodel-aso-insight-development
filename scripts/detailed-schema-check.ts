/**
 * Detailed Schema Comparison Script
 * Queries actual database schema and compares with expected schema
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYmNxb2NwamFoZXdxam1sZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4MDcwOTgsImV4cCI6MjA2MjM4MzA5OH0.K00WoAEZNf93P-6r3dCwOZaYah51bYuBPwHtDdW82Ek';

// Expected schema definitions
const EXPECTED_SCHEMAS = {
  monitored_apps: [
    'id', 'organization_id', 'app_store_id', 'app_id', 'app_name', 'bundle_id',
    'app_icon_url', 'developer_name', 'category', 'primary_country', 'monitor_type',
    'tags', 'notes', 'snapshot_rating', 'snapshot_review_count', 'snapshot_taken_at',
    'created_at', 'updated_at', 'created_by', 'last_checked_at',
    // AUDIT EXTENSION FIELDS:
    'audit_enabled', 'latest_audit_score', 'latest_audit_at', 'locale', 'metadata_last_refreshed_at',
    // Google Play fields:
    'play_store_package_id', 'play_store_url'
  ],
  app_metadata_cache: [
    'id', 'organization_id', 'app_id', 'platform', 'locale', 'fetched_at',
    'title', 'subtitle', 'description', 'developer_name', 'app_icon_url',
    'screenshots', 'app_json', 'screenshot_captions', 'feature_cards', 'preview_analysis',
    'version_hash', 'created_at', 'updated_at'
  ],
  audit_snapshots: [
    'id', 'organization_id', 'app_id', 'platform', 'locale', 'created_at',
    'title', 'subtitle', 'combinations', 'metrics', 'insights', 'audit_score',
    'metadata_version_hash', 'metadata_source', 'competitor_overlap', 'metadata_health', 'metadata_version'
  ]
};

async function checkSchemaDetailed() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  console.log('========================================');
  console.log('DATABASE SCHEMA VALIDATION REPORT');
  console.log('========================================\n');

  const tables = ['monitored_apps', 'app_metadata_cache', 'audit_snapshots'];
  const issues: any[] = [];

  for (const tableName of tables) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`TABLE: ${tableName.toUpperCase()}`);
    console.log('='.repeat(60));

    try {
      // Try to select from table with limit 0 to get column structure
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`\n❌ ERROR accessing table: ${error.message}`);
        console.log(`   Code: ${error.code}`);
        console.log(`   Details: ${JSON.stringify(error.details)}`);

        issues.push({
          table: tableName,
          type: 'TABLE_ACCESS_ERROR',
          error: error.message
        });
        continue;
      }

      console.log(`\n✓ Table accessible via Supabase client`);

      // Get actual columns by attempting a select *
      const { data: sampleData, error: sampleError } = await supabase
        .from(tableName)
        .select('*')
        .limit(1)
        .maybeSingle();

      let actualColumns: string[] = [];

      if (sampleData) {
        actualColumns = Object.keys(sampleData);
        console.log(`\n✓ Sample row found, columns detected: ${actualColumns.length}`);
      } else {
        // Table might be empty - try to infer from error or use expected
        console.log(`\n⚠ Table is empty, cannot detect actual columns`);
        console.log(`  Will compare against expected schema only`);
      }

      // Compare with expected schema
      const expectedColumns = EXPECTED_SCHEMAS[tableName as keyof typeof EXPECTED_SCHEMAS];
      console.log(`\n📋 Expected columns: ${expectedColumns.length}`);
      console.log(`📋 Actual columns: ${actualColumns.length || 'unknown (empty table)'}`);

      if (actualColumns.length > 0) {
        // Find missing columns
        const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));
        const extraColumns = actualColumns.filter(col => !expectedColumns.includes(col));

        if (missingColumns.length > 0) {
          console.log(`\n❌ MISSING COLUMNS (${missingColumns.length}):`);
          missingColumns.forEach(col => console.log(`   - ${col}`));

          issues.push({
            table: tableName,
            type: 'MISSING_COLUMNS',
            columns: missingColumns
          });
        } else {
          console.log(`\n✓ All expected columns present`);
        }

        if (extraColumns.length > 0) {
          console.log(`\n⚠ EXTRA COLUMNS (not in expected schema):`);
          extraColumns.forEach(col => console.log(`   - ${col}`));
        }

        // Show all actual columns
        console.log(`\n📄 ACTUAL COLUMNS:`);
        actualColumns.forEach((col, idx) => {
          const isExpected = expectedColumns.includes(col);
          const marker = isExpected ? '✓' : '⚠';
          console.log(`   ${marker} ${idx + 1}. ${col}`);
        });
      }

      // Try specific queries to detect problematic columns
      if (tableName === 'monitored_apps') {
        console.log(`\n🔍 Testing specific audit columns...`);

        const testColumns = ['audit_enabled', 'latest_audit_score', 'latest_audit_at', 'locale', 'metadata_last_refreshed_at'];

        for (const col of testColumns) {
          const { data: testData, error: testError } = await supabase
            .from(tableName)
            .select(col)
            .limit(1);

          if (testError) {
            console.log(`   ❌ ${col}: ${testError.message}`);
            issues.push({
              table: tableName,
              type: 'COLUMN_ACCESS_ERROR',
              column: col,
              error: testError.message
            });
          } else {
            console.log(`   ✓ ${col}: accessible`);
          }
        }
      }

    } catch (err: any) {
      console.log(`\n❌ UNEXPECTED ERROR: ${err.message}`);
      issues.push({
        table: tableName,
        type: 'UNEXPECTED_ERROR',
        error: err.message
      });
    }
  }

  // Summary
  console.log(`\n\n${'='.repeat(60)}`);
  console.log('SUMMARY');
  console.log('='.repeat(60));

  if (issues.length === 0) {
    console.log('\n✅ All tables accessible with expected schema');
  } else {
    console.log(`\n❌ Found ${issues.length} issue(s):\n`);
    issues.forEach((issue, idx) => {
      console.log(`${idx + 1}. Table: ${issue.table}`);
      console.log(`   Type: ${issue.type}`);
      if (issue.columns) {
        console.log(`   Columns: ${issue.columns.join(', ')}`);
      }
      if (issue.column) {
        console.log(`   Column: ${issue.column}`);
      }
      if (issue.error) {
        console.log(`   Error: ${issue.error}`);
      }
      console.log('');
    });
  }

  console.log('='.repeat(60));
  console.log('END OF REPORT');
  console.log('='.repeat(60));
}

checkSchemaDetailed();
