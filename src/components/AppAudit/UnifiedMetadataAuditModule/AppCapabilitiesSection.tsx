/**
 * App Capabilities Section - Phase 2: Description Intelligence
 *
 * Displays extracted capabilities from app description:
 * - Features detected
 * - Benefits detected
 * - Trust signals detected
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, TrendingUp, Shield } from 'lucide-react';
import type { AppCapabilityMap } from '@/types/auditV2';

interface AppCapabilitiesSectionProps {
  capabilityMap: AppCapabilityMap;
}

export const AppCapabilitiesSection: React.FC<AppCapabilitiesSectionProps> = ({
  capabilityMap,
}) => {
  const { features, benefits, trust } = capabilityMap;

  return (
    <Card className="group relative bg-black/60 backdrop-blur-lg border-zinc-700/70 border-2 border-dashed transition-all duration-300 hover:border-blue-500/40 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-zinc-200">
          <CheckCircle2 className="h-5 w-5 text-blue-400" />
          📊 App Capabilities Detected
        </CardTitle>
        <p className="text-sm text-zinc-400">
          Capabilities extracted from your app description using ASO Intelligence
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Features */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm flex items-center gap-2 text-zinc-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Features Detected
            </h3>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-400/30">
              {features.count} found
            </Badge>
          </div>
          {features.detected.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {features.detected.map((feature, idx) => (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="bg-zinc-800/50 border border-zinc-600/50 text-zinc-300"
                >
                  {feature.text}
                  {feature.category && (
                    <span className="ml-1 text-xs text-zinc-500">
                      ({feature.category})
                    </span>
                  )}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500 italic">
              No features detected in description
            </p>
          )}
        </div>

        {/* Benefits */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm flex items-center gap-2 text-zinc-200">
              <TrendingUp className="h-4 w-4 text-blue-400" />
              Benefits Detected
            </h3>
            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-400/30">
              {benefits.count} found
            </Badge>
          </div>
          {benefits.detected.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {benefits.detected.map((benefit, idx) => (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="bg-zinc-800/50 border border-zinc-600/50 text-zinc-300"
                >
                  {benefit.text}
                  {benefit.category && (
                    <span className="ml-1 text-xs text-zinc-500">
                      ({benefit.category})
                    </span>
                  )}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500 italic">
              No benefits detected in description
            </p>
          )}
        </div>

        {/* Trust Signals */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm flex items-center gap-2 text-zinc-200">
              <Shield className="h-4 w-4 text-purple-400" />
              Trust Signals
            </h3>
            <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-400/30">
              {trust.count} found
            </Badge>
          </div>
          {trust.detected.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {trust.detected.map((signal, idx) => (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="bg-zinc-800/50 border border-zinc-600/50 text-zinc-300"
                >
                  {signal.text}
                  {signal.category && (
                    <span className="ml-1 text-xs text-zinc-500">
                      ({signal.category})
                    </span>
                  )}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500 italic">
              No trust signals detected in description
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
