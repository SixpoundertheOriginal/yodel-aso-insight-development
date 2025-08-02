import { ScrapedMetadata } from '@/types/aso';

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

    const overallScore = Math.round(
      (appName.score + title.score + subtitle.score + description.score + screenshots.score + icon.score) / 6
    );

    const topRecommendations = [
      ...appName.recommendations.slice(0, 1),
      ...title.recommendations.slice(0, 1),
      ...subtitle.recommendations.slice(0, 1),
      ...description.recommendations.slice(0, 1),
      ...screenshots.recommendations.slice(0, 1),
      ...icon.recommendations.slice(0, 1)
    ].filter(Boolean);

    return {
      appName,
      title,
      subtitle,
      description,
      screenshots,
      icon,
      overallScore,
      topRecommendations
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

    return {
      score,
      characterUsage,
      maxCharacters,
      keywordDensity,
      relevanceScore,
      insights: [
        `Using ${characterUsage}/${maxCharacters} characters (${Math.round(characterUsage/maxCharacters*100)}%)`,
        `Keyword density: ${keywordDensity}%`,
        `Relevance score: ${relevanceScore}/100`
      ],
      recommendations: [
        characterUsage < 20 ? 'Consider using more characters to maximize visibility' : null,
        characterUsage > 30 ? 'Title exceeds App Store limit' : null,
        keywordDensity < 30 ? 'Add more relevant keywords to improve discoverability' : null,
        relevanceScore < 70 ? 'Make title more relevant to app functionality' : null
      ].filter(Boolean),
      keywords: this.extractKeywords(title),
      abTestSuggestions: this.generateAbTestSuggestions(title),
      competitorComparison: this.compareWithCompetitors(title, competitorData)
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

    return {
      score,
      hookStrength,
      featureMentions,
      callToActionStrength,
      readabilityScore,
      insights: [
        `Description has ${sentences.length} sentences`,
        `First paragraph hook strength: ${hookStrength}%`,
        `Feature mentions: ${featureMentions}%`
      ],
      recommendations: [
        hookStrength < 70 ? 'Strengthen the opening hook in first paragraph' : null,
        featureMentions < 60 ? 'Mention more specific features and benefits' : null,
        callToActionStrength < 50 ? 'Add compelling call-to-action phrases' : null,
        readabilityScore < 70 ? 'Improve readability with shorter sentences' : null
      ].filter(Boolean),
      keywords: this.extractKeywords(description),
      competitiveGaps: this.identifyCompetitiveGaps(description, competitorData),
      competitorComparison: this.compareWithCompetitors(description, competitorData)
    };
  }

  private static async analyzeScreenshots(metadata: ScrapedMetadata, competitorData?: any[]): Promise<ScreenshotAnalysis> {
    // Mock analysis - in real implementation, this would use image analysis
    const visualMessaging = 85;
    const featurePresentation = 78;
    const colorPsychology = 82;
    const textReadability = 90;
    const conversionElements = 75;
    
    const score = Math.round((visualMessaging + featurePresentation + colorPsychology + textReadability + conversionElements) / 5);

    return {
      score,
      visualMessaging,
      featurePresentation,
      colorPsychology,
      textReadability,
      conversionElements,
      insights: [
        'Screenshots effectively showcase key features',
        'Good visual hierarchy and readability',
        'Color scheme aligns with app category'
      ],
      recommendations: [
        visualMessaging < 70 ? 'Improve visual storytelling in screenshots' : null,
        featurePresentation < 70 ? 'Better highlight key features' : null,
        conversionElements < 60 ? 'Add more conversion-focused elements' : null
      ].filter(Boolean),
      keywords: [],
      competitorComparison: { better: 60, similar: 30, worse: 10 }
    };
  }

  private static async analyzeIcon(metadata: ScrapedMetadata, competitorData?: any[]): Promise<IconAnalysis> {
    // Mock analysis - in real implementation, this would use image analysis
    const brandRecognition = 80;
    const categoryAppropriateness = 85;
    const visualDistinctiveness = 75;
    const scalability = 90;
    
    const score = Math.round((brandRecognition + categoryAppropriateness + visualDistinctiveness + scalability) / 4);

    return {
      score,
      brandRecognition,
      categoryAppropriateness,
      visualDistinctiveness,
      scalability,
      insights: [
        'Icon scales well across different sizes',
        'Good category representation',
        'Strong brand identity potential'
      ],
      recommendations: [
        brandRecognition < 70 ? 'Strengthen brand elements in icon design' : null,
        visualDistinctiveness < 70 ? 'Make icon more visually distinctive' : null,
        categoryAppropriateness < 60 ? 'Better align icon with app category' : null
      ].filter(Boolean),
      keywords: [],
      abTestingOpportunities: [
        'Test different color variations',
        'Test with/without text elements',
        'Test different visual styles'
      ],
      competitorComparison: { better: 55, similar: 35, worse: 10 }
    };
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

  private static calculateKeywordDensity(text: string): number {
    const words = text.split(' ').filter(Boolean);
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    return Math.round((uniqueWords.size / words.length) * 100);
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

  private static calculateReadability(description: string): number {
    const sentences = description.split('.').filter(Boolean);
    const avgLength = sentences.reduce((acc, s) => acc + s.split(' ').length, 0) / sentences.length;
    return avgLength < 15 ? 85 : avgLength < 25 ? 70 : 55;
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