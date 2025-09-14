import React, { useState } from 'react';
import { Search, Star, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { 
  searchApps, 
  fetchReviews, 
  exportReviewsToCSV,
  type AppSearchResult,
  type AppReview 
} from '@/utils/itunesReviewsV2';

export default function ReviewManagementV2() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry] = useState('us');
  const [searchResults, setSearchResults] = useState<AppSearchResult[]>([]);
  const [selectedApp, setSelectedApp] = useState<AppSearchResult | null>(null);
  const [reviews, setReviews] = useState<AppReview[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 500);

  // Auto-search when debounced term changes
  React.useEffect(() => {
    if (debouncedSearchTerm.trim()) {
      handleSearch();
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearchTerm]);

  const handleSearch = async () => {
    if (!debouncedSearchTerm.trim()) return;
    
    setIsSearching(true);
    try {
      const results = await searchApps(debouncedSearchTerm, selectedCountry, 5);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Search failed. Please try again.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAppSelect = async (app: AppSearchResult) => {
    setSelectedApp(app);
    setReviews([]);
    setIsLoadingReviews(true);
    
    try {
      const { reviews: appReviews } = await fetchReviews(
        app.trackId.toString(), 
        selectedCountry, 
        1
      );
      setReviews(appReviews);
      toast.success(`Loaded ${appReviews.length} reviews for ${app.trackName}`);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
      toast.error('Failed to load reviews. Please try again.');
      setReviews([]);
    } finally {
      setIsLoadingReviews(false);
    }
  };

  const handleExportCSV = () => {
    if (!selectedApp || reviews.length === 0) {
      toast.error('No reviews to export');
      return;
    }

    try {
      exportReviewsToCSV(reviews, selectedApp.trackId.toString(), selectedCountry);
      toast.success('Reviews exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed. Please try again.');
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
        }`}
      />
    ));
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Review Management v2</h1>
          <p className="text-muted-foreground mt-2">
            Search apps and analyze their reviews from the App Store
          </p>
        </div>
      </div>

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            App Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="Search for apps..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
          
          {isSearching && (
            <div className="text-center py-4">
              <p className="text-muted-foreground">Searching...</p>
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold">Search Results</h3>
              {searchResults.map((app) => (
                <Card 
                  key={app.trackId}
                  className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                    selectedApp?.trackId === app.trackId ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleAppSelect(app)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <img
                        src={app.artworkUrl100}
                        alt={app.trackName}
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground">{app.trackName}</h4>
                        <p className="text-sm text-muted-foreground">{app.artistName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex">{renderStars(Math.round(app.averageUserRating))}</div>
                          <span className="text-sm text-muted-foreground">
                            ({app.userRatingCount?.toLocaleString() || 0} reviews)
                          </span>
                        </div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {debouncedSearchTerm && !isSearching && searchResults.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No results found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reviews Section */}
      {selectedApp && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Reviews for {selectedApp.trackName}
              </CardTitle>
              <Button
                onClick={handleExportCSV}
                disabled={reviews.length === 0}
                variant="outline"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingReviews && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading reviews...</p>
              </div>
            )}

            {!isLoadingReviews && reviews.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No reviews found</p>
              </div>
            )}

            {reviews.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {reviews.length} reviews
                  </p>
                </div>
                
                {reviews.map((review, index) => (
                  <div key={review.id} className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex">{renderStars(review.rating)}</div>
                          <Badge variant="outline">{review.version}</Badge>
                        </div>
                        <h4 className="font-semibold text-foreground mb-1">{review.title}</h4>
                        <p className="text-sm text-muted-foreground mb-2">{review.content}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>By {review.author}</span>
                          <span>{new Date(review.updated).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    {index < reviews.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}