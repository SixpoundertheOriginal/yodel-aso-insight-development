#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STEPHEN_ID = 'd07d4277-9cf7-41c3-ae8f-ffab86e52f47';
const YODEL_ORG_ID = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function checkStephenAsoHubAccess() {
  console.log('\n=== Checking Stephen\'s ASO AI Hub Access ===\n');

  // 1. Check Stephen's role
  const { data: role } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', STEPHEN_ID)
    .single();

  console.log(`✓ Stephen's role: ${role?.role}\n`);

  // 2. Check if Yodel org is in demo mode
  const { data: org } = await supabase
    .from('organizations')
    .select('slug, settings')
    .eq('id', YODEL_ORG_ID)
    .single();

  const isDemo = Boolean(org?.settings?.demo_mode) || (org?.slug || '').toLowerCase() === 'next';
  console.log(`Org demo mode: ${isDemo}`);
  console.log(`  - settings.demo_mode: ${org?.settings?.demo_mode}`);
  console.log(`  - slug: ${org?.slug}\n`);

  // 3. Check org features
  const { data: orgFeatures } = await supabase
    .from('org_feature_entitlements')
    .select('feature_key, is_enabled')
    .eq('organization_id', YODEL_ORG_ID)
    .in('feature_key', ['aso_ai_hub', 'aso_audit_demo', 'app_core_access']);

  console.log('Org features:');
  orgFeatures?.forEach(f => {
    const marker = f.is_enabled ? '✅' : '❌';
    console.log(`  ${marker} ${f.feature_key}: ${f.is_enabled}`);
  });
  console.log('');

  // 4. Check role permissions
  const { data: rolePerms } = await supabase
    .from('role_feature_permissions')
    .select('feature_key, is_allowed')
    .eq('role', role?.role)
    .in('feature_key', ['aso_ai_hub', 'aso_audit_demo', 'app_core_access']);

  console.log(`Role permissions (${role?.role}):`);
  rolePerms?.forEach(p => {
    const marker = p.is_allowed ? '✅' : '❌';
    console.log(`  ${marker} ${p.feature_key}: ${p.is_allowed}`);
  });
  console.log('');

  // 5. Check what features Stephen should have (intersection)
  console.log('Access to /aso-ai-hub/audit requires:');

  const hasAsoAiHub = orgFeatures?.find(f => f.feature_key === 'aso_ai_hub' && f.is_enabled) &&
                      rolePerms?.find(p => p.feature_key === 'aso_ai_hub' && p.is_allowed);
  console.log(`  1. app_core_access: ${orgFeatures?.find(f => f.feature_key === 'app_core_access' && f.is_enabled) ? '✅ org' : '❌ org'} ${rolePerms?.find(p => p.feature_key === 'app_core_access' && p.is_allowed) ? '✅ role' : '❌ role'}`);
  console.log(`  2. aso_ai_hub: ${hasAsoAiHub ? '✅ GRANTED' : '❌ DENIED'}`);

  if (isDemo) {
    const hasAsoAuditDemo = orgFeatures?.find(f => f.feature_key === 'aso_audit_demo' && f.is_enabled) &&
                            rolePerms?.find(p => p.feature_key === 'aso_audit_demo' && p.is_allowed);
    console.log(`  3. OR aso_audit_demo (demo mode): ${hasAsoAuditDemo ? '✅ GRANTED' : '❌ DENIED'}`);
  }

  console.log('\n=== Recommendation ===\n');

  if (!hasAsoAiHub) {
    console.log('Need to grant Stephen access to aso_ai_hub:');
    const missingOrg = !orgFeatures?.find(f => f.feature_key === 'aso_ai_hub' && f.is_enabled);
    const missingRole = !rolePerms?.find(p => p.feature_key === 'aso_ai_hub' && p.is_allowed);

    if (missingOrg) console.log('  ❌ Org does NOT have aso_ai_hub enabled');
    if (missingRole) console.log('  ❌ ASO_MANAGER role does NOT have aso_ai_hub permission');
  } else {
    console.log('✅ Stephen should have access to /aso-ai-hub/audit');
  }

  console.log('\n');
}

checkStephenAsoHubAccess();
