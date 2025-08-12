import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAsoData } from '@/context/AsoDataContext';
import TrafficSourceCard from '@/components/TrafficSourceCard';
import type { TrafficSource } from '@/hooks/useMockAsoData';
import {
  ArrowLeft,
  Download,
  RefreshCw,
  TrendingUp,
  BarChart3,
  Rocket,
  Settings,
  Search,
  Target,
  Lightbulb,
} from 'lucide-react';

const median = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
};

interface TrafficQuadrants {
  scale: TrafficSource[];
  optimize: TrafficSource[];
  investigate: TrafficSource[];
  expand: TrafficSource[];
}

const TrafficSourceQuadrantMatrix: React.FC<TrafficQuadrants> = ({
  scale,
  optimize,
  investigate,
  expand,
}) => {
  const summary = (
    <div className="relative grid grid-cols-2 gap-6 h-96">
      {/* SCALE Quadrant */}
      <div className="bg-gradient-to-br from-green-900/40 to-emerald-900/40 rounded-xl border-2 border-green-500/30 p-6 relative overflow-hidden">
        <div className="absolute top-4 left-4 px-3 py-1 bg-green-500 text-white text-sm font-bold rounded-full flex items-center gap-2">
          <Rocket className="h-4 w-4" />
          SCALE
        </div>
        <div className="mt-12 space-y-3">
          {scale.map((source) => (
            <TrafficSourceCard key={source.name} source={{
              name: source.name,
              displayName: source.name,
              downloads: source.value,
              trend: source.delta,
            }} quadrant="scale" />
          ))}
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3">
            <div className="text-green-400 font-semibold text-sm">Strategic Action</div>
            <div className="text-green-300 text-xs">Increase budget allocation and expand campaigns</div>
          </div>
        </div>
      </div>

      {/* OPTIMIZE Quadrant */}
      <div className="bg-gradient-to-br from-orange-900/40 to-yellow-900/40 rounded-xl border-2 border-orange-500/30 p-6 relative overflow-hidden">
        <div className="absolute top-4 left-4 px-3 py-1 bg-orange-500 text-white text-sm font-bold rounded-full flex items-center gap-2">
          <Settings className="h-4 w-4" />
          OPTIMIZE
        </div>
        <div className="mt-12 space-y-3">
          {optimize.map((source) => (
            <TrafficSourceCard key={source.name} source={{
              name: source.name,
              displayName: source.name,
              downloads: source.value,
              trend: source.delta,
            }} quadrant="optimize" />
          ))}
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-orange-500/20 border border-orange-500/30 rounded-lg p-3">
            <div className="text-orange-400 font-semibold text-sm">Strategic Action</div>
            <div className="text-orange-300 text-xs">Improve conversion rates and user experience</div>
          </div>
        </div>
      </div>

      {/* INVESTIGATE Quadrant */}
      <div className="bg-gradient-to-br from-red-900/40 to-rose-900/40 rounded-xl border-2 border-red-500/30 p-6 relative overflow-hidden">
        <div className="absolute top-4 left-4 px-3 py-1 bg-red-500 text-white text-sm font-bold rounded-full flex items-center gap-2">
          <Search className="h-4 w-4" />
          INVESTIGATE
        </div>
        <div className="mt-12 space-y-3">
          {investigate.map((source) => (
            <TrafficSourceCard key={source.name} source={{
              name: source.name,
              displayName: source.name,
              downloads: source.value,
              trend: source.delta,
            }} quadrant="investigate" />
          ))}
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
            <div className="text-red-400 font-semibold text-sm">Strategic Action</div>
            <div className="text-red-300 text-xs">Analyze root causes and implement fixes</div>
          </div>
        </div>
      </div>

      {/* EXPAND Quadrant */}
      <div className="bg-gradient-to-br from-blue-900/40 to-cyan-900/40 rounded-xl border-2 border-blue-500/30 p-6 relative overflow-hidden">
        <div className="absolute top-4 left-4 px-3 py-1 bg-blue-500 text-white text-sm font-bold rounded-full flex items-center gap-2">
          <Target className="h-4 w-4" />
          EXPAND
        </div>
        <div className="mt-12 space-y-3">
          {expand.map((source) => (
            <TrafficSourceCard key={source.name} source={{
              name: source.name,
              displayName: source.name,
              downloads: source.value,
              trend: source.delta,
            }} quadrant="expand" />
          ))}
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3">
            <div className="text-blue-400 font-semibold text-sm">Strategic Action</div>
            <div className="text-blue-300 text-xs">Scale successful tactics and increase reach</div>
          </div>
        </div>
      </div>

      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-sm font-medium text-gray-400 flex items-center gap-2">
        <TrendingUp className="h-4 w-4" />
        High Growth →
      </div>
      <div className="absolute -left-20 top-1/2 transform -translate-y-1/2 -rotate-90 text-sm font-medium text-gray-400 flex items-center gap-2">
        <BarChart3 className="h-4 w-4" />
        High Volume ↑
      </div>
    </div>
  );

  return summary;
};

const StrategicRecommendations: React.FC = () => (
  <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 bg-orange-500/20 rounded-lg">
        <Lightbulb className="h-5 w-5 text-orange-400" />
      </div>
      <h3 className="text-lg font-semibold text-white">Strategic Recommendations</h3>
    </div>
    <div className="space-y-4 text-sm text-gray-400">
      <div className="border-l-4 border-orange-500 pl-4 py-2">
        <div className="font-semibold text-orange-400 text-sm">High Priority</div>
        <div className="text-white font-medium">Allocate more budget to top performing sources</div>
        <div className="text-orange-300 text-xs mt-2">Expected Impact: +15% downloads</div>
      </div>
    </div>
  </div>
);

const PlaceholderPanel: React.FC<{ title: string }> = ({ title }) => (
  <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 text-white">
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <p className="text-gray-400 text-sm">Coming soon</p>
  </div>
);

const TrafficPerformanceMatrix: React.FC = () => {
  const navigate = useNavigate();
  const { data } = useAsoData();
  const trafficSources = useMemo(() => data?.trafficSources ?? [], [data]);

  const medianValue = useMemo(
    () => median(trafficSources.map((s) => s.value)),
    [trafficSources]
  );

  const categorized = useMemo(() => {
    const scale: typeof trafficSources = [];
    const optimize: typeof trafficSources = [];
    const investigate: typeof trafficSources = [];
    const expand: typeof trafficSources = [];

    trafficSources.forEach((source) => {
      const highVolume = source.value > medianValue;
      const positiveGrowth = source.delta > 0;
      if (highVolume && positiveGrowth) scale.push(source);
      else if (highVolume && !positiveGrowth) optimize.push(source);
      else if (!highVolume && !positiveGrowth) investigate.push(source);
      else expand.push(source);
    });

    return { scale, optimize, investigate, expand };
  }, [trafficSources, medianValue]);

  const summary = {
    scale: categorized.scale.length,
    optimize: categorized.optimize.length,
    investigate: categorized.investigate.length,
    expand: categorized.expand.length,
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-500 shadow-xl">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/insights')}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-white" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-white">Traffic Source Performance Matrix</h1>
                <p className="text-orange-100 mt-1">Strategic positioning and growth opportunities</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export Report
              </button>
              <button className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh Data
              </button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-6 mt-6">
            <div className="bg-white/10 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">{summary.scale}</div>
              <div className="text-orange-100 text-sm">Ready to Scale</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">{summary.optimize}</div>
              <div className="text-orange-100 text-sm">Need Optimization</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">{summary.investigate}</div>
              <div className="text-orange-100 text-sm">Require Investigation</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">{summary.expand}</div>
              <div className="text-orange-100 text-sm">Expansion Opportunities</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2">
            <TrafficSourceQuadrantMatrix
              scale={categorized.scale}
              optimize={categorized.optimize}
              investigate={categorized.investigate}
              expand={categorized.expand}
            />
          </div>
          <div className="space-y-6">
            <StrategicRecommendations />
            <PlaceholderPanel title="Performance Trends" />
            <PlaceholderPanel title="Competitive Intelligence" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrafficPerformanceMatrix;

