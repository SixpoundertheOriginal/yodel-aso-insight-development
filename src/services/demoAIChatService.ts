import type { MetricsData, FilterContext } from '@/types/aso';

interface DemoResponseTemplate {
  keywords: string[];
  responses: string[];
  requiresData?: boolean;
}

export class DemoAIChatService {
  // Security: Real client app names that must NEVER appear in demo responses
  private static readonly PROHIBITED_APP_NAMES = [
    'Mixbook', 'AppSeven', 'AppTwo', 'AppFour', 'AppOne', 'AppSix', 'AppThree', 'AppFive'
  ];

  // Safe demo app names for replacement
  private static readonly SAFE_DEMO_APPS = [
    'DemoApp_ProductivitySuite', 'DemoApp_FitnessTracker', 'DemoApp_SocialNetwork', 
    'DemoApp_GamePlatform', 'DemoApp_EcommercePro'
  ];

  private static readonly DEMO_RESPONSES: Record<string, DemoResponseTemplate> = {
    performance: {
      keywords: ['kpi', 'performance', 'metrics', 'top', 'best', 'winning', 'successful'],
      responses: [
        `# 📊 **Your App Performance Overview**

Based on your current **demo data** for ${new Date().toLocaleDateString('en-US', { month: 'long' })}, here are the key highlights:

## 🚀 **Top Performing KPIs**
- **Downloads**: ~45K total downloads with strong **App Store Search** performance
- **Conversion Rate**: Averaging **3.8%** across traffic sources 
- **Revenue**: $127K generated from your demo app portfolio
- **Impressions**: 1.2M+ total impressions driving solid visibility

## 💡 **Key Insights**
- **Apple Search Ads** showing highest conversion rates at **4.5%**
- **App Store Browse** traffic growing **15%** week-over-week
- **DemoApp_ProductivitySuite** leading in revenue generation
`
      ],
      requiresData: true
    },

    traffic: {
      keywords: ['traffic', 'source', 'channel', 'acquisition', 'roi', 'highest'],
      responses: [
        `# 🎯 **Traffic Source Performance Analysis**

## 📈 **Top Performing Channels**

| Traffic Source | Downloads | CVR | Revenue Impact |
|----------------|-----------|-----|----------------|
| Apple Search Ads | 12,500 | 4.5% | $34K |
| App Store Search | 18,200 | 3.5% | $48K |
| App Referrer | 8,900 | 5.5% | $28K |

## 🔍 **Strategic Recommendations**
- **Apple Search Ads**: Continue investing - highest quality traffic
- **App Store Search**: Optimize metadata for better organic visibility  
- **App Referrer**: Explore partnership opportunities to scale this channel

## 💰 **ROI Insights**
App Referrer traffic shows the **highest conversion rate** at 5.5%, indicating strong user intent from referral sources.
`
      ],
      requiresData: true
    },

    optimization: {
      keywords: ['optimize', 'improve', 'conversion', 'funnel', 'increase', 'boost', 'enhance'],
      responses: [
        `# ⚡ **Optimization Opportunities**

## 🎯 **Conversion Funnel Analysis**
Based on your demo data, here are immediate optimization opportunities:

### **1. Metadata Optimization**
- Your **App Store Search** CVR of 3.5% has room for improvement
- **Recommendation**: A/B test your app title and subtitle
- **Potential Impact**: +15-20% conversion lift

### **2. Creative Asset Performance**  
- Screenshots showing **varied engagement** across traffic sources
- **Action Item**: Test lifestyle-focused screenshots for Browse traffic

### **3. Traffic Source Balancing**
- **Apple Search Ads** performing well but represents only 28% of volume
- **Opportunity**: Scale ASA budget for higher-converting keywords

## 📊 **Expected Outcomes**
Implementing these optimizations could drive:
- **+25% overall conversion rate improvement**
- **+$35K additional monthly revenue**
- **Enhanced organic visibility**
`
      ]
    },

    trends: {
      keywords: ['trend', 'pattern', 'growth', 'decline', 'change', 'over time', 'period'],
      responses: [
        `# 📈 **Trend Analysis & Insights**

## 🔍 **Key Patterns in Your Demo Data**

### **Growth Trends (Last 30 Days)**
- **Overall Downloads**: +18% month-over-month growth
- **Revenue Growth**: +22% driven by improved monetization
- **Impression Volume**: Steady 8% weekly growth

### **Traffic Source Trends**
- **🔥 App Store Browse**: +31% growth (fastest growing channel)
- **📱 Apple Search Ads**: Stable performance with quality traffic
- **🔗 App Referrer**: Seasonal uptick in conversion rates

## 🎯 **Opportunity Windows**
**This Week**: App Store Browse momentum - optimize for featured placement
**Next 2 Weeks**: ASA campaign expansion during high-conversion period

## ⚠️ **Watch Areas**
Monitor Web Referrer performance - showing slight softness that may need attention.
`
      ]
    },

    apps: {
      keywords: ['app', 'portfolio', 'compare', 'comparison', 'best app', 'which app'],
      responses: [
        `# 📱 **Demo App Portfolio Performance**

## 🏆 **Top Performing Apps**

### **1. DemoApp_ProductivitySuite** 
- **Revenue Leader**: $42K (33% of total)
- **Best CVR**: 4.2% average conversion rate
- **Strong in**: Apple Search Ads, App Store Search

### **2. DemoApp_FitnessTracker**
- **Volume Leader**: 15K downloads  
- **Growing Fast**: +28% month-over-month
- **Strength**: App Store Browse discovery

### **3. DemoApp_SocialNetwork**
- **Engagement Champion**: Highest user retention
- **Revenue**: $31K with premium subscriptions
- **Best Channel**: App Referrer (viral growth)

## 📊 **Portfolio Strategy**
- **Focus**: Scale ProductivitySuite marketing investment
- **Opportunity**: Expand FitnessTracker to capitalize on growth
- **Optimize**: SocialNetwork monetization improvements

*Portfolio analysis based on demo app data for evaluation.*`
      ]
    },

    general: {
      keywords: ['help', 'what', 'how', 'advice', 'strategy', 'recommendation'],
      responses: [
        `# 👋 **I'm Your Demo ASO Expert!**

I can help you analyze various aspects of your **demo app portfolio** performance:

## 🚀 **What I Can Analyze**
- **Performance Metrics** - KPIs, conversion rates, revenue
- **Traffic Sources** - Channel performance and ROI analysis  
- **App Comparisons** - Portfolio optimization insights
- **Growth Trends** - Pattern analysis and forecasting
- **Optimization** - Actionable improvement recommendations

## 💡 **Try Asking Me**
- *"What are my top performing KPIs this period?"*
- *"Which traffic source is driving the highest ROI?"*
- *"How can I optimize my conversion funnel?"*
- *"Show me trends in my app performance"*
- *"Compare performance across my demo apps"*

## 📊 **Demo Data Context**
I'm analyzing your **synthetic demo data** which includes:
- 5 demo apps across different categories
- 8 traffic sources with realistic performance metrics
- 30 days of comprehensive ASO data

**Ready to dive deep into your demo performance data?** Ask me anything!

*All insights based on demo data for platform evaluation purposes.*`
      ]
    }
  };

  static async generateDemoResponse(
    userQuestion: string,
    metricsData?: MetricsData,
    filterContext?: FilterContext
  ): Promise<string> {
    const question = userQuestion.toLowerCase();
    
    // Find the best matching response category
    const category = this.findBestCategory(question);
    const template = this.DEMO_RESPONSES[category];
    
    let response: string;
    
    // If the template requires data and we have it, try to personalize
    if (template.requiresData && metricsData && filterContext) {
      response = this.personalizeResponse(template.responses[0], metricsData, filterContext);
    } else {
      // Return a random response from the category
      const responses = template.responses;
      response = responses[Math.floor(Math.random() * responses.length)];
    }
    
    // CRITICAL: Sanitize response to remove any real app names
    return this.sanitizeResponse(response);
  }

  private static findBestCategory(question: string): string {
    let bestMatch = 'general';
    let maxMatches = 0;

    for (const [category, template] of Object.entries(this.DEMO_RESPONSES)) {
      const matches = template.keywords.filter(keyword => 
        question.includes(keyword.toLowerCase())
      ).length;
      
      if (matches > maxMatches) {
        maxMatches = matches;
        bestMatch = category;
      }
    }

    return bestMatch;
  }

  // CRITICAL SECURITY: Remove any real app names from responses
  private static sanitizeResponse(response: string): string {
    let sanitized = response;
    
    // Replace any prohibited app names with safe demo alternatives
    this.PROHIBITED_APP_NAMES.forEach((prohibitedName, index) => {
      const regex = new RegExp(prohibitedName, 'gi');
      const safeName = this.SAFE_DEMO_APPS[index % this.SAFE_DEMO_APPS.length];
      sanitized = sanitized.replace(regex, safeName);
    });
    
    // Fix table formatting for better rendering
    sanitized = this.fixTableFormatting(sanitized);
    
    return sanitized;
  }

  // Ensure tables have proper markdown formatting
  private static fixTableFormatting(content: string): string {
    // Replace any table separators with proper markdown alignment
    const fixedContent = content.replace(
      /\|\s*---\s*\|/g, 
      '|-------|'
    ).replace(
      /\|\s*-+\s*\|/g,
      (match) => {
        const cellCount = (match.match(/\|/g) || []).length - 1;
        return '|' + '-------|'.repeat(cellCount);
      }
    );
    
    return fixedContent;
  }

  private static personalizeResponse(
    response: string,
    metricsData: MetricsData,
    filterContext: FilterContext
  ): string {
    try {
      // Basic personalization with filter context
      let personalized = response;
      
      // Replace date references with actual filter dates
      const startDate = new Date(filterContext.dateRange.start);
      const endDate = new Date(filterContext.dateRange.end);
      const monthName = startDate.toLocaleDateString('en-US', { month: 'long' });
      
      personalized = personalized.replace(/\$\{month\}/g, monthName);
      
      // Add traffic source context if specific sources are selected
      // Removed persistent footers/notes for cleaner UX
      
      // Add demo app context if single app selected (never expose real app names)
      // Removed single-app demo footnote
      
      return personalized;
    } catch (error) {
      console.warn('Error personalizing demo response:', error);
      return response; // Return original if personalization fails
    }
  }

  // Generate context-aware welcome message for demo mode
  static generateDemoWelcomeMessage(filterContext: FilterContext): string {
    const startDate = new Date(filterContext.dateRange.start);
    const endDate = new Date(filterContext.dateRange.end);
    const dateRange = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
    
    const trafficText = filterContext.trafficSources && filterContext.trafficSources.length > 0 
      ? filterContext.trafficSources.join(', ')
      : 'all traffic sources';

    const welcomeMessage = `# 🎯 **Welcome to Your Demo ASO Command Center**

**I'm your AI-powered mobile marketing strategist**, ready to help you explore our platform capabilities using realistic demo data.

## 📊 **Current Demo Analysis Scope**
- **Traffic Sources:** ${trafficText}  
- **Time Period:** ${dateRange}
- **Demo Apps:** ProductivitySuite, FitnessTracker, SocialNetwork, GamePlatform, EcommercePro

## 🚀 **Demo Capabilities I Can Demonstrate**
- **Performance Analysis** - Deep dive into demo KPIs and metrics
- **Conversion Optimization** - Identify opportunities in demo data  
- **Traffic Source Insights** - Compare demo channel performance
- **Trend Analysis** - Spot patterns in synthetic data
- **Strategic Recommendations** - ASO best practices with demo context

## 💡 **Try These Demo Questions**
- *"What are my top performing KPIs in the demo?"*
- *"Which demo traffic source has the highest ROI?"*  
- *"How can I optimize conversion for my demo apps?"*
- *"Show me growth trends in the demo data"*

---

🎪 **This is a demo environment** with synthetic data designed to showcase our AI capabilities. Ready to explore what our platform can do for your real apps?`;

    // Sanitize welcome message to ensure no real app names appear
    return this.sanitizeResponse(welcomeMessage);
  }
}
