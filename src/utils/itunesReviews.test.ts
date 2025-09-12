import { beforeEach, describe, expect, it, vi } from 'vitest';
import { searchApps } from './itunesReviews';

vi.mock('@/integrations/supabase/client', () => {
  return {
    supabase: {
      functions: {
        invoke: vi.fn(),
      },
    },
  };
});

describe('itunesReviews.searchApps', () => {
  const invoke = (await import('@/integrations/supabase/client')).supabase.functions
    .invoke as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    invoke.mockReset();
  });

  it('returns top 5 results from SDK invoke(itunes)', async () => {
    const results = Array.from({ length: 8 }).map((_, i) => ({
      name: `App ${i + 1}`,
      appId: String(1000 + i),
      developer: 'Dev',
      rating: 4.5,
      reviews: 100 + i,
      icon: 'icon.png',
      applicationCategory: 'Utilities',
    }));

    invoke.mockResolvedValueOnce({ data: { results }, error: null });

    const out = await searchApps({ term: 'test', country: 'us', limit: 15 });
    expect(out).toHaveLength(5);
    expect(out[0].name).toBe('App 1');
  });
});
