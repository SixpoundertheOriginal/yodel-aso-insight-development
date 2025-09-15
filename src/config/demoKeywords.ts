export type DemoKeywordRow = {
  keyword: string
  popularity: number
  impressions: number
  results: number
  rank: number
  installs: number
}

type DemoKeywordPreset = {
  country: string
  appId: string
  rows: DemoKeywordRow[]
}

// Demo dataset for Next: Shop Fashion & Homeware (US)
export const DEMO_KEYWORDS: Record<string, DemoKeywordPreset> = {
  next: {
    country: 'gb',
    appId: '310633997',
    rows: [
      { keyword: 'next uk', popularity: 39, impressions: 2937, results: 189, rank: 1, installs: 1063 },
      { keyword: 'h m', popularity: 65, impressions: 50666, results: 220, rank: 6, installs: 201 },
      { keyword: 'new look', popularity: 55, impressions: 18426, results: 238, rank: 3, installs: 148 },
      { keyword: 'next app', popularity: 21, impressions: 363, results: 184, rank: 1, installs: 132 },
      { keyword: 'matalan', popularity: 53, impressions: 13081, results: 34, rank: 3, installs: 103 },
      { keyword: 'next home', popularity: 20, impressions: 284, results: 203, rank: 1, installs: 51 },
      { keyword: 'next pay app', popularity: 19, impressions: 232, results: 208, rank: 1, installs: 42 },
      { keyword: 'marks and spencers', popularity: 51, impressions: 10619, results: 211, rank: 3, installs: 85 },
      { keyword: 'nextpay', popularity: 18, impressions: 242, results: 236, rank: 1, installs: 43 },
      { keyword: 'primark shopping uk', popularity: 51, impressions: 10353, results: 222, rank: 4, installs: 285 },
      { keyword: 'primark', popularity: 52, impressions: 11938, results: 234, rank: 5, installs: 257 },
      { keyword: 'zara uk', popularity: 51, impressions: 10517, results: 201, rank: 5, installs: 56 },
      { keyword: 'm and s', popularity: 47, impressions: 6311, results: 219, rank: 3, installs: 52 },
      { keyword: 'primark uk', popularity: 48, impressions: 6931, results: 236, rank: 4, installs: 157 },
      { keyword: 'h m uk', popularity: 49, impressions: 8128, results: 204, rank: 5, installs: 16 },
      { keyword: 'river island', popularity: 52, impressions: 11436, results: 182, rank: 6, installs: 49 },
      { keyword: 'tk maxx uk', popularity: 56, impressions: 19207, results: 246, rank: 7, installs: 134 },
      { keyword: 'asos uk', popularity: 50, impressions: 8905, results: 179, rank: 6, installs: 23 },
      { keyword: 'river island uk', popularity: 43, impressions: 3773, results: 158, rank: 3, installs: 29 },
      { keyword: 'amazon uk', popularity: 49, impressions: 8377, results: 224, rank: 6, installs: 2 },
      { keyword: 'h and m', popularity: 51, impressions: 9983, results: 220, rank: 8, installs: 21 },
      { keyword: 'hobbycraft', popularity: 49, impressions: 8303, results: 196, rank: 7, installs: 9 },
      { keyword: 'mango uk', popularity: 40, impressions: 2634, results: 211, rank: 5, installs: 16 },
      { keyword: 'newlook', popularity: 36, impressions: 1995, results: 196, rank: 3, installs: 17 },
      { keyword: 'tkmaxx', popularity: 49, impressions: 7066, results: 228, rank: 9, installs: 47 },
      { keyword: 'george asda', popularity: 47, impressions: 7456, results: 83, rank: 7, installs: 94 },
      { keyword: 'debenhams', popularity: 47, impressions: 7466, results: 30, rank: 9, installs: 29 },
      { keyword: 'dunelm', popularity: 47, impressions: 6725, results: 181, rank: 9, installs: 59 },
      { keyword: 'h and m uk', popularity: 36, impressions: 1745, results: 221, rank: 5, installs: 35 },
      { keyword: 'tu clothing', popularity: 36, impressions: 2192, results: 238, rank: 5, installs: 47 },
      { keyword: 'littlewoods', popularity: 38, impressions: 2345, results: 37, rank: 6, installs: 12 },
      { keyword: 'm s shopping app', popularity: 43, impressions: 3886, results: 231, rank: 8, installs: 116 },
      { keyword: 'jacamo', popularity: 34, impressions: 1490, results: 14, rank: 5, installs: 9 },
      { keyword: 'gap uk', popularity: 32, impressions: 995, results: 171, rank: 4, installs: 57 },
      { keyword: 'mands', popularity: 30, impressions: 951, results: 223, rank: 3, installs: 8 },
      { keyword: 'peacocks clothing', popularity: 32, impressions: 875, results: 233, rank: 5, installs: 24 },
      { keyword: 'matalan uk', popularity: 29, impressions: 790, results: 70, rank: 3, installs: 30 },
      { keyword: 'tk maxx', popularity: 39, impressions: 4112, results: 227, rank: 8, installs: 29 },
      { keyword: 'new look fashion online', popularity: 21, impressions: 318, results: 229, rank: 2, installs: 6 },
      { keyword: 'john lewis', popularity: 43, impressions: 4002, results: 40, rank: 10, installs: 8 },
      { keyword: 'uniqlo uk', popularity: 42, impressions: 4013, results: 223, rank: 10, installs: 23 },
      { keyword: 'marks and spencer', popularity: 29, impressions: 828, results: 225, rank: 5, installs: 4 },
      { keyword: 'handm', popularity: 32, impressions: 1165, results: 213, rank: 6, installs: 3 },
      { keyword: 'tk max', popularity: 30, impressions: 906, results: 231, rank: 6, installs: 18 },
      { keyword: 'clarks', popularity: 23, impressions: 514, results: 112, rank: 3, installs: 23 },
      { keyword: '亚马逊', popularity: 36, impressions: 1115, results: 222, rank: 7, installs: 1 },
      { keyword: 'amazon fresh', popularity: 30, impressions: 895, results: 219, rank: 6, installs: 1 },
      { keyword: 'shopping uk', popularity: 15, impressions: 195, results: 239, rank: 2, installs: 3 },
      { keyword: 'yours clothing', popularity: 39, impressions: 2653, results: 239, rank: 10, installs: 1 },
      { keyword: 'mercado livre', popularity: 28, impressions: 837, results: 198, rank: 6, installs: 1 },
    ]
  }
}

export function getDemoKeywordsPreset(slug?: string | null) {
  if (!slug) return null
  return DEMO_KEYWORDS[slug.toLowerCase()] || null
}
