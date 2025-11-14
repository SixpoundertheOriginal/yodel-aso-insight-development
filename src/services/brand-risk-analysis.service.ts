/**
 * Brand Risk Analysis Service
 * Analyzes brand keyword dependency and identifies ASO vulnerabilities
 */

export interface BrandRiskAnalysis {
  brandKeywordCount: number;
  totalKeywords: number;
  brandDependencyRatio: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  brandKeywords: string[];
  genericKeywords: string[];
  recommendations: string[];
  impactAssessment: string;
}

class BrandRiskAnalysisService {
  /**
   * Analyze brand dependency across keyword portfolio
   */
  analyzeBrandDependency(
    keywords: string[],
    brandName: string,
    appName?: string
  ): BrandRiskAnalysis {
    console.log('🔍 [BRAND-RISK] Analyzing dependency for brand:', brandName);

    // Normalize brand identifiers
    const brandTerms = this.extractBrandTerms(brandName, appName);

    // Classify keywords
    const brandKeywords: string[] = [];
    const genericKeywords: string[] = [];

    keywords.forEach(keyword => {
      if (this.isBrandKeyword(keyword, brandTerms)) {
        brandKeywords.push(keyword);
      } else {
        genericKeywords.push(keyword);
      }
    });

    // Calculate metrics
    const totalKeywords = keywords.length;
    const brandKeywordCount = brandKeywords.length;
    const brandDependencyRatio = totalKeywords > 0 ? brandKeywordCount / totalKeywords : 0;

    // Determine risk level
    const riskLevel = this.calculateRiskLevel(brandDependencyRatio);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      brandDependencyRatio,
      riskLevel,
      genericKeywords.length
    );

    // Impact assessment
    const impactAssessment = this.assessImpact(
      brandDependencyRatio,
      riskLevel,
      totalKeywords
    );

    console.log('✅ [BRAND-RISK] Analysis complete:', {
      brandKeywordCount,
      totalKeywords,
      ratio: (brandDependencyRatio * 100).toFixed(1) + '%',
      riskLevel
    });

    return {
      brandKeywordCount,
      totalKeywords,
      brandDependencyRatio,
      riskLevel,
      brandKeywords,
      genericKeywords,
      recommendations,
      impactAssessment
    };
  }

  /**
   * Extract brand terms from brand name and app name
   */
  private extractBrandTerms(brandName: string, appName?: string): string[] {
    const terms = new Set<string>();

    // Add brand name variations
    const brandLower = brandName.toLowerCase().trim();
    terms.add(brandLower);

    // Add individual words from brand name (if multi-word)
    brandLower.split(/\s+/).forEach(word => {
      if (word.length > 2) { // Ignore very short words like "app", "the"
        terms.add(word);
      }
    });

    // Add app name variations if different from brand
    if (appName && appName.toLowerCase() !== brandLower) {
      const appLower = appName.toLowerCase().trim();
      terms.add(appLower);

      appLower.split(/\s+/).forEach(word => {
        if (word.length > 2) {
          terms.add(word);
        }
      });
    }

    return Array.from(terms);
  }

  /**
   * Determine if a keyword is brand-related
   */
  private isBrandKeyword(keyword: string, brandTerms: string[]): boolean {
    const keywordLower = keyword.toLowerCase();

    return brandTerms.some(term => {
      // Exact match
      if (keywordLower === term) return true;

      // Contains brand term as a distinct word
      const wordRegex = new RegExp(`\\b${this.escapeRegex(term)}\\b`, 'i');
      if (wordRegex.test(keywordLower)) return true;

      // Brand term at start or end of keyword
      if (keywordLower.startsWith(term + ' ') || keywordLower.endsWith(' ' + term)) {
        return true;
      }

      return false;
    });
  }

  /**
   * Escape regex special characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Calculate risk level based on brand dependency ratio
   */
  private calculateRiskLevel(ratio: number): BrandRiskAnalysis['riskLevel'] {
    if (ratio >= 0.7) return 'CRITICAL';  // 70%+ brand keywords
    if (ratio >= 0.5) return 'HIGH';      // 50-69% brand keywords
    if (ratio >= 0.3) return 'MEDIUM';    // 30-49% brand keywords
    return 'LOW';                         // <30% brand keywords
  }

  /**
   * Generate risk-appropriate recommendations
   */
  private generateRecommendations(
    ratio: number,
    riskLevel: BrandRiskAnalysis['riskLevel'],
    genericCount: number
  ): string[] {
    const recommendations: string[] = [];

    if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') {
      recommendations.push(
        'URGENT: Diversify keyword portfolio immediately - over-reliance on brand search severely limits discoverability'
      );
      recommendations.push(
        'Target 20-30 high-volume generic keywords related to your app category and core features'
      );
      recommendations.push(
        'Research competitor keywords to identify discovery opportunities you\'re missing'
      );
      recommendations.push(
        'Add problem-solving keywords that capture user intent (e.g., "how to...", "best app for...")'
      );
    }

    if (riskLevel === 'MEDIUM') {
      recommendations.push(
        'Expand generic keyword coverage to reduce brand dependency risk'
      );
      recommendations.push(
        'Target category-level keywords to capture broader search intent'
      );
      recommendations.push(
        'Monitor keyword performance to ensure balanced traffic sources'
      );
    }

    if (riskLevel === 'LOW') {
      recommendations.push(
        'Maintain healthy balance between branded and generic keywords'
      );
      recommendations.push(
        'Continue expanding generic keyword coverage incrementally'
      );
    }

    if (genericCount < 15) {
      recommendations.push(
        'Expand total keyword portfolio - current coverage is too narrow for optimal discoverability'
      );
    }

    // Always include monitoring recommendation
    recommendations.push(
      'Track brand vs. generic keyword performance monthly to maintain strategic balance'
    );

    return recommendations;
  }

  /**
   * Assess impact of current brand dependency
   */
  private assessImpact(
    ratio: number,
    riskLevel: BrandRiskAnalysis['riskLevel'],
    totalKeywords: number
  ): string {
    const percentage = (ratio * 100).toFixed(0);

    if (riskLevel === 'CRITICAL') {
      return `CRITICAL RISK: ${percentage}% brand dependency means your app is almost entirely invisible to users who don't already know your brand name. New user acquisition through organic search is severely limited. This represents a major growth constraint.`;
    }

    if (riskLevel === 'HIGH') {
      return `HIGH RISK: ${percentage}% brand dependency indicates over-reliance on brand awareness for app discovery. Users searching for solutions (rather than your specific brand) are unlikely to find your app. This limits organic growth potential significantly.`;
    }

    if (riskLevel === 'MEDIUM') {
      return `MODERATE RISK: ${percentage}% brand dependency is approaching concerning levels. While you have some generic keyword coverage, expanding into category and problem-solving keywords would strengthen discoverability and reduce dependency on brand awareness.`;
    }

    return `LOW RISK: ${percentage}% brand dependency represents a healthy balance between branded and generic search visibility. Your app can be discovered both by users familiar with your brand and those searching for solutions. ${totalKeywords < 30 ? 'Consider expanding total keyword coverage for even better discoverability.' : 'Continue monitoring to maintain this balance.'}`;
  }

  /**
   * Calculate keyword distribution insights
   */
  calculateKeywordDistribution(keywords: string[]): {
    shortTail: number;    // 1-2 words
    mediumTail: number;   // 3-4 words
    longTail: number;     // 5+ words
  } {
    let shortTail = 0;
    let mediumTail = 0;
    let longTail = 0;

    keywords.forEach(keyword => {
      const wordCount = keyword.trim().split(/\s+/).length;

      if (wordCount <= 2) shortTail++;
      else if (wordCount <= 4) mediumTail++;
      else longTail++;
    });

    return { shortTail, mediumTail, longTail };
  }

  /**
   * Identify keyword gaps based on best practices
   */
  identifyKeywordGaps(
    currentKeywords: string[],
    appCategory: string
  ): {
    missingCategories: string[];
    recommendedCount: number;
    diversificationOpportunities: string[];
  } {
    const missingCategories: string[] = [];
    const diversificationOpportunities: string[] = [];

    // Check for category keywords
    if (!currentKeywords.some(k => k.toLowerCase().includes(appCategory.toLowerCase()))) {
      missingCategories.push('Category keywords');
      diversificationOpportunities.push(`Add "${appCategory}" and related category terms`);
    }

    // Check for feature keywords
    const hasFeatureKeywords = currentKeywords.some(k =>
      /feature|function|capability|tool/.test(k.toLowerCase())
    );
    if (!hasFeatureKeywords) {
      missingCategories.push('Feature-based keywords');
      diversificationOpportunities.push('Target keywords describing core features and capabilities');
    }

    // Check for problem-solving keywords
    const hasProblemKeywords = currentKeywords.some(k =>
      /how to|best|top|solution|help|manage/.test(k.toLowerCase())
    );
    if (!hasProblemKeywords) {
      missingCategories.push('Problem-solving keywords');
      diversificationOpportunities.push('Add "how to..." and "best..." variations to capture user intent');
    }

    // Recommend optimal keyword count (50-80 is ideal)
    const recommendedCount = Math.max(50, currentKeywords.length + 20);

    return {
      missingCategories,
      recommendedCount,
      diversificationOpportunities
    };
  }
}

export const brandRiskAnalysisService = new BrandRiskAnalysisService();
