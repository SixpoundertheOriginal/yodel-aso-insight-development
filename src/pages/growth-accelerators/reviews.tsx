import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Star, Download, Eye, ChevronRight, Filter, SortAsc, Calendar as CalendarIcon, Smile, Meh, Frown, Brain } from 'lucide-react';
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
import { AIInsightsDashboard } from '@/components/reviews/AIInsightsDashboard';

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
  const canAccessReviews = featureEnabledForRole('REVIEWS_PUBLIC_RSS_ENABLED', currentUserRole) || isDemoOrg;

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
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [quickRange, setQuickRange] = useState<'all' | '7d' | '30d' | '90d' | '1y' | 'custom'>('30d');

  // Development self-test state; only for super admins without an assigned org (platform scope)
  const [showDevTest, setShowDevTest] = useState(import.meta.env.DEV);
  const canShowDevPanel = isSuperAdmin && (!organizationId || String(organizationId).trim() === '');
  const showDevBadge = isSuperAdmin && !isDemoOrg;

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
    applyQuickRange('30d');
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

  // Generate comprehensive AI intelligence from enhanced reviews
  const reviewIntelligence = useMemo(() => {
    console.log('🔍 DATA DEBUG [INTELLIGENCE]: Processing reviews count:', enhancedReviews?.length || 0);
    
    if (!enhancedReviews || enhancedReviews.length === 0) {
      return { 
        themes: [], 
        featureMentions: [], 
        issuePatterns: [] 
      };
    }
    
    try {
      // Try engine first, fallback to manual extraction if needed
      const engineResult = extractReviewIntelligence(enhancedReviews);
      console.log('🔍 DATA DEBUG [ENGINE]: Engine result themes:', engineResult?.themes?.length || 0);
      
      if (engineResult?.themes?.length > 0) {
        return engineResult;
      }
      
      // Fallback: Manual intelligence extraction
      console.log('🔍 DATA DEBUG [FALLBACK]: Using manual intelligence extraction');
      
      const themeMap = new Map<string, { count: number; sentiment: number[]; examples: string[]; trending: 'up' | 'down' | 'stable' }>();
      const featureMap = new Map<string, { count: number; sentiment: number[]; impact: 'high' | 'medium' | 'low' }>();
      const issueMap = new Map<string, { count: number; severity: 'critical' | 'major' | 'minor'; affectedVersions: string[]; firstSeen: Date }>();
      
      enhancedReviews.forEach(review => {
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
  }, [enhancedReviews]);

  // Generate comprehensive actionable insights
  const actionableInsights = useMemo(() => {
    console.log('🔍 DATA DEBUG [INSIGHTS]: Generating insights for reviews:', enhancedReviews?.length || 0);
    
    if (!enhancedReviews || enhancedReviews.length === 0) {
      return { 
        priorityIssues: [], 
        improvements: [], 
        alerts: [] 
      };
    }
    
    try {
      // Try engine first, fallback if needed
      const engineResult = reviewIntelligence ? generateActionableInsights(enhancedReviews, reviewIntelligence) : null;
      
      if (engineResult?.priorityIssues?.length > 0 || engineResult?.improvements?.length > 0) {
        return engineResult;
      }
      
      // Fallback: Generate insights manually
      const priorityIssues: any[] = [];
      const improvements: any[] = [];
      const alerts: any[] = [];
      
      // Analyze for critical issues
      const negativeReviews = enhancedReviews.filter(r => r.rating <= 2);
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
      const positiveReviews = enhancedReviews.filter(r => r.rating >= 4);
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
      const negativePercentage = (negativeReviews.length / enhancedReviews.length) * 100;
      if (negativePercentage > 20) {
        alerts.push({
          type: 'warning',
          message: `${negativePercentage.toFixed(1)}% negative reviews exceed healthy threshold`,
          urgency: 'high',
          impact: 'high'
        });
      }
      
      const crashMentions = enhancedReviews.filter(r => 
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
  }, [enhancedReviews, reviewIntelligence]);

  // Enhanced analytics with comprehensive data population
  const reviewAnalytics = useMemo((): ReviewAnalytics => {
    console.log('🔍 DATA DEBUG [ANALYTICS]: Processing analytics for reviews:', enhancedReviews?.length || 0);
    
    if (!enhancedReviews || enhancedReviews.length === 0) {
      return {
        totalReviews: 0,
        averageRating: 0,
        sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
        emotionalProfile: { joy: 0, frustration: 0, excitement: 0, disappointment: 0, anger: 0 },
        topThemes: [],
        criticalIssues: 0,
        trendingTopics: []
      };
    }

    try {
      const totalReviews = enhancedReviews.length;
      const averageRating = totalReviews > 0 ? 
        enhancedReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews : 0;
      
      // Enhanced sentiment calculation
      const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
      enhancedReviews.forEach(r => {
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
      
      enhancedReviews.forEach(r => {
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

      const result = {
        totalReviews,
        averageRating: Number(averageRating.toFixed(2)),
        sentimentDistribution: {
          positive: totalReviews > 0 ? Number(((sentimentCounts.positive / totalReviews) * 100).toFixed(1)) : 0,
          neutral: totalReviews > 0 ? Number(((sentimentCounts.neutral / totalReviews) * 100).toFixed(1)) : 0,
          negative: totalReviews > 0 ? Number(((sentimentCounts.negative / totalReviews) * 100).toFixed(1)) : 0,
        },
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
        topThemes: result.topThemes.length,
        criticalIssues: result.criticalIssues
      });
      
      return result;
    } catch (error) {
      console.error('Error in review analytics calculation:', error);
      return {
        totalReviews: enhancedReviews.length,
        averageRating: enhancedReviews.length > 0 ? enhancedReviews.reduce((sum, r) => sum + r.rating, 0) / enhancedReviews.length : 0,
        sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
        emotionalProfile: { joy: 0, frustration: 0, excitement: 0, disappointment: 0, anger: 0 },
        topThemes: [],
        criticalIssues: 0,
        trendingTopics: []
      };
    }
  }, [enhancedReviews, reviewIntelligence]);

  // AI Insight Filter State
  const [selectedInsightFilter, setSelectedInsightFilter] = useState<{
    type: 'sentiment' | 'theme' | 'issue' | 'feature' | null;
    value: string | null;
  }>({ type: null, value: null });

  // Use enhanced reviews for processing
  const processedReviews = enhancedReviews;

  const filteredReviews = useMemo(() => {
    let list = processedReviews;
    
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
    if (fromDate) {
      const from = new Date(fromDate).getTime();
      list = list.filter(r => {
        const t = r.updated_at ? new Date(r.updated_at).getTime() : 0;
        return t >= from;
      });
    }
    if (toDate) {
      const to = new Date(toDate).getTime();
      list = list.filter(r => {
        const t = r.updated_at ? new Date(r.updated_at).getTime() : 0;
        return t <= to;
      });
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
    return sorted;
  }, [processedReviews, ratingFilter, sentimentFilter, textQuery, fromDate, toDate, sortBy, selectedInsightFilter]);

  // Chart data
  const ratingDistribution = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    processedReviews.forEach(r => { if (r.rating >= 1 && r.rating <= 5) counts[r.rating]++; });
    return [1,2,3,4,5].map(v => ({ rating: `${v}★`, count: counts[v] }));
  }, [processedReviews]);

  const sentimentBreakdown = useMemo(() => {
    const counts: Record<string, number> = { positive: 0, neutral: 0, negative: 0 };
    processedReviews.forEach(r => { counts[(r as any).sentiment] = (counts[(r as any).sentiment] || 0) + 1; });
    return [
      { label: 'Positive', key: 'positive', count: counts.positive },
      { label: 'Neutral', key: 'neutral', count: counts.neutral },
      { label: 'Negative', key: 'negative', count: counts.negative },
    ];
  }, [processedReviews]);

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
              
              {/* AI Insights Dashboard - Only render when data is ready */}
              {(() => {
                // Debug logging for conditional render
                const conditions = {
                  enhancedReviews: !!enhancedReviews && enhancedReviews.length > 0,
                  reviewIntelligence: !!reviewIntelligence,
                  actionableInsights: !!actionableInsights,
                  reviewAnalytics: !!reviewAnalytics
                };
                
                console.log('🔍 AI Dashboard Render Conditions:', conditions);
                console.log('🔍 Review count:', enhancedReviews?.length || 0);
                console.log('🔍 Intelligence themes:', reviewIntelligence?.themes?.length || 0);
                console.log('🔍 Actionable insights:', actionableInsights?.priorityIssues?.length || 0);
                console.log('🔍 Analytics data:', reviewAnalytics?.totalReviews || 0);
                
                const shouldRender = Object.values(conditions).every(condition => condition);
                console.log('🔍 Should render AI dashboard:', shouldRender);
                
                if (!shouldRender) {
                  console.log('🔍 Missing conditions:', Object.entries(conditions).filter(([key, value]) => !value));
                }
                
                return shouldRender;
              })() && (
                <AIInsightsDashboard
                  reviews={enhancedReviews}
                  intelligence={reviewIntelligence}
                  insights={actionableInsights}
                  analytics={reviewAnalytics}
                  onInsightAction={handleInsightAction}
                />
              )}
              
              {/* Debug fallback for AI dashboard troubleshooting */}
              {!(() => {
                const conditions = {
                  enhancedReviews: !!enhancedReviews && enhancedReviews.length > 0,
                  reviewIntelligence: !!reviewIntelligence,
                  actionableInsights: !!actionableInsights,
                  reviewAnalytics: !!reviewAnalytics
                };
                return Object.values(conditions).every(condition => condition);
              })() && enhancedReviews?.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <h3 className="text-yellow-800 font-medium mb-2">🔍 AI Dashboard Debug Status</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Enhanced Reviews:</span>
                      <span className={enhancedReviews?.length > 0 ? 'text-green-600' : 'text-red-600'}>
                        {enhancedReviews?.length || 0} reviews
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Review Intelligence:</span>
                      <span className={reviewIntelligence ? 'text-green-600' : 'text-red-600'}>
                        {reviewIntelligence ? `${reviewIntelligence.themes?.length || 0} themes` : 'Missing'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Actionable Insights:</span>
                      <span className={actionableInsights ? 'text-green-600' : 'text-red-600'}>
                        {actionableInsights ? `${actionableInsights.priorityIssues?.length || 0} issues` : 'Missing'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Review Analytics:</span>
                      <span className={reviewAnalytics ? 'text-green-600' : 'text-red-600'}>
                        {reviewAnalytics ? `${reviewAnalytics.totalReviews || 0} analyzed` : 'Missing'}
                      </span>
                    </div>
                  </div>
                  <p className="text-yellow-700 text-xs mt-2">
                    This debug panel will disappear when all AI components are ready.
                  </p>
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
          <ConnectionStatus showDetails />
          {showDevBadge && (
            <Badge variant="outline" className="text-xs">DEV MODE</Badge>
          )}
        </div>
      </div>

      {/* Card A: App Search (hidden after app selected) */}
      {!selectedApp && (
      <YodelCard variant="glass" padding="md" className="shadow-sm">
        <YodelCardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <Search className="w-5 h-5" />
            App Search
            </h2>
            {showDevBadge && (
              <Badge variant="outline" className="text-xs">DEV MODE</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">Search and select an app to fetch reviews from iTunes</p>
        </YodelCardHeader>
        <YodelCardContent className="space-y-4">
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
        </YodelCardContent>
      </YodelCard>
      )}

      {/* Card B: Reviews Fetching & Export */}
      {selectedApp && (
        <YodelCard variant="elevated" padding="md" className="shadow-md">
          <YodelCardHeader>
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
              <span className="text-xs text-muted-foreground">Fetch and export customer reviews</span>
            </div>
          </YodelCardHeader>
          <YodelCardContent className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                <div className="text-xs text-muted-foreground">Total (filtered)</div>
                <div className="text-xl font-semibold">{summary.total.toLocaleString()}</div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                <div className="text-xs text-muted-foreground">App Store rating</div>
                <div className="text-xl font-semibold">
                  {(selectedApp?.rating ?? 0).toFixed(2)}
                  <span className="text-xs text-muted-foreground"> / 5</span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">{(selectedApp?.reviews ?? 0).toLocaleString()} ratings</div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                <div className="text-xs text-muted-foreground">Average rating</div>
                <div className="text-xl font-semibold">{summary.avg.toFixed(2)}</div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                <div className="text-xs text-muted-foreground">Positive %</div>
                <div className="text-xl font-semibold">{summary.posPct}%</div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                <div className="text-xs text-muted-foreground">New reviews (period)</div>
                <div className="text-xl font-semibold">{periodTotal.toLocaleString()}</div>
                <div className="text-[10px] text-muted-foreground mt-1">based on loaded pages</div>
              </div>
            </div>
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
              {/* Date range */}
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                <Select value={quickRange} onValueChange={(v: any) => applyQuickRange(v)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All time</SelectItem>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                    <SelectItem value="1y">Last year</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setQuickRange('custom'); }} className="w-36" />
                <span className="text-xs text-muted-foreground">to</span>
                <Input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setQuickRange('custom'); }} className="w-36" />
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
            <div className="border rounded-md p-3 bg-zinc-900/40">
              <h4 className="text-sm font-medium mb-2">Rating distribution</h4>
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
            <div className="border rounded-md p-3 bg-zinc-900/40">
              <h4 className="text-sm font-medium mb-2">Sentiment breakdown</h4>
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
            </div>

            {/* Trend Over Time */}
            <div className="border rounded-md p-3 bg-zinc-900/40">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">Trend over time</h4>
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

            {filteredReviews.length > 0 && (
              <div className="max-h-96 overflow-y-auto space-y-3 border rounded-md p-4">
                {selectedInsightFilter.type && (
                  <div className="mb-3 p-2 bg-muted/50 rounded text-sm text-muted-foreground border-l-4 border-primary">
                    <strong>AI Filter:</strong> Showing reviews matching {selectedInsightFilter.type}: "{selectedInsightFilter.value}"
                  </div>
                )}
                {filteredReviews.map((review: any, index) => (
                  <div key={review.review_id || index} className={`border-b pb-3 last:border-b-0 ${
                    selectedInsightFilter.type && (
                      (selectedInsightFilter.type === 'theme' && review.extractedThemes?.includes(selectedInsightFilter.value)) ||
                      (selectedInsightFilter.type === 'issue' && review.identifiedIssues?.includes(selectedInsightFilter.value)) ||
                      (selectedInsightFilter.type === 'feature' && review.mentionedFeatures?.includes(selectedInsightFilter.value)) ||
                      (selectedInsightFilter.type === 'sentiment' && review.sentiment === selectedInsightFilter.value)
                    ) ? 'bg-primary/5 p-2 rounded border-l-4 border-primary' : ''
                  }`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h5 className="font-medium text-sm">{review.title || 'No title'}</h5>
                        <p className="text-xs text-muted-foreground">
                          {review.author || 'Anonymous'} • {formatDate(review.updated_at)} • v{review.version || '—'}
                          {review.sentiment && (
                            <span className="ml-2 inline-flex items-center gap-1">
                              {review.sentiment === 'positive' && <Smile className="w-3 h-3 text-green-500" />}
                              {review.sentiment === 'neutral' && <Meh className="w-3 h-3 text-zinc-500" />}
                              {review.sentiment === 'negative' && <Frown className="w-3 h-3 text-red-500" />}
                              <span className="capitalize">{review.sentiment}</span>
                            </span>
                          )}
                        </p>
                        {/* AI Enhancement Tags */}
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {review.extractedThemes?.slice(0, 2).map((theme: string) => (
                            <Badge 
                              key={theme} 
                              variant={selectedInsightFilter.type === 'theme' && selectedInsightFilter.value === theme ? 'default' : 'outline'} 
                              className="text-xs cursor-pointer hover:bg-muted" 
                              onClick={() => setSelectedInsightFilter({ type: 'theme', value: theme })}
                            >
                              🏷️ {theme}
                            </Badge>
                          ))}
                          {review.mentionedFeatures?.slice(0, 1).map((feature: string) => (
                            <Badge 
                              key={feature} 
                              variant={selectedInsightFilter.type === 'feature' && selectedInsightFilter.value === feature ? 'default' : 'secondary'} 
                              className="text-xs cursor-pointer hover:bg-muted"
                              onClick={() => setSelectedInsightFilter({ type: 'feature', value: feature })}
                            >
                              ⭐ {feature}
                            </Badge>
                          ))}
                          {review.identifiedIssues?.slice(0, 1).map((issue: string) => (
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

            {filteredReviews.length === 0 && !reviewsLoading && (
              <div className="text-center py-8 text-muted-foreground">
                <Eye className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>{reviews.length === 0 ? 'Select an app to fetch reviews' : 'No reviews match current filters'}</p>
              </div>
            )}

            {reviewsLoading && (
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
    </MainLayout>
  );
};

export default ReviewManagementPage;
