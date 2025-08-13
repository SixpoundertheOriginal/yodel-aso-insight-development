// Enterprise ASO Dashboard Design System - Unified Chart Theme
// Consistent styling across all chart libraries (Recharts, Chart.js, etc.)

import { chartTheme, getTrafficSourceColor } from './tokens';

// Recharts theme configuration
export const rechartsTheme = {
  // Global chart styling
  fontFamily: chartTheme.typography.fontFamily,
  fontSize: parseInt(chartTheme.typography.fontSize.label),
  
  // Color palette for different data series
  colors: [
    chartTheme.colors.primary,
    chartTheme.colors.secondary,
    chartTheme.colors.tertiary,
    chartTheme.colors.quaternary,
  ],

  // Grid and axis styling
  grid: {
    stroke: chartTheme.colors.grid,
    strokeWidth: 1,
    strokeDasharray: '3 3',
  },

  // Axis styling
  axis: {
    tick: {
      fill: chartTheme.colors.text,
      fontSize: parseInt(chartTheme.typography.fontSize.label),
      fontFamily: chartTheme.typography.fontFamily,
    },
    line: {
      stroke: chartTheme.colors.grid,
      strokeWidth: 1,
    },
  },

  // Tooltip styling
  tooltip: {
    contentStyle: {
      backgroundColor: 'hsl(var(--card))',
      border: '1px solid hsl(var(--border))',
      borderRadius: '8px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      fontFamily: chartTheme.typography.fontFamily,
      fontSize: parseInt(chartTheme.typography.fontSize.label),
      color: 'hsl(var(--foreground))',
    },
    labelStyle: {
      color: 'hsl(var(--foreground))',
      fontWeight: 600,
    },
  },

  // Legend styling
  legend: {
    wrapperStyle: {
      fontSize: parseInt(chartTheme.typography.fontSize.legend),
      fontFamily: chartTheme.typography.fontFamily,
      color: chartTheme.colors.text,
    },
  },
};

// Chart.js theme configuration
export const chartJsTheme = {
  plugins: {
    legend: {
      labels: {
        color: chartTheme.colors.text,
        font: {
          family: chartTheme.typography.fontFamily,
          size: parseInt(chartTheme.typography.fontSize.legend),
        },
      },
    },
    tooltip: {
      backgroundColor: 'hsl(var(--card))',
      titleColor: 'hsl(var(--foreground))',
      bodyColor: 'hsl(var(--foreground))',
      borderColor: 'hsl(var(--border))',
      borderWidth: 1,
      cornerRadius: 8,
      titleFont: {
        family: chartTheme.typography.fontFamily,
        size: parseInt(chartTheme.typography.fontSize.label),
        weight: 600,
      },
      bodyFont: {
        family: chartTheme.typography.fontFamily,
        size: parseInt(chartTheme.typography.fontSize.label),
      },
    },
  },
  scales: {
    x: {
      ticks: {
        color: chartTheme.colors.text,
        font: {
          family: chartTheme.typography.fontFamily,
          size: parseInt(chartTheme.typography.fontSize.label),
        },
      },
      grid: {
        color: chartTheme.colors.grid,
        lineWidth: 1,
      },
    },
    y: {
      ticks: {
        color: chartTheme.colors.text,
        font: {
          family: chartTheme.typography.fontFamily,
          size: parseInt(chartTheme.typography.fontSize.label),
        },
      },
      grid: {
        color: chartTheme.colors.grid,
        lineWidth: 1,
      },
    },
  },
};

// Utility functions for consistent chart styling
export const getChartColorPalette = (count: number): string[] => {
  const baseColors = [
    chartTheme.colors.primary,
    chartTheme.colors.secondary,
    chartTheme.colors.tertiary,
    chartTheme.colors.quaternary,
  ];

  if (count <= baseColors.length) {
    return baseColors.slice(0, count);
  }

  // Generate additional colors if needed
  const additionalColors = [];
  const hueStep = 360 / count;
  
  for (let i = baseColors.length; i < count; i++) {
    const hue = (i * hueStep) % 360;
    additionalColors.push(`hsl(${hue}, 70%, 60%)`);
  }

  return [...baseColors, ...additionalColors];
};

// Traffic source specific colors
export const getTrafficSourcePalette = (trafficSources: string[]): { [key: string]: string } => {
  const palette: { [key: string]: string } = {};
  
  trafficSources.forEach(source => {
    palette[source] = getTrafficSourceColor(source);
  });

  return palette;
};

// Common chart configurations that should be applied to all charts
export const baseChartConfig = {
  responsive: true,
  maintainAspectRatio: false,
  
  // Consistent margin and padding
  layout: {
    padding: {
      top: parseInt(chartTheme.spacing.margin),
      right: parseInt(chartTheme.spacing.margin),
      bottom: parseInt(chartTheme.spacing.margin),
      left: parseInt(chartTheme.spacing.margin),
    },
  },

  // Animation configuration
  animation: {
    duration: 750,
    easing: 'easeInOutQuart',
  },

  // Interaction configuration
  interaction: {
    intersect: false,
    mode: 'index' as const,
  },
};

// Recharts specific configurations
export const rechartsConfig = {
  margin: {
    top: parseInt(chartTheme.spacing.margin),
    right: parseInt(chartTheme.spacing.margin),
    bottom: parseInt(chartTheme.spacing.margin),
    left: parseInt(chartTheme.spacing.margin),
  },
};

// Theme application helpers
export const applyChartTheme = {
  recharts: (component: any) => ({
    ...component,
    ...rechartsConfig,
  }),

  chartjs: (config: any) => ({
    ...config,
    ...baseChartConfig,
    ...chartJsTheme,
  }),
};