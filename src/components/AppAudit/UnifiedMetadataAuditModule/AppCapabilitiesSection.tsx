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
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-blue-600" />
          📊 App Capabilities Detected
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Capabilities extracted from your app description using ASO Intelligence
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Features */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Features Detected
            </h3>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              {features.count} found
            </Badge>
          </div>
          {features.detected.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {features.detected.map((feature, idx) => (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="bg-white border border-gray-200"
                >
                  {feature.text}
                  {feature.category && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({feature.category})
                    </span>
                  )}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No features detected in description
            </p>
          )}
        </div>

        {/* Benefits */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              Benefits Detected
            </h3>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {benefits.count} found
            </Badge>
          </div>
          {benefits.detected.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {benefits.detected.map((benefit, idx) => (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="bg-white border border-gray-200"
                >
                  {benefit.text}
                  {benefit.category && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({benefit.category})
                    </span>
                  )}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No benefits detected in description
            </p>
          )}
        </div>

        {/* Trust Signals */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-purple-600" />
              Trust Signals
            </h3>
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
              {trust.count} found
            </Badge>
          </div>
          {trust.detected.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {trust.detected.map((signal, idx) => (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="bg-white border border-gray-200"
                >
                  {signal.text}
                  {signal.category && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({signal.category})
                    </span>
                  )}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No trust signals detected in description
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
