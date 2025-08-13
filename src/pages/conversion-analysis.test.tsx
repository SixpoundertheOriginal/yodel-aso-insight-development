
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

jest.mock('../hooks/useBenchmarkData', () => ({
  useBenchmarkData: jest.fn().mockReturnValue({
    data: null,
    loading: false,
    error: null,
    availableCategories: [],
  }),
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

// Mock the ConversionRateChart component
jest.mock('../components/ConversionRateChart', () => ({
  __esModule: true,
  default: () => <div data-testid="conversion-rate-chart">Conversion Rate Chart</div>,
}));

// Mock the TrafficSourceCVRCard component
jest.mock('../components/TrafficSourceCVRCard', () => ({
  __esModule: true,
  default: ({ data }: { data: any }) => (
    <div data-testid={`traffic-source-card-${data.displayName}`}>{data.displayName}</div>
  ),
}));

// Mock the CVRTypeToggle component
jest.mock('../components/CVRTypeToggle', () => ({
  __esModule: true,
  default: () => <div data-testid="cvr-type-toggle">CVR Toggle</div>,
}));

// Mock the TrafficSourceSelect component
jest.mock('../components/Filters', () => ({
  TrafficSourceSelect: () => <div data-testid="traffic-source-select">Traffic Source Select</div>,
}));

jest.mock('../components/CategorySelector', () => ({
  __esModule: true,
  default: () => <div data-testid="category-selector">Category Selector</div>,
}));

jest.mock('../components/BenchmarkIndicator', () => ({
  __esModule: true,
  default: () => <div data-testid="benchmark-indicator">Benchmark Indicator</div>,
}));

describe('ConversionAnalysisPage', () => {
  const mockData = {
    summary: {
      impressions: { value: 100000, delta: 2.5 },
      downloads: { value: 50000, delta: 3.7 },
      product_page_views: { value: 75000, delta: 1.2 },
      product_page_cvr: { value: 66.7, delta: 2.1 },
      impressions_cvr: { value: 5.2, delta: 0.8 },
    },
    timeseriesData: [
      {
        date: '2023-01-01',
        impressions: 1000,
        downloads: 500,
        product_page_views: 750,
      }
    ],
    trafficSources: [
      {
        name: 'App Store Search',
        value: 50000,
        delta: 5.2,
        metrics: {
          impressions: { value: 1000, delta: 0 },
          downloads: { value: 200, delta: 0 },
          product_page_views: { value: 800, delta: 0 },
          product_page_cvr: { value: 25, delta: 0 },
          impressions_cvr: { value: 20, delta: 0 },
        },
      },
      {
        name: 'Web Referrer',
        value: 30000,
        delta: -2.8,
        metrics: {
          impressions: { value: 800, delta: 0 },
          downloads: { value: 120, delta: 0 },
          product_page_views: { value: 400, delta: 0 },
          product_page_cvr: { value: 30, delta: 0 },
          impressions_cvr: { value: 15, delta: 0 },
        },
      },
      {
        name: 'App Referrer',
        value: 20000,
        delta: 1.7,
        metrics: {
          impressions: { value: 600, delta: 0 },
          downloads: { value: 90, delta: 0 },
          product_page_views: { value: 300, delta: 0 },
          product_page_cvr: { value: 30, delta: 0 },
          impressions_cvr: { value: 15, delta: 0 },
        },
      },
      {
        name: 'Unknown',
        value: 10000,
        delta: -4.5,
        metrics: {
          impressions: { value: 500, delta: 0 },
          downloads: { value: 50, delta: 0 },
          product_page_views: { value: 200, delta: 0 },
          product_page_cvr: { value: 25, delta: 0 },
          impressions_cvr: { value: 10, delta: 0 },
        },
      },
    ],
  };

  beforeEach(() => {
    (useAsoData as jest.Mock).mockReturnValue({
      data: mockData,
      loading: false,
    });
  });

  it('renders the main conversion rate cards correctly', () => {
    render(<ConversionAnalysisPage />);

    // Check if the page title is rendered
    expect(screen.getByText('Conversion Analysis')).toBeInTheDocument();

    // Check if both CVR cards are rendered
    expect(screen.getByTestId('kpi-card-Product Page CVR')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-card-Impressions CVR')).toBeInTheDocument();
  });

  it('renders traffic source cards correctly', () => {
    render(<ConversionAnalysisPage />);

    // Check if the section title is rendered
    expect(screen.getByText('By Traffic Source')).toBeInTheDocument();

    // Check if the filtered traffic source cards are rendered
    expect(screen.getByTestId('traffic-source-card-App Store Search')).toBeInTheDocument();
    expect(screen.getByTestId('traffic-source-card-Web Referrer')).toBeInTheDocument();
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
