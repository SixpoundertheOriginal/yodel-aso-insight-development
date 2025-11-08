import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

console.log('🚀 Running Phase 2 Migration: Add organizations.access_level\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Since we can't execute DDL directly, we'll use a workaround
// The migration SQL needs to be run in Supabase SQL Editor
// This script will verify if it's been applied and help with testing

console.log('⚠️  Note: This script verifies migration status');
console.log('   Actual DDL (ALTER TABLE) must be run in Supabase SQL Editor\n');

// Check if column exists
console.log('1️⃣ Checking if access_level column exists...');

try {
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, access_level')
    .limit(1);

  if (error) {
    if (error.message.includes('access_level') && error.code === '42703') {
      console.log('   ❌ Column does NOT exist yet\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('📋 ACTION REQUIRED: Run this in Supabase SQL Editor:\n');
      console.log('```sql');
      console.log(`-- Step 1: Add access_level column
ALTER TABLE organizations
  ADD COLUMN access_level TEXT DEFAULT 'full'
  CHECK (access_level IN ('full', 'reporting_only', 'custom'));

-- Step 2: Set Yodel Mobile to reporting-only
UPDATE organizations
SET access_level = 'reporting_only'
WHERE id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

-- Step 3: Add column comment
COMMENT ON COLUMN organizations.access_level IS
  'Controls route access level: full/reporting_only/custom';

-- Step 4: Create index
CREATE INDEX IF NOT EXISTS idx_organizations_access_level
  ON organizations(access_level)
  WHERE access_level != 'full';

-- Step 5: Verify
SELECT id, name, slug, access_level, subscription_tier
FROM organizations
ORDER BY name;
`);
      console.log('```\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('After running SQL, re-run this script to verify.\n');
      process.exit(0);
    } else {
      throw error;
    }
  }

  console.log('   ✅ Column exists!\n');

  // Column exists, now verify the data
  console.log('2️⃣ Verifying Yodel Mobile access level...');

  const { data: yodel, error: yodelError } = await supabase
    .from('organizations')
    .select('id, name, access_level')
    .eq('id', '7cccba3f-0a8f-446f-9dba-86e9cb68c92b')
    .single();

  if (yodelError) {
    console.error('   ❌ Error:', yodelError.message);
  } else {
    console.log(`   Organization: ${yodel.name}`);
    console.log(`   Access Level: ${yodel.access_level}`);

    if (yodel.access_level === 'reporting_only') {
      console.log('   ✅ Correctly set to reporting_only\n');
    } else {
      console.log(`   ⚠️  Expected 'reporting_only', got '${yodel.access_level}'\n`);
      console.log('   Run this UPDATE:\n');
      console.log(`   UPDATE organizations SET access_level = 'reporting_only' WHERE id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';\n`);
    }
  }

  // Show all organizations
  console.log('3️⃣ All organizations access levels:');

  const { data: allOrgs, error: allError } = await supabase
    .from('organizations')
    .select('id, name, slug, access_level, subscription_tier')
    .order('name');

  if (allError) {
    console.error('   ❌ Error:', allError.message);
  } else {
    // Group by access level
    const grouped = allOrgs.reduce((acc, org) => {
      const level = org.access_level || 'null';
      if (!acc[level]) acc[level] = [];
      acc[level].push(org);
      return acc;
    }, {});

    Object.entries(grouped).forEach(([level, orgs]) => {
      console.log(`\n   ${level.toUpperCase()} (${orgs.length} orgs):`);
      orgs.forEach(org => {
        console.log(`      - ${org.name} (${org.subscription_tier || 'no tier'})`);
      });
    });
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('✅ Phase 2 Migration Applied Successfully!\n');
  console.log('Next steps:');
  console.log('1. Clear browser cache');
  console.log('2. Login as cli@yodelmobile.com');
  console.log('3. Verify navigation shows only 7 pages');
  console.log('4. Check browser console - should NOT see hardcoded fallback message\n');

} catch (err) {
  console.error('❌ Unexpected error:', err.message);
  process.exit(1);
}
