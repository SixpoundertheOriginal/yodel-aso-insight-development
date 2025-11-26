#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function checkSchema() {
  const { data, error } = await supabase
    .from('organization_features')
    .select('*')
    .limit(1);

  if (error) {
    console.log('Error:', error);
  } else {
    console.log('Sample row:', JSON.stringify(data[0], null, 2));
    console.log('\nColumns:', Object.keys(data[0] || {}));
  }
}

checkSchema();
