
import React from 'react';
import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import '@testing-library/jest-dom';
import TrafficSourcesPage from './traffic-sources';
import { useAsoData } from '../context/AsoDataContext';

// Mock the context hook
jest.mock('../context/AsoDataContext', () => ({
  useAsoData: jest.fn(),
}));

// Mock the layout component to simplify testing
jest.mock('../layouts', () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="main-layout">{children}</div>,
}));

// Mock the KpiCard component
jest.mock('../components/KpiCard', () => ({
  __esModule: true,
  default: ({ title }: { title: string }) => <div data-testid={`kpi-card-${title}`}>{title}</div>,
}));

// Mock the TrafficSourceTable component
jest.mock('../components/TrafficSourceTable', () => ({
  __esModule: true,
  default: () => <div data-testid="traffic-source-table">Table</div>,
}));

describe('TrafficSourcesPage', () => {
  const mockTrafficSources = [
    { name: 'App Store Search', value: 50000, delta: 5.2 },
    { name: 'Web Referrer', value: 30000, delta: -2.8 },
    { name: 'App Referrer', value: 20000, delta: 1.7 },
    { name: 'Unknown', value: 10000, delta: -4.5 },
  ];

  beforeEach(() => {
    (useAsoData as jest.Mock).mockReturnValue({
      data: {
        trafficSources: mockTrafficSources,
      },
      loading: false,
    });
  });

  it('renders the correct number of KPI cards with proper titles', () => {
    render(<TrafficSourcesPage />);
    
    // Check if the page title is rendered
    expect(screen.getByText('Traffic Sources')).toBeInTheDocument();
    
    // Check if all traffic sources are rendered as KPI cards
    mockTrafficSources.forEach(source => {
      expect(screen.getByTestId(`kpi-card-${source.name}`)).toBeInTheDocument();
    });
    
    // Check total count of KPI cards
    const kpiCards = screen.getAllByTestId(/^kpi-card-/);
    expect(kpiCards).toHaveLength(mockTrafficSources.length);
    
    // Check if the table is rendered
    expect(screen.getByTestId('traffic-source-table')).toBeInTheDocument();
  });

  it('shows loading state when data is loading', () => {
    (useAsoData as jest.Mock).mockReturnValue({
      data: null,
      loading: true,
    });
    
    render(<TrafficSourcesPage />);
    
    // Should still show the page title
    expect(screen.getByText('Traffic Sources')).toBeInTheDocument();
    
    // Should have loading placeholders
    const loadingPlaceholders = document.querySelectorAll('.animate-pulse');
    expect(loadingPlaceholders.length).toBeGreaterThan(0);
    
    // Should not have any KPI cards
    const kpiCards = screen.queryAllByTestId(/^kpi-card-/);
    expect(kpiCards).toHaveLength(0);
  });
});
