#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function disableDemoMode() {
  console.log('\n=== Disabling Demo Mode for All Organizations ===\n');

  const DEMO_ORG_IDS = [
    '550e8400-e29b-41d4-a716-446655440002', // Demo Analytics
    '11111111-1111-1111-1111-111111111111'  // Next
  ];

  for (const orgId of DEMO_ORG_IDS) {
    const { data: org } = await supabase
      .from('organizations')
      .select('name, settings')
      .eq('id', orgId)
      .single();

    if (!org) {
      console.log(`⚠️  Organization ${orgId} not found, skipping...`);
      continue;
    }

    console.log(`Processing: ${org.name}`);

    // Remove demo_mode from settings
    const newSettings = { ...(org.settings || {}) };
    delete newSettings.demo_mode;

    const { error } = await supabase
      .from('organizations')
      .update({ settings: newSettings })
      .eq('id', orgId);

    if (error) {
      console.error(`  ❌ Error updating ${org.name}:`, error);
    } else {
      console.log(`  ✅ Removed demo_mode from settings\n`);
    }
  }

  console.log('=== Demo Mode Disabled ===\n');
}

disableDemoMode();
