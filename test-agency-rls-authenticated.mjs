import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYmNxb2NwamFoZXdxam1sZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4MDcwOTgsImV4cCI6MjA2MjM4MzA5OH0.K00WoAEZNf93P-6r3dCwOZaYah51bYuBPwHtDdW82Ek';

async function testAgencyRLS() {
  console.log('🧪 Testing agency_clients RLS as authenticated user\n');
  console.log('='.repeat(80));
  console.log('');
  
  // Create client with anon key
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // Sign in as CLI user
  console.log('🔐 Signing in as cli@yodelmobile.com...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'cli@yodelmobile.com',
    password: 'testpassword123'
  });
  
  if (authError) {
    console.log('❌ Auth error:', authError.message);
    console.log('   Cannot test RLS without authentication\n');
    return;
  }
  
  console.log('✅ Authenticated as:', authData.user.email);
  console.log('   User ID:', authData.user.id);
  console.log('');
  
  // Now query agency_clients (this will be subject to RLS)
  console.log('🔍 Querying agency_clients table as authenticated user...');
  console.log('   This simulates what the edge function does');
  const yodelOrgId = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';
  
  const { data: managedClients, error: agencyError } = await supabase
    .from('agency_clients')
    .select('client_org_id')
    .eq('agency_org_id', yodelOrgId)
    .eq('is_active', true);
  
  console.log('');
  console.log('─'.repeat(80));
  console.log('RESULTS:');
  console.log('─'.repeat(80));
  
  if (agencyError) {
    console.log('❌ ERROR querying agency_clients:');
    console.log('   Message:', agencyError.message);
    console.log('   Code:', agencyError.code);
    if (agencyError.details) console.log('   Details:', agencyError.details);
    if (agencyError.hint) console.log('   Hint:', agencyError.hint);
    console.log('');
    console.log('🔴 DIAGNOSIS: RLS policies are preventing access');
  } else {
    console.log('✅ Query successful!');
    console.log('   Found', managedClients?.length || 0, 'client organizations');
    console.log('');
    if (managedClients && managedClients.length > 0) {
      managedClients.forEach(c => {
        console.log('   📁 Client org:', c.client_org_id.substring(0, 8) + '...');
      });
      console.log('');
      console.log('🟢 DIAGNOSIS: RLS policies are working correctly!');
    } else {
      console.log('   ⚠️  No client organizations found');
      console.log('');
      console.log('🔴 DIAGNOSIS: RLS is blocking the query!');
      console.log('   The policies exist but are not allowing access.');
      console.log('   Check if the policy conditions are correct.');
    }
  }
  
  console.log('');
  console.log('='.repeat(80));
  console.log('');
  
  // Sign out
  await supabase.auth.signOut();
}

testAgencyRLS().catch(console.error);
