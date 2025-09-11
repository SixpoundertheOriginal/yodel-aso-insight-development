#!/usr/bin/env node

// Debug test script for /whoami endpoint
// Usage: node debug-whoami-test.js

const fetch = require('node-fetch');

async function testWhoami() {
  console.log('=== WHOAMI DEBUG TEST ===');
  console.log('This will test the /whoami endpoint with debug logging');
  console.log('You need to:');
  console.log('1. Log in as demo@next-demo.com in your browser');
  console.log('2. Open browser dev tools > Application > Cookies');
  console.log('3. Copy the sb-bkbcqocpjahewqjmlgvf-auth-token value');
  console.log('4. Set it as SUPABASE_AUTH_TOKEN env var');
  console.log();
  
  const authToken = process.env.SUPABASE_AUTH_TOKEN;
  if (!authToken) {
    console.error('❌ Missing SUPABASE_AUTH_TOKEN environment variable');
    console.log('Get it from browser cookies after logging in as demo@next-demo.com');
    process.exit(1);
  }

  console.log('✅ Found auth token, length:', authToken.length);
  
  try {
    const response = await fetch('https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/admin-whoami', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('\n=== RESPONSE STATUS ===');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    console.log('\n=== RESPONSE HEADERS ===');
    for (const [key, value] of response.headers) {
      console.log(`${key}: ${value}`);
    }

    const responseText = await response.text();
    console.log('\n=== RESPONSE BODY ===');
    console.log(responseText);

    // Try to parse as JSON
    try {
      const jsonData = JSON.parse(responseText);
      console.log('\n=== PARSED JSON ===');
      console.log(JSON.stringify(jsonData, null, 2));
    } catch (e) {
      console.log('❌ Response is not valid JSON');
    }

  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }

  console.log('\n=== CHECK SUPABASE LOGS ===');
  console.log('1. Go to: https://supabase.com/dashboard/project/bkbcqocpjahewqjmlgvf/functions');
  console.log('2. Click on "admin-whoami" function');
  console.log('3. Go to "Logs" tab');
  console.log('4. Look for [DEBUG/WHOAMI] entries');
  console.log('5. Paste those logs for analysis');
}

testWhoami().catch(console.error);