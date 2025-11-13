#!/usr/bin/env node
/**
 * DISABLE FEATURES FOR YODEL MOBILE ORGANIZATION
 *
 * This script disables theme_analysis and competitor_overview features
 * for Yodel Mobile organization only.
 *
 * Usage: node disable-yodel-mobile-features.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read .env.local file
let envContent = '';
try {
  envContent = readFileSync('.env.local', 'utf-8');
} catch (e) {
  try {
    envContent = readFileSync('.env', 'utf-8');
  } catch (e2) {
    console.error('❌ Could not find .env.local or .env file');
  }
}

// Parse environment variables
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.+)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  }
});

const SUPABASE_URL = envVars.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   VITE_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const YODEL_MOBILE_ORG_ID = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

async function disableFeatures() {
  console.log('🔧 Disabling features for Yodel Mobile organization...\n');

  // Feature 1: theme_analysis
  console.log('1️⃣  Disabling theme_analysis...');
  const { data: theme, error: themeError } = await supabase
    .from('organization_features')
    .upsert({
      organization_id: YODEL_MOBILE_ORG_ID,
      feature_key: 'theme_analysis',
      is_enabled: false,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'organization_id,feature_key'
    })
    .select()
    .single();

  if (themeError) {
    console.error('   ❌ Error:', themeError.message);
  } else {
    console.log('   ✅ theme_analysis disabled');
    console.log('   📄 Record:', theme);
  }

  // Feature 2: competitor_overview
  console.log('\n2️⃣  Disabling competitor_overview...');
  const { data: competitor, error: competitorError } = await supabase
    .from('organization_features')
    .upsert({
      organization_id: YODEL_MOBILE_ORG_ID,
      feature_key: 'competitor_overview',
      is_enabled: false,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'organization_id,feature_key'
    })
    .select()
    .single();

  if (competitorError) {
    console.error('   ❌ Error:', competitorError.message);
  } else {
    console.log('   ✅ competitor_overview disabled');
    console.log('   📄 Record:', competitor);
  }

  // Verify changes
  console.log('\n🔍 Verifying changes...');
  const { data: features, error: verifyError } = await supabase
    .from('organization_features')
    .select('*')
    .eq('organization_id', YODEL_MOBILE_ORG_ID)
    .in('feature_key', ['theme_analysis', 'competitor_overview']);

  if (verifyError) {
    console.error('   ❌ Verification failed:', verifyError.message);
  } else {
    console.log('   ✅ Current organization_features for Yodel Mobile:');
    console.table(features);
  }

  // Get organization details
  console.log('\n📋 Organization Details:');
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, slug, created_at')
    .eq('id', YODEL_MOBILE_ORG_ID)
    .single();

  if (orgError) {
    console.error('   ❌ Error:', orgError.message);
  } else {
    console.log('   Organization:', org.name);
    console.log('   Slug:', org.slug);
    console.log('   ID:', org.id);
  }

  console.log('\n✅ Done! Features disabled for Yodel Mobile organization.');
  console.log('\n📝 What happens now:');
  console.log('   1. cli@yodelmobile.com will NOT see Theme Analysis or Competitor Overview in navigation');
  console.log('   2. Direct URL access will redirect to /dashboard-v2');
  console.log('   3. igor@yodelmobile.com (super admin) will still have access');
  console.log('   4. All other organizations will retain access to both features');
}

async function rollback() {
  console.log('🔄 ROLLBACK: Re-enabling features for Yodel Mobile organization...\n');

  const { data, error } = await supabase
    .from('organization_features')
    .delete()
    .eq('organization_id', YODEL_MOBILE_ORG_ID)
    .in('feature_key', ['theme_analysis', 'competitor_overview'])
    .select();

  if (error) {
    console.error('❌ Rollback failed:', error.message);
  } else {
    console.log('✅ Rollback complete. Deleted records:');
    console.table(data);
    console.log('\n📝 Features are now enabled again (default state).');
  }
}

// Main execution
const args = process.argv.slice(2);
if (args.includes('--rollback')) {
  rollback();
} else {
  disableFeatures();
}
