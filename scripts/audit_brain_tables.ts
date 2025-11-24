/**
 * Audit Script: ASO Brain Tables
 *
 * Audits all tables that power the Intent Engine and ASO Audit system.
 * Identifies which tables have data, which are empty, and what's missing.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYmNxb2NwamFoZXdxam1sZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4MDcwOTgsImV4cCI6MjA2MjM4MzA5OH0.K00WoAEZNf93P-6r3dCwOZaYah51bYuBPwHtDdW82Ek';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface TableAudit {
  name: string;
  rowCount: number;
  hasData: boolean;
  sampleData?: any[];
  error?: string;
}

async function auditTable(tableName: string): Promise<TableAudit> {
  try {
    // Get row count
    const { count, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (countError) {
      return {
        name: tableName,
        rowCount: 0,
        hasData: false,
        error: countError.message,
      };
    }

    const rowCount = count || 0;

    // Get sample data if table has rows
    let sampleData = undefined;
    if (rowCount > 0) {
      const { data, error: dataError } = await supabase
        .from(tableName)
        .select('*')
        .limit(3);

      if (!dataError) {
        sampleData = data;
      }
    }

    return {
      name: tableName,
      rowCount,
      hasData: rowCount > 0,
      sampleData,
    };
  } catch (error: any) {
    return {
      name: tableName,
      rowCount: 0,
      hasData: false,
      error: error.message,
    };
  }
}

async function auditBrainTables() {
  console.log('🧠 ASO BRAIN TABLES AUDIT\n');
  console.log('='.repeat(80));

  const tables = {
    '📘 Intent & Pattern Tables': [
      'search_intent_registry',
      'aso_intent_patterns',
      'aso_intent_pattern_overrides',
      'aso_intent_keyword_examples',
    ],
    '📐 Rule & Formula Tables': [
      'aso_rule_evaluators',
      'aso_rule_evaluator_overrides',
      'aso_rule_admin_metadata',
      'aso_formula_overrides',
    ],
    '🎯 KPI Tables': [
      'app_metadata_kpi_snapshots',
      'aso_kpi_weight_overrides',
    ],
    '📊 Audit & Snapshot Tables': [
      'aso_audit_snapshots',
      'aso_audit_diffs',
    ],
    '🎚️ Ruleset Tables': [
      'aso_ruleset_versions',
      'aso_ruleset_client',
      'aso_ruleset_market',
      'aso_ruleset_vertical',
      'aso_ruleset_audit_log',
    ],
  };

  const results: Record<string, TableAudit[]> = {};

  for (const [category, tableList] of Object.entries(tables)) {
    console.log(`\n${category}`);
    console.log('─'.repeat(80));

    results[category] = [];

    for (const tableName of tableList) {
      const audit = await auditTable(tableName);
      results[category].push(audit);

      const status = audit.hasData ? '✅' : '⚠️';
      const rowInfo = audit.hasData ? `${audit.rowCount} rows` : 'EMPTY';
      const errorInfo = audit.error ? ` (Error: ${audit.error})` : '';

      console.log(`  ${status} ${tableName.padEnd(40)} ${rowInfo}${errorInfo}`);

      // Show sample data for populated tables
      if (audit.sampleData && audit.sampleData.length > 0) {
        const sample = audit.sampleData[0];
        const keys = Object.keys(sample).slice(0, 5); // Show first 5 columns
        console.log(`     Sample columns: ${keys.join(', ')}`);
      }
    }
  }

  // Summary
  console.log('\n\n📊 SUMMARY');
  console.log('='.repeat(80));

  let totalTables = 0;
  let populatedTables = 0;
  let emptyTables = 0;

  for (const [category, audits] of Object.entries(results)) {
    const populated = audits.filter(a => a.hasData).length;
    const empty = audits.filter(a => !a.hasData).length;
    totalTables += audits.length;
    populatedTables += populated;
    emptyTables += empty;

    console.log(`\n${category}`);
    console.log(`  Populated: ${populated}/${audits.length}`);
    console.log(`  Empty: ${empty}/${audits.length}`);
  }

  console.log(`\n${'─'.repeat(80)}`);
  console.log(`Total Tables: ${totalTables}`);
  console.log(`Populated: ${populatedTables} (${Math.round((populatedTables / totalTables) * 100)}%)`);
  console.log(`Empty: ${emptyTables} (${Math.round((emptyTables / totalTables) * 100)}%)`);

  // Recommendations
  console.log('\n\n💡 RECOMMENDATIONS');
  console.log('='.repeat(80));

  for (const [category, audits] of Object.entries(results)) {
    const emptyInCategory = audits.filter(a => !a.hasData);
    if (emptyInCategory.length > 0) {
      console.log(`\n${category}`);
      emptyInCategory.forEach(audit => {
        console.log(`  ⚠️  ${audit.name} - NEEDS DATA`);
      });
    }
  }

  console.log('\n');
}

// Run audit
auditBrainTables().catch(console.error);
