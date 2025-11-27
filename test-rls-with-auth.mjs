import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYmNxb2NwamFoZXdxam1sZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4MDcwOTgsImV4cCI6MjA2MjM4MzA5OH0.K00WoAEZNf93P-6r3dCwOZaYah51bYuBPwHtDdW82Ek';

async function testRLSWithAuth() {
  console.log('🔒 Testing RLS Policy with Authenticated User\n');
  console.log('='.repeat(80));
  console.log('');

  const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Generate session for CLI user
  const { data: sessionData, error: sessionError } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: 'cli@yodelmobile.com'
  });

  if (sessionError) {
    console.log('❌ Error generating session:', sessionError.message);
    return;
  }

  // Create authenticated client
  const urlParams = new URL(sessionData.properties.action_link).searchParams;
  const token = urlParams.get('token');

  const authClient = createClient(supabaseUrl, supabaseAnonKey);
  const { data: verifyData, error: verifyError } = await authClient.auth.verifyOtp({
    token_hash: token,
    type: 'magiclink'
  });

  if (verifyError) {
    console.log('❌ Error verifying token:', verifyError.message);
    return;
  }

  console.log('✅ Authenticated as:', verifyData.user?.email);
  console.log('   User ID:', verifyData.user?.id);
  console.log('');

  // Test 1: Query agency_clients with authenticated user (subject to RLS)
  console.log('🧪 TEST 1: Query agency_clients WITH RLS (as authenticated user)');
  const yodelOrgId = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

  const { data: agencyData, error: agencyError } = await authClient
    .from('agency_clients')
    .select('client_org_id')
    .eq('agency_org_id', yodelOrgId)
    .eq('is_active', true);

  if (agencyError) {
    console.log('❌ Error:', agencyError.message);
    console.log('   Code:', agencyError.code);
    console.log('   Details:', agencyError.details);
    console.log('   Hint:', agencyError.hint);
  } else {
    console.log('✅ Success!');
    console.log('   Found', agencyData?.length || 0, 'client organizations');
    if (agencyData && agencyData.length > 0) {
      agencyData.forEach(c => console.log('   -', c.client_org_id.substring(0, 8) + '...'));
    } else {
      console.log('   ⚠️  EMPTY RESULT - RLS is blocking!');
    }
  }
  console.log('');

  // Test 2: Query with service role for comparison
  console.log('🧪 TEST 2: Query agency_clients WITHOUT RLS (service role)');

  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
  const { data: serviceData, error: serviceError } = await serviceClient
    .from('agency_clients')
    .select('client_org_id')
    .eq('agency_org_id', yodelOrgId)
    .eq('is_active', true);

  if (serviceError) {
    console.log('❌ Error:', serviceError.message);
  } else {
    console.log('✅ Success!');
    console.log('   Found', serviceData?.length || 0, 'client organizations');
    if (serviceData && serviceData.length > 0) {
      serviceData.forEach(c => console.log('   -', c.client_org_id.substring(0, 8) + '...'));
    }
  }
  console.log('');

  // Test 3: Check user's roles
  console.log('🧪 TEST 3: Check user roles');

  const { data: rolesData, error: rolesError } = await serviceClient
    .from('user_roles')
    .select('*')
    .eq('user_id', verifyData.user.id);

  if (rolesError) {
    console.log('❌ Error:', rolesError.message);
  } else {
    console.log('   Found', rolesData?.length || 0, 'roles:');
    rolesData?.forEach(r => {
      const orgLabel = r.organization_id
        ? `in org ${r.organization_id.substring(0, 8)}...`
        : 'PLATFORM-WIDE';
      console.log(`   - ${r.role} ${orgLabel}`);
      if (r.organization_id === yodelOrgId) {
        console.log('     ✅ This is the Yodel Mobile org!');
      }
    });
  }
  console.log('');

  // Diagnosis
  console.log('='.repeat(80));
  console.log('📊 DIAGNOSIS:');
  console.log('='.repeat(80));
  console.log('');

  if (!agencyError && agencyData && agencyData.length > 0) {
    console.log('✅ RLS POLICY IS WORKING!');
    console.log('   Authenticated user CAN read agency_clients');
  } else if (agencyError) {
    console.log('❌ RLS POLICY ERROR');
    console.log('   Error:', agencyError.message);
  } else {
    console.log('❌ RLS POLICY IS BLOCKING ACCESS');
    console.log('');
    console.log('   Authenticated query: 0 results');
    console.log('   Service role query:', serviceData?.length || 0, 'results');
    console.log('');
    console.log('   This means the RLS policy exists but is not allowing access.');
    console.log('');
    console.log('   Possible causes:');
    console.log('   1. Policy condition is too restrictive');
    console.log('   2. auth.uid() is not matching the user_id');
    console.log('   3. User roles not being found in the policy subquery');
  }
  console.log('');
}

testRLSWithAuth().catch(console.error);
