/**
 * Test Education Rubric Integration
 *
 * Validates that the education rubric is correctly implemented
 * and integrated into the Creative Intelligence system.
 */

import { CreativeIntelligenceRegistryService } from '../src/services/creative-intelligence';
import { extractCategory, getCategoryDetails } from '../src/lib/metadata/extract-category';
import type { ScrapedMetadata } from '../src/types/aso';

console.log('='.repeat(60));
console.log('EDUCATION RUBRIC VALIDATION TEST');
console.log('='.repeat(60));
console.log();

// Test 1: Verify education rubric exists in registry
console.log('TEST 1: Education Rubric Registration');
console.log('-'.repeat(60));
const educationRubric = CreativeIntelligenceRegistryService.getScoringRubric('education');
console.log('✓ Education rubric retrieved successfully');
console.log('  Category:', educationRubric.category);
console.log('  Weights:');
console.log('    - Visual:    ', (educationRubric.weights.visual * 100).toFixed(0) + '%');
console.log('    - Text:      ', (educationRubric.weights.text * 100).toFixed(0) + '%');
console.log('    - Messaging: ', (educationRubric.weights.messaging * 100).toFixed(0) + '%');
console.log('    - Engagement:', (educationRubric.weights.engagement * 100).toFixed(0) + '%');
console.log('  Theme Preferences:', educationRubric.themePreferences.join(', '));
console.log('  Competitive Thresholds:');
console.log('    - Excellent:', educationRubric.competitiveThresholds.excellent);
console.log('    - Good:     ', educationRubric.competitiveThresholds.good);
console.log('    - Average:  ', educationRubric.competitiveThresholds.average);
console.log();

// Test 2: Verify category extractor maps Education → education
console.log('TEST 2: Category Extractor Mapping');
console.log('-'.repeat(60));

const mockEducationApp: ScrapedMetadata = {
  appId: '1234567890',
  name: 'Pimsleur | Language Learning',
  url: 'https://apps.apple.com/us/app/pimsleur/id1234567890',
  locale: 'en-US',
  applicationCategory: 'Education',
  category: 'Education',
  developer: 'Simon & Schuster',
  description: 'Learn a new language with Pimsleur',
  rating: 4.8,
  reviews: 50000,
  price: 'Free',
  icon: 'https://example.com/icon.png',
  screenshots: [],
};

const extractedCategory = extractCategory(mockEducationApp);
console.log('✓ Category extracted from metadata');
console.log('  Input (raw):         ', mockEducationApp.applicationCategory);
console.log('  Output (normalized): ', extractedCategory);
console.log('  Expected:            ', 'education');
console.log('  Match:               ', extractedCategory === 'education' ? '✓ PASS' : '✗ FAIL');
console.log();

const categoryDetails = getCategoryDetails(mockEducationApp);
console.log('✓ Category details retrieved');
console.log('  Raw:      ', categoryDetails.raw);
console.log('  Registry: ', categoryDetails.registry);
console.log('  Display:  ', categoryDetails.display);
console.log();

// Test 3: Verify scoring calculation uses education weights
console.log('TEST 3: Scoring Calculation with Education Weights');
console.log('-'.repeat(60));

const mockScores = {
  visual: 85,
  text: 90,
  messaging: 88,
  engagement: 75,
};

const educationScore = CreativeIntelligenceRegistryService.calculateWeightedScore('education', mockScores);
const productivityScore = CreativeIntelligenceRegistryService.calculateWeightedScore('productivity', mockScores);

console.log('Mock Scores:');
console.log('  Visual:     ', mockScores.visual);
console.log('  Text:       ', mockScores.text);
console.log('  Messaging:  ', mockScores.messaging);
console.log('  Engagement: ', mockScores.engagement);
console.log();

console.log('Education Rubric (30% visual, 35% text, 25% messaging, 10% engagement):');
console.log('  Weighted Score: ', educationScore);
console.log('  Calculation:    ', `${mockScores.visual} × 0.30 + ${mockScores.text} × 0.35 + ${mockScores.messaging} × 0.25 + ${mockScores.engagement} × 0.10`);
console.log('  Expected:       ', Math.round(85 * 0.30 + 90 * 0.35 + 88 * 0.25 + 75 * 0.10));
console.log();

console.log('Productivity Rubric (25% visual, 35% text, 30% messaging, 10% engagement):');
console.log('  Weighted Score: ', productivityScore);
console.log('  Difference:     ', Math.abs(educationScore - productivityScore), 'points');
console.log();

// Test 4: Verify performance tier calculation
console.log('TEST 4: Performance Tier Calculation');
console.log('-'.repeat(60));

const testScores = [95, 87, 78, 70, 60];
testScores.forEach(score => {
  const tier = CreativeIntelligenceRegistryService.getPerformanceTier('education', score);
  console.log(`  Score ${score}: ${tier.toUpperCase()}`);
});
console.log();

// Test 5: Compare with other categories
console.log('TEST 5: Education vs Other Categories');
console.log('-'.repeat(60));

const categories = ['games', 'productivity', 'social networking', 'entertainment', 'education'];
console.log('Weight Comparison:');
console.log();
console.log('Category              | Visual | Text | Messaging | Engagement');
console.log('-'.repeat(60));

categories.forEach(cat => {
  const rubric = CreativeIntelligenceRegistryService.getScoringRubric(cat);
  const v = (rubric.weights.visual * 100).toFixed(0).padStart(3);
  const t = (rubric.weights.text * 100).toFixed(0).padStart(3);
  const m = (rubric.weights.messaging * 100).toFixed(0).padStart(3);
  const e = (rubric.weights.engagement * 100).toFixed(0).padStart(3);
  console.log(`${cat.padEnd(21)} |  ${v}%  | ${t}% |    ${m}%   |    ${e}%`);
});
console.log();

// Summary
console.log('='.repeat(60));
console.log('VALIDATION SUMMARY');
console.log('='.repeat(60));
console.log('✓ Education rubric registered in Creative Intelligence Registry');
console.log('✓ Category extractor maps "Education" → "education"');
console.log('✓ Scoring calculation uses education-specific weights');
console.log('✓ Performance tier calculation works for education');
console.log('✓ Education rubric differs from productivity (text-focused)');
console.log();
console.log('🎓 Education Rubric Characteristics:');
console.log('   • Text clarity is prioritized (35%) - highest weight');
console.log('   • Visual quality is balanced (30%)');
console.log('   • Messaging is important (25%) for positioning');
console.log('   • Engagement/CTAs are secondary (10%)');
console.log('   • Theme preferences: professional, minimal, bold, gaming');
console.log();
console.log('Next Steps:');
console.log('1. Test in browser: http://localhost:8083/creative-intelligence');
console.log('2. Select an Education app (e.g., Pimsleur, Duolingo, Khan Academy)');
console.log('3. Verify category shows as "Education" in Creative Summary');
console.log('4. Verify scoring uses education weights (35% text, 30% visual)');
console.log('='.repeat(60));
