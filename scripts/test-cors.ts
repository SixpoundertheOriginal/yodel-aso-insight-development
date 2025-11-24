/**
 * CORS Diagnostic Script
 *
 * Tests if Supabase project CORS is properly configured for localhost:8080
 */

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const ORIGIN = 'http://localhost:8080';

async function testCORS() {
  console.log('🔍 CORS Diagnostic Test\n');
  console.log('='.repeat(70));
  console.log(`Testing CORS for: ${ORIGIN}`);
  console.log(`Supabase Project: ${SUPABASE_URL}`);
  console.log('='.repeat(70) + '\n');

  // Test 1: Auth API
  console.log('1️⃣  Testing Auth API CORS...');
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      method: 'GET',
      headers: {
        'Origin': ORIGIN
      }
    });

    const corsHeader = response.headers.get('access-control-allow-origin');

    if (corsHeader === ORIGIN || corsHeader === '*') {
      console.log('   ✅ Auth API CORS: WORKING');
      console.log(`   ✅ Access-Control-Allow-Origin: ${corsHeader}`);
    } else {
      console.log('   ❌ Auth API CORS: BLOCKED');
      console.log(`   ❌ Access-Control-Allow-Origin: ${corsHeader || 'NOT PRESENT'}`);
      console.log('   ❌ Expected:', ORIGIN);
    }
  } catch (error: any) {
    console.log('   ❌ Auth API CORS: FAILED');
    console.log('   ❌ Error:', error.message);
  }

  // Test 2: REST API (Database)
  console.log('\n2️⃣  Testing REST API (Database) CORS...');
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'OPTIONS',
      headers: {
        'Origin': ORIGIN,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'apikey,authorization'
      }
    });

    const corsHeader = response.headers.get('access-control-allow-origin');

    if (corsHeader === ORIGIN || corsHeader === '*') {
      console.log('   ✅ REST API CORS: WORKING');
      console.log(`   ✅ Access-Control-Allow-Origin: ${corsHeader}`);
    } else {
      console.log('   ❌ REST API CORS: BLOCKED');
      console.log(`   ❌ Access-Control-Allow-Origin: ${corsHeader || 'NOT PRESENT'}`);
      console.log('   ❌ Expected:', ORIGIN);
    }
  } catch (error: any) {
    console.log('   ❌ REST API CORS: FAILED');
    console.log('   ❌ Error:', error.message);
  }

  // Test 3: Edge Functions
  console.log('\n3️⃣  Testing Edge Functions CORS...');
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/save-monitored-app`, {
      method: 'OPTIONS',
      headers: {
        'Origin': ORIGIN,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'apikey,authorization,content-type'
      }
    });

    const corsHeader = response.headers.get('access-control-allow-origin');

    if (corsHeader === ORIGIN || corsHeader === '*') {
      console.log('   ✅ Edge Functions CORS: WORKING');
      console.log(`   ✅ Access-Control-Allow-Origin: ${corsHeader}`);
    } else {
      console.log('   ❌ Edge Functions CORS: BLOCKED');
      console.log(`   ❌ Access-Control-Allow-Origin: ${corsHeader || 'NOT PRESENT'}`);
      console.log('   ❌ Expected:', ORIGIN);
    }
  } catch (error: any) {
    console.log('   ❌ Edge Functions CORS: FAILED');
    console.log('   ❌ Error:', error.message);
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 SUMMARY');
  console.log('='.repeat(70));
  console.log('\nIf you see ❌ CORS: BLOCKED errors above:');
  console.log('');
  console.log('👉 ACTION REQUIRED:');
  console.log('   1. Open: https://supabase.com/dashboard/project/bkbcqocpjahewqjmlgvf');
  console.log('   2. Go to: Project Settings → API → CORS Allowed Origins');
  console.log('   3. Add: http://localhost:8080');
  console.log('   4. Save and wait 30 seconds');
  console.log('   5. Re-run this script to verify');
  console.log('');
  console.log('📖 Full guide: docs/CORS_FIX_GUIDE.md');
  console.log('='.repeat(70) + '\n');
}

// Run in Node.js environment
if (typeof fetch === 'undefined') {
  console.error('❌ This script requires Node.js 18+ with native fetch support');
  console.log('   Run with: node --version (should be v18.0.0 or higher)');
  console.log('   Or use: npx tsx scripts/test-cors.ts');
  process.exit(1);
}

testCORS().catch(console.error);
