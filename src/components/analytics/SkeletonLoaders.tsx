/**
 * Skeleton Loader Components
 *
 * Loading placeholders for ASO Intelligence Layer components.
 * Provides visual feedback during Web Worker computations.
 *
 * Key Features:
 * - Matches actual component dimensions
 * - Animated shimmer effect
 * - Dark theme consistent
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Target, LineChart } from 'lucide-react';

// Base skeleton element
const Skeleton = ({ className }: { className?: string }) => (
  <div
    className={`animate-pulse bg-zinc-800/50 rounded ${className || ''}`}
    aria-label="Loading..."
  />
);

// Skeleton for Stability Score Card
export function StabilityScoreSkeleton() {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-yodel-orange animate-pulse" />
          <CardTitle className="text-lg">ASO Stability Score</CardTitle>
        </div>
        <CardDescription>Analyzing performance volatility...</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score display skeleton */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-12 w-32" />
          <Skeleton className="h-8 w-24" />
        </div>

        {/* Breakdown skeleton */}
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </div>

        {/* Insight skeleton */}
        <Skeleton className="h-20 w-full" />
      </CardContent>
    </Card>
  );
}

// Skeleton for Opportunity Map Card
export function OpportunityMapSkeleton() {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-yodel-orange animate-pulse" />
          <CardTitle className="text-lg">Opportunity Map</CardTitle>
        </div>
        <CardDescription>Identifying optimization opportunities...</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Opportunity list skeleton */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700 space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-6 w-20" />
            </div>

            {/* Current vs Benchmark */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-2 w-full" />
            </div>

            {/* Insight */}
            <Skeleton className="h-12 w-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// Skeleton for Outcome Simulation Card
export function OutcomeSimulationSkeleton() {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader>
        <div className="flex items-center gap-2">
          <LineChart className="h-5 w-5 text-yodel-orange animate-pulse" />
          <CardTitle className="text-lg">Outcome Simulations</CardTitle>
        </div>
        <CardDescription>Modeling improvement scenarios...</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Scenario list skeleton */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-6 w-24" />
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-full" />
              </div>
            </div>

            {/* Impact skeleton */}
            <Skeleton className="h-16 w-full" />

            {/* Divider */}
            {i < 3 && <div className="border-t border-zinc-800 mt-4" />}
          </div>
        ))}

        {/* Disclaimer skeleton */}
        <Skeleton className="h-12 w-full" />
      </CardContent>
    </Card>
  );
}

// Generic intelligence card skeleton
export function IntelligenceCardSkeleton({ title }: { title: string }) {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-yodel-orange animate-pulse" />
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
        <CardDescription>Loading...</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </CardContent>
    </Card>
  );
}

// Progress indicator for worker computation
export function ComputationProgress({
  currentStep,
  progress,
}: {
  currentStep: string;
  progress: number;
}) {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardContent className="py-8">
        <div className="space-y-4">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">{currentStep}</span>
              <span className="text-sm font-medium text-zinc-300">{progress}%</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-yodel-orange transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Icon */}
          <div className="flex justify-center">
            <Activity className="h-8 w-8 text-yodel-orange animate-pulse" />
          </div>

          {/* Message */}
          <p className="text-center text-sm text-zinc-500">
            Computing intelligence insights...
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
