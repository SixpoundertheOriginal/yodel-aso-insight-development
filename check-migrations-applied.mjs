import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔍 Checking Applied Migrations\n');
console.log('='.repeat(80));

async function check() {
  console.log('\n📋 Querying schema_migrations table...');

  const { data, error } = await supabase
    .from('schema_migrations')
    .select('version')
    .order('version', { ascending: false })
    .limit(20);

  if (error) {
    console.log('   ❌ Error:', error.message);
    console.log('\n   Trying supabase_migrations table instead...');

    const { data: data2, error: error2 } = await supabase
      .from('supabase_migrations')
      .select('*')
      .order('version', { ascending: false })
      .limit(20);

    if (error2) {
      console.log('   ❌ Error:', error2.message);
      return;
    }

    console.log('\n   ✅ Last 20 applied migrations:');
    data2.forEach((m, i) => {
      console.log(`   ${i + 1}. ${m.version} - ${m.name || '(no name)'}`);
    });

    // Check for our critical migrations
    const criticalMigrations = [
      '20251107300000', // fix_agency_clients_rls
      '20251125000011', // create_is_super_admin_rpc
      '20251126000011', // check_and_enable_rls_agency_clients
      '20251126000013'  // fix_is_super_admin_circular_rls
    ];

    console.log('\n📋 Checking critical migrations:');
    criticalMigrations.forEach(version => {
      const applied = data2.some(m => m.version.startsWith(version));
      console.log(`   ${applied ? '✅' : '❌'} ${version}`);
    });

    return;
  }

  console.log('\n   ✅ Last 20 applied migrations (from schema_migrations):');
  data.forEach((m, i) => {
    console.log(`   ${i + 1}. ${m.version}`);
  });

  console.log('\n');
}

check().catch(err => {
  console.error('\n💥 ERROR:');
  console.error(err);
});
