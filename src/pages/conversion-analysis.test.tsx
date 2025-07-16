
import React from 'react';
import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import '@testing-library/jest-dom';
import ConversionAnalysisPage from './conversion-analysis';
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

// Mock the TimeSeriesChart component
jest.mock('../components/TimeSeriesChart', () => ({
  __esModule: true,
  default: ({ title }: { title: string }) => <div data-testid={`time-series-${title}`}>{title}</div>,
}));

// Mock the TrafficSourceSelect component
jest.mock('../components/Filters', () => ({
  TrafficSourceSelect: () => <div data-testid="traffic-source-select">Traffic Source Select</div>,
}));

// Mock the useSourceFiltering hook
jest.mock('../hooks/useSourceFiltering', () => ({
  __esModule: true,
  default: () => ({
    selectedSources: ['App Store Search', 'Web Referrer'],
    setSelectedSources: jest.fn(),
    filteredData: [],
    filteredSources: [
      { name: 'App Store Search', value: 50000, delta: 5.2 },
      { name: 'Web Referrer', value: 30000, delta: -2.8 },
    ],
    allSourceNames: ['App Store Search', 'Web Referrer', 'App Referrer', 'Unknown'],
  }),
}));

describe('ConversionAnalysisPage', () => {
  const mockData = {
    summary: {
      impressions: { value: 100000, delta: 2.5 },
      downloads: { value: 50000, delta: 3.7 },
      pageViews: { value: 75000, delta: 1.2 },
      cvr: { value: 5.2, delta: 0.8 },
    },
    timeseriesData: [
      {
        date: '2023-01-01',
        impressions: 1000,
        downloads: 500,
        pageViews: 750,
      }
    ],
    trafficSources: [
      { name: 'App Store Search', value: 50000, delta: 5.2 },
      { name: 'Web Referrer', value: 30000, delta: -2.8 },
      { name: 'App Referrer', value: 20000, delta: 1.7 },
      { name: 'Unknown', value: 10000, delta: -4.5 },
    ],
  };

  beforeEach(() => {
    (useAsoData as jest.Mock).mockReturnValue({
      data: mockData,
      loading: false,
    });
  });

  it('renders the main conversion rate card correctly', () => {
    render(<ConversionAnalysisPage />);
    
    // Check if the page title is rendered
    expect(screen.getByText('Conversion Analysis')).toBeInTheDocument();
    
    // Check if the main CVR card is rendered
    expect(screen.getByTestId('kpi-card-Conversion Rate')).toBeInTheDocument();
  });

  it('renders traffic source cards correctly', () => {
    render(<ConversionAnalysisPage />);
    
    // Check if the section title is rendered
    expect(screen.getByText('By Traffic Source')).toBeInTheDocument();
    
    // Check if the filtered traffic source cards are rendered
    expect(screen.getByTestId('kpi-card-App Store Search')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-card-Web Referrer')).toBeInTheDocument();
  });

  it('shows loading state when data is loading', () => {
    (useAsoData as jest.Mock).mockReturnValue({
      data: null,
      loading: true,
    });
    
    render(<ConversionAnalysisPage />);
    
    // Should still show the page title
    expect(screen.getByText('Conversion Analysis')).toBeInTheDocument();
    
    // Should have loading placeholders
    const loadingPlaceholders = document.querySelectorAll('.animate-pulse');
    expect(loadingPlaceholders.length).toBeGreaterThan(0);
  });
});
