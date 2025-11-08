/**
 * LIST ALL USERS
 *
 * Show all users in the database and their organization setup
 *
 * Run: node scripts/list-all-users.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYmNxb2NwamFoZXdxam1sZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4MDcwOTgsImV4cCI6MjA2MjM4MzA5OH0.K00WoAEZNf93P-6r3dCwOZaYah51bYuBPwHtDdW82Ek';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function listAllUsers() {
  console.log('👥 LISTING ALL USERS\n');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    // 1. Get all profiles
    console.log('📋 ALL PROFILES');
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, created_at')
      .order('email');

    if (profileError) {
      console.error('❌ Error fetching profiles:', profileError.message);
      process.exit(1);
    }

    if (!profiles || profiles.length === 0) {
      console.log('❌ No profiles found\n');
    } else {
      console.log(`Found ${profiles.length} profile(s):\n`);
      profiles.forEach((p, i) => {
        console.log(`${i + 1}. ${p.email}`);
        console.log(`   ID: ${p.id}`);
        console.log(`   Created: ${p.created_at}\n`);
      });
    }

    // 2. Get all user_roles
    console.log('📋 ALL USER ROLES');
    const { data: userRoles, error: roleError } = await supabase
      .from('user_roles')
      .select(`
        id,
        user_id,
        email,
        role,
        organization_id,
        created_at,
        organizations (
          id,
          name,
          slug
        )
      `)
      .order('email');

    if (roleError) {
      console.error('❌ Error fetching user_roles:', roleError.message);
    } else if (!userRoles || userRoles.length === 0) {
      console.log('❌ No user_roles found\n');
    } else {
      console.log(`Found ${userRoles.length} user role(s):\n`);
      userRoles.forEach((r, i) => {
        console.log(`${i + 1}. ${r.email || 'No email'}`);
        console.log(`   User ID: ${r.user_id}`);
        console.log(`   Role: ${r.role}`);
        console.log(`   Organization ID: ${r.organization_id || '❌ NULL'}`);
        console.log(`   Organization: ${r.organizations?.name || 'N/A'} (${r.organizations?.slug || 'N/A'})`);
        console.log(`   Created: ${r.created_at}\n`);
      });
    }

    // 3. Check for data inconsistencies
    console.log('📋 DATA CONSISTENCY CHECK\n');

    // Check for profiles without user_roles
    if (profiles && userRoles) {
      const profileIds = new Set(profiles.map(p => p.id));
      const userRoleIds = new Set(userRoles.map(r => r.user_id));

      const profilesWithoutRoles = profiles.filter(p => !userRoleIds.has(p.id));
      const rolesWithoutProfiles = userRoles.filter(r => !profileIds.has(r.user_id));

      if (profilesWithoutRoles.length > 0) {
        console.log('⚠️  ISSUE: Profiles without user_roles:');
        profilesWithoutRoles.forEach(p => {
          console.log(`   - ${p.email} (${p.id})`);
        });
        console.log('');
      }

      if (rolesWithoutProfiles.length > 0) {
        console.log('⚠️  ISSUE: User_roles without profiles:');
        rolesWithoutProfiles.forEach(r => {
          console.log(`   - ${r.email || r.user_id}`);
        });
        console.log('');
      }

      // Check for NULL organization_ids
      const rolesWithoutOrg = userRoles.filter(r => !r.organization_id);
      if (rolesWithoutOrg.length > 0) {
        console.log('⚠️  ISSUE: User_roles with NULL organization_id:');
        rolesWithoutOrg.forEach(r => {
          console.log(`   - ${r.email || r.user_id} (${r.role})`);
        });
        console.log('');
      }

      // Check for duplicate emails
      const emailCounts = {};
      profiles.forEach(p => {
        emailCounts[p.email] = (emailCounts[p.email] || 0) + 1;
      });
      const duplicateEmails = Object.entries(emailCounts).filter(([, count]) => count > 1);
      if (duplicateEmails.length > 0) {
        console.log('⚠️  ISSUE: Duplicate email addresses:');
        duplicateEmails.forEach(([email, count]) => {
          console.log(`   - ${email} appears ${count} times`);
        });
        console.log('');
      }

      if (profilesWithoutRoles.length === 0 &&
          rolesWithoutProfiles.length === 0 &&
          rolesWithoutOrg.length === 0 &&
          duplicateEmails.length === 0) {
        console.log('✅ No data inconsistencies found\n');
      }
    }

    // 4. List all organizations
    console.log('📋 ALL ORGANIZATIONS');
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name, slug, created_at')
      .order('name');

    if (orgsError) {
      console.error('❌ Error fetching organizations:', orgsError.message);
    } else if (!orgs || orgs.length === 0) {
      console.log('❌ No organizations found\n');
    } else {
      console.log(`Found ${orgs.length} organization(s):\n`);
      orgs.forEach((org, i) => {
        // Count users in this org
        const userCount = userRoles?.filter(r => r.organization_id === org.id).length || 0;
        console.log(`${i + 1}. ${org.name} (${org.slug})`);
        console.log(`   ID: ${org.id}`);
        console.log(`   Users: ${userCount}`);
        console.log(`   Created: ${org.created_at}\n`);
      });
    }

  } catch (error) {
    console.error('❌ Failed to list users:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run
listAllUsers();
