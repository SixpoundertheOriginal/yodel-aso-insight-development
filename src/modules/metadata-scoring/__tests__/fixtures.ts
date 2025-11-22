/**
 * Test Fixtures for Metadata Scoring
 *
 * Simple deterministic test cases to validate scoring logic.
 */

export const testFixtures = {
  pimsleur: {
    title: 'Pimsleur - Language Learning',
    subtitle: 'Learn Spanish, French & More',
    expected: {
      titleTokenCount: 3, // pimsleur, language, learning
      subtitleNewTokenCount: 4, // learn, spanish, french, more
      title2WordCombos: ['pimsleur language', 'language learning'],
      subtitle2WordCombos: ['learn spanish', 'spanish french', 'french more'],
      title3WordCombos: ['pimsleur language learning'],
      subtitle3WordCombos: ['learn spanish french', 'spanish french more'],
      hasFillers: true, // 'and' → &
      hasDuplicates: false
    }
  },

  instagram: {
    title: 'Instagram',
    subtitle: 'Create & share photos, videos, reels & more',
    expected: {
      titleTokenCount: 1, // instagram
      subtitleNewTokenCount: 6, // create, share, photos, videos, reels, more
      title2WordCombos: [],
      subtitle2WordCombos: ['create share', 'share photos', 'photos videos', 'videos reels', 'reels more'],
      title3WordCombos: [],
      subtitle3WordCombos: ['create share photos', 'share photos videos', 'photos videos reels', 'videos reels more'],
      hasFillers: false,
      hasDuplicates: false
    }
  },

  duolingo: {
    title: 'Duolingo - Language Lessons',
    subtitle: 'Learn Spanish, French, German',
    expected: {
      titleTokenCount: 3, // duolingo, language, lessons
      subtitleNewTokenCount: 4, // learn, spanish, french, german
      title2WordCombos: ['duolingo language', 'language lessons'],
      subtitle2WordCombos: ['learn spanish', 'spanish french', 'french german'],
      title3WordCombos: ['duolingo language lessons'],
      subtitle3WordCombos: ['learn spanish french', 'spanish french german'],
      hasFillers: false,
      hasDuplicates: false
    }
  },

  badExample: {
    title: 'My App',
    subtitle: 'The Best App for You',
    expected: {
      titleTokenCount: 1, // app (my is stopword)
      subtitleNewTokenCount: 1, // best (the, app, for, you are stopwords)
      title2WordCombos: [], // "my app" has stopword
      subtitle2WordCombos: [], // all combos have stopwords
      title3WordCombos: [],
      subtitle3WordCombos: [],
      hasFillers: true,
      hasDuplicates: true // "app" appears in both title and subtitle
    }
  }
};

/**
 * Validation helper to check if scoring results match expectations
 */
export function validateScoring(
  appName: string,
  titleResult: any,
  subtitleResult: any
): { passed: boolean; errors: string[] } {
  const fixture = testFixtures[appName as keyof typeof testFixtures];
  if (!fixture) {
    return { passed: false, errors: [`No fixture found for ${appName}`] };
  }

  const errors: string[] = [];

  // Validate subtitle new tokens count
  const actualNewTokens = subtitleResult.breakdown.newTokens.length;
  if (actualNewTokens !== fixture.expected.subtitleNewTokenCount) {
    errors.push(
      `Expected ${fixture.expected.subtitleNewTokenCount} new tokens, got ${actualNewTokens}`
    );
  }

  // Validate filler tokens detection
  const hasFillers =
    titleResult.breakdown.fillerTokens.length > 0 ||
    subtitleResult.breakdown.fillerTokens.length > 0;
  if (hasFillers !== fixture.expected.hasFillers) {
    errors.push(`Expected hasFillers=${fixture.expected.hasFillers}, got ${hasFillers}`);
  }

  // Validate duplication detection
  const hasDuplicates =
    titleResult.breakdown.duplicates.length > 0 ||
    subtitleResult.breakdown.duplicates.length > 0;
  if (hasDuplicates !== fixture.expected.hasDuplicates) {
    errors.push(
      `Expected hasDuplicates=${fixture.expected.hasDuplicates}, got ${hasDuplicates}`
    );
  }

  return {
    passed: errors.length === 0,
    errors
  };
}
