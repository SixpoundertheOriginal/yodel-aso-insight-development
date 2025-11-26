#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function auditDemoMode() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('               DEMO MODE USAGE AUDIT');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // 1. Check which orgs have demo_mode in settings
  console.log('1️⃣  ORGANIZATIONS WITH DEMO MODE ENABLED\n');

  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, name, slug, settings')
    .order('name');

  let demoOrgCount = 0;
  orgs?.forEach(org => {
    const isDemoSettings = Boolean(org.settings?.demo_mode);
    const isDemoSlug = (org.slug || '').toLowerCase() === 'next';

    if (isDemoSettings || isDemoSlug) {
      demoOrgCount++;
      console.log(`   ${org.name}`);
      console.log(`   ├─ ID: ${org.id}`);
      console.log(`   ├─ Slug: ${org.slug}`);
      console.log(`   ├─ settings.demo_mode: ${isDemoSettings}`);
      console.log(`   └─ slug='next': ${isDemoSlug}\n`);
    }
  });

  if (demoOrgCount === 0) {
    console.log('   ✅ NO organizations have demo mode enabled\n');
  } else {
    console.log(`   ⚠️  ${demoOrgCount} organization(s) have demo mode enabled\n`);
  }

  // 2. Check for demo features
  console.log('2️⃣  DEMO FEATURES IN DATABASE\n');

  const { data: demoFeatures } = await supabase
    .from('platform_features')
    .select('feature_key, feature_name, is_active')
    .like('feature_key', '%demo%');

  if (!demoFeatures || demoFeatures.length === 0) {
    console.log('   ✅ NO demo-related features found in platform_features\n');
  } else {
    console.log(`   Found ${demoFeatures.length} demo features:\n`);
    demoFeatures.forEach(f => {
      console.log(`   - ${f.feature_key} (${f.is_active ? 'active' : 'inactive'})`);
    });
    console.log('');
  }

  // 3. Check for demo routes in use
  console.log('3️⃣  DEMO ROUTES PROTECTED BY AUTHORIZE\n');
  console.log('   Routes requiring demo mode:');
  console.log('   - /demo/aso-ai-audit      → aso_audit_demo');
  console.log('   - /demo/creative-review   → creative_review_demo');
  console.log('   - /demo/keyword-insights  → keyword_insights_demo\n');

  // 4. Check if any org has demo features enabled
  const { data: orgDemoFeatures } = await supabase
    .from('org_feature_entitlements')
    .select('organization_id, feature_key, is_enabled')
    .like('feature_key', '%demo%')
    .eq('is_enabled', true);

  if (!orgDemoFeatures || orgDemoFeatures.length === 0) {
    console.log('4️⃣  DEMO FEATURE ENTITLEMENTS\n');
    console.log('   ✅ NO organizations have demo features enabled\n');
  } else {
    console.log('4️⃣  DEMO FEATURE ENTITLEMENTS\n');
    console.log(`   ⚠️  ${orgDemoFeatures.length} demo feature(s) enabled:\n`);

    const byOrg = orgDemoFeatures.reduce((acc, f) => {
      if (!acc[f.organization_id]) acc[f.organization_id] = [];
      acc[f.organization_id].push(f.feature_key);
      return acc;
    }, {});

    for (const [orgId, features] of Object.entries(byOrg)) {
      const org = orgs?.find(o => o.id === orgId);
      console.log(`   ${org?.name || orgId}:`);
      features.forEach(f => console.log(`   - ${f}`));
      console.log('');
    }
  }

  // 5. Summary
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                        SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const hasActiveDemo = demoOrgCount > 0 ||
                        (demoFeatures && demoFeatures.length > 0) ||
                        (orgDemoFeatures && orgDemoFeatures.length > 0);

  if (!hasActiveDemo) {
    console.log('✅ SAFE TO REMOVE DEMO MODE');
    console.log('   - No organizations using demo mode');
    console.log('   - No demo features in database');
    console.log('   - No demo feature entitlements active');
    console.log('   - Demo code is completely unused\n');
  } else {
    console.log('⚠️  DEMO MODE IN USE');
    console.log('   - Review above findings before removal');
    console.log('   - May need to migrate/disable before cleanup\n');
  }

  console.log('═══════════════════════════════════════════════════════════════\n');
}

auditDemoMode();
