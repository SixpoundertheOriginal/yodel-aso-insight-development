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
const YODEL_MOBILE_ORG_ID = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

console.log('🔍 Testing Keyword Page Access for cli@yodelmobile.com\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Test 1: Check useUserProfile query (the broken one)
console.log('1️⃣ Testing useUserProfile Query (Current - BROKEN):');
console.log('   Query: profiles -> organizations(name, subscription_tier, slug)\n');

const { data: profileBroken, error: profileBrokenError } = await supabase
  .from('profiles')
  .select(`
    *,
    organizations(name, subscription_tier, slug),
    user_roles(role, organization_id)
  `)
  .eq('id', CLI_USER_ID)
  .single();

if (profileBrokenError) {
  console.log('   ❌ QUERY FAILED (Expected)');
  console.log('   Error:', profileBrokenError.code, '-', profileBrokenError.message);
  console.log('   Hint:', profileBrokenError.hint);
} else {
  console.log('   ✅ Query succeeded');
  console.log('   user_roles:', profileBroken.user_roles);
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Test 2: Check useUserProfile with fixed query
console.log('2️⃣ Testing useUserProfile Query (FIXED):');
console.log('   Query: profiles -> organizations!profiles_organization_id_fkey(...)\n');

const { data: profileFixed, error: profileFixedError } = await supabase
  .from('profiles')
  .select(`
    *,
    organizations!profiles_organization_id_fkey(name, subscription_tier, slug, settings),
    user_roles(role, organization_id)
  `)
  .eq('id', CLI_USER_ID)
  .single();

if (profileFixedError) {
  console.log('   ❌ Query failed:', profileFixedError.message);
} else {
  console.log('   ✅ Query succeeded');
  console.log('   Profile ID:', profileFixed.id);
  console.log('   Organization (direct):', profileFixed.organization_id || 'NULL');
  console.log('   Organizations relation:', profileFixed.organizations);
  console.log('   User roles:', JSON.stringify(profileFixed.user_roles, null, 2));

  // Simulate useFeatureAccess logic
  const organizationId = profileFixed?.user_roles?.[0]?.organization_id || profileFixed?.organization_id;
  console.log('\n   🔍 useFeatureAccess would extract:');
  console.log('      organizationId:', organizationId);

  if (organizationId) {
    console.log('      ✅ Would fetch organization features from database');
  } else {
    console.log('      ❌ Would use ENTERPRISE_CORE_FEATURES fallback');
  }
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Test 3: Check organization features
console.log('3️⃣ Checking Organization Features (Database):');
const { data: features, error: featuresError } = await supabase
  .from('organization_features')
  .select('feature_key, is_enabled, created_at')
  .eq('organization_id', YODEL_MOBILE_ORG_ID)
  .eq('is_enabled', true)
  .order('feature_key');

if (featuresError) {
  console.log('   ❌ Error:', featuresError.message);
} else {
  console.log('   ✅ Features enabled for Yodel Mobile:');
  features.forEach(f => {
    console.log(`      - ${f.feature_key}`);
  });

  const hasKeywordIntelligence = features.some(f => f.feature_key === 'keyword_intelligence');
  console.log(`\n   keyword_intelligence: ${hasKeywordIntelligence ? '✅ ENABLED' : '❌ NOT ENABLED'}`);
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Test 4: Check role-based access
console.log('4️⃣ Checking Role-Based Feature Access:');
console.log('   User Role: org_admin');
console.log('   Feature Required: KEYWORD_INTELLIGENCE');
console.log('\n   According to ROLE_FEATURE_DEFAULTS:');
console.log('   - org_admin has access to ALL GROWTH_ACCELERATORS features');
console.log('   - GROWTH_ACCELERATORS includes keyword_intelligence');
console.log('   - featureEnabledForRole("KEYWORD_INTELLIGENCE", "org_admin") should return: ✅ TRUE');

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Test 5: Access control logic simulation
console.log('5️⃣ Simulating Page Access Control Logic:');
console.log('   From: src/pages/growth-accelerators/keywords.tsx:63\n');

const isSuperAdmin = false;
const isOrganizationAdmin = true; // From user_roles table
const currentUserRole = isSuperAdmin ? 'super_admin' : (isOrganizationAdmin ? 'org_admin' : 'viewer');
const isDemoOrg = false; // Yodel Mobile is not a demo org

console.log('   Inputs:');
console.log('      isSuperAdmin:', isSuperAdmin);
console.log('      isOrganizationAdmin:', isOrganizationAdmin);
console.log('      currentUserRole:', currentUserRole);
console.log('      isDemoOrg:', isDemoOrg);

// Simulate featureEnabledForRole
const roleHasAccess = currentUserRole === 'super_admin' || currentUserRole === 'org_admin';
const canAccess = roleHasAccess || isDemoOrg;

console.log('\n   Logic:');
console.log('      featureEnabledForRole("KEYWORD_INTELLIGENCE", "org_admin"):', roleHasAccess ? '✅ true' : '❌ false');
console.log('      canAccess = featureEnabledForRole(...) || isDemoOrg:', canAccess ? '✅ true' : '❌ false');

console.log('\n   Result:');
if (canAccess) {
  console.log('      ✅ User SHOULD have access to /growth-accelerators/keywords');
  console.log('      ✅ Page should render (not redirect)');
} else {
  console.log('      ❌ User will be redirected to /dashboard');
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Test 6: Naming consistency audit
console.log('6️⃣ Naming Consistency Audit:\n');

const namingMap = {
  'Database feature key': 'keyword_intelligence',
  'Constant (PLATFORM_FEATURES)': 'KEYWORD_INTELLIGENCE',
  'Constant value': 'keyword_intelligence',
  'Route path': '/growth-accelerators/keywords',
  'Menu title': 'Keyword Intelligence',
  'Component file': 'src/pages/growth-accelerators/keywords.tsx',
  'Feature check in page': 'KEYWORD_INTELLIGENCE (string passed to function)',
  'Category': 'GROWTH_ACCELERATORS'
};

console.log('   Naming Breakdown:');
Object.entries(namingMap).forEach(([context, value]) => {
  console.log(`      ${context.padEnd(30)} → ${value}`);
});

console.log('\n   ⚠️  Potential Confusion Points:');
console.log('      1. Route uses "keywords" (plural) but feature is "keyword_intelligence"');
console.log('      2. Constant is KEYWORD_INTELLIGENCE but value is keyword_intelligence');
console.log('      3. Route is "/growth-accelerators/keywords" (hyphenated)');
console.log('      4. Sidebar section is "Growth Accelerators" (space-separated)');
console.log('\n   ✅ These are normal naming conventions:');
console.log('      - Routes: kebab-case (growth-accelerators/keywords)');
console.log('      - Constants: SCREAMING_SNAKE_CASE (KEYWORD_INTELLIGENCE)');
console.log('      - Database: snake_case (keyword_intelligence)');
console.log('      - UI Display: Title Case (Keyword Intelligence)');

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('✅ Test Complete\n');
