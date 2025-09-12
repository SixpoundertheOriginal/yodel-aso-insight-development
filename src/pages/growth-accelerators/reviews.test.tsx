import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ReviewManagementPage from './reviews';

vi.mock('@/integrations/supabase/client', () => {
  return {
    supabase: {
      functions: {
        invoke: vi.fn(),
      },
    },
  };
});

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({ isSuperAdmin: true, isOrganizationAdmin: false, roles: ['SUPER_ADMIN'], organizationId: 'org_test' })
}));

vi.mock('@/hooks/useEnhancedAsoInsights', () => ({ useEnhancedAsoInsights: () => {} }));

describe('ReviewManagementPage', () => {
  const invoke = (await import('@/integrations/supabase/client')).supabase.functions
    .invoke as unknown as ReturnType<typeof vi.fn>;
  beforeEach(() => {
    invoke.mockReset();
  });

  it('searches apps and loads reviews on selection', async () => {
    // Mock search invoke
    invoke.mockResolvedValueOnce({
      data: {
        results: [
          { name: 'Instagram', appId: '389801252', developer: 'Instagram, Inc.', rating: 4.6, reviews: 1000, icon: 'icon.png', applicationCategory: 'Photo & Video' },
          { name: 'WhatsApp', appId: '310633997', developer: 'WhatsApp Inc.', rating: 4.7, reviews: 2000, icon: 'icon2.png', applicationCategory: 'Social Networking' }
        ]
      },
      error: null,
    });

    // Mock reviews invoke
    invoke.mockResolvedValueOnce({
      data: { success: true, data: [
        { review_id: 'r1', title: 'Great', text: 'Nice app', rating: 5, country: 'us', app_id: '389801252' }
      ], currentPage: 1, hasMore: false },
      error: null,
    });

    render(<ReviewManagementPage />);

    const input = await screen.findByPlaceholderText(/enter app name/i);
    fireEvent.change(input, { target: { value: 'insta' } });
    const btn = screen.getByText(/search/i);
    fireEvent.click(btn);

    const resultCard = await screen.findByText('Instagram');
    fireEvent.click(resultCard);

    await waitFor(() => {
      expect(screen.getByText(/reviews for instagram/i)).toBeInTheDocument();
      expect(screen.getByText(/Nice app/i)).toBeInTheDocument();
      expect(screen.getByText(/Export CSV/i)).toBeInTheDocument();
    });
  });
});
