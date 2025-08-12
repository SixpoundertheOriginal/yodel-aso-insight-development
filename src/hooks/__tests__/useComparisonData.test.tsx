import { renderHook, waitFor } from '@testing-library/react';
import { useComparisonData } from '../useComparisonData';
import { useAsoData } from '../../context/AsoDataContext';
import { useBigQueryData } from '../useBigQueryData';
import { standardizeChartData } from '../../utils/format';

jest.mock('../../context/AsoDataContext', () => ({
  useAsoData: jest.fn()
}));
jest.mock('../useBigQueryData');
jest.mock('../../utils/format', () => ({
  standardizeChartData: jest.fn((d) => d)
}));

describe('useComparisonData - refetch preservation', () => {
  const dateRange = { from: new Date('2023-01-01'), to: new Date('2023-01-02') };
  const filters = { dateRange, trafficSources: [] };

  const currentData = {
    summary: {
      impressions: { value: 100 },
      downloads: { value: 10 },
      product_page_views: { value: 50 }
    },
    timeseriesData: [],
    trafficSources: []
  };

  const previousData = {
    summary: {
      impressions: { value: 80 },
      downloads: { value: 8 },
      product_page_views: { value: 40 }
    },
    timeseriesData: [],
    trafficSources: []
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAsoData as any).mockReturnValue({
      data: currentData,
      loading: false,
      error: null,
      filters
    });
  });

  it('keeps previous comparison data during refetch', async () => {
    (useBigQueryData as any)
      .mockReturnValueOnce({
        data: previousData,
        loading: false,
        error: null
      })
      .mockReturnValue({
        data: null,
        loading: true,
        error: null
      });

    const { result, rerender } = renderHook(() => useComparisonData('period'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    const cachedPrev = result.current.previous;
    const cachedDeltas = result.current.deltas;

    rerender();
    await waitFor(() => expect(result.current.loading).toBe(true));

    expect(result.current.previous).toBe(cachedPrev);
    expect(result.current.deltas).toBe(cachedDeltas);
  });
});
