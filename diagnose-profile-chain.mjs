import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const CLI_USER_ID = '8920ac57-63da-4f8e-9970-719be1e2569c';

console.log('🔍 Diagnosing useUserProfile → useFeatureAccess chain...\n');

// Simulate what useUserProfile does
console.log('1️⃣ Simulating FIXED useUserProfile query:');
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select(`
    *,
    organizations!profiles_organization_id_fkey(name, subscription_tier, slug, settings),
    user_roles(role, organization_id)
  `)
  .eq('id', CLI_USER_ID)
  .single();

if (profileError) {
  console.error('❌ Profile query error:', profileError);
} else {
  console.log('✅ Profile data structure:');
  console.log('   - id:', profile.id);
  console.log('   - email:', profile.email);
  console.log('   - organization_id (direct):', profile.organization_id || 'NULL');
  console.log('   - organizations:', profile.organizations);
  console.log('   - user_roles:', JSON.stringify(profile.user_roles, null, 2));
}

// Simulate what useFeatureAccess does with the profile
console.log('\n2️⃣ Simulating useFeatureAccess organizationId extraction:');
const organizationId = profile?.user_roles?.[0]?.organization_id || profile?.organization_id;
console.log('   - organizationId from user_roles[0]:', profile?.user_roles?.[0]?.organization_id || 'NULL');
console.log('   - organizationId from profile direct:', profile?.organization_id || 'NULL');
console.log('   - Final organizationId:', organizationId || 'NULL ❌');

if (!organizationId) {
  console.log('\n❌ PROBLEM FOUND: organizationId is null!');
  console.log('   useFeatureAccess will use ENTERPRISE_CORE_FEATURES fallback');
  console.log('   It will NOT fetch organization_features from database');
} else {
  console.log('\n✅ organizationId found, fetching organization features...');

  const { data: features, error: featuresError } = await supabase
    .from('organization_features')
    .select('feature_key, is_enabled')
    .eq('organization_id', organizationId)
    .eq('is_enabled', true);

  if (featuresError) {
    console.error('❌ Features query error:', featuresError);
  } else {
    console.log('✅ Organization features:', features.map(f => f.feature_key));

    const hasKeywordIntelligence = features.some(f => f.feature_key === 'keyword_intelligence');
    console.log('\n3️⃣ Feature check:');
    console.log('   - keyword_intelligence enabled:', hasKeywordIntelligence ? '✅ YES' : '❌ NO');

    if (hasKeywordIntelligence) {
      console.log('\n✅ Menu should be visible (if all caches are fresh)');
    } else {
      console.log('\n❌ Menu will NOT be visible - feature not enabled');
    }
  }
}

console.log('\n🔍 Diagnosis complete');
