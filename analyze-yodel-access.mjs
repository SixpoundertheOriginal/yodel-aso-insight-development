import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bkbcqocpjahewqjmlgvf.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const YODEL_ORG_ID = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

console.log('🔍 Analyzing Yodel Mobile Access Control\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Check organization settings
const { data: org, error: orgError } = await supabase
  .from('organizations')
  .select('id, name, slug, subscription_tier, settings')
  .eq('id', YODEL_ORG_ID)
  .single();

console.log('1️⃣ Organization Details:');
if (orgError) {
  console.log('   ❌ Error:', orgError.message);
} else {
  console.log('   Name:', org.name);
  console.log('   Slug:', org.slug);
  console.log('   Tier:', org.subscription_tier);
  console.log('   Settings:', JSON.stringify(org.settings, null, 2));
  console.log('   demo_mode:', org.settings?.demo_mode || false);
}

console.log('\n2️⃣ Expected Behavior:');
console.log('   - isDemoOrg:', org.settings?.demo_mode ? 'TRUE' : 'FALSE');
console.log('   - User role: org_admin');
console.log('   - Role mapped to: ORGANIZATION_ADMIN');

const isDemoOrg = org.settings?.demo_mode || false;
const role = 'ORGANIZATION_ADMIN';

console.log('\n3️⃣ Route Access Logic (getAllowedRoutes):');
console.log('   Input: { isDemoOrg:', isDemoOrg, ', role:', role, '}');

const DEMO_REPORTING_ROUTES = [
  '/dashboard-v2',
  '/dashboard/executive',
  '/dashboard/analytics',
  '/dashboard/conversion-rate',
  '/growth-accelerators/keywords',
  '/growth-accelerators/reviews',
  '/growth-accelerators/competitor-overview'
];

const FULL_APP = [
  '/overview', '/dashboard', '/conversion-analysis', '/insights',
  '/aso-ai-hub', '/chatgpt-visibility-audit', '/aso-knowledge-engine',
  '/metadata-copilot', '/growth-gap-copilot', '/featuring-toolkit',
  '/creative-analysis', '/growth/web-rank-apps', '/growth-accelerators/reviews',
  '/growth-accelerators/keywords', '/app-discovery', '/apps', '/admin',
  '/profile', '/settings'
];

let allowedRoutes = [];
if (isDemoOrg) {
  allowedRoutes = DEMO_REPORTING_ROUTES;
  console.log('   Result: DEMO_REPORTING_ROUTES only (' + DEMO_REPORTING_ROUTES.length + ' routes)');
} else if (role === 'VIEWER' || role === 'CLIENT') {
  allowedRoutes = DEMO_REPORTING_ROUTES;
  console.log('   Result: DEMO_REPORTING_ROUTES only (VIEWER/CLIENT)');
} else {
  allowedRoutes = [...DEMO_REPORTING_ROUTES, ...FULL_APP];
  console.log('   Result: DEMO_REPORTING_ROUTES + FULL_APP');
  console.log('   ⚠️  THIS GRANTS ACCESS TO ' + allowedRoutes.length + ' ROUTES (ALL PAGES)');
}

console.log('\n4️⃣ Allowed Routes for Yodel Mobile org_admin:');
console.log('   Total:', allowedRoutes.length, 'routes');
if (allowedRoutes.length > 10) {
  console.log('   ❌ PROBLEM: Too many routes allowed');
  console.log('   Expected: 7 routes (restricted view)');
  console.log('   Actual:', allowedRoutes.length, 'routes (full access)');
}

console.log('\n5️⃣ What You Observed:');
console.log('   - Initial render: Proper restricted navigation (7 pages from DEMO_REPORTING_ROUTES)');
console.log('   - After re-render: Full navigation menu appears (~40+ pages)');
console.log('   - Issue: Navigation expands to show ALL pages');

console.log('\n6️⃣ Root Cause:');
if (!isDemoOrg && (role === 'ORGANIZATION_ADMIN' || role === 'ORG_ADMIN')) {
  console.log('   ❌ PROBLEM IDENTIFIED:');
  console.log('');
  console.log('   Current Logic in getAllowedRoutes():');
  console.log('   ------------------------------------------------');
  console.log('   if (isDemoOrg) return DEMO_REPORTING_ROUTES;           // 7 routes');
  console.log('   if (role === VIEWER || CLIENT) return DEMO_REPORTING_ROUTES;');
  console.log('   return DEMO_REPORTING_ROUTES + FULL_APP;               // ~40 routes ❌');
  console.log('   ------------------------------------------------');
  console.log('');
  console.log('   Issue: ORGANIZATION_ADMIN role is NOT in the restricted list');
  console.log('   Result: Gets DEMO_REPORTING_ROUTES + FULL_APP = full access');
  console.log('');
  console.log('   The "restricted view" you saw initially was likely:');
  console.log('   - Loading state (before permissions loaded)');
  console.log('   - Or useFeatureAccess filtering (which now works after fix)');
  console.log('   - Once permissions fully load, getAllowedRoutes grants full access');
}

console.log('\n7️⃣ Desired Behavior for Yodel Mobile:');
console.log('   You want Yodel Mobile users (org_admin) to have:');
console.log('   - Limited route access (7 pages from DEMO_REPORTING_ROUTES)');
console.log('   - Feature-based access (keyword_intelligence enabled)');
console.log('   - Role-based restrictions within those pages');
console.log('');
console.log('   Current problem: org_admin role grants FULL app access');

console.log('\n8️⃣ Possible Solutions:');
console.log('');
console.log('   Option 1: Organization-level access restriction');
console.log('   ------------------------------------------------');
console.log('   - Add organization_access_level field to organizations table');
console.log('   - Values: "full", "reporting_only", "custom"');
console.log('   - getAllowedRoutes checks org access level first');
console.log('   - Pros: Flexible, scalable, org-specific');
console.log('   - Cons: Requires migration, new field to maintain');
console.log('');
console.log('   Option 2: Role-based tiers');
console.log('   ------------------------------------------------');
console.log('   - Add ORG_ADMIN_LIMITED role');
console.log('   - getAllowedRoutes treats it like VIEWER');
console.log('   - But permissions/features still work for enabled features');
console.log('   - Pros: Simple, uses existing role system');
console.log('   - Cons: Role proliferation, not org-specific');
console.log('');
console.log('   Option 3: Feature-driven routing (RECOMMENDED)');
console.log('   ------------------------------------------------');
console.log('   - Remove route-based filtering (getAllowedRoutes)');
console.log('   - Rely entirely on feature flags from organization_features');
console.log('   - Each route tied to a feature key');
console.log('   - Sidebar only shows routes for enabled features');
console.log('   - Pros: Single source of truth, already working for features');
console.log('   - Cons: Requires mapping all routes to features');
console.log('');
console.log('   Option 4: Custom route lists per org');
console.log('   ------------------------------------------------');
console.log('   - New table: organization_allowed_routes');
console.log('   - Columns: organization_id, route_path, is_allowed');
console.log('   - Most flexible, per-org customization');
console.log('   - Pros: Maximum flexibility');
console.log('   - Cons: Most complex, hardest to maintain');

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('✅ Analysis Complete');
