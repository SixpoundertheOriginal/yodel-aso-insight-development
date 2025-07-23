
import React from 'react';
import { MetricCard } from '@/components/ui/design-system';
import { TrendingUp, Award, Target } from 'lucide-react';

export const MetricsDashboard = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    <MetricCard
      title="Potential Visibility Boost"
      value="8x"
      change={700}
      changeLabel="vs. baseline"
      icon={<TrendingUp />}
      accentColor="green"
    />
    <MetricCard
      title="Success Probability"
      value="75%"
      change={25}
      changeLabel="with toolkit"
      icon={<Target />}
      accentColor="blue"
    />
    <MetricCard
      title="Strategic Alignment"
      value="High"
      icon={<Award />}
      accentColor="orange"
    />
  </div>
);
