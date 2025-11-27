/**
 * Test Gap Analysis Engine
 *
 * Phase 3: Test capability gap detection with sample app descriptions
 */

// Mock capability extraction (simplified)
function mockExtractCapabilities(description) {
  const features = [];
  const benefits = [];
  const trust = [];

  const text = description.toLowerCase();

  // Detect features
  if (text.includes('offline')) features.push({ category: 'offline' });
  if (text.includes('voice')) features.push({ category: 'voice' });
  if (text.includes('personalized') || text.includes('custom')) features.push({ category: 'customization' });
  if (text.includes('free')) features.push({ category: 'free' });
  if (text.includes('sync') || text.includes('cloud')) features.push({ category: 'sync' });
  if (text.includes('budget') || text.includes('track spending')) features.push({ category: 'budget_tracking' });
  if (text.includes('secure') || text.includes('encrypted')) features.push({ category: 'secure' });
  if (text.includes('workout')) features.push({ category: 'workout_plans' });
  if (text.includes('progress')) features.push({ category: 'progress_tracking' });

  // Detect benefits
  if (text.includes('fluent') || text.includes('master')) benefits.push({ category: 'fluency' });
  if (text.includes('fast') || text.includes('quick')) benefits.push({ category: 'fast_learning' });
  if (text.includes('save money')) benefits.push({ category: 'save_money' });
  if (text.includes('build wealth')) benefits.push({ category: 'build_wealth' });
  if (text.includes('get fit') || text.includes('lose weight')) benefits.push({ category: 'get_fit' });
  if (text.includes('transform')) benefits.push({ category: 'transform' });
  if (text.includes('save time')) benefits.push({ category: 'save_time' });

  // Detect trust
  if (text.includes('millions') || text.includes('trusted by')) trust.push({ category: 'user_base' });
  if (text.includes('expert') || text.includes('professional')) trust.push({ category: 'professional' });
  if (text.includes('award') || text.includes('certified')) trust.push({ category: 'awards' });
  if (text.includes('private') || text.includes('secure')) trust.push({ category: 'privacy' });

  return {
    features: { detected: features, count: features.length, categories: features.map(f => f.category) },
    benefits: { detected: benefits, count: benefits.length, categories: benefits.map(b => b.category) },
    trust: { detected: trust, count: trust.length, categories: trust.map(t => t.category) },
  };
}

// Sample test cases
const testCases = [
  {
    vertical: 'language_learning',
    name: 'Complete Language App',
    description: `
      Learn Spanish fast with our free language learning app!
      Master Spanish with offline lessons, voice recognition, and personalized learning paths.
      Join millions of users worldwide. Trusted by language experts.
    `,
  },
  {
    vertical: 'language_learning',
    name: 'Incomplete Language App (Many Gaps)',
    description: `
      Learn a new language with our app. Easy to use and fun!
    `,
  },
  {
    vertical: 'finance',
    name: 'Complete Finance App',
    description: `
      Save money with our secure finance app. Track spending and budgets with bank-level encryption.
      Build wealth over time. Trusted by millions. Award-winning app with financial insights.
    `,
  },
  {
    vertical: 'finance',
    name: 'Incomplete Finance App (Missing Security)',
    description: `
      Track your budget and save money with our easy finance app.
      Build wealth and achieve financial freedom.
    `,
  },
  {
    vertical: 'fitness',
    name: 'Complete Fitness App',
    description: `
      Get fit fast with professional workout plans! Track your progress and transform your body.
      Custom meal plans and exercise routines. Join our community of millions.
    `,
  },
];

// Mock gap analysis (simplified)
function mockGapAnalysis(capabilityMap, vertical) {
  // Define what's expected for each vertical
  const benchmarks = {
    language_learning: {
      features: ['offline', 'voice', 'customization'],
      benefits: ['fluency', 'fast_learning'],
      trust: ['user_base'],
    },
    finance: {
      features: ['budget_tracking', 'secure', 'insights'],
      benefits: ['save_money', 'build_wealth'],
      trust: ['security'],
    },
    fitness: {
      features: ['workout_plans', 'progress_tracking'],
      benefits: ['get_fit', 'transform'],
      trust: ['professional'],
    },
  };

  const benchmark = benchmarks[vertical] || { features: [], benefits: [], trust: [] };

  // Count gaps
  const featureGaps = benchmark.features.filter(
    f => !capabilityMap.features.categories.includes(f)
  );
  const benefitGaps = benchmark.benefits.filter(
    b => !capabilityMap.benefits.categories.includes(b)
  );
  const trustGaps = benchmark.trust.filter(t => !capabilityMap.trust.categories.includes(t));

  const totalGaps = featureGaps.length + benefitGaps.length + trustGaps.length;
  const totalExpected =
    benchmark.features.length + benchmark.benefits.length + benchmark.trust.length;

  const coverageScore = totalExpected > 0 ? ((totalExpected - totalGaps) / totalExpected) * 100 : 100;

  // Count critical gaps (missing critical features/benefits)
  let criticalGaps = 0;
  if (vertical === 'language_learning') {
    if (featureGaps.includes('offline')) criticalGaps++;
    if (benefitGaps.includes('fluency')) criticalGaps++;
  } else if (vertical === 'finance') {
    if (featureGaps.includes('secure')) criticalGaps++;
    if (benefitGaps.includes('save_money')) criticalGaps++;
  } else if (vertical === 'fitness') {
    if (featureGaps.includes('workout_plans')) criticalGaps++;
    if (benefitGaps.includes('get_fit')) criticalGaps++;
  }

  return {
    overallGapScore: Math.round(coverageScore),
    totalGaps,
    criticalGaps,
    featureGaps: {
      missing: featureGaps,
      detected: capabilityMap.features.categories.filter(f => benchmark.features.includes(f)),
      coveragePercentage:
        benchmark.features.length > 0
          ? ((benchmark.features.length - featureGaps.length) / benchmark.features.length) * 100
          : 100,
    },
    benefitGaps: {
      missing: benefitGaps,
      detected: capabilityMap.benefits.categories.filter(b => benchmark.benefits.includes(b)),
      coveragePercentage:
        benchmark.benefits.length > 0
          ? ((benchmark.benefits.length - benefitGaps.length) / benchmark.benefits.length) * 100
          : 100,
    },
    trustGaps: {
      missing: trustGaps,
      detected: capabilityMap.trust.categories.filter(t => benchmark.trust.includes(t)),
      coveragePercentage:
        benchmark.trust.length > 0
          ? ((benchmark.trust.length - trustGaps.length) / benchmark.trust.length) * 100
          : 100,
    },
  };
}

// Run tests
console.log('\n🧪 Testing Gap Analysis Engine (Phase 3)\n');
console.log('='.repeat(80));

for (const testCase of testCases) {
  console.log(`\n📱 ${testCase.vertical.toUpperCase()}: ${testCase.name}`);
  console.log('-'.repeat(80));

  // Extract capabilities
  const capabilityMap = mockExtractCapabilities(testCase.description);

  console.log(`\n✅ Detected Capabilities:`);
  console.log(`   Features: ${capabilityMap.features.count} (${capabilityMap.features.categories.join(', ') || 'none'})`);
  console.log(`   Benefits: ${capabilityMap.benefits.count} (${capabilityMap.benefits.categories.join(', ') || 'none'})`);
  console.log(`   Trust: ${capabilityMap.trust.count} (${capabilityMap.trust.categories.join(', ') || 'none'})`);

  // Analyze gaps
  const gapAnalysis = mockGapAnalysis(capabilityMap, testCase.vertical);

  console.log(`\n🔍 Gap Analysis Results:`);
  console.log(`   Overall Gap Score: ${gapAnalysis.overallGapScore}/100 ${gapAnalysis.overallGapScore >= 80 ? '✅' : gapAnalysis.overallGapScore >= 60 ? '⚠️' : '❌'}`);
  console.log(`   Total Gaps: ${gapAnalysis.totalGaps}`);
  console.log(`   Critical Gaps: ${gapAnalysis.criticalGaps} ${gapAnalysis.criticalGaps === 0 ? '✅' : '🔴'}`);

  console.log(`\n📊 Category Coverage:`);
  console.log(`   Features: ${Math.round(gapAnalysis.featureGaps.coveragePercentage)}%`);
  console.log(`      ✅ Detected: ${gapAnalysis.featureGaps.detected.join(', ') || 'none'}`);
  console.log(`      ❌ Missing: ${gapAnalysis.featureGaps.missing.join(', ') || 'none'}`);

  console.log(`   Benefits: ${Math.round(gapAnalysis.benefitGaps.coveragePercentage)}%`);
  console.log(`      ✅ Detected: ${gapAnalysis.benefitGaps.detected.join(', ') || 'none'}`);
  console.log(`      ❌ Missing: ${gapAnalysis.benefitGaps.missing.join(', ') || 'none'}`);

  console.log(`   Trust: ${Math.round(gapAnalysis.trustGaps.coveragePercentage)}%`);
  console.log(`      ✅ Detected: ${gapAnalysis.trustGaps.detected.join(', ') || 'none'}`);
  console.log(`      ❌ Missing: ${gapAnalysis.trustGaps.missing.join(', ') || 'none'}`);

  // Recommendations
  if (gapAnalysis.totalGaps > 0) {
    console.log(`\n💡 Top Recommendations:`);
    if (gapAnalysis.featureGaps.missing.length > 0) {
      console.log(`   🔴 Add missing features: ${gapAnalysis.featureGaps.missing.join(', ')}`);
    }
    if (gapAnalysis.benefitGaps.missing.length > 0) {
      console.log(`   🟠 Highlight missing benefits: ${gapAnalysis.benefitGaps.missing.join(', ')}`);
    }
    if (gapAnalysis.trustGaps.missing.length > 0) {
      console.log(`   🟡 Include missing trust signals: ${gapAnalysis.trustGaps.missing.join(', ')}`);
    }
  } else {
    console.log(`\n💡 No gaps detected - Excellent coverage! ✅`);
  }
}

console.log('\n' + '='.repeat(80));
console.log('\n✅ Phase 3 Gap Analysis Test Complete!\n');
console.log('Key Capabilities:');
console.log('  ✅ Vertical-specific benchmarks (language, finance, fitness)');
console.log('  ✅ Gap detection by category (features, benefits, trust)');
console.log('  ✅ Coverage percentage calculation');
console.log('  ✅ Critical gap identification');
console.log('  ✅ Prioritized recommendations');
console.log('');
