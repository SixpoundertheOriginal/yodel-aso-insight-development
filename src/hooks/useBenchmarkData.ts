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
      console.log('📦 Fetching categories from apps...');
      const { data: apps, error } = await supabase
        .from('apps')
        .select('app_store_category')
        .not('app_store_category', 'is', null)
        .order('app_store_category');
      if (error) {
        console.error('❌ Category fetch failed:', error);
        return;
      }
      console.log('✅ Categories fetched:', apps?.length);
      if (apps) {
        const uniqueCategories = [...new Set(apps.map((a) => a.app_store_category).filter(Boolean))];
        setAvailableCategories(uniqueCategories as string[]);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!selectedCategory) return;
    const fetchBenchmark = async () => {
      console.log('🎯 Fetching benchmark for category:', selectedCategory);
      setLoading(true);
      // Note: conversion_benchmarks table doesn't exist
      // Using apps table as fallback
      const { data: apps, error } = await supabase
        .from('apps')
        .select('*')
        .eq('app_store_category', selectedCategory)
        .limit(1)
        .maybeSingle();
      if (error) {
        console.error('❌ Benchmark fetch failed:', error);
      } else {
        console.log('✅ Benchmark data:', apps);
      }
      setData(apps as any);
      setLoading(false);
    };
    fetchBenchmark();
  }, [selectedCategory]);

  return { data, loading, availableCategories };
};

export default useBenchmarkData;
