import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Shield, AlertCircle, CheckCircle2, Sparkles, X } from 'lucide-react';
import type { RiskAssessmentNarrative } from '@/services/narrative-engine.service';

interface RiskAssessmentPanelProps {
  narrative: RiskAssessmentNarrative | null;
  isLoading?: boolean;
}

export const RiskAssessmentPanel: React.FC<RiskAssessmentPanelProps> = ({
  narrative,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-12 text-center">
          <Sparkles className="h-12 w-12 text-orange-400 mx-auto mb-4 animate-pulse" />
          <p className="text-zinc-400 text-lg">Analyzing ASO risks...</p>
          <p className="text-zinc-500 text-sm mt-2">Identifying vulnerabilities and mitigation strategies</p>
        </CardContent>
      </Card>
    );
  }

  if (!narrative) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-12 text-center">
          <Shield className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400 text-lg">Risk assessment not available</p>
        </CardContent>
      </Card>
    );
  }

  const riskLevelConfig = {
    CRITICAL: {
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      borderColor: 'border-red-500/30',
      icon: AlertTriangle,
      iconColor: 'text-red-400',
      label: 'Critical Risk'
    },
    HIGH: {
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20',
      borderColor: 'border-orange-500/30',
      icon: AlertTriangle,
      iconColor: 'text-orange-400',
      label: 'High Risk'
    },
    MEDIUM: {
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20',
      borderColor: 'border-yellow-500/30',
      icon: AlertCircle,
      iconColor: 'text-yellow-400',
      label: 'Medium Risk'
    },
    LOW: {
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/30',
      icon: Shield,
      iconColor: 'text-green-400',
      label: 'Low Risk'
    }
  };

  const riskConfig = riskLevelConfig[narrative.overallRiskLevel];
  const RiskIcon = riskConfig.icon;

  const severityConfig = {
    HIGH: {
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/50'
    },
    MEDIUM: {
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/50'
    },
    LOW: {
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/50'
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className={`bg-gradient-to-br from-${riskConfig.iconColor.split('-')[1]}-500/10 to-zinc-900 ${riskConfig.borderColor}`}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <RiskIcon className={`h-8 w-8 ${riskConfig.iconColor}`} />
              <div>
                <CardTitle className="text-2xl font-bold text-foreground">
                  Risk Assessment
                </CardTitle>
                <CardDescription className="text-zinc-400 mt-1">
                  Vulnerability analysis and mitigation strategies
                </CardDescription>
              </div>
            </div>
            <Badge className={`text-lg px-4 py-2 ${riskConfig.bgColor} ${riskConfig.color} ${riskConfig.borderColor}`}>
              {riskConfig.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-zinc-900/50 rounded-lg p-6 border border-zinc-800">
            <p className={`text-lg font-semibold ${riskConfig.color} mb-2`}>
              Overall Risk: {narrative.overallRiskLevel}
            </p>
            <p className="text-zinc-300 leading-relaxed">
              {narrative.riskSummary}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Vulnerabilities */}
      {narrative.vulnerabilities.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center space-x-2">
              <X className="h-5 w-5 text-red-400" />
              <span>Identified Vulnerabilities</span>
            </CardTitle>
            <CardDescription>
              {narrative.vulnerabilities.length} risk{narrative.vulnerabilities.length !== 1 ? 's' : ''} detected in your ASO strategy
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {narrative.vulnerabilities.map((vulnerability, index) => {
                const sevConfig = severityConfig[vulnerability.severity];
                return (
                  <div
                    key={index}
                    className={`p-5 rounded-lg border ${sevConfig.borderColor} ${sevConfig.bgColor}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h4 className={`text-lg font-semibold ${sevConfig.color}`}>
                        {vulnerability.type}
                      </h4>
                      <Badge className={`${sevConfig.bgColor} ${sevConfig.color} border-transparent`}>
                        {vulnerability.severity} Severity
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-zinc-400 text-sm font-medium mb-1">Risk Description:</p>
                        <p className="text-zinc-200 leading-relaxed">
                          {vulnerability.description}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-zinc-700/50">
                        <p className="text-green-400 text-sm font-medium mb-1 flex items-center space-x-2">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Mitigation Strategy:</span>
                        </p>
                        <p className="text-zinc-200 leading-relaxed bg-zinc-900/50 rounded p-3">
                          {vulnerability.mitigation}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Brand Dependency Analysis */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-blue-400" />
            <span>Brand Dependency Analysis</span>
          </CardTitle>
          <CardDescription>
            Evaluation of brand keyword reliance and diversification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-zinc-800/30 rounded-lg p-6">
            <p className="text-zinc-300 leading-relaxed">
              {narrative.brandDependencyAnalysis}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card className="bg-gradient-to-br from-green-500/5 to-zinc-900 border-green-500/30">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center space-x-2">
            <Shield className="h-5 w-5 text-green-400" />
            <span>Risk Mitigation Recommendations</span>
          </CardTitle>
          <CardDescription>
            Prioritized actions to strengthen your ASO foundation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {narrative.recommendations.map((recommendation, index) => (
              <div
                key={index}
                className="flex items-start space-x-3 p-4 bg-gradient-to-r from-green-500/5 to-transparent rounded-lg border-l-4 border-green-500 hover:from-green-500/10 transition-colors"
              >
                <div className="bg-green-500/20 rounded-full p-1.5 flex-shrink-0 mt-0.5">
                  <span className="text-green-400 text-xs font-bold">{index + 1}</span>
                </div>
                <p className="text-zinc-200 leading-relaxed">{recommendation}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Risk Level Explanation */}
      <Alert className={`${riskConfig.borderColor} ${riskConfig.bgColor}`}>
        <RiskIcon className={`h-5 w-5 ${riskConfig.iconColor}`} />
        <AlertDescription className="text-zinc-200 ml-2">
          <strong className={riskConfig.color}>Risk Level Interpretation:</strong>{' '}
          {narrative.overallRiskLevel === 'CRITICAL' && 'Immediate action required. Multiple critical vulnerabilities threaten organic growth.'}
          {narrative.overallRiskLevel === 'HIGH' && 'Significant risks identified. Address high-severity issues within 2-4 weeks.'}
          {narrative.overallRiskLevel === 'MEDIUM' && 'Moderate vulnerabilities present. Plan improvements over next 1-2 months.'}
          {narrative.overallRiskLevel === 'LOW' && 'ASO foundation is relatively strong. Continue monitoring and iterative improvement.'}
        </AlertDescription>
      </Alert>

      {/* AI Attribution */}
      <div className="flex items-center justify-center space-x-2 text-zinc-500 text-sm">
        <Sparkles className="h-4 w-4" />
        <span>AI-powered risk assessment and vulnerability analysis</span>
      </div>
    </div>
  );
};
