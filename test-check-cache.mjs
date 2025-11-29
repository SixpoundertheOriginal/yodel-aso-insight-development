/**
 * Check what's in the metadata cache for Inspire app
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkCache() {
  const { data, error } = await supabase
    .from('app_metadata_cache')
    .select('*')
    .eq('app_id', '6477780060')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('📦 Cached Metadata for Inspire (6477780060):\n');
  console.log(`  App Name: ${data.app_name}`);
  console.log(`  Title: ${data.title}`);
  console.log(`  Subtitle: ${data.subtitle || 'NULL'}`);
  console.log(`  Subtitle Length: ${data.subtitle?.length || 0}`);
  console.log(`  Description Length: ${data.description?.length || 0}`);
  console.log(`  Created: ${data.created_at}`);
  console.log(`\n  First 100 chars of subtitle: "${(data.subtitle || '').substring(0, 100)}"`);
}

checkCache();
