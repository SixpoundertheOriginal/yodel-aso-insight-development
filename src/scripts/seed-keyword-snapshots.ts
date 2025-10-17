// @ts-nocheck - Tables referenced in this file don't exist in current database schema
import fs from 'node:fs/promises';
import path from 'node:path';

import type { Database } from '@/integrations/supabase/types';

type KeywordSnapshotInsert = Database['public']['Tables']['keyword_ranking_snapshots']['Insert'];

type KeywordSnapshotRow = Database['public']['Tables']['keyword_ranking_snapshots']['Row'];

type SupabaseClientType = typeof import('@/integrations/supabase/client')['supabase'];
type KeywordRankingServiceType = typeof import('@/services/keyword-ranking.service')['keywordRankingService'];

type LoadedClients = {
  supabase: SupabaseClientType;
  keywordRankingService: KeywordRankingServiceType;
};

type SeedApp = {
  name: string;
  appId: string;
};

type LocalStorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
};

const SEED_APPS: SeedApp[] = [
  { name: 'MyFitnessPal', appId: '341232718' },
  { name: 'Mint', appId: '300238550' },
  { name: 'Instagram', appId: '389801252' },
  { name: 'TikTok', appId: '1235601864' },
  { name: 'Spotify', appId: '324684580' }
];

const BASE_KEYWORDS = [
  'fitness',
  'budget',
  'photo editor',
  'music',
  'travel'
];

const EXTENDED_KEYWORDS = [
  'fitness app',
  'fitness tracker',
  'health tracker',
  'calorie counter',
  'budget app',
  'budget planner',
  'expense tracker',
  'money management',
  'photo filter',
  'selfie editor',
  'video editor',
  'music streaming',
  'playlist maker',
  'travel planner',
  'flight deals'
];

const KEYWORDS_PER_APP = 20;
const RATE_LIMIT_DELAY_MS = 500;
const SNAPSHOT_CSV_DIR = path.resolve(process.cwd(), 'exports');

function ensureLocalStorage() {
  const globalAny = globalThis as unknown as { localStorage?: LocalStorageLike };

  if (!globalAny.localStorage) {
    const memoryStore = new Map<string, string>();
    const localStoragePolyfill: LocalStorageLike = {
      getItem: (key) => memoryStore.get(key) ?? null,
      setItem: (key, value) => {
        memoryStore.set(key, value);
      },
      removeItem: (key) => {
        memoryStore.delete(key);
      },
      clear: () => {
        memoryStore.clear();
      }
    };

    globalAny.localStorage = localStoragePolyfill;
  }
}

function buildKeywordList(): string[] {
  const combined = new Set<string>();
  [...BASE_KEYWORDS, ...EXTENDED_KEYWORDS].forEach((kw) => combined.add(kw));

  const keywords = Array.from(combined).map((kw) => kw.trim()).filter(Boolean);

  if (keywords.length < KEYWORDS_PER_APP) {
    throw new Error(`Not enough keywords to satisfy ${KEYWORDS_PER_APP} per app (have ${keywords.length}).`);
  }

  return keywords.slice(0, KEYWORDS_PER_APP);
}

function estimateDifficulty(rank: number | null): number | null {
  if (!rank) return null;
  if (rank <= 10) return 85;
  if (rank <= 50) return 65;
  if (rank <= 200) return 40;
  return null;
}

async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchSeedOrganizationId(supabaseClient: SupabaseClientType): Promise<string> {
  const explicit = process.env.SEED_ORGANIZATION_ID;
  if (explicit) {
    return explicit;
  }

  const { data, error } = await supabaseClient
    .from('organizations')
    .select('id, name')
    .order('created_at', { ascending: true })
    .limit(1);

  if (error) {
    throw new Error(`Failed to fetch organizations: ${error.message}`);
  }

  const organization = data?.[0];
  if (!organization) {
    console.log('ℹ️ No organizations found. Creating one via RPC...');

    const orgName = 'Seed Keyword Organization';
    const orgSlug = `seed-keyword-org-${Date.now()}`;

    const { data: createdOrgId, error: createOrgError } = await supabaseClient.rpc('create_organization_and_assign_admin', {
      org_name: orgName,
      org_slug: orgSlug
    });

    if (createOrgError) {
      throw new Error(`Failed to create organization via RPC: ${createOrgError.message}`);
    }

    if (!createdOrgId) {
      throw new Error('Organization RPC returned empty result. Set SEED_ORGANIZATION_ID to proceed.');
    }

    console.log(`🌱 Created organization ${orgName} (${createdOrgId})`);
    return createdOrgId as string;
  }

  console.log(`🌱 Using organization ${organization.name ?? organization.id} (${organization.id})`);
  return organization.id;
}

async function loadSupabase(): Promise<LoadedClients> {
  ensureLocalStorage();
  const [{ supabase }, { keywordRankingService }] = await Promise.all([
    import('@/integrations/supabase/client'),
    import('@/services/keyword-ranking.service')
  ]);

  return { supabase, keywordRankingService };
}

async function ensureSupabaseAuth(supabaseClient: SupabaseClientType): Promise<void> {
  const email = process.env.SEED_SUPABASE_EMAIL;
  const password = process.env.SEED_SUPABASE_PASSWORD;

  if (!email || !password) {
    throw new Error('Supabase credentials not provided. Set SEED_SUPABASE_EMAIL and SEED_SUPABASE_PASSWORD.');
  }

  const signIn = await supabaseClient.auth.signInWithPassword({ email, password });

  if (!signIn.error) {
    const userEmail = signIn.data.user?.email ?? email;
    console.log(`🔐 Authenticated to Supabase as ${userEmail}`);
    return;
  }

  if (signIn.error && signIn.error.message !== 'Invalid login credentials') {
    throw new Error(`Failed to authenticate with Supabase: ${signIn.error.message}`);
  }

  console.log('ℹ️ Supabase user not found. Attempting to sign up with provided credentials...');
  const signUp = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: 'Seed',
        last_name: 'User'
      }
    }
  });

  if (signUp.error) {
    throw new Error(`Failed to create Supabase user: ${signUp.error.message}`);
  }

  const finalSignIn = await supabaseClient.auth.signInWithPassword({ email, password });
  if (finalSignIn.error) {
    throw new Error(`Failed to authenticate newly created user: ${finalSignIn.error.message}`);
  }

  const userEmail = finalSignIn.data.user?.email ?? email;
  console.log(`🔐 Authenticated to Supabase as ${userEmail}`);
}

async function fetchExistingSnapshotKeys(
  supabaseClient: LoadedClients['supabase'],
  organizationId: string,
  snapshotDate: string
): Promise<Set<string>> {
  const { data, error } = await supabaseClient
    .from('keyword_ranking_snapshots')
    .select('app_id, keyword')
    .eq('organization_id', organizationId)
    .eq('snapshot_date', snapshotDate);

  if (error) {
    console.warn(`⚠️ Failed to fetch existing snapshots: ${error.message}`);
    return new Set();
  }

  const existing = new Set<string>();
  data?.forEach((row) => {
    existing.add(`${row.app_id}|${row.keyword.toLowerCase()}`);
  });
  return existing;
}

function buildCsv(rows: KeywordSnapshotRow[]): string {
  const header = [
    'id',
    'organization_id',
    'app_id',
    'keyword',
    'rank',
    'snapshot_date',
    'search_volume',
    'difficulty_score',
    'created_at'
  ];

  const csvLines = rows.map((row) => [
    row.id,
    row.organization_id,
    row.app_id,
    row.keyword,
    row.rank ?? '',
    row.snapshot_date ?? '',
    row.search_volume ?? '',
    row.difficulty_score ?? '',
    row.created_at ?? ''
  ].map((value) => {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    return stringValue.includes(',') ? `"${stringValue.replace(/"/g, '""')}"` : stringValue;
  }).join(','));

  return [header.join(','), ...csvLines].join('\n');
}

async function ensureOutputDir() {
  try {
    await fs.mkdir(SNAPSHOT_CSV_DIR, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
  }
}

async function writeCsv(rows: KeywordSnapshotRow[], snapshotDate: string) {
  await ensureOutputDir();
  const filename = `keyword-snapshots-${snapshotDate}.csv`;
  const filePath = path.join(SNAPSHOT_CSV_DIR, filename);
  const csv = buildCsv(rows);
  await fs.writeFile(filePath, csv, 'utf8');
  console.log(`📄 CSV summary written to ${filePath}`);
}

async function main() {
  const clients = await loadSupabase();
  const { supabase, keywordRankingService } = clients;
  await ensureSupabaseAuth(supabase);
  const keywordList = buildKeywordList();
  const organizationId = await fetchSeedOrganizationId(supabase);
  const snapshotDate = new Date().toISOString().split('T')[0];
  const existingKeys = await fetchExistingSnapshotKeys(supabase, organizationId, snapshotDate);
  const insertedRows: KeywordSnapshotRow[] = [];

  const rankBuckets: { top10: number; mid: number; longTail: number; nulls: number } = {
    top10: 0,
    mid: 0,
    longTail: 0,
    nulls: 0
  };

  for (const app of SEED_APPS) {
    for (const keyword of keywordList) {
      const normalizedKey = `${app.appId}|${keyword.toLowerCase()}`;
      if (existingKeys.has(normalizedKey)) {
        console.log(`⏭️  Skipping existing snapshot for ${app.name} / "${keyword}"`);
        continue;
      }

      try {
        const result = await keywordRankingService.checkKeywordRanking(keyword, app.appId, {
          organizationId,
          cacheEnabled: false,
          country: 'us',
          serpMaxPages: 5,
          serpDeepScan: true
        });

        const rank = result?.position && result.position > 0 && result.position <= 200 ? result.position : null;
        const searchVolume = result?.searchResults ?? null;
        const difficultyScore = estimateDifficulty(rank);

        if (rank === null) {
          rankBuckets.nulls += 1;
        } else if (rank <= 10) {
          rankBuckets.top10 += 1;
        } else if (rank <= 50) {
          rankBuckets.mid += 1;
        } else {
          rankBuckets.longTail += 1;
        }

        console.log(`Checking '${keyword}' for ${app.name}... Rank: ${rank ?? 'N/A'}`);

        const record: KeywordSnapshotInsert = {
          organization_id: organizationId,
          app_id: app.appId,
          keyword,
          rank,
          snapshot_date: snapshotDate,
          search_volume: searchVolume,
          difficulty_score: difficultyScore
        };

        const { data, error } = await supabase
          .from('keyword_ranking_snapshots')
          .insert(record)
          .select()
          .maybeSingle();

        if (error) {
          console.error(`❌ Failed to insert snapshot for ${app.name} / "${keyword}": ${error.message}`);
        } else if (data) {
          insertedRows.push(data);
          existingKeys.add(normalizedKey);
        }
      } catch (error) {
        console.error(`⚠️ Error processing ${app.name} / "${keyword}": ${(error as Error).message}`);
      }

      await delay(RATE_LIMIT_DELAY_MS);
    }
  }

  console.log('📊 Seed summary:');
  console.log(`   Total snapshots attempted: ${SEED_APPS.length * keywordList.length}`);
  console.log(`   Inserted snapshots: ${insertedRows.length}`);
  console.log(`   Top 1-10 ranks: ${rankBuckets.top10}`);
  console.log(`   Mid-range 11-50 ranks: ${rankBuckets.mid}`);
  console.log(`   Long-tail 51-200 ranks: ${rankBuckets.longTail}`);
  console.log(`   Null ranks: ${rankBuckets.nulls}`);

  if (insertedRows.length === 0) {
    console.warn('⚠️ No snapshots were inserted.');
    return;
  }

  const nonNullRanks = insertedRows.filter((row) => row.rank !== null).length;
  console.log(`   Non-null ranks inserted: ${nonNullRanks}`);

  await writeCsv(insertedRows, snapshotDate);
}

main().catch((error) => {
  console.error('❌ Seeding script failed:', error);
  process.exit(1);
});
