import { CompetitiveIntelligence } from './competitor-review-intelligence.service';
import { exportService } from './export.service';

/**
 * Export service for competitor comparison data
 * Provides CSV and future PDF export capabilities
 */
class CompetitorComparisonExportService {
  /**
   * Export competitive intelligence to CSV format
   */
  exportToCSV(intelligence: CompetitiveIntelligence, filename?: string): void {
    const timestamp = new Date().toISOString().split('T')[0];
    const exportFilename = filename || `competitive-analysis-${timestamp}`;

    // Prepare sections for export
    const sections: any[] = [];

    // Section 1: Executive Summary
    sections.push({
      section: 'Executive Summary',
      metric: 'Overall Position',
      value: intelligence.summary.overallPosition,
      details: ''
    });

    intelligence.summary.keyInsights.forEach((insight, idx) => {
      sections.push({
        section: 'Executive Summary',
        metric: `Key Insight ${idx + 1}`,
        value: insight,
        details: ''
      });
    });

    intelligence.summary.priorityActions.forEach((action, idx) => {
      sections.push({
        section: 'Executive Summary',
        metric: `Priority Action ${idx + 1}`,
        value: action,
        details: ''
      });
    });

    sections.push({
      section: '',
      metric: '',
      value: '',
      details: ''
    });

    // Section 2: Benchmarks
    sections.push({
      section: 'Benchmarks',
      metric: 'Average Rating (Yours)',
      value: intelligence.benchmarks.averageRating.yours.toFixed(2),
      details: `vs ${intelligence.benchmarks.averageRating.competitors.toFixed(2)} (competitors)`
    });

    sections.push({
      section: 'Benchmarks',
      metric: 'Average Sentiment (Yours)',
      value: `${(intelligence.benchmarks.averageSentiment.yours * 100).toFixed(1)}%`,
      details: `vs ${(intelligence.benchmarks.averageSentiment.competitors * 100).toFixed(1)}% (competitors)`
    });

    sections.push({
      section: 'Benchmarks',
      metric: 'Issue Frequency (Yours)',
      value: `${(intelligence.benchmarks.issueFrequency.yours * 100).toFixed(1)}%`,
      details: `vs ${(intelligence.benchmarks.issueFrequency.competitors * 100).toFixed(1)}% (competitors)`
    });

    sections.push({
      section: 'Benchmarks',
      metric: 'Feature Coverage (Yours)',
      value: `${(intelligence.benchmarks.featureCoverage.yours * 100).toFixed(1)}%`,
      details: `vs ${(intelligence.benchmarks.featureCoverage.competitors * 100).toFixed(1)}% (competitors)`
    });

    sections.push({
      section: '',
      metric: '',
      value: '',
      details: ''
    });

    // Section 3: Feature Gaps
    sections.push({
      section: 'Feature Gaps',
      metric: 'Total Gaps Identified',
      value: intelligence.featureGaps.length,
      details: ''
    });

    intelligence.featureGaps.forEach((gap, idx) => {
      sections.push({
        section: 'Feature Gaps',
        metric: `#${idx + 1}: ${gap.feature}`,
        value: `${gap.userDemand.toUpperCase()} DEMAND`,
        details: `Mentioned in ${gap.mentionedInCompetitors.length} competitors (${gap.frequency} times), Sentiment: ${(gap.competitorSentiment * 100).toFixed(0)}%`
      });

      // Add competitors where mentioned
      sections.push({
        section: 'Feature Gaps',
        metric: `  Competitors`,
        value: gap.mentionedInCompetitors.join(', '),
        details: ''
      });

      // Add example reviews
      gap.examples.slice(0, 2).forEach((example, exIdx) => {
        sections.push({
          section: 'Feature Gaps',
          metric: `  Example ${exIdx + 1}`,
          value: example,
          details: ''
        });
      });
    });

    sections.push({
      section: '',
      metric: '',
      value: '',
      details: ''
    });

    // Section 4: Opportunities
    sections.push({
      section: 'Competitive Opportunities',
      metric: 'Total Opportunities',
      value: intelligence.opportunities.length,
      details: ''
    });

    intelligence.opportunities.forEach((opp, idx) => {
      sections.push({
        section: 'Competitive Opportunities',
        metric: `#${idx + 1}: ${opp.description}`,
        value: `${opp.exploitability.toUpperCase()} EXPLOITABILITY`,
        details: `${opp.competitor} has ${opp.frequency} complaints (${(opp.sentiment * 100).toFixed(0)}% sentiment)`
      });

      sections.push({
        section: 'Competitive Opportunities',
        metric: '  Recommendation',
        value: opp.recommendation,
        details: `Affects ${opp.affectedReviews} reviews`
      });
    });

    sections.push({
      section: '',
      metric: '',
      value: '',
      details: ''
    });

    // Section 5: Strengths
    sections.push({
      section: 'Your Strengths',
      metric: 'Total Strengths',
      value: intelligence.strengths.length,
      details: ''
    });

    intelligence.strengths.forEach((strength, idx) => {
      sections.push({
        section: 'Your Strengths',
        metric: `#${idx + 1}: ${strength.aspect}`,
        value: `+${(strength.difference * 100).toFixed(0)}% BETTER`,
        details: `Your score: ${(strength.yourSentiment * 100).toFixed(0)}% vs Competitors avg: ${(strength.competitorAvgSentiment * 100).toFixed(0)}% (${strength.confidence} confidence)`
      });

      // Add evidence
      strength.evidence.slice(0, 2).forEach((evidence, evIdx) => {
        sections.push({
          section: 'Your Strengths',
          metric: `  Evidence ${evIdx + 1}`,
          value: evidence,
          details: ''
        });
      });
    });

    sections.push({
      section: '',
      metric: '',
      value: '',
      details: ''
    });

    // Section 6: Threats
    sections.push({
      section: 'Competitive Threats',
      metric: 'Total Threats',
      value: intelligence.threats.length,
      details: ''
    });

    intelligence.threats.forEach((threat, idx) => {
      sections.push({
        section: 'Competitive Threats',
        metric: `#${idx + 1}: ${threat.feature}`,
        value: `${(threat.userDemand * 100).toFixed(0)}% USER DEMAND`,
        details: `${threat.competitor} users love this (${(threat.sentiment * 100).toFixed(0)}% sentiment, ${threat.momentum} momentum)`
      });

      sections.push({
        section: 'Competitive Threats',
        metric: '  Recommendation',
        value: threat.recommendation,
        details: ''
      });
    });

    // Export to CSV
    exportService.exportToCsv(sections, exportFilename);
  }

  /**
   * Export feature gaps to CSV (detailed)
   */
  exportFeatureGapsToCSV(intelligence: CompetitiveIntelligence, filename?: string): void {
    const timestamp = new Date().toISOString().split('T')[0];
    const exportFilename = filename || `feature-gaps-${timestamp}`;

    const rows = intelligence.featureGaps.map((gap, idx) => ({
      rank: idx + 1,
      feature: gap.feature,
      user_demand: gap.userDemand,
      frequency: gap.frequency,
      mentioned_in_competitors: gap.mentionedInCompetitors.join(', '),
      competitor_count: gap.mentionedInCompetitors.length,
      sentiment: `${(gap.competitorSentiment * 100).toFixed(0)}%`,
      example_1: gap.examples[0] || '',
      example_2: gap.examples[1] || '',
      example_3: gap.examples[2] || ''
    }));

    exportService.exportToCsv(rows, exportFilename);
  }

  /**
   * Export opportunities to CSV (detailed)
   */
  exportOpportunitiesToCSV(intelligence: CompetitiveIntelligence, filename?: string): void {
    const timestamp = new Date().toISOString().split('T')[0];
    const exportFilename = filename || `opportunities-${timestamp}`;

    const rows = intelligence.opportunities.map((opp, idx) => ({
      rank: idx + 1,
      type: opp.type,
      description: opp.description,
      competitor: opp.competitor,
      frequency: opp.frequency,
      sentiment: `${(opp.sentiment * 100).toFixed(0)}%`,
      exploitability: opp.exploitability,
      affected_reviews: opp.affectedReviews,
      recommendation: opp.recommendation
    }));

    exportService.exportToCsv(rows, exportFilename);
  }

  /**
   * Export strengths to CSV (detailed)
   */
  exportStrengthsToCSV(intelligence: CompetitiveIntelligence, filename?: string): void {
    const timestamp = new Date().toISOString().split('T')[0];
    const exportFilename = filename || `strengths-${timestamp}`;

    const rows = intelligence.strengths.map((strength, idx) => ({
      rank: idx + 1,
      aspect: strength.aspect,
      your_sentiment: `${(strength.yourSentiment * 100).toFixed(0)}%`,
      competitor_avg: `${(strength.competitorAvgSentiment * 100).toFixed(0)}%`,
      difference: `+${(strength.difference * 100).toFixed(0)}%`,
      confidence: strength.confidence,
      evidence_1: strength.evidence[0] || '',
      evidence_2: strength.evidence[1] || '',
      evidence_3: strength.evidence[2] || ''
    }));

    exportService.exportToCsv(rows, exportFilename);
  }

  /**
   * Export threats to CSV (detailed)
   */
  exportThreatsToCSV(intelligence: CompetitiveIntelligence, filename?: string): void {
    const timestamp = new Date().toISOString().split('T')[0];
    const exportFilename = filename || `threats-${timestamp}`;

    const rows = intelligence.threats.map((threat, idx) => ({
      rank: idx + 1,
      feature: threat.feature,
      competitor: threat.competitor,
      user_demand: `${(threat.userDemand * 100).toFixed(0)}%`,
      sentiment: `${(threat.sentiment * 100).toFixed(0)}%`,
      momentum: threat.momentum,
      recommendation: threat.recommendation
    }));

    exportService.exportToCsv(rows, exportFilename);
  }

  /**
   * Generate markdown report for competitive intelligence
   * Useful for copying to Notion, Confluence, etc.
   */
  generateMarkdownReport(intelligence: CompetitiveIntelligence): string {
    const report: string[] = [];
    const timestamp = new Date().toISOString().split('T')[0];

    report.push(`# Competitive Intelligence Report`);
    report.push(`Generated: ${timestamp}\n`);

    // Executive Summary
    report.push(`## Executive Summary\n`);
    report.push(`**Overall Position:** ${intelligence.summary.overallPosition}\n`);

    report.push(`### Key Insights\n`);
    intelligence.summary.keyInsights.forEach((insight, idx) => {
      report.push(`${idx + 1}. ${insight}`);
    });
    report.push('');

    report.push(`### Priority Actions\n`);
    intelligence.summary.priorityActions.forEach((action, idx) => {
      report.push(`${idx + 1}. ${action}`);
    });
    report.push('');

    // Benchmarks
    report.push(`## Benchmarks\n`);
    report.push(`| Metric | Your Performance | Competitor Average |`);
    report.push(`|--------|-----------------|-------------------|`);
    report.push(`| Average Rating | ${intelligence.benchmarks.averageRating.yours.toFixed(2)} | ${intelligence.benchmarks.averageRating.competitors.toFixed(2)} |`);
    report.push(`| Average Sentiment | ${(intelligence.benchmarks.averageSentiment.yours * 100).toFixed(1)}% | ${(intelligence.benchmarks.averageSentiment.competitors * 100).toFixed(1)}% |`);
    report.push(`| Issue Frequency | ${(intelligence.benchmarks.issueFrequency.yours * 100).toFixed(1)}% | ${(intelligence.benchmarks.issueFrequency.competitors * 100).toFixed(1)}% |`);
    report.push(`| Feature Coverage | ${(intelligence.benchmarks.featureCoverage.yours * 100).toFixed(1)}% | ${(intelligence.benchmarks.featureCoverage.competitors * 100).toFixed(1)}% |`);
    report.push('');

    // Feature Gaps
    if (intelligence.featureGaps.length > 0) {
      report.push(`## Feature Gaps (${intelligence.featureGaps.length})\n`);
      intelligence.featureGaps.slice(0, 10).forEach((gap, idx) => {
        report.push(`### ${idx + 1}. ${gap.feature} - ${gap.userDemand.toUpperCase()} DEMAND\n`);
        report.push(`- Mentioned in: ${gap.mentionedInCompetitors.join(', ')}`);
        report.push(`- Frequency: ${gap.frequency} mentions`);
        report.push(`- Competitor Sentiment: ${(gap.competitorSentiment * 100).toFixed(0)}%`);
        if (gap.examples.length > 0) {
          report.push(`- Example: "${gap.examples[0].substring(0, 150)}..."`);
        }
        report.push('');
      });
    }

    // Opportunities
    if (intelligence.opportunities.length > 0) {
      report.push(`## Competitive Opportunities (${intelligence.opportunities.length})\n`);
      intelligence.opportunities.slice(0, 10).forEach((opp, idx) => {
        report.push(`### ${idx + 1}. ${opp.description} - ${opp.exploitability.toUpperCase()} EXPLOITABILITY\n`);
        report.push(`- Competitor: ${opp.competitor}`);
        report.push(`- Complaint Frequency: ${opp.frequency}`);
        report.push(`- Sentiment: ${(opp.sentiment * 100).toFixed(0)}%`);
        report.push(`- **Recommendation:** ${opp.recommendation}`);
        report.push('');
      });
    }

    // Strengths
    if (intelligence.strengths.length > 0) {
      report.push(`## Your Strengths (${intelligence.strengths.length})\n`);
      intelligence.strengths.slice(0, 10).forEach((strength, idx) => {
        report.push(`### ${idx + 1}. ${strength.aspect} - +${(strength.difference * 100).toFixed(0)}% BETTER\n`);
        report.push(`- Your Performance: ${(strength.yourSentiment * 100).toFixed(0)}%`);
        report.push(`- Competitor Average: ${(strength.competitorAvgSentiment * 100).toFixed(0)}%`);
        report.push(`- Confidence: ${strength.confidence}`);
        if (strength.evidence.length > 0) {
          report.push(`- Evidence: "${strength.evidence[0].substring(0, 150)}..."`);
        }
        report.push('');
      });
    }

    // Threats
    if (intelligence.threats.length > 0) {
      report.push(`## Competitive Threats (${intelligence.threats.length})\n`);
      intelligence.threats.slice(0, 10).forEach((threat, idx) => {
        report.push(`### ${idx + 1}. ${threat.feature} - ${(threat.userDemand * 100).toFixed(0)}% USER DEMAND\n`);
        report.push(`- Competitor: ${threat.competitor}`);
        report.push(`- Sentiment: ${(threat.sentiment * 100).toFixed(0)}%`);
        report.push(`- Momentum: ${threat.momentum}`);
        report.push(`- **Recommendation:** ${threat.recommendation}`);
        report.push('');
      });
    }

    return report.join('\n');
  }

  /**
   * Copy markdown report to clipboard
   */
  async copyMarkdownToClipboard(intelligence: CompetitiveIntelligence): Promise<boolean> {
    try {
      const markdown = this.generateMarkdownReport(intelligence);
      await navigator.clipboard.writeText(markdown);
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }

  /**
   * Download markdown report as .md file
   */
  downloadMarkdownReport(intelligence: CompetitiveIntelligence, filename?: string): void {
    const timestamp = new Date().toISOString().split('T')[0];
    const exportFilename = filename || `competitive-analysis-${timestamp}.md`;
    const markdown = this.generateMarkdownReport(intelligence);

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = exportFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export const competitorComparisonExportService = new CompetitorComparisonExportService();
