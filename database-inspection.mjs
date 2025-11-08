/**
 * Database Inspection Script
 *
 * Purpose: Query production database to document current state before fixes
 *
 * Inspects:
 * 1. agency_clients table schema
 * 2. Current RLS policies on agency_clients
 * 3. Current data in agency_clients
 * 4. References to org_users_deprecated across all policies
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=your_key node database-inspection.mjs
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error('❌ ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable not set');
  console.log('\nUsage:');
  console.log('  SUPABASE_SERVICE_ROLE_KEY=your_key node database-inspection.mjs');
  console.log('\nOr set it in .env file and run:');
  console.log('  source .env && node database-inspection.mjs');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

console.log('━'.repeat(80));
console.log('🔍 DATABASE INSPECTION - agency_clients Table');
console.log('━'.repeat(80));
console.log('');

async function inspectDatabase() {
  try {
    // ========================================================================
    // 1. Check if agency_clients table exists
    // ========================================================================
    console.log('📋 STEP 1: Checking if agency_clients table exists...\n');

    const { data: tableData, error: tableError } = await supabase
      .from('agency_clients')
      .select('*')
      .limit(0);

    if (tableError) {
      console.error('❌ ERROR: agency_clients table does not exist or not accessible');
      console.error('   Error:', tableError.message);
      return;
    }

    console.log('✅ agency_clients table exists\n');

    // ========================================================================
    // 2. Get table schema
    // ========================================================================
    console.log('📋 STEP 2: Querying table schema...\n');

    let schemaData = null;
    let schemaError = null;

    try {
      const result = await supabase.rpc('exec_sql', {
        sql: `
          SELECT
            column_name,
            data_type,
            is_nullable,
            column_default
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'agency_clients'
          ORDER BY ordinal_position;
        `
      });
      schemaData = result.data;
      schemaError = result.error;
    } catch (e) {
      schemaError = { message: 'RPC not available or exec_sql function does not exist' };
    }

    if (schemaData && schemaData.length > 0) {
      console.log('   Table Schema:');
      schemaData.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        console.log(`   - ${col.column_name}: ${col.data_type} ${nullable}${defaultVal}`);
      });
      console.log('');
    } else {
      console.log('   ⚠️  Cannot query schema via information_schema\n');
    }

    // ========================================================================
    // 3. Get current data
    // ========================================================================
    console.log('📋 STEP 3: Querying current data in agency_clients...\n');

    const { data: clientData, error: clientError } = await supabase
      .from('agency_clients')
      .select('*');

    if (clientError) {
      console.error('❌ ERROR querying agency_clients data:', clientError.message);
    } else {
      console.log(`   ✅ Found ${clientData?.length || 0} agency-client relationships:\n`);

      if (clientData && clientData.length > 0) {
        // Get organization names
        const orgIds = new Set();
        clientData.forEach(rel => {
          orgIds.add(rel.agency_org_id);
          orgIds.add(rel.client_org_id);
        });

        const { data: orgs } = await supabase
          .from('organizations')
          .select('id, name, slug')
          .in('id', Array.from(orgIds));

        const getOrgName = (id) => {
          const org = orgs?.find(o => o.id === id);
          return org ? `${org.name} (${org.slug})` : id;
        };

        clientData.forEach((rel, i) => {
          console.log(`   Relationship ${i + 1}:`);
          console.log(`     Agency:    ${getOrgName(rel.agency_org_id)}`);
          console.log(`     Client:    ${getOrgName(rel.client_org_id)}`);
          console.log(`     Active:    ${rel.is_active}`);
          console.log(`     Created:   ${rel.created_at}`);
          console.log('');
        });
      }
    }

    // ========================================================================
    // 4. Get RLS policies on agency_clients
    // ========================================================================
    console.log('📋 STEP 4: Querying RLS policies on agency_clients...\n');

    let policyData = null;
    let policyError = null;

    try {
      const result = await supabase.rpc('exec_sql', {
        sql: `
          SELECT
            schemaname,
            tablename,
            policyname,
            permissive,
            roles,
            cmd,
            qual,
            with_check
          FROM pg_policies
          WHERE schemaname = 'public'
            AND tablename = 'agency_clients'
          ORDER BY policyname;
        `
      });
      policyData = result.data;
      policyError = result.error;
    } catch (e) {
      policyError = { message: 'RPC not available' };
    }

    if (policyError || !policyData) {
      console.log('   ⚠️  Cannot query pg_policies directly (RPC not available)');
      console.log('   This is expected - policies exist but cannot be queried via client\n');
    } else {
      if (policyData.length === 0) {
        console.log('   ⚠️  NO RLS POLICIES FOUND on agency_clients');
        console.log('   This is unusual - table should have RLS policies\n');
      } else {
        console.log(`   ✅ Found ${policyData.length} RLS policies:\n`);

        policyData.forEach((policy, i) => {
          console.log(`   Policy ${i + 1}: ${policy.policyname}`);
          console.log(`     Command:      ${policy.cmd}`);
          console.log(`     Permissive:   ${policy.permissive}`);
          console.log(`     Roles:        ${policy.roles}`);

          if (policy.qual) {
            console.log(`     USING Clause:`);
            console.log(`       ${policy.qual}`);

            // Check for org_users_deprecated reference
            if (policy.qual.includes('org_users_deprecated') || policy.qual.includes('org_users')) {
              console.log(`       🔥 FOUND: References org_users_deprecated or org_users`);
            }
          }

          if (policy.with_check) {
            console.log(`     WITH CHECK Clause:`);
            console.log(`       ${policy.with_check}`);

            if (policy.with_check.includes('org_users_deprecated') || policy.with_check.includes('org_users')) {
              console.log(`       🔥 FOUND: References org_users_deprecated or org_users`);
            }
          }

          console.log('');
        });
      }
    }

    // ========================================================================
    // 5. Search for org_users_deprecated references across ALL policies
    // ========================================================================
    console.log('📋 STEP 5: Searching for org_users_deprecated references across ALL tables...\n');

    let allPoliciesData = null;
    let allPoliciesError = null;

    try {
      const result = await supabase.rpc('exec_sql', {
        sql: `
          SELECT
            tablename,
            policyname,
            cmd,
            qual,
            with_check
          FROM pg_policies
          WHERE schemaname = 'public'
            AND (
              qual LIKE '%org_users_deprecated%'
              OR qual LIKE '%org_users%'
              OR with_check LIKE '%org_users_deprecated%'
              OR with_check LIKE '%org_users%'
            )
          ORDER BY tablename, policyname;
        `
      });
      allPoliciesData = result.data;
      allPoliciesError = result.error;
    } catch (e) {
      allPoliciesError = { message: 'RPC not available' };
    }

    if (allPoliciesError || !allPoliciesData) {
      console.log('   ⚠️  Cannot query all policies (RPC not available)\n');
    } else {
      if (allPoliciesData.length === 0) {
        console.log('   ✅ No policies found referencing org_users_deprecated or org_users\n');
      } else {
        console.log(`   🔥 FOUND ${allPoliciesData.length} policies referencing org_users:\n`);

        allPoliciesData.forEach(policy => {
          console.log(`   Table: ${policy.tablename}`);
          console.log(`     Policy: ${policy.policyname} (${policy.cmd})`);

          const hasDeprecated = (policy.qual?.includes('org_users_deprecated') ||
                                 policy.with_check?.includes('org_users_deprecated'));

          if (hasDeprecated) {
            console.log(`     ❌ References org_users_deprecated (BROKEN)`);
          } else {
            console.log(`     ⚠️  References org_users (may need review)`);
          }

          console.log('');
        });
      }
    }

    // ========================================================================
    // 6. Check RLS status on agency_clients
    // ========================================================================
    console.log('📋 STEP 6: Checking RLS status on agency_clients...\n');

    let rlsData = null;
    let rlsError = null;

    try {
      const result = await supabase.rpc('exec_sql', {
        sql: `
          SELECT
            relname as table_name,
            relrowsecurity as rls_enabled,
            relforcerowsecurity as rls_forced
          FROM pg_class
          WHERE relname = 'agency_clients'
            AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
        `
      });
      rlsData = result.data;
      rlsError = result.error;
    } catch (e) {
      rlsError = { message: 'RPC not available' };
    }

    if (rlsData && rlsData.length > 0) {
      const rls = rlsData[0];
      console.log(`   Table: ${rls.table_name}`);
      console.log(`     RLS Enabled: ${rls.rls_enabled ? '✅ YES' : '❌ NO'}`);
      console.log(`     RLS Forced:  ${rls.rls_forced ? 'YES' : 'NO'}`);
      console.log('');
    } else {
      console.log('   ⚠️  Cannot query RLS status\n');
    }

    // ========================================================================
    // SUMMARY
    // ========================================================================
    console.log('━'.repeat(80));
    console.log('📊 INSPECTION SUMMARY');
    console.log('━'.repeat(80));
    console.log('');
    console.log('Next Steps:');
    console.log('');
    console.log('1. Review the RLS policies above');
    console.log('2. Identify which policies reference org_users_deprecated');
    console.log('3. Create migration to fix those policies');
    console.log('4. Test migration locally');
    console.log('5. Deploy to production');
    console.log('');
    console.log('Expected Fix:');
    console.log('  - Drop policies referencing org_users_deprecated');
    console.log('  - Create new policies using user_roles table');
    console.log('  - Follow pattern from organization_features fix (20251205130000)');
    console.log('');
    console.log('━'.repeat(80));
    console.log('✅ INSPECTION COMPLETE');
    console.log('━'.repeat(80));

  } catch (error) {
    console.error('\n❌ UNEXPECTED ERROR:', error.message);
    console.error(error);
  }
}

// Run inspection
inspectDatabase();
