import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bkbcqocpjahewqjmlgvf.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false },
    db: { schema: 'public' }
  }
);

console.log('🚀 Applying Phase 2: Adding access_level to organizations\n');

// Step 1: Check if column exists
console.log('1️⃣ Checking if access_level column exists...');
const { data: orgs, error: checkError } = await supabase
  .from('organizations')
  .select('id, name, access_level')
  .limit(1);

if (checkError && checkError.message.includes('column') && checkError.message.includes('access_level')) {
  console.log('   ⚠️  Column does not exist yet - needs manual migration');
  console.log('\n📋 Please run this SQL in Supabase SQL Editor:');
  console.log('\n```sql');
  console.log(`ALTER TABLE organizations
  ADD COLUMN access_level TEXT DEFAULT 'full'
  CHECK (access_level IN ('full', 'reporting_only', 'custom'));

UPDATE organizations
SET access_level = 'reporting_only'
WHERE id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

COMMENT ON COLUMN organizations.access_level IS
  'Controls route access level: full/reporting_only/custom';
`);
  console.log('```\n');
  process.exit(1);
} else if (checkError) {
  console.error('   ❌ Unexpected error:', checkError.message);
  process.exit(1);
} else {
  console.log('   ✅ Column already exists!');
}

// Step 2: Update Yodel Mobile
console.log('\n2️⃣ Setting Yodel Mobile to reporting_only...');
const { data: updated, error: updateError } = await supabase
  .from('organizations')
  .update({ access_level: 'reporting_only' })
  .eq('id', '7cccba3f-0a8f-446f-9dba-86e9cb68c92b')
  .select();

if (updateError) {
  console.error('   ❌ Error:', updateError.message);
} else {
  console.log('   ✅ Updated:', updated[0]?.name, '→ reporting_only');
}

// Step 3: Verify
console.log('\n3️⃣ Verifying access levels...');
const { data: allOrgs, error: verifyError } = await supabase
  .from('organizations')
  .select('id, name, access_level')
  .order('name');

if (verifyError) {
  console.error('   ❌ Error:', verifyError.message);
} else {
  console.log(`\n   Organizations (${allOrgs.length} total):`);
  const grouped = allOrgs.reduce((acc, org) => {
    const level = org.access_level || 'null';
    if (!acc[level]) acc[level] = [];
    acc[level].push(org.name);
    return acc;
  }, {});

  Object.entries(grouped).forEach(([level, names]) => {
    console.log(`\n   ${level} (${names.length}):`);
    names.forEach(name => console.log(`      - ${name}`));
  });
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ Phase 2 Migration Complete!\n');
