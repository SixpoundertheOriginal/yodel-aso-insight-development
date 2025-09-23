/**
 * PATTERN VISUALIZATION COMPONENTS
 * 
 * Advanced charts for displaying review intelligence patterns
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Cell, PieChart, Pie } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { ReviewIntelligence, EnhancedReviewItem } from '@/types/review-intelligence.types';

interface PatternVisualizationProps {
  intelligence: ReviewIntelligence;
  reviews: EnhancedReviewItem[];
}

export const ThemeCloud: React.FC<{ themes: ReviewIntelligence['themes'] }> = ({ themes }) => {
  const data = themes.slice(0, 8).map(theme => ({
    theme: theme.theme,
    frequency: theme.frequency,
    sentiment: theme.sentiment,
    color: theme.sentiment > 0 ? '#22c55e' : theme.sentiment < -0.3 ? '#ef4444' : '#6b7280'
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Top Themes</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            frequency: {
              label: "Mentions",
              color: "hsl(var(--chart-1))"
            }
          }}
          className="h-48"
        >
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="theme" 
              angle={-45}
              textAnchor="end"
              height={80}
              fontSize={11}
            />
            <YAxis fontSize={11} />
            <ChartTooltip 
              content={<ChartTooltipContent />}
              formatter={(value, name, props) => [
                `${value} mentions`,
                `Sentiment: ${props.payload?.sentiment > 0 ? 'Positive' : props.payload?.sentiment < -0.3 ? 'Negative' : 'Neutral'}`
              ]}
            />
            <Bar dataKey="frequency" fill="var(--color-frequency)" radius={[2, 2, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export const EmotionalHeatmap: React.FC<{ reviews: EnhancedReviewItem[] }> = ({ reviews }) => {
  // Calculate average emotions
  const emotionData = React.useMemo(() => {
    const totals = { joy: 0, frustration: 0, excitement: 0, disappointment: 0, anger: 0 };
    let count = 0;

    reviews.forEach(review => {
      if (review.enhancedSentiment?.emotions) {
        Object.keys(totals).forEach(emotion => {
          totals[emotion as keyof typeof totals] += review.enhancedSentiment!.emotions[emotion as keyof typeof totals];
        });
        count++;
      }
    });

    return Object.entries(totals).map(([emotion, total]) => ({
      emotion: emotion.charAt(0).toUpperCase() + emotion.slice(1),
      value: count > 0 ? +(total / count).toFixed(2) : 0,
      fullMark: 1
    }));
  }, [reviews]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Emotional Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            value: {
              label: "Intensity",
              color: "hsl(var(--chart-2))"
            }
          }}
          className="h-48"
        >
          <RadarChart data={emotionData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="emotion" fontSize={11} />
            <PolarRadiusAxis 
              angle={90} 
              domain={[0, 1]}
              fontSize={10}
              tickFormatter={(value) => value.toFixed(1)}
            />
            <Radar
              name="Emotion Intensity"
              dataKey="value"
              stroke="var(--color-value)"
              fill="var(--color-value)"
              fillOpacity={0.3}
            />
            <ChartTooltip 
              content={<ChartTooltipContent />}
              formatter={(value) => [`${value}`, 'Intensity (0-1)']}
            />
          </RadarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export const IssueTimeline: React.FC<{ issues: ReviewIntelligence['issuePatterns'] }> = ({ issues }) => {
  const data = issues
    .slice(0, 6)
    .sort((a, b) => b.frequency - a.frequency)
    .map(issue => ({
      issue: issue.issue.length > 20 ? issue.issue.substring(0, 20) + '...' : issue.issue,
      frequency: issue.frequency,
      severity: issue.severity,
      color: issue.severity === 'critical' ? '#ef4444' : 
             issue.severity === 'major' ? '#f59e0b' : '#6b7280'
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Issue Frequency</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            frequency: {
              label: "Reports",
              color: "hsl(var(--chart-3))"
            }
          }}
          className="h-48"
        >
          <BarChart data={data} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" fontSize={11} />
            <YAxis 
              dataKey="issue" 
              type="category"
              width={100}
              fontSize={10}
            />
            <ChartTooltip 
              content={<ChartTooltipContent />}
              formatter={(value, name, props) => [
                `${value} reports`,
                `Severity: ${props.payload?.severity}`
              ]}
            />
            <Bar dataKey="frequency" radius={[0, 2, 2, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export const AspectBreakdown: React.FC<{ reviews: EnhancedReviewItem[] }> = ({ reviews }) => {
  // Calculate aspect sentiment distribution
  const aspectData = React.useMemo(() => {
    const aspects = ['ui_ux', 'performance', 'features', 'pricing', 'support'];
    
    return aspects.map(aspect => {
      const sentiments = { positive: 0, neutral: 0, negative: 0 };
      
      reviews.forEach(review => {
        const aspectSentiment = review.enhancedSentiment?.aspects?.[aspect as keyof typeof review.enhancedSentiment.aspects];
        if (aspectSentiment) {
          sentiments[aspectSentiment]++;
        }
      });
      
      const total = Object.values(sentiments).reduce((a, b) => a + b, 0);
      
      return {
        aspect: aspect.replace('_', '/').replace(/\b\w/g, l => l.toUpperCase()),
        positive: total > 0 ? sentiments.positive / total : 0,
        neutral: total > 0 ? sentiments.neutral / total : 0,
        negative: total > 0 ? sentiments.negative / total : 0,
        total: total
      };
    }).filter(item => item.total > 0);
  }, [reviews]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Aspect Sentiment</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            positive: { label: "Positive", color: "#22c55e" },
            neutral: { label: "Neutral", color: "#6b7280" },
            negative: { label: "Negative", color: "#ef4444" }
          }}
          className="h-48"
        >
          <BarChart data={aspectData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="aspect" fontSize={11} />
            <YAxis fontSize={11} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="positive" stackId="sentiment" fill="var(--color-positive)" />
            <Bar dataKey="neutral" stackId="sentiment" fill="var(--color-neutral)" />
            <Bar dataKey="negative" stackId="sentiment" fill="var(--color-negative)" />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export const PatternVisualization: React.FC<PatternVisualizationProps> = ({ intelligence, reviews }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ThemeCloud themes={intelligence.themes} />
      <EmotionalHeatmap reviews={reviews} />
      <IssueTimeline issues={intelligence.issuePatterns} />
      <AspectBreakdown reviews={reviews} />
    </div>
  );
};