import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Star, Download, Eye, ChevronRight, Filter, SortAsc, Calendar as CalendarIcon, Smile, Meh, Frown, Brain, TrendingUp, MessageSquare, BarChart3, Globe, Target, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, ComposedChart, Line, Legend } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';
import { useEnhancedAsoInsights } from '@/hooks/useEnhancedAsoInsights';
import { usePermissions } from '@/hooks/usePermissions';
import { useDemoOrgDetection } from '@/hooks/useDemoOrgDetection';
import { PLATFORM_FEATURES, featureEnabledForRole, type UserRole } from '@/constants/features';
import { getDemoPresetForSlug } from '@/config/demoPresets';
import { useDemoSelectedApp } from '@/context/DemoSelectedAppContext';
import { fetchAppReviews } from '@/utils/itunesReviews';
import { asoSearchService } from '@/services/aso-search.service';
import { AmbiguousSearchError } from '@/types/search-errors';
import { AppSelectionModal } from '@/components/shared/AsoShared/AppSelectionModal';
import { exportService } from '@/services/export.service';
import { MainLayout } from '@/layouts';
import { YodelCard, YodelCardHeader, YodelCardContent } from '@/components/ui/design-system';
import { YodelToolbar, YodelToolbarGroup, YodelToolbarSpacer } from '@/components/ui/design-system';
import { ConnectionStatus } from '@/components/ui/connection-status';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

// Enhanced AI Intelligence imports
import { 
  EnhancedReviewItem, 
  ReviewIntelligence, 
  ActionableInsights, 
  ReviewAnalytics 
} from '@/types/review-intelligence.types';
import { 
  analyzeEnhancedSentiment, 
  extractReviewIntelligence, 
  generateActionableInsights 
} from '@/engines/review-intelligence.engine';
import { CollapsibleAnalyticsSection } from '@/components/reviews/CollapsibleAnalyticsSection';
import { MonitoredAppsGrid } from '@/components/reviews/MonitoredAppsGrid';
import { AddToMonitoringButton } from '@/components/reviews/AddToMonitoringButton';
import { useMonitoredApps, useUpdateLastChecked } from '@/hooks/useMonitoredApps';
import { useCachedReviews } from '@/hooks/useCachedReviews';
import { CompetitorComparisonView } from '@/components/reviews/CompetitorComparisonView';
import { CompetitorManagementPanel } from '@/components/reviews/CompetitorManagementPanel';
import { useReviewAnalysis } from '@/contexts/ReviewAnalysisContext';
import { ReviewIntelligenceSummary } from '@/components/reviews/ReviewIntelligenceSummary';
import { ProductFrictionStrengths } from '@/components/reviews/ProductFrictionStrengths';
import { AIRecommendationsPanel } from '@/components/reviews/AIRecommendationsPanel';
import { DateRangePicker } from '@/components/DateRangePicker';


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
  // Enhanced fields for AI analysis
  sentiment?: 'positive' | 'neutral' | 'negative';
  enhancedSentiment?: any;
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
  
  const { isDemoOrg, organization } = useDemoOrgDetection();
  const canAccessReviews = featureEnabledForRole(PLATFORM_FEATURES.REVIEWS_PUBLIC_RSS_ENABLED, currentUserRole) || isDemoOrg;

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
  
  // App selection modal state for ambiguous results
  const [showAppSelection, setShowAppSelection] = useState(false);
  const [appCandidates, setAppCandidates] = useState<any[]>([]);
  const [pendingSearchTerm, setPendingSearchTerm] = useState('');

  // Reviews state
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreReviews, setHasMoreReviews] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('us');

  // Local analysis + filters (Phase 1 - client only)
  const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all');
  const [sentimentFilter, setSentimentFilter] = useState<'all' | 'positive' | 'neutral' | 'negative'>('all');
  const [textQuery, setTextQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'rating_high' | 'rating_low'>('newest');
  // Initialize with Last 30 days as default (matching quickRange default)
  const getDefaultDateRange = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 29); // 29 days ago + today = 30 days
    return {
      start: thirtyDaysAgo.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0]
    };
  };

  const defaultRange = getDefaultDateRange();
  const [fromDate, setFromDate] = useState<string>(defaultRange.start);
  const [toDate, setToDate] = useState<string>(defaultRange.end);
  const [quickRange, setQuickRange] = useState<'all' | '7d' | '30d' | '90d' | '1y' | 'custom'>('30d');

  // Development self-test state; only for super admins without an assigned org (platform scope)
  const [showDevTest, setShowDevTest] = useState(import.meta.env.DEV);
  const canShowDevPanel = isSuperAdmin && (!organizationId || String(organizationId).trim() === '');
  const showDevBadge = isSuperAdmin && !isDemoOrg;

  // Monitored apps hooks
  const { data: monitoredApps } = useMonitoredApps(organizationId);
  const updateLastChecked = useUpdateLastChecked();

  // Shared state for Reviews and Theme Analysis
  const { setSelectedApp: setSharedSelectedApp, isAppMonitored: checkAppMonitored } = useReviewAnalysis();

  const isAppMonitored = monitoredApps?.some(
    app => app.app_store_id === selectedApp?.appId && app.primary_country === selectedCountry
  );

  // Get monitored app details for cached reviews
  const monitoredAppDetails = monitoredApps?.find(
    ma => ma.app_store_id === selectedApp?.appId && ma.primary_country === selectedCountry
  );
  const monitoredAppId = monitoredAppDetails?.id;

  // Build params for useCachedReviews (only when app is monitored)
  const cachedReviewsParams = selectedApp && isAppMonitored && monitoredAppId && organizationId
    ? {
        monitoredAppId,
        appStoreId: selectedApp.appId,
        country: selectedCountry,
        organizationId,
        forceRefresh: false
      }
    : null;

  // Use cached reviews hook for monitored apps
  const {
    data: cachedReviewsData,
    isLoading: cachedReviewsLoading,
    error: cachedReviewsError,
    refetch: refetchCachedReviews
  } = useCachedReviews(cachedReviewsParams);

  // When cached reviews are loaded, populate reviews state
  React.useEffect(() => {
    if (cachedReviewsData && cachedReviewsData.reviews.length > 0) {
      console.log('[Reviews] Setting reviews from cache:', {
        count: cachedReviewsData.reviews.length,
        fromCache: cachedReviewsData.fromCache,
        cacheAge: cachedReviewsData.cacheAge
      });

      setReviews(cachedReviewsData.reviews);
      setCurrentPage(1);
      setHasMoreReviews(false); // Cached reviews don't support pagination yet

      const source = cachedReviewsData.fromCache
        ? `from cache (${Math.floor((cachedReviewsData.cacheAge || 0) / 60)} min old)`
        : 'from iTunes (cached)';
      toast.success(`Loaded ${cachedReviewsData.reviews.length} reviews ${source}`);
    }
  }, [cachedReviewsData]);

  // Handle cache errors
  React.useEffect(() => {
    if (cachedReviewsError && isAppMonitored) {
      console.error('[Reviews] Cache error, falling back to manual fetch:', cachedReviewsError);
      // Don't show error - fallback will happen automatically
    }
  }, [cachedReviewsError, isAppMonitored]);

  // Combine loading states (manual fetch + cached reviews fetch)
  const isLoadingReviews = reviewsLoading || (isAppMonitored && cachedReviewsLoading);

  // Feature flag gate - redirect if not accessible
  if (!canAccessReviews) {
    return <Navigate to="/dashboard" replace />;
  }

  // Bulletproof app search functionality
  const handleAppSearch = async () => {
    if (!searchTerm.trim()) {
      toast.error('Please enter an app name to search');
      return;
    }

    setSearchLoading(true);
    try {
      // Use bulletproof ASO search service with organization context
      // Super admin can search across all organizations
      const searchConfig = {
        organizationId: isSuperAdmin ? null : (organizationId || '__fallback__'),
        cacheEnabled: true,
        country: selectedCountry,
        onProgress: (stage: string, progress: number) => {
          console.log(`🔍 Search progress: ${stage} (${progress}%)`);
        }
      };

      const result = await asoSearchService.search(searchTerm, searchConfig);
      
      if (result.targetApp) {
        // Direct match found - convert to AppSearchResult format
        const convertedApp: AppSearchResult = {
          name: result.targetApp.name,
          appId: result.targetApp.appId,
          developer: result.targetApp.developer || 'Unknown Developer',
          rating: result.targetApp.rating || 0,
          reviews: result.targetApp.reviews || 0,
          icon: result.targetApp.icon || '',
          applicationCategory: result.targetApp.applicationCategory || 'Unknown'
        };
        
        setSearchResults([convertedApp]);
        toast.success('App found successfully with bulletproof search');
        console.log('✅ [BULLETPROOF-SEARCH] Direct match found:', convertedApp);
      } else {
        // No results found
        setSearchResults([]);
        toast.error('No apps found matching your search');
        console.log('❌ [BULLETPROOF-SEARCH] No results found');
      }
      
    } catch (error: any) {
      console.error('Bulletproof search failed:', error);
      
      if (error instanceof AmbiguousSearchError) {
        // Handle ambiguous results with selection modal
        console.log('🔄 [BULLETPROOF-SEARCH] Ambiguous results, showing selection modal');
        setAppCandidates(error.candidates || []);
        setPendingSearchTerm(searchTerm);
        setShowAppSelection(true);
        setSearchLoading(false);
        return;
      }
      
      // Enhanced error messaging based on error type
      let errorMessage = 'Search failed';
      if (error.message.includes('timeout')) {
        errorMessage = 'Search timed out - please check your connection and try again';
      } else if (error.message.includes('temporarily unavailable')) {
        errorMessage = 'Search service temporarily unavailable - please try again in a moment';
      } else if (error.message.includes('Connection timeout')) {
        errorMessage = 'Connection timeout - please check your internet connection';
      } else if (error.message.includes('Circuit breaker')) {
        errorMessage = 'Search service temporarily offline - please try again in a few moments';
      } else {
        errorMessage = `Search failed: ${error.message}`;
      }
      
      toast.error(errorMessage);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle app selection from modal
  const handleAppSelectionFromModal = (selectedMetadata: any) => {
    // Convert ScrapedMetadata to AppSearchResult format
    const convertedApp: AppSearchResult = {
      name: selectedMetadata.name,
      appId: selectedMetadata.appId,
      developer: selectedMetadata.developer || 'Unknown Developer',
      rating: selectedMetadata.rating || 0,
      reviews: selectedMetadata.reviews || 0,
      icon: selectedMetadata.icon || '',
      applicationCategory: selectedMetadata.applicationCategory || 'Unknown'
    };
    
    setSearchResults([convertedApp]);
    setShowAppSelection(false);
    setAppCandidates([]);
    setPendingSearchTerm('');
    toast.success('App selected successfully');
    console.log('✅ [APP-SELECTION] Selected from modal:', convertedApp);
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

  // Demo preset auto-select removed: require manual app selection in demo mode

  // Watch for when an app becomes monitored and update shared state
  React.useEffect(() => {
    if (selectedApp && isAppMonitored && monitoredApps) {
      const monitoredApp = monitoredApps.find(
        ma => ma.app_store_id === selectedApp.appId && ma.primary_country === selectedCountry
      );

      if (monitoredApp) {
        console.log('[Reviews] App became monitored, updating shared state:', selectedApp.name);
        setSharedSelectedApp({
          appId: selectedApp.appId,
          appStoreId: selectedApp.appId,
          name: selectedApp.name,
          developer: selectedApp.developer,
          icon: selectedApp.icon,
          country: selectedCountry,
          rating: selectedApp.rating,
          reviewCount: selectedApp.reviews,
          category: selectedApp.applicationCategory,
          monitoredAppId: monitoredApp.id,
          lastSelectedAt: Date.now()
        });
      }
    }
  }, [isAppMonitored, selectedApp, monitoredApps, selectedCountry, setSharedSelectedApp]);

  // App selection handler
  const handleSelectApp = (app: AppSearchResult) => {
    setSelectedApp(app);
    setReviews([]);
    setCurrentPage(1);
    setHasMoreReviews(false);
    // Default to last 30 days on app change
    const today = new Date();
    const end = formatDateInputLocal(today);
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 29);
    const start = formatDateInputLocal(startDate);
    setFromDate(start);
    setToDate(end);
    setQuickRange('30d');

    // Check if app is already monitored
    const isMonitored = checkAppMonitored(app.appId, selectedCountry);

    if (isMonitored) {
      // For monitored apps, useCachedReviews hook will fetch automatically
      console.log('[Reviews] Monitored app selected, will use cached reviews:', app.name);
    } else {
      // For non-monitored apps, use manual fetch as before
      console.log('[Reviews] Non-monitored app selected, fetching reviews manually:', app.name);
      fetchReviews(app.appId, 1);
    }

    // Save to shared state if app is monitored
    if (checkAppMonitored(app.appId, selectedCountry)) {
      const monitoredApp = monitoredApps?.find(
        ma => ma.app_store_id === app.appId && ma.primary_country === selectedCountry
      );

      if (monitoredApp) {
        console.log('[Reviews] Saving monitored app to shared state:', app.name);
        setSharedSelectedApp({
          appId: app.appId,
          appStoreId: app.appId,
          name: app.name,
          developer: app.developer,
          icon: app.icon,
          country: selectedCountry,
          rating: app.rating,
          reviewCount: app.reviews,
          category: app.applicationCategory,
          monitoredAppId: monitoredApp.id,
          lastSelectedAt: Date.now()
        });
      }
    }
  };

  // Load more reviews
  const handleLoadMore = () => {
    if (selectedApp && hasMoreReviews && !isLoadingReviews) {
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

  // Convert country code to emoji flag
  const ccToFlag = (cc: string): string => {
    try {
      const up = cc?.toUpperCase();
      if (!up || up.length !== 2) return up || '';
      const codePoints = [...up].map(c => 127397 + c.charCodeAt(0));
      return String.fromCodePoint(...codePoints);
    } catch {
      return cc;
    }
  };

  // Local date formatting for <input type="date"> (avoid UTC shift)
  const formatDateInputLocal = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const applyQuickRange = (range: 'all' | '7d' | '30d' | '90d' | '1y' | 'custom') => {
    setQuickRange(range);
    if (range === 'all') {
      setFromDate('');
      setToDate('');
      return;
    }
    if (range === 'custom') return;
    const today = new Date();
    const end = formatDateInputLocal(today);
    const startDate = new Date(today);
    if (range === '7d') startDate.setDate(today.getDate() - 6); // include today
    if (range === '30d') startDate.setDate(today.getDate() - 29);
    if (range === '90d') startDate.setDate(today.getDate() - 89);
    if (range === '1y') startDate.setFullYear(today.getFullYear() - 1);
    const start = formatDateInputLocal(startDate);
    setFromDate(start);
    setToDate(end);
  };

  // Default the page to last 30 days on first render
  React.useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 29);
    setFromDate(formatDateInputLocal(thirtyDaysAgo));
    setToDate(formatDateInputLocal(today));
    setQuickRange('30d');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Very lightweight sentiment estimation (client-only, Phase 1)
  const estimateSentiment = (r: ReviewItem): 'positive' | 'neutral' | 'negative' => {
    // Primary signal: star rating
    if (r.rating >= 4) return 'positive';
    if (r.rating <= 2) return 'negative';

    const text = (r.text || '').toLowerCase();
    const positives = ['love', 'great', 'awesome', 'excellent', 'amazing', 'good', 'fantastic', 'best'];
    const negatives = ['bad', 'terrible', 'awful', 'bug', 'crash', 'hate', 'worst', 'poor'];
    const posHit = positives.some(w => text.includes(w));
    const negHit = negatives.some(w => text.includes(w));
    if (posHit && !negHit) return 'positive';
    if (negHit && !posHit) return 'negative';
    return 'neutral';
  };

  // Enhanced helper functions for meaningful AI analysis
  const extractThemesFromText = (text: string): string[] => {
    if (!text || typeof text !== 'string') return [];

    const lowerText = text.toLowerCase();
    const detectedThemes: string[] = [];

    // Comprehensive theme patterns
    const themePatterns = {
      'checkout problems': ['checkout', 'payment', 'purchase', 'buy', 'cart', 'billing'],
      'app crashes': ['crash', 'crashes', 'freeze', 'frozen', 'stuck', 'closes'],
      'performance issues': ['slow', 'lag', 'loading', 'speed', 'response time', 'performance'],
      'ui/ux design': ['design', 'interface', 'layout', 'ui', 'ux', 'look', 'appearance'],
      'login problems': ['login', 'sign in', 'password', 'account', 'authentication'],
      'feature requests': ['feature', 'add', 'would like', 'wish', 'need', 'missing'],
      'customer support': ['support', 'help', 'service', 'response', 'customer care'],
      'pricing concerns': ['price', 'cost', 'expensive', 'cheap', 'subscription', 'premium'],
      'battery usage': ['battery', 'drain', 'power', 'energy'],
      'notifications': ['notification', 'alert', 'remind', 'push']
    };

    Object.entries(themePatterns).forEach(([theme, keywords]) => {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        detectedThemes.push(theme);
      }
    });

    return detectedThemes;
  };

  const extractFeaturesFromText = (text: string): string[] => {
    if (!text || typeof text !== 'string') return [];

    const lowerText = text.toLowerCase();
    const detectedFeatures: string[] = [];

    const featurePatterns = {
      'dark mode': ['dark mode', 'night mode', 'dark theme'],
      'notifications': ['notification', 'alert', 'remind'],
      'search functionality': ['search', 'find', 'look for'],
      'offline mode': ['offline', 'without internet', 'no connection'],
      'sync': ['sync', 'synchronize', 'backup'],
      'export data': ['export', 'download', 'save'],
      'sharing': ['share', 'send', 'forward'],
      'customization': ['customize', 'personalize', 'settings'],
      'voice input': ['voice', 'speech', 'dictate'],
      'widgets': ['widget', 'shortcut', 'quick access']
    };

    Object.entries(featurePatterns).forEach(([feature, keywords]) => {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        detectedFeatures.push(feature);
      }
    });

    return detectedFeatures;
  };

  const extractIssuesFromText = (text: string): string[] => {
    if (!text || typeof text !== 'string') return [];

    const lowerText = text.toLowerCase();
    const detectedIssues: string[] = [];

    const issuePatterns = {
      'app crashes': ['crash', 'crashes', 'freeze', 'frozen', 'stuck'],
      'login failures': ['can\'t login', 'login failed', 'won\'t sign in'],
      'loading problems': ['won\'t load', 'loading forever', 'stuck loading'],
      'sync errors': ['sync failed', 'won\'t sync', 'sync problem'],
      'payment issues': ['payment failed', 'can\'t purchase', 'billing error'],
      'performance lag': ['slow', 'laggy', 'sluggish', 'unresponsive'],
      'ui bugs': ['button doesn\'t work', 'interface broken', 'display issue'],
      'data loss': ['lost data', 'deleted', 'missing information'],
      'notification problems': ['notifications not working', 'no alerts'],
      'battery drain': ['drains battery', 'battery usage', 'power hungry']
    };

    Object.entries(issuePatterns).forEach(([issue, keywords]) => {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        detectedIssues.push(issue);
      }
    });

    return detectedIssues;
  };

  const calculateBusinessImpact = (rating: number, text: string): 'high' | 'medium' | 'low' => {
    if (!text) return rating <= 2 ? 'medium' : 'low';

    const criticalKeywords = ['crash', 'bug', 'broken', 'terrible', 'worst', 'awful'];
    const hasCriticalIssue = criticalKeywords.some(keyword => text.toLowerCase().includes(keyword));

    if (rating <= 2 && hasCriticalIssue) return 'high';
    if (rating >= 4 && text.length > 100) return 'high';
    if (rating === 3 || hasCriticalIssue) return 'medium';
    return 'low';
  };

  // Enhanced sentiment analysis with AI intelligence
  const enhancedReviews = useMemo(() => {
    console.log('🔍 DATA DEBUG [ENHANCED]: Starting review processing. Raw reviews:', reviews?.length || 0);
    
    if (!reviews || !Array.isArray(reviews) || reviews.length === 0) {
      return [];
    }
    
    try {
      const processed = reviews.map(r => {
        try {
          const enhancedSentiment = analyzeEnhancedSentiment(r.text || '', r.rating);
          const extractedThemes = extractThemesFromText(r.text || '');
          const mentionedFeatures = extractFeaturesFromText(r.text || '');
          const identifiedIssues = extractIssuesFromText(r.text || '');
          
          return {
            ...r,
            sentiment: enhancedSentiment.overall,
            enhancedSentiment,
            extractedThemes,
            mentionedFeatures,
            identifiedIssues,
            businessImpact: calculateBusinessImpact(r.rating, r.text || '')
          } as EnhancedReviewItem;
        } catch (error) {
          console.error('Error processing individual review:', error);
          // Fallback to basic review with estimated sentiment
          return {
            ...r,
            sentiment: estimateSentiment(r),
            enhancedSentiment: {
              overall: estimateSentiment(r),
              confidence: 0.5,
              emotions: { joy: 0, frustration: 0, excitement: 0, disappointment: 0, anger: 0 },
              aspects: { ui_ux: null, performance: null, features: null, pricing: null, support: null },
              intensity: 'mild' as const
            },
            extractedThemes: extractThemesFromText(r.text || ''),
            mentionedFeatures: extractFeaturesFromText(r.text || ''),
            identifiedIssues: extractIssuesFromText(r.text || ''),
            businessImpact: calculateBusinessImpact(r.rating, r.text || '')
          } as EnhancedReviewItem;
        }
      });
      
      console.log('🔍 DATA DEBUG [ENHANCED]: Processed reviews with themes:', 
        processed.filter(r => r.extractedThemes?.length > 0).length);
      console.log('🔍 DATA DEBUG [ENHANCED]: Processed reviews with issues:', 
        processed.filter(r => r.identifiedIssues?.length > 0).length);
      
      return processed;
    } catch (error) {
      console.error('Error in enhanced reviews processing:', error);
      // Ultimate fallback - return reviews with basic sentiment
      return reviews.map(r => ({
        ...r,
        sentiment: estimateSentiment(r),
        enhancedSentiment: {
          overall: estimateSentiment(r),
          confidence: 0.5,
          emotions: { joy: 0, frustration: 0, excitement: 0, disappointment: 0, anger: 0 },
          aspects: { ui_ux: null, performance: null, features: null, pricing: null, support: null },
          intensity: 'mild' as const
        },
        extractedThemes: [],
        mentionedFeatures: [],
        identifiedIssues: [],
        businessImpact: 'low' as const
      })) as EnhancedReviewItem[];
    }
  }, [reviews]);

  // Use enhanced reviews for processing
  const processedReviews = enhancedReviews;

  // AI Insight Filter State (needed for filteredReviews)
  const [selectedInsightFilter, setSelectedInsightFilter] = useState<{
    type: 'sentiment' | 'theme' | 'issue' | 'feature' | null;
    value: string | null;
  }>({ type: null, value: null });

  const filteredReviews = useMemo(() => {
    console.log('📅 [FILTER] filteredReviews useMemo running - fromDate:', fromDate, 'toDate:', toDate);
    let list = processedReviews;
    console.log('📅 [FILTER] Starting with', list.length, 'reviews');

    // Apply standard filters
    if (ratingFilter !== 'all') {
      list = list.filter(r => r.rating === ratingFilter);
    }
    if (sentimentFilter !== 'all') {
      list = list.filter(r => (r as any).sentiment === sentimentFilter);
    }
    if (textQuery.trim()) {
      const q = textQuery.toLowerCase();
      list = list.filter(r =>
        (r.title || '').toLowerCase().includes(q) ||
        (r.text || '').toLowerCase().includes(q) ||
        (r.author || '').toLowerCase().includes(q)
      );
    }

    // AI Insight-based filtering (NEW)
    if (selectedInsightFilter.type && selectedInsightFilter.value) {
      const { type, value } = selectedInsightFilter;

      if (type === 'sentiment') {
        list = list.filter(r => (r as any).sentiment === value);
      } else if (type === 'theme') {
        list = list.filter(r =>
          r.extractedThemes?.includes(value) ||
          r.text?.toLowerCase().includes(value.toLowerCase())
        );
      } else if (type === 'issue') {
        list = list.filter(r =>
          r.identifiedIssues?.includes(value) ||
          r.text?.toLowerCase().includes(value.toLowerCase())
        );
      } else if (type === 'feature') {
        list = list.filter(r =>
          r.mentionedFeatures?.includes(value) ||
          r.text?.toLowerCase().includes(value)
        );
      }
    }

    // Date filtering with debug logging
    if (fromDate) {
      const from = new Date(fromDate).getTime();
      console.log('📅 [FILTER] Applying fromDate filter:', fromDate, '(timestamp:', from, ')');
      const beforeFilter = list.length;
      list = list.filter(r => {
        const t = r.updated_at ? new Date(r.updated_at).getTime() : 0;
        return t >= from;
      });
      console.log('📅 [FILTER] After fromDate filter:', list.length, '(filtered out', beforeFilter - list.length, ')');
    }
    if (toDate) {
      // Add end of day (23:59:59.999) to include all reviews from toDate
      const toDateEnd = new Date(toDate);
      toDateEnd.setHours(23, 59, 59, 999);
      const to = toDateEnd.getTime();
      console.log('📅 [FILTER] Applying toDate filter:', toDate, '(timestamp:', to, ')');
      const beforeFilter = list.length;
      list = list.filter(r => {
        const t = r.updated_at ? new Date(r.updated_at).getTime() : 0;
        return t <= to;
      });
      console.log('📅 [FILTER] After toDate filter:', list.length, '(filtered out', beforeFilter - list.length, ')');
    }

    // Sorting
    const sorted = [...list];
    switch (sortBy) {
      case 'newest':
        sorted.sort((a, b) => (new Date(b.updated_at || 0).getTime()) - (new Date(a.updated_at || 0).getTime()));
        break;
      case 'oldest':
        sorted.sort((a, b) => (new Date(a.updated_at || 0).getTime()) - (new Date(b.updated_at || 0).getTime()));
        break;
      case 'rating_high':
        sorted.sort((a, b) => b.rating - a.rating);
        break;
      case 'rating_low':
        sorted.sort((a, b) => a.rating - b.rating);
        break;
    }
    console.log('📅 [FILTER] Final filtered count:', sorted.length);
    return sorted;
  }, [processedReviews, ratingFilter, sentimentFilter, textQuery, fromDate, toDate, sortBy, selectedInsightFilter]);

  // Generate comprehensive AI intelligence from enhanced reviews
  const reviewIntelligence = useMemo(() => {
    console.log('🔍 DATA DEBUG [INTELLIGENCE]: Processing reviews count:', filteredReviews?.length || 0);

    if (!filteredReviews || filteredReviews.length === 0) {
      return {
        themes: [],
        featureMentions: [],
        issuePatterns: []
      };
    }

    try {
      // Try engine first, fallback to manual extraction if needed
      const engineResult = extractReviewIntelligence(filteredReviews);
      console.log('🔍 DATA DEBUG [ENGINE]: Engine result themes:', engineResult?.themes?.length || 0);
      
      if (engineResult?.themes?.length > 0) {
        return engineResult;
      }
      
      // Fallback: Manual intelligence extraction
      console.log('🔍 DATA DEBUG [FALLBACK]: Using manual intelligence extraction');

      const themeMap = new Map<string, { count: number; sentiment: number[]; examples: string[]; trending: 'up' | 'down' | 'stable' }>();
      const featureMap = new Map<string, { count: number; sentiment: number[]; impact: 'high' | 'medium' | 'low' }>();
      const issueMap = new Map<string, { count: number; severity: 'critical' | 'major' | 'minor'; affectedVersions: string[]; firstSeen: Date }>();

      filteredReviews.forEach(review => {
        // Process themes
        review.extractedThemes?.forEach(theme => {
          if (!themeMap.has(theme)) {
            themeMap.set(theme, { count: 0, sentiment: [], examples: [], trending: 'stable' });
          }
          const themeData = themeMap.get(theme)!;
          themeData.count++;
          themeData.sentiment.push(review.rating);
          if (themeData.examples.length < 3 && review.text) {
            themeData.examples.push(review.text.substring(0, 100) + '...');
          }
        });
        
        // Process features
        review.mentionedFeatures?.forEach(feature => {
          if (!featureMap.has(feature)) {
            featureMap.set(feature, { count: 0, sentiment: [], impact: 'medium' });
          }
          const featureData = featureMap.get(feature)!;
          featureData.count++;
          featureData.sentiment.push(review.rating);
          // Determine impact based on frequency and sentiment
          featureData.impact = featureData.count >= 3 ? 'high' : featureData.count >= 2 ? 'medium' : 'low';
        });
        
        // Process issues
        review.identifiedIssues?.forEach(issue => {
          if (!issueMap.has(issue)) {
            issueMap.set(issue, { 
              count: 0, 
              severity: 'minor', 
              affectedVersions: [], 
              firstSeen: review.updated_at ? new Date(review.updated_at) : new Date() 
            });
          }
          const issueData = issueMap.get(issue)!;
          issueData.count++;
          // Determine severity based on frequency and rating
          issueData.severity = issueData.count >= 3 ? 'critical' : issueData.count >= 2 ? 'major' : 'minor';
          if (review.version && !issueData.affectedVersions.includes(review.version)) {
            issueData.affectedVersions.push(review.version);
          }
        });
      });
      
      // Convert to expected format
      const themes = Array.from(themeMap.entries()).map(([theme, data]) => ({
        theme,
        frequency: data.count,
        sentiment: data.sentiment.reduce((a, b) => a + b, 0) / data.sentiment.length,
        examples: data.examples,
        trending: data.trending
      })).sort((a, b) => b.frequency - a.frequency);
      
      const featureMentions = Array.from(featureMap.entries()).map(([feature, data]) => ({
        feature,
        mentions: data.count,
        sentiment: data.sentiment.reduce((a, b) => a + b, 0) / data.sentiment.length,
        impact: data.impact
      })).sort((a, b) => b.mentions - a.mentions);
      
      const issuePatterns = Array.from(issueMap.entries()).map(([issue, data]) => ({
        issue,
        frequency: data.count,
        severity: data.severity,
        affectedVersions: data.affectedVersions,
        firstSeen: data.firstSeen
      })).sort((a, b) => b.frequency - a.frequency);
      
      const result = { themes, featureMentions, issuePatterns };
      console.log('🔍 DATA DEBUG [RESULT]: Generated intelligence:', {
        themesCount: themes.length,
        featuresCount: featureMentions.length,
        issuesCount: issuePatterns.length
      });
      
      return result;
    } catch (error) {
      console.error('Error in review intelligence extraction:', error);
      return {
        themes: [],
        featureMentions: [],
        issuePatterns: []
      };
    }
  }, [filteredReviews]);

  // Generate comprehensive actionable insights
  const actionableInsights = useMemo(() => {
    console.log('🔍 DATA DEBUG [INSIGHTS]: Generating insights for reviews:', filteredReviews?.length || 0);

    if (!filteredReviews || filteredReviews.length === 0) {
      return {
        priorityIssues: [],
        improvements: [],
        alerts: []
      };
    }

    try {
      // Try engine first, fallback if needed
      const engineResult = reviewIntelligence ? generateActionableInsights(filteredReviews, reviewIntelligence) : null;

      if (engineResult?.priorityIssues?.length > 0 || engineResult?.improvements?.length > 0) {
        return engineResult;
      }

      // Fallback: Generate insights manually
      const priorityIssues: any[] = [];
      const improvements: any[] = [];
      const alerts: any[] = [];

      // Analyze for critical issues
      const negativeReviews = filteredReviews.filter(r => r.rating <= 2);
      const issueFrequency = new Map<string, number>();
      
      negativeReviews.forEach(review => {
        review.identifiedIssues?.forEach(issue => {
          issueFrequency.set(issue, (issueFrequency.get(issue) || 0) + 1);
        });
      });
      
      // Generate priority issues
      issueFrequency.forEach((count, issue) => {
        if (count >= 2) { // Issue mentioned multiple times
          priorityIssues.push({
            issue,
            frequency: count,
            urgency: count >= 3 ? 'high' : 'medium',
            impact: count >= 3 ? 'high' : 'medium',
            recommendation: `Address ${issue} - mentioned in ${count} negative reviews`
          });
        }
      });
      
      // Generate improvements from positive reviews
      const positiveReviews = filteredReviews.filter(r => r.rating >= 4);
      const featureRequests = new Map<string, number>();

      positiveReviews.forEach(review => {
        const text = review.text?.toLowerCase() || '';
        if (text.includes('would be great') || text.includes('wish') || text.includes('add')) {
          review.mentionedFeatures?.forEach(feature => {
            featureRequests.set(feature, (featureRequests.get(feature) || 0) + 1);
          });
        }
      });

      featureRequests.forEach((count, feature) => {
        improvements.push({
          opportunity: `Enhance ${feature}`,
          impact: 'medium',
          effort: 'medium',
          description: `${count} users mentioned wanting improvements to ${feature}`
        });
      });

      // Generate alerts for concerning trends
      const negativePercentage = (negativeReviews.length / filteredReviews.length) * 100;
      if (negativePercentage > 20) {
        alerts.push({
          type: 'warning',
          message: `${negativePercentage.toFixed(1)}% negative reviews exceed healthy threshold`,
          urgency: 'high',
          impact: 'high'
        });
      }

      const crashMentions = filteredReviews.filter(r =>
        r.text?.toLowerCase().includes('crash') ||
        r.text?.toLowerCase().includes('freeze')
      ).length;

      if (crashMentions > 2) {
        alerts.push({
          type: 'critical',
          message: `${crashMentions} reviews mention app crashes - requires immediate attention`,
          urgency: 'immediate',
          impact: 'high'
        });
      }

      const result = { priorityIssues, improvements, alerts };
      console.log('🔍 DATA DEBUG [INSIGHTS-RESULT]:', {
        priorityIssuesCount: priorityIssues.length,
        improvementsCount: improvements.length,
        alertsCount: alerts.length
      });

      return result;
    } catch (error) {
      console.error('Error in actionable insights generation:', error);
      return {
        priorityIssues: [],
        improvements: [],
        alerts: []
      };
    }
  }, [filteredReviews, reviewIntelligence]);

  // Enhanced analytics with comprehensive data population
  const reviewAnalytics = useMemo((): ReviewAnalytics => {
    console.log('🔍 DATA DEBUG [ANALYTICS]: Processing analytics for reviews:', filteredReviews?.length || 0);

    if (!filteredReviews || filteredReviews.length === 0) {
      return {
        totalReviews: 0,
        averageRating: 0,
        sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
        positivePercentage: 0,
        emotionalProfile: { joy: 0, frustration: 0, excitement: 0, disappointment: 0, anger: 0 },
        topThemes: [],
        criticalIssues: 0,
        trendingTopics: []
      };
    }

    try {
      const totalReviews = filteredReviews.length;
      const averageRating = totalReviews > 0 ?
        filteredReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews : 0;

      // Enhanced sentiment calculation
      const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
      filteredReviews.forEach(r => {
        if (r.enhancedSentiment?.overall) {
          sentimentCounts[r.enhancedSentiment.overall]++;
        } else {
          // Fallback based on rating
          if (r.rating >= 4) sentimentCounts.positive++;
          else if (r.rating <= 2) sentimentCounts.negative++;
          else sentimentCounts.neutral++;
        }
      });

      // Enhanced emotional profile with real text analysis
      const emotionalProfile = { joy: 0, frustration: 0, excitement: 0, disappointment: 0, anger: 0 };

      filteredReviews.forEach(r => {
        if (r.enhancedSentiment?.emotions) {
          // Use existing emotions if available
          Object.keys(emotionalProfile).forEach(emotion => {
            emotionalProfile[emotion as keyof typeof emotionalProfile] += 
              r.enhancedSentiment!.emotions[emotion as keyof typeof emotionalProfile] || 0;
          });
        } else {
          // Generate emotions from text and rating
          const text = (r.text || '').toLowerCase();
          
          // Joy indicators
          if (text.includes('love') || text.includes('amazing') || text.includes('excellent') || r.rating === 5) {
            emotionalProfile.joy += 0.8;
          }
          
          // Frustration indicators  
          if (text.includes('frustrating') || text.includes('annoying') || text.includes('difficult')) {
            emotionalProfile.frustration += 0.7;
          }
          
          // Excitement indicators
          if (text.includes('awesome') || text.includes('fantastic') || text.includes('incredible')) {
            emotionalProfile.excitement += 0.6;
          }
          
          // Disappointment indicators
          if (text.includes('disappointed') || text.includes('expected better') || (r.rating <= 2 && text.length > 50)) {
            emotionalProfile.disappointment += 0.5;
          }
          
          // Anger indicators
          if (text.includes('terrible') || text.includes('worst') || text.includes('hate') || r.rating === 1) {
            emotionalProfile.anger += 0.4;
          }
        }
      });

      // Normalize emotional profile
      const maxEmotion = Math.max(...Object.values(emotionalProfile));
      if (maxEmotion > 0) {
        Object.keys(emotionalProfile).forEach(emotion => {
          emotionalProfile[emotion as keyof typeof emotionalProfile] = 
            (emotionalProfile[emotion as keyof typeof emotionalProfile] / totalReviews) * 100;
        });
      }

      const positivePercentage = totalReviews > 0 ? Number(((sentimentCounts.positive / totalReviews) * 100).toFixed(0)) : 0;

      const result = {
        totalReviews,
        averageRating: Number(averageRating.toFixed(2)),
        sentimentDistribution: {
          positive: totalReviews > 0 ? Number(((sentimentCounts.positive / totalReviews) * 100).toFixed(1)) : 0,
          neutral: totalReviews > 0 ? Number(((sentimentCounts.neutral / totalReviews) * 100).toFixed(1)) : 0,
          negative: totalReviews > 0 ? Number(((sentimentCounts.negative / totalReviews) * 100).toFixed(1)) : 0,
        },
        positivePercentage,
        emotionalProfile: {
          joy: Number(emotionalProfile.joy.toFixed(1)),
          frustration: Number(emotionalProfile.frustration.toFixed(1)),
          excitement: Number(emotionalProfile.excitement.toFixed(1)),
          disappointment: Number(emotionalProfile.disappointment.toFixed(1)),
          anger: Number(emotionalProfile.anger.toFixed(1))
        },
        topThemes: reviewIntelligence?.themes?.slice(0, 5).map(t => t.theme) || [],
        criticalIssues: reviewIntelligence?.issuePatterns?.filter(i => i.severity === 'critical' || i.severity === 'major').length || 0,
        trendingTopics: reviewIntelligence?.featureMentions?.slice(0, 3).map(f => f.feature) || []
      };
      
      console.log('🔍 DATA DEBUG [ANALYTICS-RESULT]:', {
        totalReviews: result.totalReviews,
        averageRating: result.averageRating,
        sentimentDist: result.sentimentDistribution,
        positivePercentage: result.positivePercentage,
        topThemes: result.topThemes.length,
        criticalIssues: result.criticalIssues
      });
      
      return result;
    } catch (error) {
      console.error('Error in review analytics calculation:', error);
      return {
        totalReviews: filteredReviews.length,
        averageRating: filteredReviews.length > 0 ? filteredReviews.reduce((sum, r) => sum + r.rating, 0) / filteredReviews.length : 0,
        sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
        positivePercentage: 0,
        emotionalProfile: { joy: 0, frustration: 0, excitement: 0, disappointment: 0, anger: 0 },
        topThemes: [],
        criticalIssues: 0,
        trendingTopics: []
      };
    }
  }, [filteredReviews, reviewIntelligence]);

  // Tab navigation state
  const [activeTab, setActiveTab] = useState<'reviews' | 'competitors'>('reviews');

  // Chart data - Use filteredReviews to respect date range
  const ratingDistribution = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    filteredReviews.forEach(r => { if (r.rating >= 1 && r.rating <= 5) counts[r.rating]++; });
    return [1,2,3,4,5].map(v => ({ rating: `${v}★`, count: counts[v] }));
  }, [filteredReviews]);

  const sentimentBreakdown = useMemo(() => {
    const counts: Record<string, number> = { positive: 0, neutral: 0, negative: 0 };
    filteredReviews.forEach(r => { counts[(r as any).sentiment] = (counts[(r as any).sentiment] || 0) + 1; });
    return [
      { label: 'Positive', key: 'positive', count: counts.positive },
      { label: 'Neutral', key: 'neutral', count: counts.neutral },
      { label: 'Negative', key: 'negative', count: counts.negative },
    ];
  }, [filteredReviews]);

  // Summary metrics
  const summary = useMemo(() => {
    const total = filteredReviews.length;
    const positive = filteredReviews.filter((r: any) => r.sentiment === 'positive').length;
    const avg = total ? +(filteredReviews.reduce((s, r) => s + (r.rating || 0), 0) / total).toFixed(2) : 0;
    const posPct = total ? +((positive / total) * 100).toFixed(1) : 0;
    return { total, avg, posPct };
  }, [filteredReviews]);

  // Period-only metric (ignores rating/sentiment/text filters): new reviews in chosen date window
  const periodTotal = useMemo(() => {
    if (!fromDate && !toDate) return reviews.length; // all loaded
    const from = fromDate ? new Date(fromDate).getTime() : Number.NEGATIVE_INFINITY;
    const to = toDate ? new Date(toDate).getTime() : Number.POSITIVE_INFINITY;
    return reviews.filter(r => {
      const t = r.updated_at ? new Date(r.updated_at).getTime() : Number.NEGATIVE_INFINITY;
      return t >= from && t <= to;
    }).length;
  }, [reviews, fromDate, toDate]);

  // Trend over time (daily): counts and average rating from filtered set
  const trendOverTime = useMemo(() => {
    const buckets: Record<string, { date: string; count: number; sumRating: number; avgRating: number } & { positive: number; neutral: number; negative: number }> = {};
    for (const r of filteredReviews) {
      if (!r.updated_at) continue;
      const d = new Date(r.updated_at);
      if (isNaN(d.getTime())) continue;
      const key = d.toISOString().slice(0, 10);
      if (!buckets[key]) {
        buckets[key] = { date: key, count: 0, sumRating: 0, avgRating: 0, positive: 0, neutral: 0, negative: 0 };
      }
      buckets[key].count += 1;
      buckets[key].sumRating += r.rating || 0;
      const s = (r as any).sentiment as 'positive' | 'neutral' | 'negative' | undefined;
      if (s) buckets[key][s] += 1;
    }
    const rows = Object.values(buckets)
      .map(b => ({
        ...b,
        avgRating: b.count ? +(b.sumRating / b.count).toFixed(2) : 0,
        percentPositive: b.count ? +((b.positive / b.count) * 100).toFixed(1) : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    return rows;
  }, [filteredReviews]);

  // Trend metric toggle: average rating vs positive percentage
  const [trendMetric, setTrendMetric] = useState<'avg' | 'positive'>('avg');
  // Bar mode: total reviews vs stacked sentiment counts
  const [trendBarMode, setTrendBarMode] = useState<'total' | 'stacked'>('total');

  // AI Insight Action Handler (NEW)
  const handleInsightAction = (action: string, data?: any) => {
    console.log('🧠 AI Insight Action:', action, data);
    
    switch (action) {
      case 'view_sentiment':
        // Focus on sentiment analysis
        setSentimentFilter('all');
        setSelectedInsightFilter({ type: null, value: null });
        break;
        
      case 'filter_negative':
        setSentimentFilter('negative');
        setSelectedInsightFilter({ type: 'sentiment', value: 'negative' });
        break;
        
      case 'view_themes':
        // Show theme-related reviews
        if (data?.intelligence?.themes?.[0]?.theme) {
          setSelectedInsightFilter({ type: 'theme', value: data.intelligence.themes[0].theme });
          setTextQuery(data.intelligence.themes[0].theme);
        }
        break;
        
      case 'view_opportunities':
        // Filter to positive reviews to see opportunities
        setSentimentFilter('positive');
        setSelectedInsightFilter({ type: 'sentiment', value: 'positive' });
        break;
        
      case 'view_priority_issues':
        // Filter to negative reviews showing issues
        setSentimentFilter('negative');
        setSelectedInsightFilter({ type: 'sentiment', value: 'negative' });
        break;
        
      case 'view_theme_timeline':
        // Show reviews mentioning specific theme
        if (data?.intelligence?.themes?.[0]) {
          setSelectedInsightFilter({ type: 'theme', value: data.intelligence.themes[0].theme });
        }
        break;
        
      default:
        // Handle specific insight actions
        if (action.startsWith('alert_')) {
          setSentimentFilter('negative');
          setSelectedInsightFilter({ type: 'sentiment', value: 'negative' });
        }
        break;
    }
    
    // Scroll to reviews section to show filtered results
    setTimeout(() => {
      const reviewsSection = document.querySelector('[id*="reviews"]');
      if (reviewsSection) {
        reviewsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
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
    <MainLayout>
        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="border-b border-border">
            <div className="flex gap-2">
              <Button
                variant={activeTab === 'reviews' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('reviews')}
                className="rounded-b-none"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Reviews
              </Button>
              <Button
                variant={activeTab === 'competitors' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('competitors')}
                className="rounded-b-none"
              >
                <Target className="h-4 w-4 mr-2" />
                Competitor Analysis
              </Button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'competitors' && organizationId ? (
            <CompetitorComparisonView
              organizationId={organizationId}
              onExit={() => setActiveTab('reviews')}
              preSelectedAppId={selectedApp?.appId}
              preSelectedCountry={selectedCountry}
            />
          ) : (
            <div className="space-y-6">
          {/* AI Intelligence Dashboard with Interactive Connections */}
          {selectedApp && reviews.length > 0 && (
            <div className="bg-gradient-to-r from-primary/5 to-secondary/5 p-6 rounded-lg border">
              {selectedInsightFilter.type && (
                <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">
                        AI Filter Active: {selectedInsightFilter.type} = "{selectedInsightFilter.value}"
                      </span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setSelectedInsightFilter({ type: null, value: null });
                        setTextQuery('');
                        setSentimentFilter('all');
                      }}
                    >
                      Clear Filter
                    </Button>
                  </div>
                </div>
              )}
              
            </div>
          )}

          {/* Rest of existing dashboard */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Review Management</h1>
          <p className="text-muted-foreground">Search apps and fetch public customer reviews from iTunes RSS</p>
        </div>
        <div className="flex items-center gap-2">
          {organizationId && monitoredApps && monitoredApps.length >= 2 && (
            <Button
              onClick={() => setShowCompetitorComparison(true)}
              className="gap-2 bg-gradient-to-br from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
            >
              <Target className="h-4 w-4" />
              Compare Competitors
            </Button>
          )}
          <ConnectionStatus showDetails />
          {showDevBadge && (
            <Badge variant="outline" className="text-xs">DEV MODE</Badge>
          )}
        </div>
      </div>

      {/* Monitored Apps Grid - Shows saved apps for quick access */}
      {monitoredApps && monitoredApps.length > 0 && !selectedApp && organizationId && (
        <MonitoredAppsGrid
          organizationId={organizationId}
          onSelectApp={(app) => {
            console.log('[MonitoredApp] Clicked:', {
              appName: app.app_name,
              appId: app.app_store_id,
              country: app.primary_country
            });

            // Load app into reviews page
            setSelectedApp({
              name: app.app_name,
              appId: app.app_store_id,
              developer: app.developer_name || 'Unknown',
              rating: app.snapshot_rating || 0,
              reviews: app.snapshot_review_count || 0,
              icon: app.app_icon_url || '',
              applicationCategory: app.category || 'Unknown'
            });

            // ✅ CRITICAL FIX v2: Pass country directly to avoid stale state
            // Problem: setSelectedCountry is async, fetchReviews would use old state
            // Solution: Store the country value and pass it explicitly
            const targetCountry = app.primary_country;
            setSelectedCountry(targetCountry);

            // Clear old state
            setReviews([]);
            setCurrentPage(1);
            setHasMoreReviews(false);

            // Fetch reviews with explicit country parameter
            console.log('[MonitoredApp] Triggering review fetch:', {
              appId: app.app_store_id,
              country: targetCountry,
              page: 1
            });

            // IMPORTANT: We need to call fetchReviews with the country
            // But fetchReviews uses selectedCountry from state (closure)
            // So we need to fetch directly here with explicit params
            (async () => {
              setReviewsLoading(true);
              try {
                console.log('[MonitoredApp] Fetching from iTunes:', {
                  appId: app.app_store_id,
                  cc: targetCountry,
                  page: 1
                });

                const result = await fetchAppReviews({
                  appId: app.app_store_id,
                  cc: targetCountry,
                  page: 1
                });

                const newReviews = result.data || [];
                console.log('[MonitoredApp] Reviews fetched:', {
                  count: newReviews.length,
                  hasMore: result.hasMore,
                  currentPage: result.currentPage
                });

                setReviews(newReviews);
                setCurrentPage(result.currentPage);
                setHasMoreReviews(result.hasMore);

                if (newReviews.length > 0) {
                  toast.success(`Loaded ${newReviews.length} reviews for ${app.app_name}`);
                } else {
                  toast.info(`No reviews found for ${app.app_name} in ${targetCountry.toUpperCase()}`);
                }

              } catch (error: any) {
                console.error('[MonitoredApp] Fetch failed:', error);
                toast.error(`Failed to fetch reviews: ${error.message}`);
              } finally {
                setReviewsLoading(false);
              }
            })();

            // Update last checked timestamp
            updateLastChecked.mutate(app.id);
          }}
        />
      )}

      {/* Card A: App Search (hidden after app selected) */}
      {!selectedApp && (
      <Card className={cn(
        "relative overflow-hidden transition-all duration-300",
        "hover:scale-[1.005] hover:shadow-2xl",
        "bg-card/50 backdrop-blur-xl border-border/50"
      )}>
        {/* Gradient Background Accent */}
        <div className="absolute top-0 right-0 w-48 h-48 opacity-10 blur-3xl bg-gradient-to-br from-blue-500 to-purple-600" />

        <div className="relative p-6 space-y-6">
          {/* Header with gradient icon */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                <Search className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold uppercase tracking-wide">
                  App Search
                </h2>
                <p className="text-xs text-muted-foreground/80">
                  Search and select an app to analyze reviews
                </p>
              </div>
            </div>
            {showDevBadge && (
              <Badge variant="outline" className="text-xs">DEV MODE</Badge>
            )}
          </div>

          {/* Content */}
          <div className="space-y-4">
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
                <SelectItem value="us">🇺🇸 United States</SelectItem>
                <SelectItem value="gb">🇬🇧 United Kingdom</SelectItem>
                <SelectItem value="ca">🇨🇦 Canada</SelectItem>
                <SelectItem value="au">🇦🇺 Australia</SelectItem>
                <SelectItem value="de">🇩🇪 Germany</SelectItem>
                <SelectItem value="fr">🇫🇷 France</SelectItem>
                <SelectItem value="it">🇮🇹 Italy</SelectItem>
                <SelectItem value="es">🇪🇸 Spain</SelectItem>
                <SelectItem value="nl">🇳🇱 Netherlands</SelectItem>
                <SelectItem value="se">🇸🇪 Sweden</SelectItem>
                <SelectItem value="no">🇳🇴 Norway</SelectItem>
                <SelectItem value="dk">🇩🇰 Denmark</SelectItem>
                <SelectItem value="jp">🇯🇵 Japan</SelectItem>
                <SelectItem value="kr">🇰🇷 South Korea</SelectItem>
                <SelectItem value="br">🇧🇷 Brazil</SelectItem>
                <SelectItem value="in">🇮🇳 India</SelectItem>
                <SelectItem value="mx">🇲🇽 Mexico</SelectItem>
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
          </div>
        </div>
      </Card>
      )}

      {/* Card B: Reviews Fetching & Export */}
      {selectedApp && (
        <YodelCard variant="elevated" padding="md" className="shadow-md">
          <YodelCardHeader>
            <div className="space-y-4">
              {/* Top row: App info and actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedApp.icon && (
                    <img src={selectedApp.icon} alt={selectedApp.name} className="w-10 h-10 rounded-lg shadow" />
                  )}
                  <div className="flex flex-col">
                    <div className="text-lg font-semibold tracking-tight flex items-center gap-2">
                      <Eye className="w-5 h-5" />
                      <span>Reviews for {selectedApp.name}</span>
                      <Badge variant="secondary" className="text-[10px]">{ccToFlag(selectedCountry)} {selectedCountry.toUpperCase()}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{selectedApp.developer}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <StarRating rating={Math.round(selectedApp?.rating || 0)} />
                      <span className="text-xs text-muted-foreground">
                        {(selectedApp?.rating ?? 0).toFixed(2)} / 5 • {(selectedApp?.reviews ?? 0).toLocaleString()} ratings
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {organizationId && (
                    <AddToMonitoringButton
                      organizationId={organizationId}
                      appStoreId={selectedApp.appId}
                      appName={selectedApp.name}
                      appIconUrl={selectedApp.icon}
                      developerName={selectedApp.developer}
                      category={selectedApp.applicationCategory}
                      country={selectedCountry}
                      rating={selectedApp.rating}
                      reviewCount={selectedApp.reviews}
                      isMonitored={isAppMonitored}
                    />
                  )}
                  <Button variant="outline" size="sm" onClick={() => setSelectedApp(null)}>
                    Search Another
                  </Button>
                </div>
              </div>

              {/* Date Range Picker */}
              <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground mr-2">Date Range:</span>
                <DateRangePicker
                  dateRange={{ start: fromDate, end: toDate }}
                  onDateRangeChange={(range) => {
                    console.log('📅 [ReviewPage] Date range changed:', range);
                    setFromDate(range.start);
                    setToDate(range.end);
                    setQuickRange('custom');
                    console.log('📅 [ReviewPage] State updated - fromDate:', range.start, 'toDate:', range.end);
                  }}
                  className="min-w-[280px]"
                />
                {fromDate && toDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFromDate('');
                      setToDate('');
                      setQuickRange('all');
                    }}
                    className="h-8"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </YodelCardHeader>
          <YodelCardContent className="space-y-4">
            {/* Summary Metrics - Premium Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
              {/* Total Reviews */}
              <Card className={cn(
                "relative overflow-hidden transition-all duration-300",
                "hover:scale-[1.02] hover:shadow-xl",
                "bg-card/50 backdrop-blur-xl border-border/50"
              )}>
                <div className="absolute top-0 right-0 w-16 h-16 opacity-20 blur-2xl bg-gradient-to-br from-blue-500 to-cyan-600" />
                <div className="relative p-4 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Total Reviews
                    </span>
                  </div>
                  <div className="text-3xl font-bold tracking-tight">
                    {summary.total.toLocaleString()}
                  </div>
                </div>
              </Card>

              {/* App Store Rating */}
              <Card className={cn(
                "relative overflow-hidden transition-all duration-300",
                "hover:scale-[1.02] hover:shadow-xl",
                "bg-card/50 backdrop-blur-xl border-border/50"
              )}>
                <div className="absolute top-0 right-0 w-16 h-16 opacity-20 blur-2xl bg-gradient-to-br from-yellow-500 to-orange-600" />
                <div className="relative p-4 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5 text-yellow-500" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      App Store
                    </span>
                  </div>
                  <div className="text-3xl font-bold tracking-tight">
                    {(selectedApp?.rating ?? 0).toFixed(2)}
                    <span className="text-base text-muted-foreground font-normal"> / 5</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {(selectedApp?.reviews ?? 0).toLocaleString()} ratings
                  </div>
                </div>
              </Card>

              {/* Average Rating */}
              <Card className={cn(
                "relative overflow-hidden transition-all duration-300",
                "hover:scale-[1.02] hover:shadow-xl",
                "bg-card/50 backdrop-blur-xl border-border/50"
              )}>
                <div className="absolute top-0 right-0 w-16 h-16 opacity-20 blur-2xl bg-gradient-to-br from-purple-500 to-pink-600" />
                <div className="relative p-4 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-purple-500" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Avg Rating
                    </span>
                  </div>
                  <div className="text-3xl font-bold tracking-tight">
                    {summary.avg.toFixed(2)}
                  </div>
                </div>
              </Card>

              {/* Positive Percentage */}
              <Card className={cn(
                "relative overflow-hidden transition-all duration-300",
                "hover:scale-[1.02] hover:shadow-xl",
                "bg-card/50 backdrop-blur-xl border-border/50"
              )}>
                <div className="absolute top-0 right-0 w-16 h-16 opacity-20 blur-2xl bg-gradient-to-br from-green-500 to-emerald-600" />
                <div className="relative p-4 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Smile className="h-3.5 w-3.5 text-green-500" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Positive
                    </span>
                  </div>
                  <div className="text-3xl font-bold tracking-tight">
                    {summary.posPct}%
                  </div>
                </div>
              </Card>

              {/* Period Total */}
              <Card className={cn(
                "relative overflow-hidden transition-all duration-300",
                "hover:scale-[1.02] hover:shadow-xl",
                "bg-card/50 backdrop-blur-xl border-border/50"
              )}>
                <div className="absolute top-0 right-0 w-16 h-16 opacity-20 blur-2xl bg-gradient-to-br from-cyan-500 to-blue-600" />
                <div className="relative p-4 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <CalendarIcon className="h-3.5 w-3.5 text-cyan-500" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      This Period
                    </span>
                  </div>
                  <div className="text-3xl font-bold tracking-tight">
                    {periodTotal.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    based on loaded pages
                  </div>
                </div>
              </Card>
            </div>

            {/* AI Intelligence Hub - ALWAYS visible when reviews loaded */}
            {reviews.length > 0 && reviewIntelligence && actionableInsights && (
              <div className="space-y-6 mt-6">
                {/* AI Summary */}
                <ReviewIntelligenceSummary
                  intelligence={reviewIntelligence}
                  insights={actionableInsights}
                  analytics={reviewAnalytics}
                />

                {/* Product Friction & Strengths */}
                <ProductFrictionStrengths
                  issuePatterns={reviewIntelligence.issuePatterns}
                  featureMentions={reviewIntelligence.featureMentions}
                  totalReviews={reviews.length}
                />

                {/* AI Recommendations */}
                <AIRecommendationsPanel insights={actionableInsights} />
              </div>
            )}

            {/* Detailed Analytics & Charts Section - Collapsible */}
            {reviews.length > 0 && (
              <CollapsibleAnalyticsSection
                reviews={enhancedReviews}
                intelligence={reviewIntelligence}
                insights={actionableInsights}
                analytics={reviewAnalytics}
                onInsightAction={handleInsightAction}
              />
            )}

            {/* Competitor Management Panel - NEW */}
            {selectedApp && organizationId && isAppMonitored && (
              <CompetitorManagementPanel
                targetAppId={monitoredApps?.find(
                  app => app.app_store_id === selectedApp.appId && app.primary_country === selectedCountry
                )?.id || ''}
                targetAppName={selectedApp.name}
                organizationId={organizationId}
                country={selectedCountry}
                onCompare={(competitorIds) => {
                  // Quick compare button clicked - switch to competitor analysis tab
                  setActiveTab('competitors');
                }}
              />
            )}

            {/* Filters Row */}
            <YodelToolbar>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Filters</span>
              </div>
              {/* Rating chips */}
              <div className="flex items-center gap-1">
                {(['all', 5, 4, 3, 2, 1] as const).map(val => (
                  <Button
                    key={String(val)}
                    size="sm"
                    variant={ratingFilter === val ? 'default' : 'outline'}
                    onClick={() => setRatingFilter(val as any)}
                    className="text-xs"
                  >
                    {val === 'all' ? 'All' : `${val}★`}
                  </Button>
                ))}
              </div>
              {/* Sentiment chips */}
              <div className="flex items-center gap-1 ml-2">
                {[{k:'all', icon:Meh, label:'All'}, {k:'positive', icon:Smile, label:'Positive'}, {k:'neutral', icon:Meh, label:'Neutral'}, {k:'negative', icon:Frown, label:'Negative'}].map(({k, icon:Icon, label}) => (
                  <Button
                    key={k}
                    size="sm"
                    variant={sentimentFilter === (k as any) ? 'default' : 'outline'}
                    onClick={() => setSentimentFilter(k as any)}
                    className="text-xs"
                  >
                    <Icon className="w-3 h-3 mr-1" /> {label}
                  </Button>
                ))}
              </div>
              <YodelToolbarSpacer />
              {/* Text search */}
              <div className="min-w-[220px]">
                <Input placeholder="Search title, text, author" value={textQuery} onChange={e => setTextQuery(e.target.value)} />
              </div>
              {/* Sort */}
              <div className="flex items-center gap-2">
                <SortAsc className="w-4 h-4 text-muted-foreground" />
                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="oldest">Oldest</SelectItem>
                    <SelectItem value="rating_high">Rating: High to Low</SelectItem>
                    <SelectItem value="rating_low">Rating: Low to High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </YodelToolbar>

            {/* Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className={cn(
              "relative overflow-hidden transition-all duration-300",
              "hover:shadow-lg",
              "bg-card/50 backdrop-blur-xl border-border/50"
            )}>
              <div className="absolute top-0 left-0 w-24 h-24 opacity-10 blur-2xl bg-gradient-to-br from-yellow-500 to-orange-600" />
              <div className="relative p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-yellow-500" />
                    <h4 className="text-sm font-medium uppercase tracking-wide">
                      Rating Distribution
                    </h4>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {reviews.length} reviews
                  </Badge>
                </div>
              <ChartContainer config={{ count: { label: 'Reviews', color: 'hsl(var(--primary))' } }}>
                <BarChart data={ratingDistribution} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="rating" />
                  <YAxis allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count">
                    {ratingDistribution.map((entry: any) => {
                      const label = entry.rating as string; // like "1★"
                      const n = parseInt(label);
                      // Color mapping per star: 1 red -> 5 emerald
                      const color = n === 5 ? '#22c55e' : n === 4 ? '#60a5fa' : n === 3 ? '#f59e0b' : n === 2 ? '#f97316' : '#ef4444';
                      return <Cell key={`cell-${label}`} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ChartContainer>
              </div>
            </Card>
            <Card className={cn(
              "relative overflow-hidden transition-all duration-300",
              "hover:shadow-lg",
              "bg-card/50 backdrop-blur-xl border-border/50"
            )}>
              <div className="absolute top-0 left-0 w-24 h-24 opacity-10 blur-2xl bg-gradient-to-br from-purple-500 to-pink-600" />
              <div className="relative p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-purple-500" />
                    <h4 className="text-sm font-medium uppercase tracking-wide">
                      Sentiment Breakdown
                    </h4>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    AI Analyzed
                  </Badge>
                </div>
              <ChartContainer config={{ positive: { label: 'Positive', color: '#22c55e' }, neutral: { label: 'Neutral', color: '#a3a3a3' }, negative: { label: 'Negative', color: '#ef4444' }}}>
                <PieChart>
                  <Pie data={sentimentBreakdown} dataKey="count" nameKey="label" outerRadius={70} label>
                    <Cell key="pos" fill="var(--color-positive)" />
                    <Cell key="neu" fill="var(--color-neutral)" />
                    <Cell key="neg" fill="var(--color-negative)" />
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
              </div>
            </Card>
            </div>

            {/* Trend Over Time */}
            <Card className={cn(
              "relative overflow-hidden transition-all duration-300",
              "hover:shadow-lg",
              "bg-card/50 backdrop-blur-xl border-border/50"
            )}>
              <div className="absolute top-0 left-0 w-32 h-32 opacity-10 blur-3xl bg-gradient-to-br from-blue-500 to-cyan-600" />
              <div className="relative p-5 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  <h4 className="text-sm font-medium uppercase tracking-wide">
                    Trend Over Time
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Line metric</span>
                  <Select value={trendMetric} onValueChange={(v: any) => setTrendMetric(v)}>
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="avg">Avg Rating</SelectItem>
                      <SelectItem value="positive">Positive %</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground ml-2">Bar mode</span>
                  <Select value={trendBarMode} onValueChange={(v: any) => setTrendBarMode(v)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="total">Total reviews</SelectItem>
                      <SelectItem value="stacked">Stacked sentiment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <ChartContainer config={{ count: { label: '# Reviews', color: '#93c5fd' }, positive: { label: 'Positive', color: '#22c55e' }, neutral: { label: 'Neutral', color: '#a3a3a3' }, negative: { label: 'Negative', color: '#ef4444' }, avgRating: { label: 'Avg Rating', color: '#0ea5e9' }, percentPositive: { label: 'Positive %', color: '#0ea5e9' }}}>
                <ComposedChart data={trendOverTime} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" allowDecimals={false} />
                  <YAxis yAxisId="right" orientation="right" domain={trendMetric === 'avg' ? [0, 5] : [0, 100]} tickFormatter={(v: number) => trendMetric === 'avg' ? v.toFixed(1) : `${v}%`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  {trendBarMode === 'total' ? (
                    <Bar yAxisId="left" dataKey="count" name="# Reviews" fill="var(--color-count)" />
                  ) : (
                    <>
                      <Bar yAxisId="left" dataKey="positive" name="Positive" stackId="s" fill="var(--color-positive)" />
                      <Bar yAxisId="left" dataKey="neutral" name="Neutral" stackId="s" fill="var(--color-neutral)" />
                      <Bar yAxisId="left" dataKey="negative" name="Negative" stackId="s" fill="var(--color-negative)" />
                    </>
                  )}
                  <Line yAxisId="right" type="monotone" dataKey={trendMetric === 'avg' ? 'avgRating' : 'percentPositive'} name={trendMetric === 'avg' ? 'Avg Rating' : 'Positive %'} stroke="var(--color-avgRating)" dot={false} />
                </ComposedChart>
              </ChartContainer>
              </div>
            </Card>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <p className="text-sm text-muted-foreground">
                  Page {currentPage} • {reviews.length} reviews loaded
                </p>
                {hasMoreReviews && (
                  <Button variant="outline" size="sm" onClick={handleLoadMore} disabled={isLoadingReviews}>
                    {isLoadingReviews ? 'Loading...' : 'Load More'}
                  </Button>
                )}
              </div>
              <Button onClick={handleExportCSV} disabled={reviews.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>

            {filteredReviews.length > 0 && (
              <div className="max-h-96 overflow-y-auto space-y-3 p-4">
                {selectedInsightFilter.type && (
                  <Card className="p-3 bg-primary/10 border-l-4 border-primary">
                    <div className="text-sm">
                      <strong className="text-primary">AI Filter Active:</strong>
                      <span className="text-muted-foreground ml-1">
                        Showing reviews matching {selectedInsightFilter.type}: "{selectedInsightFilter.value}"
                      </span>
                    </div>
                  </Card>
                )}
                {filteredReviews.map((review: any, index) => (
                  <Card key={review.review_id || index} className={cn(
                    "relative overflow-hidden transition-all duration-200",
                    "hover:shadow-lg hover:border-primary/30",
                    "bg-card/30 backdrop-blur-sm border-border/30",
                    // Sentiment-based left border
                    review.sentiment === 'positive' && "border-l-4 border-l-green-500/80",
                    review.sentiment === 'negative' && "border-l-4 border-l-red-500/80",
                    review.sentiment === 'neutral' && "border-l-4 border-l-zinc-500/80",
                    // Highlight matching filter
                    selectedInsightFilter.type && (
                      (selectedInsightFilter.type === 'theme' && review.extractedThemes?.includes(selectedInsightFilter.value)) ||
                      (selectedInsightFilter.type === 'issue' && review.identifiedIssues?.includes(selectedInsightFilter.value)) ||
                      (selectedInsightFilter.type === 'feature' && review.mentionedFeatures?.includes(selectedInsightFilter.value)) ||
                      (selectedInsightFilter.type === 'sentiment' && review.sentiment === selectedInsightFilter.value)
                    ) && 'ring-2 ring-primary/50 bg-primary/5'
                  )}>
                    <div className="p-4 space-y-3">
                      {/* Header with rating stars */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h5 className="font-semibold text-base mb-1">{review.title || 'No title'}</h5>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-medium">{review.author || 'Anonymous'}</span>
                            <span>•</span>
                            <span>{formatDate(review.updated_at)}</span>
                            <span>•</span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                              v{review.version || '—'}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1.5">
                          <StarRating rating={review.rating} />
                          {review.sentiment && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs",
                                review.sentiment === 'positive' && "border-green-500/50 text-green-500 bg-green-500/10",
                                review.sentiment === 'negative' && "border-red-500/50 text-red-500 bg-red-500/10",
                                review.sentiment === 'neutral' && "border-zinc-500/50 text-zinc-500 bg-zinc-500/10"
                              )}
                            >
                              {review.sentiment === 'positive' && <Smile className="w-3 h-3 mr-1" />}
                              {review.sentiment === 'negative' && <Frown className="w-3 h-3 mr-1" />}
                              {review.sentiment === 'neutral' && <Meh className="w-3 h-3 mr-1" />}
                              {review.sentiment}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Review text */}
                      <p className="text-sm leading-relaxed text-muted-foreground">{review.text}</p>

                      {/* AI Enhancement Tags */}
                      {(review.extractedThemes?.length > 0 || review.mentionedFeatures?.length > 0 || review.identifiedIssues?.length > 0) && (
                        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/50">
                          {review.extractedThemes?.slice(0, 3).map((theme: string) => (
                            <Badge
                              key={theme}
                              variant="secondary"
                              className="text-xs bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer"
                              onClick={() => setSelectedInsightFilter({ type: 'theme', value: theme })}
                            >
                              {theme}
                            </Badge>
                          ))}
                          {review.mentionedFeatures?.slice(0, 2).map((feature: string) => (
                            <Badge
                              key={feature}
                              variant="secondary"
                              className="text-xs bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 cursor-pointer"
                              onClick={() => setSelectedInsightFilter({ type: 'feature', value: feature })}
                            >
                              ⭐ {feature}
                            </Badge>
                          ))}
                          {review.identifiedIssues?.slice(0, 2).map((issue: string) => (
                            <Badge
                              key={issue}
                              variant="destructive"
                              className="text-xs cursor-pointer hover:opacity-80"
                              onClick={() => setSelectedInsightFilter({ type: 'issue', value: issue })}
                            >
                              ⚠️ {issue}
                            </Badge>
                          ))}
                          {review.businessImpact && review.businessImpact === 'high' && (
                            <Badge variant="destructive" className="text-xs">
                              🔥 High Impact
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {filteredReviews.length === 0 && !isLoadingReviews && (
              <div className="text-center py-8 text-muted-foreground">
                <Eye className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>{reviews.length === 0 ? 'Select an app to fetch reviews' : 'No reviews match current filters'}</p>
              </div>
            )}

            {isLoadingReviews && (
              <div className="text-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                <p className="text-muted-foreground">Loading reviews...</p>
              </div>
            )}
          </YodelCardContent>
        </YodelCard>
      )}

      {/* Dev Self-Test Panel - visible only for super admin without organization */}
      {canShowDevPanel && showDevTest && (
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

            {/* App Selection Modal for ambiguous results */}
            <AppSelectionModal
              isOpen={showAppSelection}
              onClose={() => {
                setShowAppSelection(false);
                setAppCandidates([]);
                setPendingSearchTerm('');
              }}
              candidates={appCandidates}
              onSelect={handleAppSelectionFromModal}
              searchTerm={pendingSearchTerm}
              mode="select"
              searchCountry={selectedCountry}
            />
          </div>
          )}
        </div>
    </MainLayout>
  );
};

export default ReviewManagementPage;
