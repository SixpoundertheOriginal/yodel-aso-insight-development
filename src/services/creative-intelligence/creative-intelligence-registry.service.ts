/**
 * Creative Intelligence Registry Service
 *
 * Centralized registry for creative themes, metrics, validators, and scoring rubrics.
 * Follows the same singleton pattern as BenchmarkRegistryService for consistency.
 *
 * This service provides:
 * - Theme Registry: Visual theme classification (minimal, bold, professional, gaming)
 * - Metrics Registry: Scoring dimensions (visual quality, text clarity, CTA, consistency)
 * - Validators Registry: Quality checks and best practices
 * - Scoring Rubrics: Category-specific weights and thresholds
 *
 * All data is loaded lazily on first access for optimal performance.
 *
 * @module CreativeIntelligenceRegistryService
 * @version 1.0.0
 */

import type {
  CreativeTheme,
  CreativeMetric,
  CreativeValidator,
  CategoryScoringRubric,
  PerformanceTier,
  CreativeElement,
  ValidationResult,
} from '@/types/creative-intelligence.types';

export class CreativeIntelligenceRegistryService {
  // ============================================
  // Private Static Storage
  // ============================================

  private static themes: Map<string, CreativeTheme> = new Map();
  private static metrics: Map<string, CreativeMetric> = new Map();
  private static validators: Map<string, CreativeValidator> = new Map();
  private static rubrics: Map<string, CategoryScoringRubric> = new Map();
  private static initialized = false;

  private static readonly REGISTRY_VERSION = '1.0.0';

  // ============================================
  // Initialization
  // ============================================

  /**
   * Initialize all registries with default data.
   * Lazy-loaded on first access.
   * @private
   */
  private static initializeRegistries(): void {
    if (this.initialized) return;

    console.log('[CreativeRegistry] Initializing registries v' + this.REGISTRY_VERSION);

    // Load all registries
    this.loadThemes();
    this.loadMetrics();
    this.loadValidators();
    this.loadScoringRubrics();

    this.initialized = true;

    console.log('[CreativeRegistry] Initialization complete:', {
      themes: this.themes.size,
      metrics: this.metrics.size,
      validators: this.validators.size,
      rubrics: this.rubrics.size,
      version: this.REGISTRY_VERSION,
    });
  }

  // ============================================
  // Theme Registry
  // ============================================

  /**
   * Load theme registry data
   * @private
   */
  private static loadThemes(): void {
    // Minimal Theme
    this.themes.set('minimal', {
      id: 'minimal',
      name: 'Minimal & Clean',
      description: 'Simple, uncluttered design with plenty of whitespace',
      categories: ['productivity', 'utilities', 'finance'],
      characteristics: {
        visualDensity: 'low',
        colorPalette: 'muted',
        typography: 'minimal',
        composition: 'centered',
        textRatio: 30,
        ctaPresence: false,
      },
      benchmarks: {
        topPerformingApps: ['notion', 'bear', 'things'],
        avgScore: 78,
        categoryFit: {
          'productivity': 92,
          'utilities': 85,
          'finance': 88,
          'games': 45,
          'social networking': 55,
          'entertainment': 50,
        },
      },
      aiPromptHints: [
        'clean layout',
        'whitespace',
        'simple typography',
        'muted colors',
        'centered composition',
      ],
    });

    // Bold Theme
    this.themes.set('bold', {
      id: 'bold',
      name: 'Bold & Vibrant',
      description: 'High visual density with vibrant colors and dynamic composition',
      categories: ['games', 'entertainment', 'social networking'],
      characteristics: {
        visualDensity: 'high',
        colorPalette: 'vibrant',
        typography: 'bold',
        composition: 'dynamic',
        textRatio: 20,
        ctaPresence: true,
      },
      benchmarks: {
        topPerformingApps: ['clash-of-clans', 'candy-crush', 'tiktok'],
        avgScore: 85,
        categoryFit: {
          'games': 95,
          'entertainment': 88,
          'social networking': 82,
          'productivity': 40,
          'utilities': 35,
          'finance': 30,
        },
      },
      aiPromptHints: [
        'vibrant colors',
        'high contrast',
        'bold typography',
        'action-oriented',
        'dynamic layout',
      ],
    });

    // Professional Theme
    this.themes.set('professional', {
      id: 'professional',
      name: 'Professional & Trustworthy',
      description: 'Corporate-friendly design emphasizing trust and credibility',
      categories: ['finance', 'health & fitness', 'education'],
      characteristics: {
        visualDensity: 'medium',
        colorPalette: 'muted',
        typography: 'minimal',
        composition: 'grid',
        textRatio: 40,
        ctaPresence: false,
      },
      benchmarks: {
        topPerformingApps: ['robinhood', 'headspace', 'duolingo'],
        avgScore: 82,
        categoryFit: {
          'finance': 94,
          'health & fitness': 88,
          'education': 90,
          'games': 35,
          'productivity': 75,
          'utilities': 70,
        },
      },
      aiPromptHints: [
        'professional',
        'trustworthy',
        'data visualization',
        'structured layout',
        'corporate colors',
      ],
    });

    // Gaming Theme
    this.themes.set('gaming', {
      id: 'gaming',
      name: 'Gaming & Immersive',
      description: 'Game-centric design with character focus and immersive visuals',
      categories: ['games'],
      characteristics: {
        visualDensity: 'high',
        colorPalette: 'gradient',
        typography: 'decorative',
        composition: 'asymmetric',
        textRatio: 10,
        ctaPresence: true,
      },
      benchmarks: {
        topPerformingApps: ['genshin-impact', 'pubg', 'minecraft'],
        avgScore: 90,
        categoryFit: {
          'games': 98,
          'entertainment': 60,
          'productivity': 20,
          'finance': 15,
          'social networking': 45,
        },
      },
      aiPromptHints: [
        'game characters',
        'immersive visuals',
        'gradient backgrounds',
        'action scenes',
        'decorative fonts',
      ],
    });
  }

  /**
   * Get theme by ID
   * @param themeId - Theme identifier
   * @returns Theme or null if not found
   */
  public static getTheme(themeId: string): CreativeTheme | null {
    this.initializeRegistries();
    return this.themes.get(themeId) || null;
  }

  /**
   * Get all themes
   * @returns Array of all themes
   */
  public static getAllThemes(): CreativeTheme[] {
    this.initializeRegistries();
    return Array.from(this.themes.values());
  }

  /**
   * Get themes best suited for a specific category
   * @param category - App category (e.g., 'games', 'productivity')
   * @returns Array of themes sorted by category fit score (descending)
   */
  public static getThemesForCategory(category: string): CreativeTheme[] {
    this.initializeRegistries();
    const normalizedCategory = category.toLowerCase();

    return Array.from(this.themes.values())
      .filter(theme => theme.categories.includes(normalizedCategory))
      .sort((a, b) => {
        const aFit = a.benchmarks.categoryFit[normalizedCategory] || 0;
        const bFit = b.benchmarks.categoryFit[normalizedCategory] || 0;
        return bFit - aFit;
      });
  }

  // ============================================
  // Metrics Registry
  // ============================================

  /**
   * Load metrics registry data
   * @private
   */
  private static loadMetrics(): void {
    // Visual Quality Metric
    this.metrics.set('visual_quality', {
      id: 'visual_quality',
      name: 'Visual Quality',
      description: 'Image resolution, clarity, and professional appearance',
      category: 'visual',
      weight: 0.3,
      elementTypes: ['screenshots', 'icon', 'preview-video'],
      scoringCriteria: {
        excellent: {
          min: 90,
          description: 'High-resolution, professional photography/renders, no artifacts',
        },
        good: {
          min: 75,
          description: 'Clear imagery, minor quality issues, good composition',
        },
        average: {
          min: 50,
          description: 'Acceptable quality, some pixelation or poor lighting',
        },
        poor: {
          min: 0,
          description: 'Low resolution, blurry, unprofessional appearance',
        },
      },
      calculationMethod: 'ai',
      aiPromptTemplate: `Analyze the visual quality of this screenshot:
- Resolution and clarity (sharp vs blurry)
- Professional appearance (polished vs amateur)
- Lighting and color balance
- Presence of compression artifacts
- Overall aesthetic appeal

Score from 0-100 and explain your rating.`,
      focusAreas: [
        { id: 'ui_clarity', description: 'UI is unobstructed and readable' },
        { id: 'contrast', description: 'Strong contrast between UI layers' },
        { id: 'resolution', description: 'High resolution with no pixelation' },
        { id: 'composition', description: 'Professional composition and framing' },
      ],
    });

    // Text Clarity Metric
    this.metrics.set('text_clarity', {
      id: 'text_clarity',
      name: 'Text Clarity',
      description: 'Readability, font choice, and text hierarchy',
      category: 'text',
      weight: 0.25,
      elementTypes: ['screenshots', 'description'],
      scoringCriteria: {
        excellent: {
          min: 90,
          description: 'Clear hierarchy, readable fonts, optimal size, good contrast',
        },
        good: {
          min: 75,
          description: 'Readable text, minor hierarchy issues, acceptable contrast',
        },
        average: {
          min: 50,
          description: 'Text present but small, weak hierarchy, low contrast',
        },
        poor: {
          min: 0,
          description: 'Illegible text, no hierarchy, poor contrast',
        },
      },
      calculationMethod: 'hybrid',
      aiPromptTemplate: `Analyze text clarity in this screenshot:
- Font readability at thumbnail size
- Text hierarchy and emphasis
- Color contrast (text vs background)
- Amount of text (too much vs too little)
- Multilingual considerations

Score from 0-100 and provide improvement suggestions.`,
      focusAreas: [
        { id: 'readability', description: 'Text is legible at all sizes' },
        { id: 'hierarchy', description: 'Clear visual hierarchy in text elements' },
        { id: 'text_contrast', description: 'Strong contrast between text and background' },
        { id: 'density', description: 'Appropriate text density (not too cluttered)' },
      ],
    });

    // CTA Effectiveness Metric
    this.metrics.set('cta_effectiveness', {
      id: 'cta_effectiveness',
      name: 'CTA Effectiveness',
      description: 'Presence and clarity of call-to-action elements',
      category: 'engagement',
      weight: 0.2,
      elementTypes: ['screenshots'],
      scoringCriteria: {
        excellent: {
          min: 90,
          description: 'Clear, prominent CTA with action-oriented language',
        },
        good: {
          min: 75,
          description: 'CTA present, somewhat visible, decent copy',
        },
        average: {
          min: 50,
          description: 'Weak CTA, unclear action, low visibility',
        },
        poor: {
          min: 0,
          description: 'No CTA or completely ineffective',
        },
      },
      calculationMethod: 'ai',
      aiPromptTemplate: `Analyze call-to-action effectiveness:
- Is there a clear CTA button/element?
- How prominent is it? (size, color, position)
- Does the text clearly state the action?
- Does it create urgency or value proposition?
- Would a user understand what to do next?

Score from 0-100.`,
      focusAreas: [
        { id: 'cta_visibility', description: 'CTA is prominent and easily spotted' },
        { id: 'action_clarity', description: 'Action is clear and compelling' },
        { id: 'placement', description: 'CTA is positioned strategically' },
        { id: 'urgency', description: 'Creates sense of urgency or value' },
      ],
    });

    // Message Consistency Metric
    this.metrics.set('message_consistency', {
      id: 'message_consistency',
      name: 'Message Consistency',
      description: 'Alignment between screenshots and app description',
      category: 'messaging',
      weight: 0.25,
      elementTypes: ['screenshots', 'description'],
      scoringCriteria: {
        excellent: {
          min: 90,
          description: 'Perfect alignment, consistent value proposition across all elements',
        },
        good: {
          min: 75,
          description: 'Good alignment, minor inconsistencies in messaging',
        },
        average: {
          min: 50,
          description: 'Some alignment, noticeable gaps between visuals and text',
        },
        poor: {
          min: 0,
          description: 'Conflicting messages, no clear value proposition',
        },
      },
      calculationMethod: 'ai',
      aiPromptTemplate: `Analyze message consistency across creative elements:
- Do screenshots match description's value proposition?
- Is the core benefit clearly communicated everywhere?
- Are feature highlights consistent?
- Does visual storytelling align with text narrative?
- Any conflicting or confusing messages?

Score from 0-100.`,
      focusAreas: [
        { id: 'value_alignment', description: 'Value proposition is consistent across all elements' },
        { id: 'feature_consistency', description: 'Features are highlighted consistently' },
        { id: 'narrative_flow', description: 'Visual storytelling aligns with text narrative' },
        { id: 'brand_voice', description: 'Brand voice is consistent throughout' },
      ],
    });
  }

  /**
   * Get metric by ID
   * @param metricId - Metric identifier
   * @returns Metric or null if not found
   */
  public static getMetric(metricId: string): CreativeMetric | null {
    this.initializeRegistries();
    return this.metrics.get(metricId) || null;
  }

  /**
   * Get all metrics
   * @returns Array of all metrics
   */
  public static getAllMetrics(): CreativeMetric[] {
    this.initializeRegistries();
    return Array.from(this.metrics.values());
  }

  /**
   * Get metrics by category
   * @param category - Metric category (visual, text, messaging, engagement)
   * @returns Array of metrics in the specified category
   */
  public static getMetricsByCategory(category: 'visual' | 'text' | 'messaging' | 'engagement'): CreativeMetric[] {
    this.initializeRegistries();
    return Array.from(this.metrics.values()).filter(metric => metric.category === category);
  }

  // ============================================
  // Validators Registry
  // ============================================

  /**
   * Load validators registry data
   * @private
   */
  private static loadValidators(): void {
    // Screenshot Count Validator
    this.validators.set('screenshot_count', {
      id: 'screenshot_count',
      name: 'Screenshot Count Check',
      description: 'Validates optimal number of screenshots (8-10 recommended)',
      severity: 'warning',
      category: 'best-practice',
      elementTypes: ['screenshots'],
      validate: (element: CreativeElement): ValidationResult => {
        const count = element.screenshots?.length || 0;
        if (count >= 8 && count <= 10) {
          return {
            passed: true,
            score: 100,
            message: `Perfect! You have ${count} screenshots (optimal range: 8-10)`,
          };
        } else if (count >= 5 && count < 8) {
          return {
            passed: false,
            score: 75,
            message: `You have ${count} screenshots. Consider adding ${8 - count} more for maximum impact.`,
            suggestion: 'Add screenshots highlighting additional features or use cases',
          };
        } else if (count < 5) {
          return {
            passed: false,
            score: 40,
            message: `Critical: Only ${count} screenshots. Add at least ${5 - count} more.`,
            suggestion: 'Showcase key features, benefits, and user testimonials',
          };
        } else {
          return {
            passed: false,
            score: 85,
            message: `You have ${count} screenshots (more than recommended 10). Consider removing ${count - 10} to focus on strongest visuals.`,
            suggestion: 'Keep only the most compelling and diverse screenshots',
          };
        }
      },
      autoFixAvailable: false,
    });

    // Resolution Check Validator
    this.validators.set('resolution_check', {
      id: 'resolution_check',
      name: 'Image Resolution Check',
      description: 'Validates screenshots meet minimum resolution requirements',
      severity: 'critical',
      category: 'technical',
      elementTypes: ['screenshots', 'icon'],
      validate: (element: CreativeElement): ValidationResult => {
        const minWidth = element.type === 'icon' ? 1024 : 1242;
        const minHeight = element.type === 'icon' ? 1024 : 2688;

        if ((element.width || 0) >= minWidth && (element.height || 0) >= minHeight) {
          return {
            passed: true,
            score: 100,
            message: `Resolution validated: ${element.width}x${element.height}`,
          };
        } else {
          return {
            passed: false,
            score: 0,
            message: `Resolution too low: ${element.width || 0}x${element.height || 0}. Minimum: ${minWidth}x${minHeight}`,
            suggestion: `Use high-resolution images (at least ${minWidth}x${minHeight})`,
          };
        }
      },
      autoFixAvailable: false,
    });

    // Description Length Validator
    this.validators.set('text_length', {
      id: 'text_length',
      name: 'Description Length Check',
      description: 'Validates description uses optimal character count',
      severity: 'warning',
      category: 'content',
      elementTypes: ['description'],
      validate: (element: CreativeElement): ValidationResult => {
        const length = element.description?.length || 0;
        const maxLength = 4000;
        const optimalMin = 1000;

        if (length >= optimalMin && length <= maxLength) {
          return {
            passed: true,
            score: 100,
            message: `Description length optimal: ${length} characters (${maxLength} max)`,
          };
        } else if (length < optimalMin) {
          return {
            passed: false,
            score: 60,
            message: `Description is short: ${length} characters. Consider adding ${optimalMin - length} more for better SEO.`,
            suggestion: 'Add feature details, benefits, use cases, and keywords',
          };
        } else {
          return {
            passed: true,
            score: 95,
            message: `Description is ${length} characters (${maxLength} max). Well-utilized!`,
          };
        }
      },
      autoFixAvailable: false,
    });

    // Theme-Category Fit Validator
    this.validators.set('theme_category_fit', {
      id: 'theme_category_fit',
      name: 'Theme-Category Fit Check',
      description: 'Validates creative theme matches app category expectations',
      severity: 'info',
      category: 'best-practice',
      elementTypes: ['screenshots'],
      validate: (element: CreativeElement): ValidationResult => {
        const theme = element.detectedTheme;
        const category = element.appCategory;

        if (!theme || !category) {
          return {
            passed: true,
            score: 100,
            message: 'Theme detection pending',
          };
        }

        const themeData = this.getTheme(theme.id);
        const fitScore = themeData?.benchmarks.categoryFit[category.toLowerCase()] || 50;

        if (fitScore >= 80) {
          return {
            passed: true,
            score: 100,
            message: `Excellent theme fit: ${theme.name} matches ${category} category expectations (${fitScore}% fit)`,
          };
        } else if (fitScore >= 60) {
          return {
            passed: true,
            score: 75,
            message: `Good theme fit: ${theme.name} works for ${category} (${fitScore}% fit)`,
          };
        } else {
          const suggestedThemes = this.getThemesForCategory(category)
            .slice(0, 3)
            .map(t => t.name)
            .join(', ');
          return {
            passed: false,
            score: 40,
            message: `Theme mismatch: ${theme.name} has low fit for ${category} (${fitScore}% fit).`,
            suggestion: `Top themes for ${category}: ${suggestedThemes}`,
          };
        }
      },
      autoFixAvailable: false,
    });
  }

  /**
   * Get validator by ID
   * @param validatorId - Validator identifier
   * @returns Validator or null if not found
   */
  public static getValidator(validatorId: string): CreativeValidator | null {
    this.initializeRegistries();
    return this.validators.get(validatorId) || null;
  }

  /**
   * Get all validators
   * @returns Array of all validators
   */
  public static getAllValidators(): CreativeValidator[] {
    this.initializeRegistries();
    return Array.from(this.validators.values());
  }

  /**
   * Get validators for specific element type
   * @param elementType - Type of element to validate
   * @returns Array of applicable validators
   */
  public static getValidatorsForElement(
    elementType: 'screenshots' | 'icon' | 'preview-video' | 'description'
  ): CreativeValidator[] {
    this.initializeRegistries();
    return Array.from(this.validators.values()).filter(validator =>
      validator.elementTypes.includes(elementType)
    );
  }

  // ============================================
  // Scoring Rubrics Registry
  // ============================================

  /**
   * Load scoring rubrics registry data
   * @private
   */
  private static loadScoringRubrics(): void {
    // Games Rubric
    this.rubrics.set('games', {
      category: 'games',
      weights: {
        visual: 0.45,
        text: 0.15,
        messaging: 0.20,
        engagement: 0.20,
      },
      themePreferences: ['gaming', 'bold', 'minimal', 'professional'],
      minRequirements: {
        screenshotCount: 8,
        descriptionLength: 800,
        iconResolution: [1024, 1024],
      },
      competitiveThresholds: {
        excellent: 90,
        good: 78,
        average: 65,
      },
    });

    // Productivity Rubric
    this.rubrics.set('productivity', {
      category: 'productivity',
      weights: {
        visual: 0.25,
        text: 0.35,
        messaging: 0.30,
        engagement: 0.10,
      },
      themePreferences: ['minimal', 'professional', 'bold', 'gaming'],
      minRequirements: {
        screenshotCount: 6,
        descriptionLength: 1200,
        iconResolution: [1024, 1024],
      },
      competitiveThresholds: {
        excellent: 85,
        good: 75,
        average: 70,
      },
    });

    // Social Networking Rubric
    this.rubrics.set('social networking', {
      category: 'social networking',
      weights: {
        visual: 0.40,
        text: 0.20,
        messaging: 0.25,
        engagement: 0.15,
      },
      themePreferences: ['bold', 'minimal', 'professional', 'gaming'],
      minRequirements: {
        screenshotCount: 8,
        descriptionLength: 600,
        iconResolution: [1024, 1024],
      },
      competitiveThresholds: {
        excellent: 88,
        good: 77,
        average: 68,
      },
    });

    // Entertainment Rubric
    this.rubrics.set('entertainment', {
      category: 'entertainment',
      weights: {
        visual: 0.40,
        text: 0.20,
        messaging: 0.25,
        engagement: 0.15,
      },
      themePreferences: ['bold', 'minimal', 'professional', 'gaming'],
      minRequirements: {
        screenshotCount: 7,
        descriptionLength: 700,
        iconResolution: [1024, 1024],
      },
      competitiveThresholds: {
        excellent: 87,
        good: 76,
        average: 67,
      },
    });

    // Education Rubric
    // Education apps depend heavily on text clarity and pedagogy-focused messaging.
    // Screenshots should emphasize structured learning, progress indicators, and method clarity.
    // Visual quality should support trust, but not overshadow clarity of instruction.
    this.rubrics.set('education', {
      category: 'education',
      weights: {
        visual: 0.30,      // Visual polish matters, but not as high as games
        text: 0.35,        // Education relies on clarity + information density
        messaging: 0.25,   // Important for positioning & differentiation
        engagement: 0.10,  // CTAs matter but are less central
      },
      themePreferences: ['professional', 'minimal', 'bold', 'gaming'],
      minRequirements: {
        screenshotCount: 7,
        descriptionLength: 1000,  // Education apps need detailed explanations
        iconResolution: [1024, 1024],
      },
      competitiveThresholds: {
        excellent: 86,
        good: 76,
        average: 68,
      },
    });

    // Finance Rubric
    this.rubrics.set('finance', {
      category: 'finance',
      weights: {
        visual: 0.30,
        text: 0.30,
        messaging: 0.30,
        engagement: 0.10,
      },
      themePreferences: ['professional', 'minimal', 'bold', 'gaming'],
      minRequirements: {
        screenshotCount: 6,
        descriptionLength: 1000,
        iconResolution: [1024, 1024],
      },
      competitiveThresholds: {
        excellent: 86,
        good: 75,
        average: 68,
      },
    });

    // Default Rubric (fallback for unknown categories)
    this.rubrics.set('default', {
      category: 'default',
      weights: {
        visual: 0.35,
        text: 0.25,
        messaging: 0.25,
        engagement: 0.15,
      },
      themePreferences: ['minimal', 'professional', 'bold', 'gaming'],
      minRequirements: {
        screenshotCount: 7,
        descriptionLength: 800,
        iconResolution: [1024, 1024],
      },
      competitiveThresholds: {
        excellent: 85,
        good: 75,
        average: 65,
      },
    });
  }

  /**
   * Get scoring rubric for a specific category
   * @param category - App category
   * @returns Scoring rubric or default rubric if category not found
   */
  public static getScoringRubric(category: string): CategoryScoringRubric {
    this.initializeRegistries();
    const normalizedCategory = category.toLowerCase();
    return this.rubrics.get(normalizedCategory) || this.rubrics.get('default')!;
  }

  /**
   * Get all scoring rubrics
   * @returns Array of all rubrics
   */
  public static getAllScoringRubrics(): CategoryScoringRubric[] {
    this.initializeRegistries();
    return Array.from(this.rubrics.values());
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Get all available categories with rubrics
   * @returns Array of category names
   */
  public static getAvailableCategories(): string[] {
    this.initializeRegistries();
    return Array.from(this.rubrics.keys()).filter(key => key !== 'default');
  }

  /**
   * Calculate weighted score based on category-specific weights
   * @param category - App category
   * @param scores - Score breakdown by metric category
   * @returns Weighted overall score (0-100)
   */
  public static calculateWeightedScore(
    category: string,
    scores: {
      visual: number;
      text: number;
      messaging: number;
      engagement: number;
    }
  ): number {
    const rubric = this.getScoringRubric(category);

    const weighted =
      scores.visual * rubric.weights.visual +
      scores.text * rubric.weights.text +
      scores.messaging * rubric.weights.messaging +
      scores.engagement * rubric.weights.engagement;

    // Clamp score to 0-100 range
    const clamped = Math.max(0, Math.min(100, weighted));

    return Math.round(clamped);
  }

  /**
   * Get performance tier based on score and category
   * @param category - App category
   * @param score - Overall score (0-100)
   * @returns Performance tier (excellent, good, average, poor)
   */
  public static getPerformanceTier(category: string, score: number): PerformanceTier {
    const rubric = this.getScoringRubric(category);

    if (score >= rubric.competitiveThresholds.excellent) return 'excellent';
    if (score >= rubric.competitiveThresholds.good) return 'good';
    if (score >= rubric.competitiveThresholds.average) return 'average';
    return 'poor';
  }

  /**
   * Get registry version
   * @returns Version string
   */
  public static getVersion(): string {
    return this.REGISTRY_VERSION;
  }
}
