import type { Meta, StoryObj } from '@storybook/react';
import { 
  StatCardBase, 
  StatCardLabel, 
  StatCardValue, 
  StatCardDelta, 
  StatCardSubLabel 
} from './StatCardBase';

const meta = {
  title: 'Design System/Stats Cards/StatCardBase',
  component: StatCardBase,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
**StatCardBase** is the foundational component for all stat cards in the design system. It provides:

- Consistent design tokens (background, border, shadow, padding)
- Responsive layout structure
- Interactive state management
- Accessibility features

**Components Included:**
- \`StatCardBase\` - Container with DS tokens
- \`StatCardLabel\` - Consistent typography for metric names  
- \`StatCardValue\` - Monospace typography for values
- \`StatCardDelta\` - Trend indicators with ARIA support
- \`StatCardSubLabel\` - Action/status indicators with semantic colors

**Usage:** Typically used indirectly through \`DashboardStatsCard\` or \`TrafficSourceKpiCards\`.
        `,
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof StatCardBase>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BasicContainer: Story = {
  render: () => (
    <StatCardBase>
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Basic container</p>
        <p className="text-xl font-bold text-white">with custom content</p>
      </div>
    </StatCardBase>
  ),
};

export const InteractiveCard: Story = {
  render: () => (
    <StatCardBase 
      interactive={true}
      onClick={() => alert('Card clicked!')}
    >
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Click me!</p>
        <p className="text-xl font-bold text-white">Interactive</p>
      </div>
    </StatCardBase>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Interactive cards show hover states and handle click events.',
      },
    },
  },
};

// Component examples
export const LabelComponent: Story = {
  render: () => (
    <div className="space-y-4">
      <StatCardBase>
        <StatCardLabel>Standard Label</StatCardLabel>
      </StatCardBase>
      <StatCardBase>
        <StatCardLabel className="text-left">Left Aligned</StatCardLabel>
      </StatCardBase>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'StatCardLabel provides consistent typography for metric names.',
      },
    },
  },
};

export const ValueComponent: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4">
      <StatCardBase>
        <StatCardValue>1,234,567</StatCardValue>
      </StatCardBase>
      <StatCardBase>
        <StatCardValue>2.34%</StatCardValue>
      </StatCardBase>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'StatCardValue uses monospace typography for consistent number alignment.',
      },
    },
  },
};

export const DeltaComponent: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4">
      <StatCardBase>
        <div className="text-center space-y-2">
          <StatCardLabel>Positive Trend</StatCardLabel>
          <StatCardValue>45,678</StatCardValue>
          <StatCardDelta delta={3.2} />
        </div>
      </StatCardBase>
      <StatCardBase>
        <div className="text-center space-y-2">
          <StatCardLabel>Negative Trend</StatCardLabel>
          <StatCardValue>12,345</StatCardValue>
          <StatCardDelta delta={-1.4} />
        </div>
      </StatCardBase>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'StatCardDelta shows trend indicators with semantic colors and ARIA labels.',
      },
    },
  },
};

export const SubLabelVariants: Story = {
  render: () => (
    <div className="grid grid-cols-5 gap-4">
      {[
        { variant: 'success' as const, label: 'Scale' },
        { variant: 'warning' as const, label: 'Optimize' }, 
        { variant: 'error' as const, label: 'Investigate' },
        { variant: 'info' as const, label: 'Expand' },
        { variant: 'neutral' as const, label: 'Monitor' },
      ].map(({ variant, label }) => (
        <StatCardBase key={variant}>
          <div className="text-center space-y-2">
            <StatCardLabel>Traffic Source</StatCardLabel>
            <StatCardValue>98,765</StatCardValue>
            <StatCardSubLabel variant={variant}>{label}</StatCardSubLabel>
          </div>
        </StatCardBase>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'StatCardSubLabel variants for different action types.',
      },
    },
  },
};

// Complete examples built with components
export const CompleteStatCard: Story = {
  render: () => (
    <StatCardBase>
      <div className="flex flex-col items-center text-center gap-2 w-full">
        <div className="flex items-center justify-between w-full mb-1">
          <StatCardLabel className="flex-1">App Store Search</StatCardLabel>
          <StatCardSubLabel variant="success">Scale</StatCardSubLabel>
        </div>
        <StatCardValue>1,234,567</StatCardValue>
        <StatCardDelta delta={4.2} />
      </div>
    </StatCardBase>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Complete stat card built using all StatCardBase components.',
      },
    },
  },
};

export const DesignTokens: Story = {
  render: () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <StatCardBase>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-2">Standard Card</p>
            <p className="text-sm">bg-background/60</p>
            <p className="text-sm">border-border rounded-lg</p>
            <p className="text-sm">shadow-sm p-5</p>
          </div>
        </StatCardBase>
        <StatCardBase interactive={true}>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-2">Interactive Card</p>
            <p className="text-sm">hover:bg-background/80</p>
            <p className="text-sm">cursor-pointer</p>
            <p className="text-sm">transition-colors</p>
          </div>
        </StatCardBase>
      </div>
      
      <div className="p-4 bg-zinc-800 rounded-lg">
        <h3 className="font-semibold text-white mb-2">Design System Tokens</h3>
        <div className="grid grid-cols-2 gap-4 text-sm text-zinc-400">
          <div>
            <p><strong>Background:</strong> bg-background/60</p>
            <p><strong>Border:</strong> border-border rounded-lg</p>
            <p><strong>Shadow:</strong> shadow-sm</p>
            <p><strong>Padding:</strong> p-5 (20px)</p>
          </div>
          <div>
            <p><strong>Min Size:</strong> 170×100px</p>
            <p><strong>Typography:</strong> Design system tokens</p>
            <p><strong>Colors:</strong> Semantic variants</p>
            <p><strong>Interactive:</strong> Hover states</p>
          </div>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Overview of design tokens and styling used by StatCardBase.',
      },
    },
  },
};