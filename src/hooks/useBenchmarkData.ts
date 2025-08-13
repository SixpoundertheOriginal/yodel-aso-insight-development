import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BenchmarkData {
  category: string;
  impressions_to_page_views: number;
  page_views_to_installs: number;
  impressions_to_installs: number;
}

export const useBenchmarkData = (selectedCategory: string) => {
  const [data, setData] = useState<BenchmarkData | null>(null);
  const [loading, setLoading] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data: categories } = await supabase
        .from('conversion_benchmarks')
        .select('category')
        .order('category');
      if (categories) {
        setAvailableCategories(categories.map((c) => c.category));
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!selectedCategory) return;
    const fetchBenchmark = async () => {
      setLoading(true);
      const { data: benchmark } = await supabase
        .from('conversion_benchmarks')
        .select('category, impressions_to_page_views, page_views_to_installs, impressions_to_installs')
        .eq('category', selectedCategory)
        .single();
      setData(benchmark);
      setLoading(false);
    };
    fetchBenchmark();
  }, [selectedCategory]);

  return { data, loading, availableCategories };
};

export default useBenchmarkData;
