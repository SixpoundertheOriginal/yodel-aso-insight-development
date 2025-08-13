import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BenchmarkMetrics {
  impressions_to_page_views: number;
  page_views_to_installs: number;
  impressions_to_installs: number;
}

interface BenchmarkComparison {
  category: string;
  benchmarks: BenchmarkMetrics;
  client_performance?: BenchmarkMetrics;
  performance_vs_benchmark?: {
    impressions_to_page_views: 'above' | 'below' | 'at';
    page_views_to_installs: 'above' | 'below' | 'at';
    impressions_to_installs: 'above' | 'below' | 'at';
  };
}

export const useBenchmarkData = (
  selectedCategory: string,
  clientMetrics?: {
    impressions_to_page_views: number;
    page_views_to_installs: number;
  }
): {
  data: BenchmarkComparison | null;
  loading: boolean;
  error: Error | null;
  availableCategories: string[];
} => {
  const [data, setData] = useState<BenchmarkComparison | null>(null);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchCategories = useCallback(async () => {
    const { data: categories, error } = await supabase
      .from('conversion_benchmarks')
      .select('category');
    if (error) {
      setError(error);
      return;
    }
    const sorted = categories.map((c) => c.category).sort();
    setAvailableCategories(sorted);
  }, []);

  const fetchBenchmark = useCallback(async () => {
    if (!selectedCategory) return;
    setLoading(true);
    const { data: benchmark, error } = await supabase
      .from('conversion_benchmarks')
      .select('category, impressions_to_page_views, page_views_to_installs, impressions_to_installs')
      .eq('category', selectedCategory)
      .single();
    if (error) {
      setError(error);
      setLoading(false);
      return;
    }
    let client_performance: BenchmarkMetrics | undefined;
    let performance_vs_benchmark: BenchmarkComparison['performance_vs_benchmark'] | undefined;
    if (clientMetrics) {
      const impressions_to_installs =
        (clientMetrics.impressions_to_page_views * clientMetrics.page_views_to_installs) / 100;
      client_performance = {
        impressions_to_page_views: clientMetrics.impressions_to_page_views,
        page_views_to_installs: clientMetrics.page_views_to_installs,
        impressions_to_installs,
      };
      const compare = (client: number, bench: number) =>
        client > bench ? 'above' : client < bench ? 'below' : 'at';
      performance_vs_benchmark = {
        impressions_to_page_views: compare(client_performance.impressions_to_page_views, benchmark.impressions_to_page_views),
        page_views_to_installs: compare(client_performance.page_views_to_installs, benchmark.page_views_to_installs),
        impressions_to_installs: compare(client_performance.impressions_to_installs, benchmark.impressions_to_installs),
      };
    }
    setData({
      category: benchmark.category,
      benchmarks: {
        impressions_to_page_views: benchmark.impressions_to_page_views,
        page_views_to_installs: benchmark.page_views_to_installs,
        impressions_to_installs: benchmark.impressions_to_installs,
      },
      client_performance,
      performance_vs_benchmark,
    });
    setLoading(false);
  }, [selectedCategory, clientMetrics]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchBenchmark();
  }, [fetchBenchmark]);

  return { data, loading, error, availableCategories };
};

export default useBenchmarkData;
