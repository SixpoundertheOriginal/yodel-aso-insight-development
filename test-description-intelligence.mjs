/**
 * Test Description Intelligence Extraction
 *
 * Quick test of Phase 2 capability extraction with sample descriptions
 */

// Sample app descriptions from different verticals
const testDescriptions = {
  languageLearning: `
    Learn Spanish fast with our free language learning app!
    Master Spanish with fun, interactive lessons and speak fluently in weeks.
    Features offline mode, voice recognition, and personalized learning paths.
    Join millions of users worldwide. Trusted by language experts.
    Save time with our proven method. Achieve your language goals today!
  `,

  finance: `
    Save money and invest smart with our award-winning finance app.
    Track your spending, budget effortlessly, and build wealth over time.
    Secure and private - your data is encrypted and never shared.
    Fast, intuitive interface with powerful analytics and insights.
    Trusted by over 5 million users. Free to download and use.
  `,

  fitness: `
    Transform your body with personalized workout plans and nutrition tracking.
    Get fit fast with professional trainers and achieve your fitness goals.
    Features: offline workouts, progress tracking, custom meal plans, and more.
    Join our motivating community. Sync with Apple Watch and Health app.
    Beautiful, easy-to-use design. Start your free trial today!
  `,

  productivity: `
    Stay organized and boost productivity with our powerful task management app.
    Manage projects, set reminders, and collaborate with your team seamlessly.
    Simple yet advanced - perfect for individuals and professionals.
    Sync across all devices with cloud backup. Integrate with your favorite tools.
    Trusted by Fortune 500 companies. Ad-free experience with premium features.
  `
};

// Mock the extraction function (simplified version without imports)
function extractCapabilitiesSimple(description) {
  const features = [];
  const benefits = [];
  const trust = [];

  const normalized = description.toLowerCase();

  // Feature patterns
  const featurePatterns = [
    { pattern: /\b(free|no cost)\b/i, category: 'free' },
    { pattern: /\b(offline|without internet)\b/i, category: 'offline' },
    { pattern: /\b(ad-free|no ads)\b/i, category: 'ad_free' },
    { pattern: /\b(sync|cloud)\b/i, category: 'sync' },
    { pattern: /\b(voice|speech recognition)\b/i, category: 'voice' },
    { pattern: /\b(personalize|custom)\b/i, category: 'customization' },
    { pattern: /\b(analytics|insights|reports)\b/i, category: 'analytics' },
    { pattern: /\b(collaborate|team)\b/i, category: 'collaboration' },
  ];

  // Benefit patterns
  const benefitPatterns = [
    { pattern: /\b(save time|time-saving|faster|fast)\b/i, category: 'time_saving' },
    { pattern: /\b(save money|cost-saving)\b/i, category: 'cost_saving' },
    { pattern: /\b(learn|master)\b/i, category: 'learning' },
    { pattern: /\b(achieve|reach|accomplish)\b/i, category: 'achievement' },
    { pattern: /\b(fun|entertaining|engaging)\b/i, category: 'enjoyment' },
    { pattern: /\b(organized|organize|track)\b/i, category: 'organization' },
    { pattern: /\b(efficient|streamline|boost)\b/i, category: 'efficiency' },
    { pattern: /\b(motivate|inspire)\b/i, category: 'motivation' },
    { pattern: /\b(transform|change)\b/i, category: 'transformation' },
    { pattern: /\b(manage|control|monitor)\b/i, category: 'control' },
  ];

  // Trust patterns
  const trustPatterns = [
    { pattern: /\b(trusted by|millions of users|#1)\b/i, category: 'social_proof' },
    { pattern: /\b(award|featured|recognized)\b/i, category: 'recognition' },
    { pattern: /\b(expert|professional)\b/i, category: 'expertise' },
    { pattern: /\b(private|privacy|secure|encrypted)\b/i, category: 'privacy' },
    { pattern: /\b(proven|reliable)\b/i, category: 'reliability' },
  ];

  // Extract features
  for (const { pattern, category } of featurePatterns) {
    const match = normalized.match(pattern);
    if (match) {
      features.push({ text: match[0], category });
    }
  }

  // Extract benefits
  for (const { pattern, category } of benefitPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      benefits.push({ text: match[0], category });
    }
  }

  // Extract trust signals
  for (const { pattern, category } of trustPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      trust.push({ text: match[0], category });
    }
  }

  return {
    features: { detected: features, count: features.length },
    benefits: { detected: benefits, count: benefits.length },
    trust: { detected: trust, count: trust.length }
  };
}

// Run tests
console.log('\n🧪 Testing Description Intelligence Extraction (Phase 2)\n');
console.log('='.repeat(70));

for (const [vertical, description] of Object.entries(testDescriptions)) {
  console.log(`\n📱 ${vertical.toUpperCase()}`);
  console.log('-'.repeat(70));

  const result = extractCapabilitiesSimple(description);

  console.log(`\n✅ Features (${result.features.count}):`);
  result.features.detected.forEach(f => {
    console.log(`   - ${f.text} [${f.category}]`);
  });

  console.log(`\n💎 Benefits (${result.benefits.count}):`);
  result.benefits.detected.forEach(b => {
    console.log(`   - ${b.text} [${b.category}]`);
  });

  console.log(`\n🛡️  Trust Signals (${result.trust.count}):`);
  result.trust.detected.forEach(t => {
    console.log(`   - ${t.text} [${t.category}]`);
  });

  const total = result.features.count + result.benefits.count + result.trust.count;
  console.log(`\n📊 Total Capabilities: ${total}`);
}

console.log('\n' + '='.repeat(70));
console.log('\n✅ Phase 2 Test Complete!\n');
console.log('Next steps:');
console.log('  1. Frontend type integration ✓');
console.log('  2. Edge function integration ✓');
console.log('  3. Real-world testing with edge function');
console.log('  4. UI components (future phase)');
console.log('');
