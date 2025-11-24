/**
 * PostgREST Version Check
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYmNxb2NwamFoZXdxam1sZ3ZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjgwNzA5OCwiZXhwIjoyMDYyMzgzMDk4fQ.vaBiZHIQ7Y5gsGPg2324rEu9InKtk9JDLz7L2mZp-Fo';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkPostgREST() {
  console.log('A) Checking PostgREST Version\n');

  try {
    // Try to query PostgREST version via SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      query: "SHOW postgrest.server_version;"
    });

    if (error) {
      console.log('❌ Cannot query postgrest.server_version via RPC');
      console.log('   Error:', error.message);
      console.log('   This is expected - trying alternative method...\n');
    } else {
      console.log('✅ PostgREST Version:', data);
    }
  } catch (err: any) {
    console.log('❌ Error:', err.message);
  }

  // Alternative: Check via REST API headers
  console.log('\nAlternative: Checking REST API headers...');
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseServiceKey
      }
    });

    const serverHeader = response.headers.get('server');
    console.log('✅ Server Header:', serverHeader || 'Not present');

    // Check for PostgREST header
    const allHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      allHeaders[key] = value;
    });
    console.log('\n📋 All Response Headers:');
    console.log(JSON.stringify(allHeaders, null, 2));
  } catch (err: any) {
    console.log('❌ Error fetching REST API:', err.message);
  }
}

async function checkCORSVariable() {
  console.log('\n' + '='.repeat(70));
  console.log('\nB) Checking cors_allowed_origins System Variable\n');

  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      query: "SHOW supabase.cors_allowed_origins;"
    });

    if (error) {
      console.log('❌ Cannot query supabase.cors_allowed_origins');
      console.log('   Error:', error.message);
      console.log('   This likely means CORS is NOT managed at DB level');
    } else {
      console.log('✅ supabase.cors_allowed_origins:', data);
    }
  } catch (err: any) {
    console.log('❌ Error:', err.message);
  }
}

async function main() {
  console.log('🔍 PHASE 20.A — Supabase Gateway + CORS Detection');
  console.log('='.repeat(70));
  console.log(`Project: bkbcqocpjahewqjmlgvf`);
  console.log(`URL: ${supabaseUrl}`);
  console.log('='.repeat(70) + '\n');

  await checkPostgREST();
  await checkCORSVariable();
}

main().catch(console.error);
