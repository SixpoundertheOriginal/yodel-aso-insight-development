import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { openAIService } from '@/services/openAIService';

interface BasicStats {
  tonnage: number;
  sets: number;
  reps: number;
  deltaPct: number;
}

// Placeholder hook. In a real app this would load stats from the backend.
function useBasicWorkoutStats(): BasicStats {
  return { tonnage: 0, sets: 0, reps: 0, deltaPct: 0 };
}

function getWeekNumber(date: Date): number {
  const temp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = temp.getUTCDay() || 7;
  temp.setUTCDate(temp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
  return Math.ceil(((temp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function WeeklySummaryStats() {
  const stats = useBasicWorkoutStats();
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const locale = navigator.language || 'en-US';

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const periodType = 'week';
  const period = `${new Date().getFullYear()}-W${String(getWeekNumber(new Date())).padStart(2, '0')}`;

  const queryClient = useQueryClient();
  const { data: motivation } = useQuery({
    queryKey: ['motivation', period, locale],
    queryFn: () =>
      openAIService.generateMotivationForPeriod({
        ...stats,
        period,
        periodType,
        locale,
      }),
    enabled: visible,
    staleTime: Infinity,
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['motivation', period, locale] });
  };

  return (
    <div ref={ref} className="p-4 border rounded space-y-1">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Weekly Tonnage</h3>
        <button onClick={handleRefresh} className="text-sm" aria-label="Refresh" title="Refresh">
          ↻
        </button>
      </div>
      <p className="text-2xl font-bold">{stats.tonnage.toLocaleString()} kg lifted</p>
      <p className="text-sm text-muted-foreground">{motivation ?? 'Keep going strong!'}</p>
    </div>
  );
}
