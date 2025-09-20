Centralized Chart Design Guide
================================

Purpose
- Ensure every chart across the app shares one brand look and feel.
- Make new charts trivial to implement without re‑inventing tooltip/legend/axes.
- Prevent drift by discouraging direct Recharts usage in page/components.

Core building blocks
- BrandLineChart (preferred): src/components/charts/BrandLineChart.tsx
- Design system primitives (do not bypass): src/components/ui/chart.tsx
  - ChartContainer (injects CSS vars, unified axis/grid/tooltip/legend styles)
  - ChartTooltip, ChartTooltipContent
  - ChartLegend, ChartLegendContent
- Color tokens
  - Metric series: src/utils/chartConfig.ts (chartColors)
  - Traffic sources: src/utils/trafficSourceColors.ts (TRAFFIC_SOURCE_COLORS)

How to add a line chart
1) Prepare your data array with a date-like xKey and numeric series keys:
   const data = [ { date: '2025-01-01', impressions: 1000, downloads: 200 }, ... ]
2) Build your series array with labels and colors:
   const series = [
     { key: 'impressions', label: 'Impressions', color: chartColors.impressions },
     { key: 'downloads', label: 'Downloads', color: chartColors.downloads },
   ];
3) Render with BrandLineChart:
   <BrandLineChart data={data} series={series} height={450} tooltipIndicator="dot" showLegend />

Grid/axes/tooltip/legend
- Provided by ChartContainer and styled globally; do not override per chart.
- X ticks: BrandLineChart formats dates consistently (short month + day; day only on mobile).
- Y ticks: Locale number formatting by default.

Containers
- Use PremiumCard for all dashboard charts for consistent chrome:
  - variant="glow" intensity="strong" glowColor="blue"
  - Header: PremiumTypography.SectionTitle + optional StatusIndicator
  - Content padding: p-8
- Height: default to 450 for parity between pages.

Do’s and Don’ts
- DO use BrandLineChart for all line charts.
- DO use chartColors/TRAFFIC_SOURCE_COLORS for palette consistency.
- DO keep xKey raw (BrandLineChart handles formatting).
- DON’T import Recharts directly in pages or arbitrary components.
- DON’T style tooltips/legends/axes per chart — keep it centralized.

Future chart types
- Prefer adding BrandBarChart / BrandAreaChart here using the same pattern.
- Keep all Recharts wiring inside Brand* components or ui/chart.tsx primitives.

Enforcement (recommended)
- ESLint rule or CI check that rejects direct imports of 'recharts' outside:
  - src/components/ui/chart.tsx
  - src/components/charts/* (centralized Brand* components only)
- Simple CI grep example:
  rg -n "from 'recharts'" src | rg -v "src/components/(ui|charts)/"

Testing/Docs
- Consider Storybook stories for BrandLineChart permutations.
- Visual QA across light/dark themes and mobile breakpoints.

Examples in codebase
- Executive Dashboard time series rebuilt with BrandLineChart in src/pages/overview.tsx
- Analytics Performance Over Time rebuilt with BrandLineChart in src/pages/dashboard.tsx

Questions
- If a new metric or traffic source is added, update chartColors or TRAFFIC_SOURCE_COLORS accordingly.
