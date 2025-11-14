import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, AlertCircle, X } from 'lucide-react';
import type { RiskAssessmentNarrative } from '@/services/narrative-engine.service';

interface CompactRiskSummaryProps {
  narrative: RiskAssessmentNarrative | null;
}

export const CompactRiskSummary: React.FC<CompactRiskSummaryProps> = ({ narrative }) => {
  if (!narrative) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-6">
          <p className="text-zinc-400 text-center">Risk assessment not available</p>
        </CardContent>
      </Card>
    );
  }

  const riskConfig = {
    CRITICAL: {
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      borderColor: 'border-red-500/30',
      icon: AlertTriangle
    },
    HIGH: {
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20',
      borderColor: 'border-orange-500/30',
      icon: AlertTriangle
    },
    MEDIUM: {
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20',
      borderColor: 'border-yellow-500/30',
      icon: AlertCircle
    },
    LOW: {
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/30',
      icon: Shield
    }
  };

  const config = riskConfig[narrative.overallRiskLevel];
  const RiskIcon = config.icon;

  const severityConfig = {
    HIGH: {
      color: 'text-red-400',
      icon: '🔴'
    },
    MEDIUM: {
      color: 'text-yellow-400',
      icon: '🟡'
    },
    LOW: {
      color: 'text-blue-400',
      icon: '🔵'
    }
  };

  return (
    <div className="space-y-4">
      {/* Risk Level */}
      <Card className={`bg-gradient-to-r from-${config.color.split('-')[1]}-500/10 to-zinc-900 ${config.borderColor}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <RiskIcon className={`h-6 w-6 ${config.color}`} />
              <div>
                <p className="text-xs text-zinc-400">Overall Risk Level</p>
                <p className={`text-2xl font-bold ${config.color}`}>{narrative.overallRiskLevel}</p>
              </div>
            </div>
            <Badge className={`${config.bgColor} ${config.color} ${config.borderColor} text-sm`}>
              {narrative.vulnerabilities.length} Vulnerabilities
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Risk Summary */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-4">
          <p className="text-sm text-zinc-300 leading-relaxed">{narrative.riskSummary}</p>
        </CardContent>
      </Card>

      {/* Top Vulnerabilities (Max 2) */}
      {narrative.vulnerabilities.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center space-x-2">
            <X className="h-4 w-4" />
            <span>Top Vulnerabilities</span>
          </p>
          {narrative.vulnerabilities.slice(0, 2).map((vulnerability, index) => {
            const sevConfig = severityConfig[vulnerability.severity];
            return (
              <Card key={index} className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-semibold text-foreground flex items-center space-x-2">
                      <span>{sevConfig.icon}</span>
                      <span>{vulnerability.type}</span>
                    </p>
                    <Badge variant="outline" className={`text-xs ${sevConfig.color} border-zinc-700`}>
                      {vulnerability.severity}
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-400 mb-2">{vulnerability.description}</p>
                  <div className="bg-zinc-800/50 rounded p-2 border-l-2 border-green-500/50">
                    <p className="text-xs text-green-400 font-medium mb-0.5">Mitigation:</p>
                    <p className="text-xs text-zinc-300">{vulnerability.mitigation}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Brand Dependency Quick Note */}
      <Card className="bg-gradient-to-r from-blue-500/5 to-transparent border-l-4 border-blue-500">
        <CardContent className="p-3">
          <p className="text-xs text-blue-400 font-semibold uppercase tracking-wide mb-1">
            Brand Dependency
          </p>
          <p className="text-xs text-zinc-300 leading-relaxed">
            {narrative.brandDependencyAnalysis.slice(0, 150)}...
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
