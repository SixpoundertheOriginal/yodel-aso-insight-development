import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Star, Download, Eye, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';
import { useEnhancedAsoInsights } from '@/hooks/useEnhancedAsoInsights';
import { usePermissions } from '@/hooks/usePermissions';
import { PLATFORM_FEATURES, featureEnabledForRole, type UserRole } from '@/constants/features';
import { searchApps as searchItunesApps, fetchAppReviews } from '@/utils/itunesReviews';
import { exportService } from '@/services/export.service';

interface AppSearchResult {
  name: string;
  appId: string;
  developer: string;
  rating: number;
  reviews: number;
  icon: string;
  applicationCategory: string;
}

interface ReviewItem {
  review_id: string;
  title: string;
  text: string;
  rating: number;
  version?: string;
  author?: string;
  updated_at?: string;
  country: string;
  app_id: string;
}

interface ReviewsResponse {
  success: boolean;
  data?: ReviewItem[];
  error?: string;
  currentPage: number;
  hasMore: boolean;
  totalReviews?: number;
}

const ReviewManagementPage: React.FC = () => {
  // Feature flag check using platform config
  const { isSuperAdmin, isOrganizationAdmin, roles = [], organizationId } = usePermissions();
  const role = roles[0] || 'viewer';
  const currentUserRole: UserRole = isSuperAdmin ? 'super_admin' : 
    (isOrganizationAdmin ? 'org_admin' : 
    (role?.toLowerCase().includes('aso') ? 'aso_manager' :
    (role?.toLowerCase().includes('analyst') ? 'analyst' : 'viewer')));
  
  const canAccessReviews = featureEnabledForRole('REVIEWS_PUBLIC_RSS_ENABLED', currentUserRole);

  // Debug logging for troubleshooting
  console.log('ReviewManagement - Debug Info:', {
    isSuperAdmin,
    isOrganizationAdmin,
    roles,
    currentUserRole,
    canAccessReviews,
    featureConfig: PLATFORM_FEATURES.REVIEWS_PUBLIC_RSS_ENABLED
  });

  // Disable insights auto-fetching on this page
  useEnhancedAsoInsights(null, undefined, undefined, { enabled: false });

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<AppSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedApp, setSelectedApp] = useState<AppSearchResult | null>(null);

  // Reviews state
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreReviews, setHasMoreReviews] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('us');

  // Development self-test state
  const [showDevTest, setShowDevTest] = useState(import.meta.env.DEV);

  // Feature flag gate - redirect if not accessible
  if (!canAccessReviews) {
    return <Navigate to="/dashboard" replace />;
  }

  // App search functionality
  const handleAppSearch = async () => {
    if (!searchTerm.trim()) {
      toast.error('Please enter an app name to search');
      return;
    }

    setSearchLoading(true);
    try {
      const results = await searchItunesApps({
        term: searchTerm,
        country: selectedCountry,
        limit: 5,
      });
      setSearchResults(results);
      toast.success(`Found ${results.length} apps`);
      console.log('[searchApps OK]', results.length);
      
    } catch (error: any) {
      console.error('App search failed:', error);
      toast.error(`Search failed: ${error.message}`);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Reviews fetching
  const fetchReviews = async (appId: string, page: number = 1, append: boolean = false) => {
    setReviewsLoading(true);
    try {
      const result = await fetchAppReviews({ appId, cc: selectedCountry, page });
      const newReviews = result.data || [];
      console.log('[fetchReviews OK]', newReviews.length);
      if (append) {
        setReviews(prev => [...prev, ...newReviews]);
      } else {
        setReviews(newReviews);
      }
      
      setCurrentPage(result.currentPage);
      setHasMoreReviews(result.hasMore);
      
      toast.success(`Loaded ${newReviews.length} reviews (page ${result.currentPage})`);
      
    } catch (error: any) {
      console.error('Reviews fetch failed:', error);
      toast.error(`Failed to fetch reviews: ${error.message}`);
    } finally {
      setReviewsLoading(false);
    }
  };

  // App selection handler
  const handleSelectApp = (app: AppSearchResult) => {
    setSelectedApp(app);
    setReviews([]);
    setCurrentPage(1);
    setHasMoreReviews(false);
    fetchReviews(app.appId, 1);
  };

  // Load more reviews
  const handleLoadMore = () => {
    if (selectedApp && hasMoreReviews && !reviewsLoading) {
      fetchReviews(selectedApp.appId, currentPage + 1, true);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (reviews.length === 0) {
      toast.error('No reviews to export');
      return;
    }

    // Use shared CSV export utility
    try {
      const filename = `reviews-${selectedApp?.name || 'app'}-${selectedCountry}-${Date.now()}`;
      exportService.exportToCsv(
        reviews.map(r => ({
          review_id: r.review_id,
          title: r.title,
          text: r.text,
          rating: r.rating,
          version: r.version ?? '—',
          author: r.author ?? '—',
          updated_at: r.updated_at ?? '—',
          country: r.country,
          app_id: r.app_id,
        })),
        filename
      );
      toast.success(`Exported ${reviews.length} reviews to CSV`);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to export CSV');
    }
  };

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return '—';
    }
  };

  const StarRating: React.FC<{ rating: number }> = ({ rating }) => (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <Star 
          key={star} 
          className={`w-4 h-4 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
        />
      ))}
    </div>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Review Management</h1>
          <p className="text-muted-foreground">Search apps and fetch public customer reviews from iTunes RSS</p>
        </div>
        {showDevTest && (
          <Badge variant="outline" className="text-xs">DEV MODE</Badge>
        )}
      </div>

      {/* Card A: App Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            App Search
          </CardTitle>
          <CardDescription>
            Search and select an app to fetch reviews from iTunes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Enter app name (e.g. WhatsApp, Instagram)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAppSearch()}
              />
            </div>
            <Select value={selectedCountry} onValueChange={setSelectedCountry}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="us">🇺🇸 US</SelectItem>
                <SelectItem value="gb">🇬🇧 UK</SelectItem>
                <SelectItem value="ca">🇨🇦 CA</SelectItem>
                <SelectItem value="au">🇦🇺 AU</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleAppSearch} disabled={searchLoading}>
              {searchLoading ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Top 5 Results:</p>
              {searchResults.map((app, index) => (
                <Card 
                  key={app.appId}
                  className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                    selectedApp?.appId === app.appId ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleSelectApp(app)}
                >
                  <div className="flex items-center gap-3">
                    <img src={app.icon} alt={app.name} className="w-12 h-12 rounded-lg" />
                    <div className="flex-1">
                      <h4 className="font-medium">{app.name}</h4>
                      <p className="text-sm text-muted-foreground">{app.developer}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <StarRating rating={Math.round(app.rating)} />
                        <span className="text-sm text-muted-foreground">
                          ({app.reviews.toLocaleString()} reviews)
                        </span>
                        <Badge variant="secondary" className="text-xs">{app.applicationCategory}</Badge>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card B: Reviews Fetching & Export */}
      {selectedApp && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Reviews for {selectedApp.name}
            </CardTitle>
            <CardDescription>
              Fetch and export customer reviews (default: 3 pages, max 10)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <p className="text-sm text-muted-foreground">
                  Page {currentPage} • {reviews.length} reviews loaded
                </p>
                {hasMoreReviews && (
                  <Button variant="outline" size="sm" onClick={handleLoadMore} disabled={reviewsLoading}>
                    {reviewsLoading ? 'Loading...' : 'Load More'}
                  </Button>
                )}
              </div>
              <Button onClick={handleExportCSV} disabled={reviews.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>

            {reviews.length > 0 && (
              <div className="max-h-96 overflow-y-auto space-y-3 border rounded-md p-4">
                {reviews.map((review, index) => (
                  <div key={review.review_id || index} className="border-b pb-3 last:border-b-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h5 className="font-medium text-sm">{review.title || 'No title'}</h5>
                        <p className="text-xs text-muted-foreground">
                          {review.author || 'Anonymous'} • {formatDate(review.updated_at)} • v{review.version || '—'}
                        </p>
                      </div>
                      <StarRating rating={review.rating} />
                    </div>
                    <p className="text-sm text-foreground">
                      {review.text || 'No review text'}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {reviews.length === 0 && !reviewsLoading && (
              <div className="text-center py-8 text-muted-foreground">
                <Eye className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Select an app to fetch reviews</p>
              </div>
            )}

            {reviewsLoading && (
              <div className="text-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                <p className="text-muted-foreground">Loading reviews...</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dev Self-Test Panel */}
      {showDevTest && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="text-sm text-orange-800">Development Self-Test Panel</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p><strong>Feature Flag:</strong> {canAccessReviews ? '✅ ON' : '❌ OFF'}</p>
                <p><strong>Search Results:</strong> {searchResults.length}/5</p>
                <p><strong>Selected App:</strong> {selectedApp?.name || 'None'}</p>
              </div>
              <div>
                <p><strong>Reviews Loaded:</strong> {reviews.length}</p>
                <p><strong>Current Page:</strong> {currentPage}/10</p>
                <p><strong>Has More:</strong> {hasMoreReviews ? 'Yes' : 'No'}</p>
              </div>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setShowDevTest(false)}
              className="text-xs"
            >
              Hide Test Panel
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ReviewManagementPage;
