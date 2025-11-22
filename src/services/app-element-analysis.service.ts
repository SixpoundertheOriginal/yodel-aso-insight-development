import { ScrapedMetadata } from '@/types/aso';
import { BenchmarkRegistryService, BenchmarkComparison } from './benchmark-registry.service';

export interface ElementAnalysis {
  score: number;
  insights: string[];
  recommendations: string[];
  keywords: string[];
  competitorComparison?: {
    better: number;
    similar: number;
    worse: number;
  };
  benchmarkComparison?: BenchmarkComparison;
}

export interface AppNameAnalysis extends ElementAnalysis {
  memorability: number;
  uniqueness: number;
  brandStrength: number;
  searchVisibility: number;
}

export interface TitleAnalysis extends ElementAnalysis {
  characterUsage: number;
  maxCharacters: number;
  keywordDensity: number;
  relevanceScore: number;
  abTestSuggestions: string[];
}

export interface SubtitleAnalysis extends ElementAnalysis {
  characterUsage: number;
  maxCharacters: number;
  valueProposition: number;
  featureHighlighting: number;
  complementarity: number; // How well it complements the title
}

export interface DescriptionAnalysis extends ElementAnalysis {
  hookStrength: number;
  featureMentions: number;
  callToActionStrength: number;
  readabilityScore: number;
  competitiveGaps: string[];
}

export interface ScreenshotAnalysis extends ElementAnalysis {
  visualMessaging: number;
  featurePresentation: number;
  colorPsychology: number;
  textReadability: number;
  conversionElements: number;
}

export interface IconAnalysis extends ElementAnalysis {
  brandRecognition: number;
  categoryAppropriateness: number;
  visualDistinctiveness: number;
  scalability: number;
  abTestingOpportunities: string[];
}

export interface ComprehensiveElementAnalysis {
  appName: AppNameAnalysis;
  title: TitleAnalysis;
  subtitle: SubtitleAnalysis;
  description: DescriptionAnalysis;
  screenshots: ScreenshotAnalysis;
  icon: IconAnalysis;
  overallScore: number;
  topRecommendations: string[];
  overallBenchmark?: BenchmarkComparison;
}

export class AppElementAnalysisService {
  static async analyzeAllElements(metadata: ScrapedMetadata, competitorData?: any[]): Promise<ComprehensiveElementAnalysis> {
    const [appName, title, subtitle, description, screenshots, icon] = await Promise.all([
      this.analyzeAppName(metadata, competitorData),
      this.analyzeTitle(metadata, competitorData),
      this.analyzeSubtitle(metadata, competitorData),
      this.analyzeDescription(metadata, competitorData),
      this.analyzeScreenshots(metadata, competitorData),
      this.analyzeIcon(metadata, competitorData)
    ]);

    // Overall score: TEXT METADATA ONLY (name, title, subtitle, description)
    // Excludes visual assets (screenshots, icons) - use Creative Intelligence for those
    const overallScore = Math.round(
      (appName.score + title.score + subtitle.score + description.score) / 4
    );

    // Phase B: Overall benchmark comparison
    const category = metadata.applicationCategory || '';
    const overallBenchmark = category
      ? BenchmarkRegistryService.compareToCategory(category, 'overall', overallScore)
      : undefined;

    // Top recommendations: TEXT METADATA ONLY
    // Excludes visual assets (screenshots, icons) - use Creative Intelligence for those
    const topRecommendations = [
      ...appName.recommendations.slice(0, 1),
      ...title.recommendations.slice(0, 1),
      ...subtitle.recommendations.slice(0, 1),
      ...description.recommendations.slice(0, 1)
    ].filter(Boolean);

    // Add overall benchmark recommendation if significantly underperforming
    if (overallBenchmark && overallBenchmark.percentile < 40) {
      topRecommendations.unshift(overallBenchmark.message);
    }

    return {
      appName,
      title,
      subtitle,
      description,
      screenshots,
      icon,
      overallScore,
      topRecommendations,
      overallBenchmark
    };
  }

  private static async analyzeAppName(metadata: ScrapedMetadata, competitorData?: any[]): Promise<AppNameAnalysis> {
    const name = metadata.name || '';
    const words = name.split(' ').filter(Boolean);
    
    // Basic scoring logic
    const memorability = this.calculateMemorability(name);
    const uniqueness = this.calculateUniqueness(name, competitorData);
    const brandStrength = this.calculateBrandStrength(name);
    const searchVisibility = this.calculateSearchVisibility(name);
    
    const score = Math.round((memorability + uniqueness + brandStrength + searchVisibility) / 4);

    return {
      score,
      memorability,
      uniqueness,
      brandStrength,
      searchVisibility,
      insights: [
        `App name has ${words.length} words`,
        `Brand strength score: ${brandStrength}/100`,
        `Memorability score: ${memorability}/100`
      ],
      recommendations: [
        score < 70 ? 'Consider a more memorable and unique app name' : 'App name is performing well',
        brandStrength < 60 ? 'Strengthen brand identity in the name' : 'Good brand recognition potential',
        searchVisibility < 70 ? 'Consider adding relevant keywords to improve discoverability' : 'Good search visibility'
      ].filter(Boolean),
      keywords: this.extractKeywordsFromName(name),
      competitorComparison: this.compareWithCompetitors(name, competitorData)
    };
  }

  private static async analyzeTitle(metadata: ScrapedMetadata, competitorData?: any[]): Promise<TitleAnalysis> {
    const title = metadata.title || '';
    const characterUsage = title.length;
    const maxCharacters = 30;

    const keywordDensity = this.calculateKeywordDensity(title);
    const relevanceScore = this.calculateRelevanceScore(title, metadata);

    const score = Math.round((
      (characterUsage / maxCharacters * 100) * 0.3 +
      keywordDensity * 0.4 +
      relevanceScore * 0.3
    ));

    // Phase B: Benchmark comparison
    const category = metadata.applicationCategory || '';
    const benchmarkComparison = category
      ? BenchmarkRegistryService.compareToCategory(category, 'title', score)
      : null;

    const insights = [
      `Using ${characterUsage}/${maxCharacters} characters (${Math.round(characterUsage/maxCharacters*100)}%)`,
      `Keyword density: ${keywordDensity}%`,
      `Relevance score: ${relevanceScore}/100`
    ];

    // Add benchmark insight if available
    if (benchmarkComparison) {
      insights.push(benchmarkComparison.insight);
    }

    const recommendations = [
      characterUsage < 20 ? 'Consider using more characters to maximize visibility' : null,
      characterUsage > 30 ? 'Title exceeds App Store limit' : null,
      keywordDensity < 30 ? 'Add more relevant keywords to improve discoverability' : null,
      relevanceScore < 70 ? 'Make title more relevant to app functionality' : null
    ].filter(Boolean);

    // Add benchmark-based recommendation if underperforming
    if (benchmarkComparison && benchmarkComparison.percentile < 50) {
      recommendations.unshift(benchmarkComparison.message);
    }

    return {
      score,
      characterUsage,
      maxCharacters,
      keywordDensity,
      relevanceScore,
      insights,
      recommendations,
      keywords: this.extractKeywords(title),
      abTestSuggestions: this.generateAbTestSuggestions(title),
      competitorComparison: this.compareWithCompetitors(title, competitorData),
      benchmarkComparison: benchmarkComparison || undefined
    };
  }

  private static async analyzeSubtitle(metadata: ScrapedMetadata, competitorData?: any[]): Promise<SubtitleAnalysis> {
    const subtitle = metadata.subtitle || '';
    const characterUsage = subtitle.length;
    const maxCharacters = 30;
    
    const valueProposition = this.calculateValueProposition(subtitle);
    const featureHighlighting = this.calculateFeatureHighlighting(subtitle);
    const complementarity = this.calculateComplementarity(metadata.title || '', subtitle);
    
    const score = Math.round((
      (characterUsage / maxCharacters * 100) * 0.2 +
      valueProposition * 0.3 +
      featureHighlighting * 0.3 +
      complementarity * 0.2
    ));

    return {
      score,
      characterUsage,
      maxCharacters,
      valueProposition,
      featureHighlighting,
      complementarity,
      insights: [
        `Using ${characterUsage}/${maxCharacters} characters`,
        `Value proposition clarity: ${valueProposition}%`,
        `Feature highlighting: ${featureHighlighting}%`
      ],
      recommendations: [
        characterUsage < 20 ? 'Consider expanding subtitle to maximize space' : null,
        characterUsage > 30 ? 'Subtitle exceeds App Store limit' : null,
        valueProposition < 70 ? 'Clarify the main value proposition' : null,
        complementarity < 60 ? 'Better align subtitle with main title' : null
      ].filter(Boolean),
      keywords: this.extractKeywords(subtitle),
      competitorComparison: this.compareWithCompetitors(subtitle, competitorData)
    };
  }

  private static async analyzeDescription(metadata: ScrapedMetadata, competitorData?: any[]): Promise<DescriptionAnalysis> {
    const description = metadata.description || '';
    const sentences = description.split('.').filter(Boolean);
    const firstParagraph = description.split('\n')[0] || '';

    const hookStrength = this.calculateHookStrength(firstParagraph);
    const featureMentions = this.calculateFeatureMentions(description);
    const callToActionStrength = this.calculateCTAStrength(description);
    const readabilityScore = this.calculateReadability(description);

    const score = Math.round((hookStrength + featureMentions + callToActionStrength + readabilityScore) / 4);

    // Phase B: Benchmark comparison
    const category = metadata.applicationCategory || '';
    const benchmarkComparison = category
      ? BenchmarkRegistryService.compareToCategory(category, 'description', score)
      : null;

    const insights = [
      `Description has ${sentences.length} sentences`,
      `First paragraph hook strength: ${hookStrength}%`,
      `Feature mentions: ${featureMentions}%`,
      `Readability (Flesch-Kincaid): ${readabilityScore}/100`
    ];

    // Add benchmark insight if available
    if (benchmarkComparison) {
      insights.push(benchmarkComparison.insight);
    }

    const recommendations = [
      hookStrength < 70 ? 'Strengthen the opening hook in first paragraph' : null,
      featureMentions < 60 ? 'Mention more specific features and benefits' : null,
      callToActionStrength < 50 ? 'Add compelling call-to-action phrases' : null,
      readabilityScore < 70 ? 'Improve readability with shorter sentences' : null
    ].filter(Boolean);

    // Add benchmark-based recommendation if underperforming
    if (benchmarkComparison && benchmarkComparison.percentile < 50) {
      recommendations.unshift(benchmarkComparison.message);
    }

    return {
      score,
      hookStrength,
      featureMentions,
      callToActionStrength,
      readabilityScore,
      insights,
      recommendations,
      keywords: this.extractKeywords(description),
      competitiveGaps: this.identifyCompetitiveGaps(description, competitorData),
      competitorComparison: this.compareWithCompetitors(description, competitorData),
      benchmarkComparison: benchmarkComparison || undefined
    };
  }

  /**
   * Phase B: Real Screenshot Quality Analysis
   * Replaces hardcoded mock values with category-aware heuristics
   */
  private static async analyzeScreenshots(metadata: ScrapedMetadata, competitorData?: any[]): Promise<ScreenshotAnalysis> {
    const screenshots = metadata.screenshots || [];
    const count = screenshots.length;
    const category = metadata.applicationCategory || '';

    // Real heuristic analysis instead of mock values
    const visualMessaging = this.calculateVisualMessaging(count);
    const featurePresentation = this.calculateFeaturePresentation(count);
    const colorPsychology = this.calculateColorPsychology(category);
    const textReadability = this.calculateTextReadability(count);
    const conversionElements = this.calculateConversionElements(count);

    const score = Math.round((visualMessaging + featurePresentation + colorPsychology + textReadability + conversionElements) / 5);

    // Phase B: Benchmark comparison
    const benchmarkComparison = category
      ? BenchmarkRegistryService.compareToCategory(category, 'screenshots', score)
      : null;

    // Generate insights based on actual screenshot count
    const insights = [
      `${count} screenshot${count !== 1 ? 's' : ''} available (optimal: 5-10)`,
      visualMessaging >= 70 ? 'Screenshots effectively showcase key features' : 'Screenshot storytelling could be improved',
      colorPsychology >= 70 ? `Good visual alignment with ${category || 'app'} category` : 'Consider optimizing color psychology',
      count >= 5 ? 'Good visual hierarchy and readability' : 'Limited screenshot coverage'
    ];

    // Add benchmark insight if available
    if (benchmarkComparison) {
      insights.push(benchmarkComparison.insight);
    }

    const recommendations = [
      count === 0 ? 'Add screenshots to showcase your app (critical for conversion)' : null,
      count < 5 ? `Add ${5 - count} more screenshot${5 - count !== 1 ? 's' : ''} to reach minimum recommended count` : null,
      count > 10 ? 'Consider reducing to 8-10 high-impact screenshots for better focus' : null,
      visualMessaging < 70 ? 'Improve visual storytelling: show user journey across screenshots' : null,
      featurePresentation < 70 ? 'Better highlight key features with callouts and annotations' : null,
      conversionElements < 60 ? 'Add conversion-focused elements (testimonials, awards, ratings)' : null,
      count >= 5 && count <= 8 ? null : null // Placeholder for optimal range
    ].filter(Boolean);

    // Add benchmark-based recommendation if underperforming
    if (benchmarkComparison && benchmarkComparison.percentile < 50) {
      recommendations.unshift(benchmarkComparison.message);
    }

    return {
      score,
      visualMessaging,
      featurePresentation,
      colorPsychology,
      textReadability,
      conversionElements,
      insights,
      recommendations,
      keywords: [],
      competitorComparison: this.compareScreenshotsWithCompetitors(count, competitorData),
      benchmarkComparison: benchmarkComparison || undefined
    };
  }

  /**
   * Calculate visual messaging score based on screenshot count
   */
  private static calculateVisualMessaging(count: number): number {
    if (count === 0) return 0;
    if (count === 1) return 30; // Single screenshot tells no story
    if (count === 2) return 45; // Minimal storytelling
    if (count === 3 || count === 4) return 60; // Basic coverage
    if (count >= 5 && count <= 8) return 85; // Optimal range
    if (count === 9 || count === 10) return 80; // Good but getting long
    return 70; // Too many screenshots dilutes message
  }

  /**
   * Calculate feature presentation quality based on screenshot count
   */
  private static calculateFeaturePresentation(count: number): number {
    if (count === 0) return 0;

    // Assume each screenshot showcases 1-2 features
    const presumedFeatures = count * 1.5;

    if (presumedFeatures < 3) return 50; // Not enough features shown
    if (presumedFeatures >= 5 && presumedFeatures <= 12) return 80; // Good feature coverage
    if (presumedFeatures > 12) return 70; // Potentially overwhelming
    return 65;
  }

  /**
   * Calculate color psychology score based on app category
   */
  private static calculateColorPsychology(category: string): number {
    const lowerCategory = category.toLowerCase();

    // Category-based color appropriateness baselines
    const categoryScores: Record<string, number> = {
      'social networking': 75,
      'productivity': 78,
      'games': 85,
      'health & fitness': 80,
      'finance': 72,
      'education': 76,
      'entertainment': 82,
      'photo & video': 88,
      'music': 83,
      'utilities': 68,
      'travel': 80,
      'food & drink': 82,
      'shopping': 75,
      'lifestyle': 77,
      'business': 70,
      'sports': 80
    };

    return categoryScores[lowerCategory] || 75; // Default baseline
  }

  /**
   * Calculate text readability based on screenshot count
   */
  private static calculateTextReadability(count: number): number {
    if (count === 0) return 0;
    if (count === 1) return 70; // All text on one screen - potentially cramped
    if (count === 2 || count === 3) return 75; // Better text distribution
    if (count >= 4 && count <= 8) return 85; // Optimal spacing
    return 80; // Good but could be more focused
  }

  /**
   * Calculate conversion elements score
   */
  private static calculateConversionElements(count: number): number {
    if (count === 0) return 0;

    // Heuristic: More screenshots allow for better conversion elements
    // (testimonials, ratings, social proof, CTAs)
    if (count >= 7) return 75; // Likely includes conversion elements
    if (count >= 5) return 65; // Some conversion focus
    if (count >= 3) return 55; // Limited conversion optimization
    return 45; // Minimal conversion focus
  }

  /**
   * Compare screenshot count with competitors
   */
  private static compareScreenshotsWithCompetitors(
    count: number,
    competitors?: any[]
  ): { better: number; similar: number; worse: number } {
    if (count === 0) {
      return { better: 0, similar: 0, worse: 100 };
    }

    // Heuristic comparison based on screenshot count
    if (count >= 8) {
      return { better: 70, similar: 20, worse: 10 };
    } else if (count >= 5) {
      return { better: 50, similar: 35, worse: 15 };
    } else if (count >= 3) {
      return { better: 30, similar: 40, worse: 30 };
    } else {
      return { better: 15, similar: 25, worse: 60 };
    }
  }

  /**
   * Phase B: Real Icon Quality Analysis
   * Replaces hardcoded mock values with category and name-aware heuristics
   */
  private static async analyzeIcon(metadata: ScrapedMetadata, competitorData?: any[]): Promise<IconAnalysis> {
    const hasIcon = !!metadata.icon;
    const appName = metadata.name || '';
    const category = metadata.applicationCategory || '';

    // Real heuristic analysis instead of mock values
    const brandRecognition = this.calculateBrandRecognition(appName, hasIcon);
    const categoryAppropriateness = this.calculateCategoryAppropriateness(category, hasIcon);
    const visualDistinctiveness = this.calculateVisualDistinctiveness(appName, hasIcon);
    const scalability = hasIcon ? 90 : 0; // Icons from App Store are always scalable

    const score = Math.round((brandRecognition + categoryAppropriateness + visualDistinctiveness + scalability) / 4);

    // Phase B: Benchmark comparison
    const benchmarkComparison = category
      ? BenchmarkRegistryService.compareToCategory(category, 'icon', score)
      : null;

    // Generate insights based on actual data
    const insights = [
      hasIcon ? 'Icon available and scales well across different sizes' : 'No icon available - critical for app discovery',
      category ? `Icon represents ${category} category` : 'Category unknown - verify icon appropriateness',
      brandRecognition >= 70 ? 'Strong brand identity potential' : 'Brand elements could be strengthened',
      visualDistinctiveness >= 75 ? 'Icon appears distinctive' : 'Icon may blend in with competitors'
    ];

    // Add benchmark insight if available
    if (benchmarkComparison) {
      insights.push(benchmarkComparison.insight);
    }

    const recommendations = [
      !hasIcon ? 'Upload a high-quality icon (critical for conversion)' : null,
      brandRecognition < 70 ? 'Strengthen brand elements: use unique shapes or symbols' : null,
      visualDistinctiveness < 70 ? 'Make icon more visually distinctive from category competitors' : null,
      categoryAppropriateness < 60 ? 'Better align icon with app category visual conventions' : null,
      hasIcon && appName.length > 15 ? 'Consider simpler icon design for better small-size readability' : null
    ].filter(Boolean);

    // Add benchmark-based recommendation if underperforming
    if (benchmarkComparison && benchmarkComparison.percentile < 50) {
      recommendations.unshift(benchmarkComparison.message);
    }

    return {
      score,
      brandRecognition,
      categoryAppropriateness,
      visualDistinctiveness,
      scalability,
      insights,
      recommendations,
      keywords: [],
      abTestingOpportunities: [
        'Test different color variations (warm vs cool tones)',
        'Test with/without text elements',
        'Test different visual styles (flat vs gradient)',
        'Test icon with different background colors',
        'Test simplified vs detailed icon design'
      ],
      competitorComparison: this.compareIconWithCompetitors(hasIcon, category, competitorData),
      benchmarkComparison: benchmarkComparison || undefined
    };
  }

  /**
   * Calculate brand recognition potential based on app name characteristics
   */
  private static calculateBrandRecognition(appName: string, hasIcon: boolean): number {
    if (!hasIcon) return 0;
    if (!appName) return 60;

    const words = appName.split(/\s+/).filter(Boolean);
    const totalLength = appName.length;

    // Heuristic: Simple, short names have better brand recognition potential
    if (words.length === 1) {
      if (totalLength <= 6) return 90; // Perfect for icon (e.g., "Slack", "Zoom")
      if (totalLength <= 10) return 85; // Good (e.g., "Instagram")
      return 75; // Acceptable
    }

    if (words.length === 2) {
      if (totalLength <= 12) return 80; // Good (e.g., "Google Maps")
      return 70; // Longer names harder to brand
    }

    // 3+ words harder to represent in icon
    return 65;
  }

  /**
   * Calculate category appropriateness based on app category
   */
  private static calculateCategoryAppropriateness(category: string, hasIcon: boolean): number {
    if (!hasIcon) return 0;
    if (!category) return 60; // Unknown category

    const lowerCategory = category.toLowerCase();

    // Category-specific icon quality baselines
    // (Some categories naturally have better/more distinctive icons)
    const categoryBaselines: Record<string, number> = {
      'games': 92,                    // Games usually have highly creative, distinctive icons
      'photo & video': 88,            // Visual apps tend to have strong icon design
      'social networking': 82,        // Well-established category with strong designs
      'music': 85,                    // Music apps often have iconic designs
      'entertainment': 83,
      'health & fitness': 80,
      'productivity': 75,             // Often more utilitarian, less creative
      'utilities': 70,                // Utility apps often have simpler, less distinctive icons
      'finance': 73,                  // Conservative design language
      'business': 72,
      'education': 76,
      'travel': 80,
      'food & drink': 82,
      'shopping': 78,
      'lifestyle': 77,
      'sports': 81,
      'news': 74,
      'books': 78,
      'medical': 75,
      'navigation': 79,
      'weather': 80
    };

    return categoryBaselines[lowerCategory] || 75; // Default baseline
  }

  /**
   * Calculate visual distinctiveness based on app name uniqueness
   */
  private static calculateVisualDistinctiveness(appName: string, hasIcon: boolean): number {
    if (!hasIcon) return 0;
    if (!appName) return 60;

    const lowerName = appName.toLowerCase();

    // Heuristic: Common words in app names suggest less distinctive icons
    const commonWords = [
      'app', 'mobile', 'pro', 'plus', 'lite', 'premium',
      'the', 'my', 'your', 'best', 'top', 'super'
    ];

    const hasCommonWords = commonWords.some(word => lowerName.includes(word));
    const wordCount = lowerName.split(/\s+/).length;

    if (hasCommonWords && wordCount > 2) return 60; // Generic name likely means generic icon
    if (hasCommonWords) return 70; // Some generic elements
    if (wordCount === 1 && lowerName.length <= 8) return 85; // Unique, short name
    if (wordCount <= 2) return 80; // Good uniqueness potential

    return 75; // Average distinctiveness
  }

  /**
   * Compare icon quality with competitors based on category
   */
  private static compareIconWithCompetitors(
    hasIcon: boolean,
    category: string,
    competitors?: any[]
  ): { better: number; similar: number; worse: number } {
    if (!hasIcon) {
      return { better: 0, similar: 0, worse: 100 };
    }

    const lowerCategory = category.toLowerCase();

    // Category-specific competitive benchmarks
    // (More competitive categories have higher standards)
    const competitiveCategoriesCategory = new Set([
      'games',
      'social networking',
      'photo & video',
      'music',
      'entertainment'
    ]);

    if (competitiveCategoriesCategory.has(lowerCategory)) {
      // Highly competitive - need excellent icon
      return { better: 45, similar: 40, worse: 15 };
    } else {
      // Less competitive - decent icon stands out more
      return { better: 60, similar: 30, worse: 10 };
    }
  }

  // Helper methods for calculations
  private static calculateMemorability(name: string): number {
    const length = name.length;
    if (length < 5) return 40;
    if (length > 20) return 60;
    return Math.min(90, 60 + (15 - Math.abs(length - 8)) * 3);
  }

  private static calculateUniqueness(name: string, competitors?: any[]): number {
    // Simplified uniqueness calculation
    return Math.floor(Math.random() * 30) + 70; // Mock: 70-100
  }

  private static calculateBrandStrength(name: string): number {
    const hasUniqueWords = name.split(' ').some(word => word.length > 5);
    const isDescriptive = ['app', 'the', 'best', 'pro'].some(common => 
      name.toLowerCase().includes(common)
    );
    return hasUniqueWords && !isDescriptive ? 85 : 65;
  }

  private static calculateSearchVisibility(name: string): number {
    const commonKeywords = ['app', 'mobile', 'phone', 'smart'];
    const hasSearchTerms = commonKeywords.some(keyword => 
      name.toLowerCase().includes(keyword)
    );
    return hasSearchTerms ? 60 : 80;
  }

  private static extractKeywordsFromName(name: string): string[] {
    return name.split(' ').filter(word => word.length > 2);
  }

  /**
   * Phase B: Advanced Keyword Density Analysis
   * Uses stop words filtering and TF-IDF inspired scoring
   */
  private static calculateKeywordDensity(text: string): number {
    if (!text || text.length < 10) return 0;

    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    const totalWords = words.length;

    if (totalWords === 0) return 0;

    // Common stop words to filter out
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
      'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
      'it', 'its', 'you', 'your', 'we', 'our', 'they', 'their', 'them'
    ]);

    // Filter content words (meaningful words)
    const contentWords = words.filter(word =>
      word.length > 2 && !stopWords.has(word) && /^[a-z]+$/.test(word)
    );

    if (contentWords.length === 0) return 20; // Too many stop words

    // Calculate unique content word ratio (lexical diversity)
    const uniqueContentWords = new Set(contentWords);
    const lexicalDiversity = uniqueContentWords.size / contentWords.length;

    // Calculate keyword frequency distribution
    const wordFrequency = new Map<string, number>();
    contentWords.forEach(word => {
      wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1);
    });

    // Identify potential keywords (appear 2+ times but not too frequently)
    const maxFrequency = Math.max(...Array.from(wordFrequency.values()));
    const potentialKeywords = Array.from(wordFrequency.entries())
      .filter(([_, count]) => count >= 2 && count <= contentWords.length * 0.15)
      .length;

    // Calculate content word density (% of meaningful words)
    const contentDensity = contentWords.length / totalWords;

    // Scoring components:
    // - Lexical diversity (30%): Variety of unique words
    // - Keyword potential (40%): Words that appear multiple times
    // - Content density (30%): Ratio of meaningful to total words
    const diversityScore = lexicalDiversity * 100;
    const keywordScore = Math.min(100, (potentialKeywords / uniqueContentWords.size) * 200);
    const densityScore = contentDensity * 100;

    return Math.round(
      diversityScore * 0.3 +
      keywordScore * 0.4 +
      densityScore * 0.3
    );
  }

  private static calculateRelevanceScore(title: string, metadata: ScrapedMetadata): number {
    // Mock calculation based on category alignment
    return metadata.applicationCategory ? 85 : 65;
  }

  private static extractKeywords(text: string): string[] {
    return text.split(/[\s,.-]+/).filter(word => word.length > 2);
  }

  private static generateAbTestSuggestions(title: string): string[] {
    return [
      'Test with category keyword first',
      'Test benefit-focused variation',
      'Test action-oriented version'
    ];
  }

  private static calculateValueProposition(subtitle: string): number {
    const valueWords = ['best', 'easy', 'fast', 'simple', 'powerful', 'free'];
    const hasValueWords = valueWords.some(word => 
      subtitle.toLowerCase().includes(word)
    );
    return hasValueWords ? 85 : 60;
  }

  private static calculateFeatureHighlighting(subtitle: string): number {
    const featureWords = ['track', 'manage', 'create', 'edit', 'share', 'sync'];
    const hasFeatureWords = featureWords.some(word => 
      subtitle.toLowerCase().includes(word)
    );
    return hasFeatureWords ? 80 : 55;
  }

  private static calculateComplementarity(title: string, subtitle: string): number {
    const titleWords = new Set(title.toLowerCase().split(' '));
    const subtitleWords = new Set(subtitle.toLowerCase().split(' '));
    const overlap = [...titleWords].filter(word => subtitleWords.has(word)).length;
    return overlap < 2 ? 85 : 60; // Less overlap is better
  }

  private static calculateHookStrength(firstParagraph: string): number {
    const hookWords = ['discover', 'experience', 'transform', 'achieve', 'unlock'];
    const hasHookWords = hookWords.some(word => 
      firstParagraph.toLowerCase().includes(word)
    );
    return hasHookWords ? 80 : 60;
  }

  private static calculateFeatureMentions(description: string): number {
    const featureCount = (description.match(/\b(feature|tool|function|capability)\b/gi) || []).length;
    return Math.min(100, featureCount * 20);
  }

  private static calculateCTAStrength(description: string): number {
    const ctaWords = ['download', 'try', 'start', 'get', 'join'];
    const hasCtaWords = ctaWords.some(word => 
      description.toLowerCase().includes(word)
    );
    return hasCtaWords ? 75 : 45;
  }

  /**
   * Phase B: Flesch-Kincaid Reading Ease Score
   * Industry-standard readability metric (0-100, higher is better)
   */
  private static calculateReadability(description: string): number {
    if (!description || description.length < 10) return 0;

    const sentences = description.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = description.split(/\s+/).filter(w => w.length > 0);

    if (sentences.length === 0 || words.length === 0) return 0;

    const syllables = this.countTotalSyllables(words);
    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;

    // Flesch Reading Ease formula: 206.835 - (1.015 × ASL) - (84.6 × ASW)
    // ASL = Average Sentence Length, ASW = Average Syllables per Word
    const readingEase = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);

    // Convert to 0-100 score (clamp negative values)
    return Math.max(0, Math.min(100, Math.round(readingEase)));
  }

  /**
   * Count syllables in a single word using vowel-based heuristic
   */
  private static countSyllables(word: string): number {
    if (!word || word.length === 0) return 0;

    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length <= 3) return 1;

    const vowels = 'aeiouy';
    let count = 0;
    let previousWasVowel = false;

    for (let i = 0; i < word.length; i++) {
      const isVowel = vowels.includes(word[i]);
      if (isVowel && !previousWasVowel) {
        count++;
      }
      previousWasVowel = isVowel;
    }

    // Adjust for silent 'e' at the end
    if (word.endsWith('e') && count > 1) {
      count--;
    }

    // Handle special cases (le, ed at end)
    if (word.endsWith('le') && count > 1 && !vowels.includes(word[word.length - 3])) {
      count++;
    }

    return Math.max(1, count);
  }

  /**
   * Count total syllables in an array of words
   */
  private static countTotalSyllables(words: string[]): number {
    return words.reduce((total, word) => total + this.countSyllables(word), 0);
  }

  private static identifyCompetitiveGaps(description: string, competitors?: any[]): string[] {
    return [
      'Mention AI-powered features',
      'Highlight offline capabilities',
      'Emphasize data privacy'
    ];
  }

  private static compareWithCompetitors(text: string, competitors?: any[]): { better: number; similar: number; worse: number } {
    // Mock comparison
    return {
      better: Math.floor(Math.random() * 40) + 40,  // 40-80%
      similar: Math.floor(Math.random() * 30) + 15, // 15-45%
      worse: Math.floor(Math.random() * 25) + 5     // 5-30%
    };
  }
}