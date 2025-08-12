import { renderHook, waitFor } from '@testing-library/react';
import { useAsoDataWithFallback } from '../useAsoDataWithFallback';
import { useBigQueryData } from '../useBigQueryData';
import { useMockAsoData } from '../useMockAsoData';
import { useBigQueryAppSelection } from '@/context/BigQueryAppContext';
import { useAuth } from '@/context/AuthContext';

jest.mock('../useBigQueryData');
jest.mock('../useMockAsoData');
jest.mock('@/context/BigQueryAppContext', () => ({
  useBigQueryAppSelection: jest.fn(() => ({ selectedApps: [] }))
}));
jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn(() => ({ user: null }))
}));
jest.mock('@/integrations/supabase/client', () => ({
  supabase: { from: jest.fn() }
}));

describe('useAsoDataWithFallback', () => {
  const dateRange = { from: new Date('2023-01-01'), to: new Date('2023-01-02') };
  const sources = ['organic'];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('preserves previous data during BigQuery refetch', async () => {
    const bigQueryData = { summary: { impressions: { value: 1 }, downloads: { value: 1 }, product_page_views: { value: 1 } }, timeseriesData: [], trafficSources: [] };

    (useBigQueryData as any)
      .mockReturnValueOnce({
        data: bigQueryData,
        loading: false,
        error: null,
        availableTrafficSources: []
      })
      .mockReturnValue({
        data: null,
        loading: true,
        error: null,
        availableTrafficSources: []
      });

    (useMockAsoData as any).mockReturnValue({ data: null, loading: false, error: null });

    const { result, rerender } = renderHook(() =>
      useAsoDataWithFallback(dateRange, sources)
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    const initialData = result.current.data;

    rerender();
    await waitFor(() => expect(result.current.loading).toBe(true));
    expect(result.current.data).toBe(initialData);
  });

  it('surfaces mock error when BigQuery and mock fail', async () => {
    const bigQueryError = new Error('BigQuery failed');
    const mockError = new Error('Mock failed');

    (useBigQueryData as any).mockReturnValue({
      data: null,
      loading: false,
      error: bigQueryError,
      availableTrafficSources: []
    });

    (useMockAsoData as any).mockReturnValue({
      data: null,
      loading: false,
      error: mockError
    });

    const { result } = renderHook(() =>
      useAsoDataWithFallback(dateRange, sources)
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(mockError);
  });
});
