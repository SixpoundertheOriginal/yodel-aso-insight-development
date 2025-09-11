import React, { useMemo } from 'react';
import { useAsoData } from '@/context/AsoDataContext';
import { useKpiData } from '@/hooks/useKpiData';
import type { StandardKpiData, StandardKpiMetric } from '@/types/kpiData';

type Props = {
  label: string;
  trafficSourceView: string;
  includeDerivedMetrics: boolean;
};

type CoreKey = 'impressions' | 'downloads' | 'product_page_views' | 'product_page_cvr' | 'impressions_cvr';
type DerivedKey = 'true_search_impressions' | 'true_search_downloads';

const FORMAT = (key: string, val: number): string => {
  const isPct = key.endsWith('_cvr');
  return isPct ? `${val.toFixed(1)}%` : new Intl.NumberFormat('en-US').format(val);
};

const approxEqual = (key: string, a: number, b: number): boolean => {
  const tol = key.endsWith('_cvr') ? 0.1 : 0.5; // tighter for %
  return Math.abs(a - b) <= tol;
};

export const KpiDataConsistencyTest: React.FC<Props> = ({ label, trafficSourceView, includeDerivedMetrics }) => {
  const debugAudit = (import.meta as any).env?.VITE_DEBUG_KPI_AUDIT === 'true';
  if (!debugAudit) return null;

  const { data } = useAsoData();
  const { kpiData } = useKpiData({ trafficSourceView, includeDerivedMetrics });

  const rows = useMemo(() => {
    const core: CoreKey[] = ['impressions', 'downloads', 'product_page_views', 'product_page_cvr', 'impressions_cvr'];
    const derived: DerivedKey[] = includeDerivedMetrics && trafficSourceView === 'true-organic-search'
      ? ['true_search_impressions', 'true_search_downloads']
      : [];
    const keys: (CoreKey | DerivedKey)[] = [...core, ...derived];

    const baseline = (key: string): StandardKpiMetric | undefined => {
      const s = data?.summary;
      if (!s) return undefined;
      switch (key) {
        case 'impressions': return s.impressions;
        case 'downloads': return s.downloads;
        case 'product_page_views': return s.product_page_views;
        case 'product_page_cvr': return s.product_page_cvr;
        case 'impressions_cvr': return s.impressions_cvr;
        default: return undefined; // derived not in summary
      }
    };

    return keys.map((key) => {
      const exec = (kpiData as StandardKpiData)[key as keyof StandardKpiData];
      const anal = baseline(key);
      const hasBaseline = anal !== undefined;
      const match = hasBaseline ? approxEqual(key, exec.value, anal!.value) : null;
      if (hasBaseline && match === false) {
        // eslint-disable-next-line no-console
        console.log('[KPIConsistency]', { label, key, exec: exec.value, analytics: anal!.value });
      }
      return {
        key,
        execVal: exec.value,
        analVal: hasBaseline ? anal!.value : null,
        status: match === null ? 'N/A' : match ? 'OK' : 'MISMATCH',
      };
    });
  }, [data?.summary, kpiData, label, includeDerivedMetrics, trafficSourceView]);

  if (!data || !data.summary) {
    return <div className="mt-4 text-xs text-muted-foreground">[KPIConsistency] No data available</div>;
  }

  return (
    <div className="mt-4 border border-border/60 rounded-md p-3 bg-background/40">
      <div className="text-xs font-medium text-muted-foreground mb-2">KPI Consistency: {label}</div>
      <div className="text-xs">
        <div className="grid grid-cols-4 gap-2 font-medium text-muted-foreground">
          <div>KPI</div>
          <div className="text-center">Exec</div>
          <div className="text-center">Analytics</div>
          <div className="text-center">Status</div>
        </div>
        {rows.map(r => (
          <div key={r.key} className="grid grid-cols-4 gap-2 py-1 border-t border-border/40">
            <div className="truncate">{r.key}</div>
            <div className="text-center text-foreground">{FORMAT(r.key, r.execVal)}</div>
            <div className="text-center text-foreground">{r.analVal === null ? '—' : FORMAT(r.key, r.analVal)}</div>
            <div className={r.status === 'OK' ? 'text-emerald-500 text-center' : r.status === 'MISMATCH' ? 'text-yellow-500 text-center' : 'text-zinc-400 text-center'}>
              {r.status === 'OK' ? '✅' : r.status === 'MISMATCH' ? '⚠️' : '—'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KpiDataConsistencyTest;

