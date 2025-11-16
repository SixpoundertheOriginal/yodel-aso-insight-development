/**
 * DESIGN REGISTRY: Primitive Components Unit Tests
 *
 * Comprehensive test coverage for all primitive components.
 * Target: 100% code coverage
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  DeltaChip,
  MetricValue,
  SectionHeader,
  LoadingSkeleton,
  ZeroState,
  Badge,
  IconWrapper,
} from '../components/primitives';
import { TrendingUp, Star, Activity } from 'lucide-react';

// ============================================================================
// DeltaChip Tests
// ============================================================================
describe('DeltaChip', () => {
  it('renders positive percentage delta correctly', () => {
    render(<DeltaChip value={5.2} format="percentage" />);
    expect(screen.getByText('+5.2%')).toBeInTheDocument();
  });

  it('renders negative percentage delta correctly', () => {
    render(<DeltaChip value={-3.1} format="percentage" />);
    expect(screen.getByText('-3.1%')).toBeInTheDocument();
  });

  it('renders neutral delta (below threshold)', () => {
    render(<DeltaChip value={0.05} format="percentage" />);
    expect(screen.getByText('+0.1%')).toBeInTheDocument();
  });

  it('renders percentage points format', () => {
    render(<DeltaChip value={2.5} format="points" />);
    expect(screen.getByText('2.5pp')).toBeInTheDocument();
  });

  it('renders number format', () => {
    render(<DeltaChip value={1500} format="number" />);
    expect(screen.getByText('1.5K')).toBeInTheDocument();
  });

  it('hides icon when showIcon is false', () => {
    const { container } = render(<DeltaChip value={5} showIcon={false} />);
    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<DeltaChip value={5} className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('renders different sizes correctly', () => {
    const { container: sm } = render(<DeltaChip value={5} size="sm" />);
    expect(sm.firstChild).toHaveClass('text-xs');

    const { container: lg } = render(<DeltaChip value={5} size="lg" />);
    expect(lg.firstChild).toHaveClass('text-base');
  });
});

// ============================================================================
// MetricValue Tests
// ============================================================================
describe('MetricValue', () => {
  it('renders compact format correctly', () => {
    render(<MetricValue value={1500000} format="compact" />);
    expect(screen.getByText('1.5M')).toBeInTheDocument();
  });

  it('renders full format correctly', () => {
    render(<MetricValue value={1234567} format="full" />);
    expect(screen.getByText('1,234,567')).toBeInTheDocument();
  });

  it('renders precise format correctly', () => {
    render(<MetricValue value={1234.567} format="precise" decimals={2} />);
    expect(screen.getByText('1,234.57')).toBeInTheDocument();
  });

  it('renders percentage format correctly', () => {
    render(<MetricValue value={12.5} format="percentage" />);
    expect(screen.getByText('12.5%')).toBeInTheDocument();
  });

  it('renders ratio format correctly', () => {
    render(<MetricValue value={2.5} format="ratio" />);
    expect(screen.getByText('2.5:1')).toBeInTheDocument();
  });

  it('renders currency format correctly', () => {
    render(<MetricValue value={1234.56} format="currency" />);
    expect(screen.getByText('$1,235')).toBeInTheDocument();
  });

  it('applies correct typography size', () => {
    const { container: hero } = render(<MetricValue value={100} size="hero" />);
    expect(hero.firstChild).toHaveClass('text-5xl');

    const { container: small } = render(<MetricValue value={100} size="small" />);
    expect(small.firstChild).toHaveClass('text-xl');
  });

  it('respects custom decimals', () => {
    render(<MetricValue value={1234567} format="compact" decimals={2} />);
    expect(screen.getByText('1.23M')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<MetricValue value={100} className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

// ============================================================================
// SectionHeader Tests
// ============================================================================
describe('SectionHeader', () => {
  it('renders title correctly', () => {
    render(<SectionHeader title="Test Section" />);
    expect(screen.getByText('Test Section')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    const { container } = render(<SectionHeader icon={Activity} title="Test" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<SectionHeader title="Test" subtitle="Subtitle text" />);
    expect(screen.getByText('Subtitle text')).toBeInTheDocument();
  });

  it('renders children when provided', () => {
    render(
      <SectionHeader title="Test">
        <div>Custom content</div>
      </SectionHeader>
    );
    expect(screen.getByText('Custom content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<SectionHeader title="Test" className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

// ============================================================================
// LoadingSkeleton Tests
// ============================================================================
describe('LoadingSkeleton', () => {
  it('renders single skeleton by default', () => {
    const { container } = render(<LoadingSkeleton />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders multiple skeletons when count > 1', () => {
    const { container } = render(<LoadingSkeleton count={3} />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBe(3);
  });

  it('applies custom height', () => {
    const { container } = render(<LoadingSkeleton height="h-64" />);
    expect(container.firstChild).toHaveClass('h-64');
  });

  it('applies custom width', () => {
    const { container } = render(<LoadingSkeleton width="w-1/2" />);
    expect(container.firstChild).toHaveClass('w-1/2');
  });

  it('renders children when provided', () => {
    render(
      <LoadingSkeleton>
        <div>Loading content</div>
      </LoadingSkeleton>
    );
    expect(screen.getByText('Loading content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<LoadingSkeleton className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

// ============================================================================
// ZeroState Tests
// ============================================================================
describe('ZeroState', () => {
  it('renders title correctly', () => {
    render(<ZeroState title="No data available" />);
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    const { container } = render(<ZeroState icon={Star} title="Empty" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<ZeroState title="Empty" description="Try adjusting your filters" />);
    expect(screen.getByText('Try adjusting your filters')).toBeInTheDocument();
  });

  it('renders action when provided', () => {
    render(
      <ZeroState
        title="Empty"
        action={<button>Refresh</button>}
      />
    );
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });

  it('applies default variant styling', () => {
    const { container } = render(<ZeroState title="Test" variant="default" />);
    expect(container.querySelector('.text-muted-foreground')).toBeInTheDocument();
  });

  it('applies emphasized variant styling', () => {
    const { container } = render(<ZeroState title="Test" variant="emphasized" />);
    expect(container.querySelector('.text-zinc-200')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<ZeroState title="Test" className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

// ============================================================================
// Badge Tests
// ============================================================================
describe('Badge', () => {
  it('renders children correctly', () => {
    render(<Badge>Test Badge</Badge>);
    expect(screen.getByText('Test Badge')).toBeInTheDocument();
  });

  it('applies default variant', () => {
    const { container } = render(<Badge variant="default">Default</Badge>);
    expect(container.firstChild).toHaveClass('bg-primary');
  });

  it('applies status variant with success', () => {
    const { container } = render(<Badge variant="status" status="success">Success</Badge>);
    expect(container.firstChild).toHaveClass('text-green-400');
  });

  it('applies priority variant with high', () => {
    const { container } = render(<Badge variant="priority" priority="high">High</Badge>);
    expect(container.firstChild).toHaveClass('text-red-400');
  });

  it('applies score variant with excellent', () => {
    const { container } = render(<Badge variant="score" score="excellent">Excellent</Badge>);
    expect(container.firstChild).toHaveClass('text-green-400');
  });

  it('applies trafficSource variant', () => {
    const { container } = render(<Badge variant="trafficSource" trafficSource="search">Search</Badge>);
    expect(container.firstChild).toHaveClass('text-purple-400');
  });

  it('renders different sizes correctly', () => {
    const { container: sm } = render(<Badge size="sm">Small</Badge>);
    expect(sm.firstChild).toHaveClass('text-xs');

    const { container: lg } = render(<Badge size="lg">Large</Badge>);
    expect(lg.firstChild).toHaveClass('text-sm');
  });

  it('applies custom className', () => {
    const { container } = render(<Badge className="custom-class">Test</Badge>);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

// ============================================================================
// IconWrapper Tests
// ============================================================================
describe('IconWrapper', () => {
  it('renders icon correctly', () => {
    const { container } = render(<IconWrapper icon={TrendingUp} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('applies size variant', () => {
    const { container } = render(<IconWrapper icon={TrendingUp} size="lg" />);
    expect(container.querySelector('svg')).toHaveClass('h-6');
  });

  it('applies semantic sizing', () => {
    const { container } = render(<IconWrapper icon={TrendingUp} semantic="cardHeader" />);
    expect(container.querySelector('svg')).toHaveClass('h-5');
  });

  it('applies color variant', () => {
    const { container } = render(<IconWrapper icon={TrendingUp} color="success" />);
    expect(container.querySelector('svg')).toHaveClass('text-green-400');
  });

  it('applies custom strokeWidth', () => {
    const { container } = render(<IconWrapper icon={TrendingUp} strokeWidth={2.5} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('stroke-width', '2.5');
  });

  it('applies custom className', () => {
    const { container } = render(<IconWrapper icon={TrendingUp} className="custom-class" />);
    expect(container.querySelector('svg')).toHaveClass('custom-class');
  });

  it('semantic sizing takes precedence over size prop', () => {
    const { container } = render(
      <IconWrapper icon={TrendingUp} size="sm" semantic="sectionHeader" />
    );
    expect(container.querySelector('svg')).toHaveClass('h-6');
  });
});
