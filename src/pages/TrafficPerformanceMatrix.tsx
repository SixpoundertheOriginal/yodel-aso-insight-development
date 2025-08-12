import React, { useEffect, useMemo } from 'react';
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
  Info,
} from 'lucide-react';

interface TrafficQuadrants {
  scale: TrafficSource[];
  optimize: TrafficSource[];
  investigate: TrafficSource[];
  expand: TrafficSource[];
}

const categorizeTrafficSources = (trafficSources: TrafficSource[]) => {
  const volumes = trafficSources.map((s) => s.value).sort((a, b) => b - a);
  const volumeThreshold = volumes[Math.floor(volumes.length / 2)] || 0;
  const growthThreshold = 0;

  return trafficSources.map((source) => {
    const highVolume = source.value > volumeThreshold;
    const highGrowth = source.delta > growthThreshold;

    let quadrant: 'scale' | 'optimize' | 'investigate' | 'expand';
    let action: string;
    let priority: 'high' | 'medium';

    if (highVolume && highGrowth) {
      quadrant = 'scale';
      action = 'Increase budget allocation and expand campaigns';
      priority = 'high';
    } else if (highVolume && !highGrowth) {
      quadrant = 'optimize';
      action = 'Improve conversion rates and user experience';
      priority = 'high';
    } else if (!highVolume && !highGrowth) {
      quadrant = 'investigate';
      action = 'Analyze root causes and implement fixes';
      priority = 'medium';
    } else {
      quadrant = 'expand';
      action = 'Scale successful tactics and increase reach';
      priority = 'medium';
    }

    return { ...source, quadrant, action, priority };
  });
};

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
          {scale.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">No sources in this category</div>
              <div className="text-xs text-gray-500">No high-volume, high-growth sources detected</div>
            </div>
          ) : (
            scale.map((source) => (
              <TrafficSourceCard
                key={source.name}
                source={{
                  name: source.name,
                  displayName: source.name,
                  downloads: source.value,
                  delta: source.delta,
                }}
                quadrant="scale"
              />
            ))
          )}
        </div>
        <div className="mt-4 bg-gray-600 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium text-sm">Recommended Action</div>
              <div className="text-gray-300 text-xs">Increase budget allocation and expand campaigns</div>
            </div>
            <button className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white text-xs rounded transition-colors">
              Take Action
            </button>
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
          {optimize.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">No sources in this category</div>
              <div className="text-xs text-gray-500">No high-volume, declining sources detected</div>
            </div>
          ) : (
            optimize.map((source) => (
              <TrafficSourceCard
                key={source.name}
                source={{
                  name: source.name,
                  displayName: source.name,
                  downloads: source.value,
                  delta: source.delta,
                }}
                quadrant="optimize"
              />
            ))
          )}
        </div>
        <div className="mt-4 bg-gray-600 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium text-sm">Recommended Action</div>
              <div className="text-gray-300 text-xs">Improve conversion rates and user experience</div>
            </div>
            <button className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white text-xs rounded transition-colors">
              Take Action
            </button>
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
          {investigate.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">No sources in this category</div>
              <div className="text-xs text-gray-500">No low-volume, declining sources detected</div>
            </div>
          ) : (
            investigate.map((source) => (
              <TrafficSourceCard
                key={source.name}
                source={{
                  name: source.name,
                  displayName: source.name,
                  downloads: source.value,
                  delta: source.delta,
                }}
                quadrant="investigate"
              />
            ))
          )}
        </div>
        <div className="mt-4 bg-gray-600 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium text-sm">Recommended Action</div>
              <div className="text-gray-300 text-xs">Analyze root causes and implement fixes</div>
            </div>
            <button className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white text-xs rounded transition-colors">
              Take Action
            </button>
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
          {expand.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">No sources in this category</div>
              <div className="text-xs text-gray-500">No low-volume, high-growth sources detected</div>
            </div>
          ) : (
            expand.map((source) => (
              <TrafficSourceCard
                key={source.name}
                source={{
                  name: source.name,
                  displayName: source.name,
                  downloads: source.value,
                  delta: source.delta,
                }}
                quadrant="expand"
              />
            ))
          )}
        </div>
        <div className="mt-4 bg-gray-600 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium text-sm">Recommended Action</div>
              <div className="text-gray-300 text-xs">Scale successful tactics and increase reach</div>
            </div>
            <button className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white text-xs rounded transition-colors">
              Take Action
            </button>
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

  const categorizedSources = useMemo(
    () => categorizeTrafficSources(trafficSources),
    [trafficSources]
  );

  const categorized = useMemo(
    () => ({
      scale: categorizedSources.filter((s) => s.quadrant === 'scale'),
      optimize: categorizedSources.filter((s) => s.quadrant === 'optimize'),
      investigate: categorizedSources.filter((s) => s.quadrant === 'investigate'),
      expand: categorizedSources.filter((s) => s.quadrant === 'expand'),
    }),
    [categorizedSources]
  );

  useEffect(() => {
    console.log('Traffic Source Distribution:', {
      scale: categorized.scale,
      optimize: categorized.optimize,
      investigate: categorized.investigate,
      expand: categorized.expand,
    });
  }, [categorized]);

  useEffect(() => {
    if (data?.trafficSources) {
      console.log('Traffic Sources Data:', data.trafficSources);
      const hasRealisticData = data.trafficSources.some(
        (source) =>
          source.metrics.downloads.value > 0 &&
          source.metrics.impressions.value > 0
      );
      if (!hasRealisticData) {
        console.warn('Traffic source data appears to be mock/placeholder data');
      }
    }
  }, [data]);

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
        <div className="bg-gray-700 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <Info className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">How to Use This Matrix</h4>
              <div className="text-gray-300 text-sm space-y-1">
                <p>
                  • <span className="text-green-400 font-medium">SCALE</span>: High volume + growth - increase investment
                </p>
                <p>
                  • <span className="text-orange-400 font-medium">OPTIMIZE</span>: High volume but declining - improve performance
                </p>
                <p>
                  • <span className="text-red-400 font-medium">INVESTIGATE</span>: Low volume + declining - find root causes
                </p>
                <p>
                  • <span className="text-blue-400 font-medium">EXPAND</span>: Low volume but growing - increase reach
                </p>
              </div>
            </div>
          </div>
        </div>
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

