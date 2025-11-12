import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from project root
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function debugAdminPanel() {
  console.log('='.repeat(70));
  console.log('🔍 ADMIN PANEL DEBUG - ROOT CAUSE ANALYSIS');
  console.log('='.repeat(70));

  // Step 1: Check Yodel Mobile organization
  console.log('\n📊 STEP 1: Check Yodel Mobile Organization');
  console.log('-'.repeat(70));

  const { data: orgs, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, slug, settings')
    .or('name.ilike.%yodel%mobile%,slug.ilike.%yodel%');

  if (orgError) {
    console.error('❌ Error fetching organizations:', orgError);
    return;
  }

  if (!orgs || orgs.length === 0) {
    console.log('⚠️  No organizations found matching "yodel mobile"');
    return;
  }

  const yodelOrg = orgs[0];
  console.log(`\n✅ Found: ${yodelOrg.name}`);
  console.log(`   ID: ${yodelOrg.id}`);
  console.log(`   Slug: ${yodelOrg.slug}`);
  console.log(`   Settings:`, JSON.stringify(yodelOrg.settings, null, 2));

  // Analyze demo mode detection
  const hasDemoMode = Boolean(yodelOrg.settings?.demo_mode);
  const isNextSlug = yodelOrg.slug?.toLowerCase() === 'next';
  const isDemoOrg = hasDemoMode || isNextSlug;

  console.log(`\n🔍 Demo Mode Detection:`);
  console.log(`   settings.demo_mode: ${yodelOrg.settings?.demo_mode} → ${hasDemoMode}`);
  console.log(`   slug === 'next': ${isNextSlug}`);
  console.log(`   ⚠️  isDemoOrg (final): ${isDemoOrg}`);

  if (isDemoOrg) {
    console.log(`\n❌ PROBLEM FOUND: Organization flagged as demo!`);
    if (hasDemoMode) {
      console.log(`   Reason: settings.demo_mode = true`);
    }
    if (isNextSlug) {
      console.log(`   Reason: slug is 'next' (hardcoded check)`);
    }
  } else {
    console.log(`\n✅ Demo mode: Disabled`);
  }

  // Step 2: Check cli@yodelmobile.com user
  console.log('\n' + '='.repeat(70));
  console.log('👤 STEP 2: Check cli@yodelmobile.com Permissions');
  console.log('-'.repeat(70));

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, organization_id')
    .ilike('email', '%cli@yodelmobile%');

  if (profileError) {
    console.error('❌ Error fetching profiles:', profileError);
    return;
  }

  if (!profiles || profiles.length === 0) {
    console.log('⚠️  No user found with email like "cli@yodelmobile"');
    return;
  }

  const user = profiles[0];
  console.log(`\n✅ User: ${user.email}`);
  console.log(`   ID: ${user.id}`);
  console.log(`   Organization ID: ${user.organization_id}`);

  // Check if user's org matches Yodel Mobile
  if (user.organization_id !== yodelOrg.id) {
    console.log(`\n⚠️  WARNING: User's org (${user.organization_id}) doesn't match Yodel Mobile org (${yodelOrg.id})`);
  }

  // Check user_roles
  const { data: roles, error: rolesError } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', user.id);

  if (rolesError) {
    console.error('❌ Error fetching user_roles:', rolesError);
  } else {
    console.log(`\n📋 User Roles (${roles?.length || 0}):`);
    roles?.forEach(role => {
      console.log(`   - ${role.role} (org: ${role.organization_id || 'NULL'})`);
    });
  }

  // Check user_permissions_unified
  const { data: permissions, error: permError } = await supabase
    .from('user_permissions_unified')
    .select('*')
    .eq('user_id', user.id);

  if (permError) {
    console.error('❌ Error fetching permissions:', permError);
  } else {
    console.log(`\n🔐 Unified Permissions (${permissions?.length || 0}):`);
    permissions?.forEach(perm => {
      console.log(`   Organization: ${perm.organization_name}`);
      console.log(`   Role: ${perm.role}`);
      console.log(`   is_super_admin: ${perm.is_super_admin}`);
      console.log(`   is_org_admin: ${perm.is_org_admin}`);
      console.log(`   ---`);
    });
  }

  // Step 3: Simulate AppSidebar logic
  console.log('\n' + '='.repeat(70));
  console.log('🎯 STEP 3: Simulate AppSidebar Logic');
  console.log('-'.repeat(70));

  const userRole = roles?.[0]?.role || 'UNKNOWN';
  const isSuperAdmin = permissions?.[0]?.is_super_admin || false;
  const isOrgAdmin = permissions?.[0]?.is_org_admin || false;

  console.log(`\n📊 Permission State:`);
  console.log(`   isSuperAdmin: ${isSuperAdmin}`);
  console.log(`   isOrganizationAdmin: ${isOrgAdmin}`);
  console.log(`   role: ${userRole}`);
  console.log(`   isDemoOrg: ${isDemoOrg}`);

  // Simulate sidebar logic
  console.log(`\n🔄 Sidebar Logic Flow:`);

  if (isSuperAdmin) {
    console.log(`   ✅ Would show: "System Control" link to /admin`);
  } else if (isOrgAdmin) {
    console.log(`   ✅ Would show: "User Management" link to /admin/users`);
  } else {
    console.log(`   ❌ Would NOT show admin links (not admin)`);
  }

  // Simulate getAllowedRoutes
  console.log(`\n🛣️  getAllowedRoutes() Simulation:`);
  if (isDemoOrg) {
    console.log(`   ❌ RETURNS: DEMO_REPORTING_ROUTES (6 routes only)`);
    console.log(`   ❌ /admin/users NOT INCLUDED`);
    console.log(`   ❌ This is why admin panel doesn't show!`);
  } else if (isSuperAdmin) {
    console.log(`   ✅ RETURNS: All routes (DEFAULT + ORG_ADMIN + SUPER_ADMIN)`);
  } else if (isOrgAdmin) {
    console.log(`   ✅ RETURNS: DEFAULT_ORG_USER_ROUTES + ORG_ADMIN_ADDITIONAL_ROUTES`);
    console.log(`   ✅ Includes /admin/users`);
  } else {
    console.log(`   ✅ RETURNS: DEFAULT_ORG_USER_ROUTES only`);
  }

  // Final diagnosis
  console.log('\n' + '='.repeat(70));
  console.log('💡 ROOT CAUSE DIAGNOSIS');
  console.log('='.repeat(70));

  if (!isOrgAdmin && !isSuperAdmin) {
    console.log(`\n❌ PROBLEM: User is NOT an ORG_ADMIN or SUPER_ADMIN`);
    console.log(`   Current role: ${userRole}`);
    console.log(`   is_org_admin: ${isOrgAdmin}`);
    console.log(`   Solution: Assign ORG_ADMIN role to user`);
  } else if (isDemoOrg) {
    console.log(`\n❌ PROBLEM: Organization is flagged as demo`);
    console.log(`   This causes getAllowedRoutes() to return only 6 demo routes`);
    console.log(`   /admin/users is NOT in demo routes, so link won't show`);
    console.log(`\n💊 SOLUTION:`);
    if (hasDemoMode) {
      console.log(`   Run: UPDATE organizations SET settings = settings - 'demo_mode' WHERE id = '${yodelOrg.id}';`);
    }
    if (isNextSlug) {
      console.log(`   Change slug from 'next' to something else (e.g., 'yodel-mobile')`);
      console.log(`   Run: UPDATE organizations SET slug = 'yodel-mobile' WHERE id = '${yodelOrg.id}';`);
    }
  } else {
    console.log(`\n✅ Configuration looks correct!`);
    console.log(`   User has ORG_ADMIN permissions: ${isOrgAdmin}`);
    console.log(`   Organization is NOT demo: ${!isDemoOrg}`);
    console.log(`   Admin panel should be visible.`);
    console.log(`\n🔍 If still not showing, check:`);
    console.log(`   1. Browser cache / hard refresh (Ctrl+Shift+R)`);
    console.log(`   2. React Query cache invalidation`);
    console.log(`   3. Frontend console logs for errors`);
  }

  console.log('\n' + '='.repeat(70));
}

debugAdminPanel().then(() => process.exit(0)).catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
