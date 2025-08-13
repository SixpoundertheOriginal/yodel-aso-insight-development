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
      console.log('📦 Fetching categories from Supabase...');
      const { data: categories, error } = await supabase
        .from('conversion_benchmarks')
        .select('category')
        .order('category');
      if (error) {
        console.error('❌ Category fetch failed:', error);
        return;
      }
      console.log('✅ Categories fetched:', categories?.length, categories);
      if (categories) {
        setAvailableCategories(categories.map((c) => c.category));
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!selectedCategory) return;
    const fetchBenchmark = async () => {
      console.log('🎯 Fetching benchmark for category:', selectedCategory);
      setLoading(true);
      const { data: benchmark, error } = await supabase
        .from('conversion_benchmarks')
        .select('*')
        .eq('category', selectedCategory)
        .single();
      if (error) {
        console.error('❌ Benchmark fetch failed:', error);
      } else {
        console.log('✅ Benchmark data:', benchmark);
      }
      setData(benchmark);
      setLoading(false);
    };
    fetchBenchmark();
  }, [selectedCategory]);

  return { data, loading, availableCategories };
};

export default useBenchmarkData;
