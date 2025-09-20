import React from 'react';
import PreviewSplash from '@/components/marketing/PreviewSplash';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldCheck, BarChart3, TrendingUp, Search, MessageSquare, Building2 } from 'lucide-react';
import { useDemoOrgDetection } from '@/hooks/useDemoOrgDetection';

const Section: React.FC<{ icon: React.ReactNode; title: string; blurb: string; }>
  = ({ icon, title, blurb }) => (
  <Card className="relative bg-zinc-900/60 border-zinc-800 overflow-hidden">
    {/* Left science accent bar */}
    <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-teal-400 via-cyan-400 to-teal-500" aria-hidden />
    {/* Inner subtle dot grid */}
    <div
      className="absolute inset-0 opacity-20 pointer-events-none"
      style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(45,212,191,0.25) 1px, transparent 1px)`,
        backgroundSize: '14px 14px',
      }}
      aria-hidden
    />
    <CardContent className="relative p-6 flex items-start gap-4">
      <div className="mt-1 text-teal-400" aria-hidden>
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="mt-1 text-zinc-300 leading-relaxed">{blurb}</p>
      </div>
    </CardContent>
  </Card>
);

const sections = [
  {
    icon: <BarChart3 className="h-6 w-6" />,
    title: 'Unified Analytics',
    blurb: 'Executive KPIs at a glance — impressions, downloads, revenue — with market filters across time and storefronts.'
  },
  {
    icon: <TrendingUp className="h-6 w-6" />,
    title: 'Traffic Source Intelligence',
    blurb: 'Attribution-ready breakdown of Search, Browse, and Paid to pinpoint growth impact and optimize spend.'
  },
  {
    icon: <ShieldCheck className="h-6 w-6" />,
    title: 'Conversion Benchmarks',
    blurb: 'Track conversion rate deltas vs industry standards and spotlight creative or listing changes that move the needle.'
  },
  {
    icon: <Search className="h-6 w-6" />,
    title: 'Keyword Intelligence',
    blurb: 'Live ranking trends, competitor watchlists, and growth terms to protect core positions and discover new demand.'
  },
  {
    icon: <MessageSquare className="h-6 w-6" />,
    title: 'Review Management',
    blurb: 'Understand sentiment and ratings across locales; triage feedback with AI summaries and public RSS export.'
  },
  {
    icon: <Building2 className="h-6 w-6" />,
    title: 'Enterprise Architecture',
    blurb: 'Security layers with tenant isolation and strict RLS; JSON-only APIs, feature flags, and compliance-first design.'
  },
];

const PreviewPage: React.FC = () => {
  const { isDemoOrg } = useDemoOrgDetection();
  const enabled = ((import.meta as any).env?.VITE_PREVIEW_PAGE_ENABLED === 'true')
    || ((import.meta as any).env?.VITE_DEMO_DEBUG === 'true')
    || isDemoOrg;
  if (!enabled) {
    // Soft 404 to dashboard if disabled
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-300">
        <div className="text-center">
          <p className="text-sm">Preview is disabled.</p>
          <a href="/dashboard" className="text-teal-400 underline">Go to dashboard</a>
        </div>
      </div>
    );
  }

  return (
    <main className="bg-zinc-950">
      {/* Hero */}
      <PreviewSplash
        title="Yodel ASO Insights"
        subtitle="Unify analytics, accelerate growth, and secure your storefronts with enterprise-grade ASO intelligence."
        primaryCta={{ label: 'Get Started', href: '/auth/sign-in' }}
        secondaryCta={{ label: 'Learn More', href: '/#features', variant: 'outline' }}
      />

      {/* Feature pillars */}
      <section id="features" className="relative">
        {/* Scientific background accents: vertical columns and soft glows */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(600px 200px at 80% 10%, rgba(20,184,166,0.10), transparent 60%),
              radial-gradient(400px 180px at 20% 30%, rgba(34,211,238,0.08), transparent 60%),
              repeating-linear-gradient(
                to right,
                rgba(45,212,191,0.06) 0px,
                rgba(45,212,191,0.06) 1px,
                transparent 1px,
                transparent 80px
              )
            `,
          }}
        />

        <div className="container mx-auto px-4 py-12 md:py-20 relative">
          <div className="max-w-3xl mx-auto text-center mb-10 md:mb-14">
            <h2 className="text-2xl md:text-3xl font-bold text-white">Built for Growth Teams</h2>
            <p className="mt-3 text-zinc-300">Six pillars that align strategy with execution across search, browse, and conversion.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
            {sections.map((s) => (
              <Section key={s.title} icon={s.icon} title={s.title} blurb={s.blurb} />
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 via-cyan-400/10 to-teal-500/10" aria-hidden />
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center">
            <h3 className="text-2xl md:text-3xl font-bold text-white">Ready to preview the platform?</h3>
            <p className="mt-3 text-zinc-300">Sign in to explore the demo organization or contact us for enterprise access.</p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <a href="/auth/sign-in" className="inline-block">
                <button className="px-6 h-11 rounded-md bg-teal-500 hover:bg-teal-400 text-black font-semibold focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-zinc-950">
                  Sign In
                </button>
              </a>
              <a href="/contact" className="inline-block">
                <button className="px-6 h-11 rounded-md border border-teal-500/60 text-teal-300 hover:bg-teal-500/10 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-zinc-950">
                  Contact Sales
                </button>
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default PreviewPage;
