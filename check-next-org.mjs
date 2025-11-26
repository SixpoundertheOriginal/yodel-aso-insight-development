#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const { data } = await supabase
  .from('organizations')
  .select('id, name, slug, settings')
  .eq('id', '11111111-1111-1111-1111-111111111111')
  .single();

console.log('Next org:', JSON.stringify(data, null, 2));
