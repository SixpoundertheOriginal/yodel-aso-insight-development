import type { Meta, StoryObj } from '@storybook/react';
import { DashboardStatsCard } from './DashboardStatsCard';

const meta = {
  title: 'Design System/Stats Cards/DashboardStatsCard',
  component: DashboardStatsCard,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
The canonical component for displaying KPIs and statistical summaries across all Yodel analytics and reporting interfaces.

**Key Features:**
- Design system compliant styling and tokens
- Responsive typography and layout  
- Accessibility compliant with proper ARIA labels
- Optional trend indicators with semantic colors
- Support for both numeric and percentage formatting
- Optional sub-labels for action recommendations

**Standard Usage:**
Use within the canonical grid pattern: \`grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4\`
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: 'Metric name/description',
    },
    value: {
      control: 'number',
      description: 'Raw numeric value',
    },
    variant: {
      control: 'select',
      options: ['number', 'percentage'],
      description: 'Formatting mode',
    },
    decimals: {
      control: { type: 'number', min: 0, max: 4, step: 1 },
      description: 'Decimal places for percentage variant',
    },
    delta: {
      control: { type: 'number', min: -100, max: 100, step: 0.1 },
      description: 'Optional change percentage',
    },
    subLabel: {
      control: 'text',
      description: 'Optional action/status indicator',
    },
    subLabelVariant: {
      control: 'select',
      options: ['success', 'warning', 'error', 'info', 'neutral'],
      description: 'Color variant for subLabel',
    },
  },
} satisfies Meta<typeof DashboardStatsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Basic examples
export const BasicNumber: Story = {
  args: {
    label: 'Total Downloads',
    value: 45678,
  },
};

export const WithPositiveDelta: Story = {
  args: {
    label: 'Impressions',
    value: 1234567,
    delta: 3.2,
  },
};

export const WithNegativeDelta: Story = {
  args: {
    label: 'Product Page Views',
    value: 89012,
    delta: -1.4,
  },
};

export const PercentageMetric: Story = {
  args: {
    label: 'Conversion Rate',
    value: 2.34,
    variant: 'percentage',
    decimals: 2,
    delta: 0.6,
  },
};

// SubLabel examples
export const WithSubLabelScale: Story = {
  args: {
    label: 'App Store Search',
    value: 987654,
    delta: 4.1,
    subLabel: 'Scale',
    subLabelVariant: 'success',
  },
};

export const WithSubLabelOptimize: Story = {
  args: {
    label: 'Google Play Search',
    value: 345678,
    delta: -2.3,
    subLabel: 'Optimize',
    subLabelVariant: 'warning',
  },
};

export const WithSubLabelInvestigate: Story = {
  args: {
    label: 'Search Ads',
    value: 12345,
    delta: -8.7,
    subLabel: 'Investigate',
    subLabelVariant: 'error',
  },
};

export const WithSubLabelExpand: Story = {
  args: {
    label: 'Social Media',
    value: 5678,
    delta: 12.4,
    subLabel: 'Expand',
    subLabelVariant: 'info',
  },
};

// Grid layout examples
export const TwoColumnGrid: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4 w-full max-w-md">
      <DashboardStatsCard label="Impressions" value={1234567} delta={3.2} />
      <DashboardStatsCard label="Downloads" value={45678} delta={-1.4} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Mobile layout: 2 columns showing essential metrics only.',
      },
    },
  },
};

export const ThreeColumnGrid: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4 w-full max-w-2xl">
      <DashboardStatsCard label="Impressions" value={1234567} delta={3.2} />
      <DashboardStatsCard label="Downloads" value={45678} delta={-1.4} />
      <DashboardStatsCard label="Page Views" value={89012} delta={2.1} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Tablet layout: 3 columns for balanced information density.',
      },
    },
  },
};

export const SixColumnGrid: Story = {
  render: () => (
    <div className="grid grid-cols-6 gap-4 w-full">
      <DashboardStatsCard label="Impressions" value={1234567} delta={3.2} />
      <DashboardStatsCard label="Downloads" value={45678} delta={-1.4} />
      <DashboardStatsCard label="Page Views" value={89012} delta={2.1} />
      <DashboardStatsCard 
        label="Page CVR" 
        value={2.34} 
        variant="percentage" 
        decimals={2}
        delta={0.6} 
      />
      <DashboardStatsCard 
        label="Impression CVR" 
        value={3.71} 
        variant="percentage" 
        decimals={2}
        delta={-0.2} 
      />
      <DashboardStatsCard label="True Search" value={987654} delta={4.8} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Desktop layout: 6 columns for full dashboard overview.',
      },
    },
  },
};

export const ResponsiveGrid: Story = {
  render: () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4 w-full">
      <DashboardStatsCard label="Impressions" value={1234567} delta={3.2} />
      <DashboardStatsCard label="Downloads" value={45678} delta={-1.4} />
      <DashboardStatsCard label="Page Views" value={89012} delta={2.1} />
      <DashboardStatsCard 
        label="Page CVR" 
        value={2.34} 
        variant="percentage" 
        decimals={1}
        delta={0.6} 
      />
      <DashboardStatsCard 
        label="Impression CVR" 
        value={3.71} 
        variant="percentage" 
        decimals={1}
        delta={-0.2} 
      />
      <DashboardStatsCard label="True Search" value={987654} delta={4.8} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'The canonical responsive grid pattern: 2 columns on mobile, 3 on tablet, 6 on desktop.',
      },
    },
  },
};

// Edge cases - Testing very large numbers (8-9 digits)
export const LargeNumbers: Story = {
  args: {
    label: 'Total Impressions',
    value: 123456789,
    delta: 15.7,
  },
};

export const ExtraLargeNumbers: Story = {
  args: {
    label: 'Huge Dataset',
    value: 987654321,
    delta: -2.3,
  },
};

export const LargeNumbersGrid: Story = {
  render: () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4 w-full">
      <DashboardStatsCard label="Large Impressions" value={123456789} delta={15.7} />
      <DashboardStatsCard label="Large Downloads" value={987654321} delta={-2.3} />
      <DashboardStatsCard label="Large Page Views" value={456789123} delta={8.1} />
      <DashboardStatsCard label="Large CVR" value={12.3456789} variant="percentage" decimals={3} delta={1.2} />
      <DashboardStatsCard label="Extra Large" value={999999999} delta={0.1} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Testing very large numbers (8-9 digits) to ensure no wrapping or overflow with font-mono text-2xl md:text-3xl.',
      },
    },
  },
};

export const SmallNumbers: Story = {
  args: {
    label: 'New Feature Adoption',
    value: 42,
    delta: 250.5,
  },
};

export const ZeroValue: Story = {
  args: {
    label: 'Errors',
    value: 0,
    delta: -100,
  },
};

export const ZeroDelta: Story = {
  args: {
    label: 'Stable Metric',
    value: 12345,
    delta: 0,
  },
};

// Accessibility example
export const AccessibilityExample: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4 w-full max-w-md">
      <DashboardStatsCard 
        label="Screen Reader Test" 
        value={45678} 
        delta={3.2}
      />
      <div className="p-4 bg-zinc-800 rounded-lg text-sm text-zinc-400">
        <p className="font-semibold mb-2">Screen Reader Output:</p>
        <p>"Screen Reader Test 45,678 Up 3.2 percent"</p>
        <p className="mt-2 text-xs">Delta includes proper ARIA labels for accessibility.</p>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Example showing screen reader accessibility with proper ARIA labels.',
      },
    },
  },
};