#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function getAllFeatureKeys() {
  const { data, error } = await supabase
    .from('organization_features')
    .select('feature_key')
    .order('feature_key');

  if (error) {
    console.error('Error:', error);
    return;
  }

  const uniqueKeys = [...new Set(data.map(d => d.feature_key))].sort();

  console.log('\n=== All Feature Keys in Database ===\n');
  console.log(`Found ${uniqueKeys.length} unique feature keys:\n`);

  uniqueKeys.forEach(key => {
    console.log(`  - ${key}`);
  });

  console.log('\n\n=== SQL INSERT Format ===\n');
  uniqueKeys.forEach(key => {
    const name = key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    console.log(`  ('${key}', '${name}', 'Feature: ${name}', 'other', true),`);
  });
}

getAllFeatureKeys();
