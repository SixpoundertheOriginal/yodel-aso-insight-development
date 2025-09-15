import { TrendingUp, Target, Users, AlertCircle, Trophy, Search } from 'lucide-react';

export interface InsightCategory {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: 'orange' | 'blue' | 'success';
  glowColor: 'orange' | 'blue' | 'success';
}

export const INSIGHT_CATEGORIES: InsightCategory[] = [
  {
    id: 'visibility',
    title: 'Visibility Performance',
    description: 'Search impression trends, keyword performance, and discovery opportunities',
    icon: Search,
    color: 'blue',
    glowColor: 'blue'
  },
  {
    id: 'conversion',
    title: 'Conversion Performance', 
    description: 'CVR analysis, funnel optimization, and user behavior insights',
    icon: Target,
    color: 'orange',
    glowColor: 'orange'
  },
  {
    id: 'competitive',
    title: 'Competitive Insights',
    description: 'Market positioning, competitor performance gaps, and opportunities',
    icon: Trophy,
    color: 'success',
    glowColor: 'success'
  }
];

export const getInsightCategoryById = (id: string): InsightCategory | undefined => {
  return INSIGHT_CATEGORIES.find(cat => cat.id === id);
};