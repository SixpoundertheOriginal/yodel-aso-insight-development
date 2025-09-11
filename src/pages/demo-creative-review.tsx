import React, { useEffect, useState } from 'react';
import { MainLayout } from '@/layouts';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { assertJsonResponse } from '@/lib/http/assertJsonResponse';

type DemoResponse = {
  meta: { org_id: string; generated_at: string; source: string };
  summary: { asset_gaps: number; priority: string };
  findings: { id: string; title: string; impact: string }[];
  recommendations: { id: string; steps: string[] }[];
};

export default function DemoCreativeReviewPage() {
  const [data, setData] = useState<DemoResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/demo-creative-review-summary`, {
          headers: { Authorization: `Bearer ${token || ''}` },
        });
        assertJsonResponse(res);
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error || 'Request failed');
        setData(body as DemoResponse);
      } catch (e: any) {
        setError(e?.message || String(e));
      }
    })();
  }, []);

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Creative Review (Demo)</h1>
        {error && <div className="text-sm text-red-500">Error: {error}</div>}
        {data && (
          <>
            <Card className="bg-background/60 border-border">
              <CardContent className="p-4 text-sm text-muted-foreground">
                Org: {data.meta.org_id} · Generated: {new Date(data.meta.generated_at).toLocaleString()} · Source: {data.meta.source}
              </CardContent>
            </Card>
            <Card className="bg-background/60 border-border">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Summary</div>
                <div className="text-foreground">Asset gaps: {data.summary.asset_gaps} · Priority: {data.summary.priority}</div>
              </CardContent>
            </Card>
            <Card className="bg-background/60 border-border">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground mb-2">Findings</div>
                <ul className="list-disc pl-5 text-foreground text-sm">
                  {data.findings.map(f => (<li key={f.id}>{f.title} — {f.impact}</li>))}
                </ul>
              </CardContent>
            </Card>
            <Card className="bg-background/60 border-border">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground mb-2">Recommendations</div>
                <ul className="list-disc pl-5 text-foreground text-sm">
                  {data.recommendations.map(r => (<li key={r.id}>{r.steps.join(', ')}</li>))}
                </ul>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  );
}
