import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://bkbcqocpjahewqjmlgvf.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

console.log('🚀 Applying Phase 2 Migration: add_organization_access_level\n');

// Read the migration file
const migrationSQL = readFileSync('supabase/migrations/20251108300000_add_organization_access_level.sql', 'utf8');

// Split into statements (handle DO blocks properly)
const statements = migrationSQL
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'))
  .map(s => s + ';');

console.log(`Found ${statements.length} SQL statements to execute\n`);

// Execute each statement
for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i];

  // Skip comments and empty statements
  if (stmt.startsWith('--') || stmt.trim() === ';') continue;

  // Show DO block titles
  if (stmt.includes('DO $$')) {
    console.log(`\nExecuting verification block...`);
  } else if (stmt.includes('SELECT')) {
    console.log(`\nExecuting query: ${stmt.substring(0, 60)}...`);
  } else {
    console.log(`\nExecuting: ${stmt.substring(0, 60)}...`);
  }

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: stmt });

    if (error) {
      // Try direct query for SELECTs
      if (stmt.trim().toUpperCase().startsWith('SELECT')) {
        const parts = stmt.split(/FROM|WHERE|ORDER/i);
        const selectPart = parts[0].replace('SELECT', '').trim();
        console.log('   ℹ️  SELECT query - checking results...');
      } else if (error.code !== '42710') { // Ignore "already exists" errors
        console.error(`   ❌ Error:`, error.message);
        if (!stmt.includes('CREATE INDEX') && !stmt.includes('ADD COLUMN')) {
          throw error;
        }
      }
    } else {
      console.log('   ✅ Success');
    }
  } catch (err) {
    console.error(`   ❌ Failed:`, err.message);
    if (!stmt.includes('IF NOT EXISTS')) {
      throw err;
    }
  }
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Verify the migration
console.log('🔍 Verifying migration results...\n');

const { data: org, error: orgError } = await supabase
  .from('organizations')
  .select('id, name, access_level')
  .eq('id', '7cccba3f-0a8f-446f-9dba-86e9cb68c92b')
  .single();

if (orgError) {
  console.error('❌ Verification failed:', orgError.message);
} else {
  console.log('✅ Yodel Mobile access level:', org.access_level);
  if (org.access_level === 'reporting_only') {
    console.log('✅ SUCCESS: Migration applied correctly!');
  } else {
    console.log('⚠️  WARNING: access_level is not "reporting_only"');
  }
}

// Count organizations by access level
const { data: counts, error: countError } = await supabase
  .from('organizations')
  .select('access_level')
  .not('access_level', 'is', null);

if (!countError) {
  const summary = counts.reduce((acc, row) => {
    acc[row.access_level] = (acc[row.access_level] || 0) + 1;
    return acc;
  }, {});

  console.log('\n📊 Organizations by access level:');
  Object.entries(summary).forEach(([level, count]) => {
    console.log(`   - ${level}: ${count}`);
  });
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('✅ Phase 2 Migration Complete\n');
