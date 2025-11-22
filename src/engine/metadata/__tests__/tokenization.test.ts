/**
 * Tokenization Tests
 *
 * Tests for ASO-aware tokenization and stopword filtering.
 */

import {
  tokenizeForASO,
  filterStopwords,
  analyzeText,
  getASOStopwords
} from '../tokenization';

describe('tokenizeForASO', () => {
  it('should handle pipe separator correctly', () => {
    const text = 'Pimsleur | Language Learning';
    const tokens = tokenizeForASO(text);

    expect(tokens).toEqual(['pimsleur', 'language', 'learning']);
    expect(tokens.length).toBe(3);
  });

  it('should handle em-dash and en-dash', () => {
    const text = 'Learn Spanish – Fast & Easy';
    const tokens = tokenizeForASO(text);

    expect(tokens).toEqual(['learn', 'spanish', 'fast', 'easy']);
  });

  it('should handle multiple visual separators', () => {
    const text = 'App Name | Category – Tagline';
    const tokens = tokenizeForASO(text);

    expect(tokens).toEqual(['app', 'name', 'category', 'tagline']);
  });

  it('should remove punctuation correctly', () => {
    const text = 'Hello, world! How are you?';
    const tokens = tokenizeForASO(text);

    expect(tokens).toEqual(['hello', 'world', 'how', 'are', 'you']);
  });

  it('should handle apostrophes', () => {
    const text = "Don't miss out on today's best deals";
    const tokens = tokenizeForASO(text);

    // Apostrophes are removed: "don't" → "dont", "today's" → "todays"
    expect(tokens).toEqual(['dont', 'miss', 'out', 'on', 'todays', 'best', 'deals']);
  });

  it('should return empty array for empty text', () => {
    expect(tokenizeForASO('')).toEqual([]);
    expect(tokenizeForASO(null as any)).toEqual([]);
    expect(tokenizeForASO(undefined as any)).toEqual([]);
  });

  it('should handle multiple spaces and normalize', () => {
    const text = 'Too    many     spaces';
    const tokens = tokenizeForASO(text);

    expect(tokens).toEqual(['too', 'many', 'spaces']);
  });

  it('should convert to lowercase', () => {
    const text = 'UPPERCASE MixedCase lowercase';
    const tokens = tokenizeForASO(text);

    expect(tokens).toEqual(['uppercase', 'mixedcase', 'lowercase']);
  });
});

describe('filterStopwords', () => {
  it('should filter common stopwords', () => {
    const tokens = ['the', 'quick', 'brown', 'fox', 'jumps', 'over', 'the', 'lazy', 'dog'];
    const result = filterStopwords(tokens);

    expect(result.keywords).toEqual(['quick', 'brown', 'fox', 'jumps', 'lazy', 'dog']);
    expect(result.ignored).toContain('the');
    expect(result.ignored).toContain('over');
  });

  it('should filter ASO-specific stopwords', () => {
    const tokens = ['best', 'app', 'for', 'learning', 'language', 'free'];
    const result = filterStopwords(tokens);

    // 'best', 'app', 'for', 'free' are stopwords
    expect(result.keywords).toEqual(['learning', 'language']);
    expect(result.ignored).toContain('best');
    expect(result.ignored).toContain('app');
    expect(result.ignored).toContain('free');
  });

  it('should filter short tokens (length <= 2)', () => {
    const tokens = ['language', 'in', '50', 'days', 'or', 'x'];
    const result = filterStopwords(tokens);

    // 'in', '50', 'or', 'x' have length <= 2
    expect(result.keywords).toEqual(['language', 'days']);
    expect(result.ignored).toContain('in');
    expect(result.ignored).toContain('50');
    expect(result.ignored).toContain('or');
    expect(result.ignored).toContain('x');
  });

  it('should calculate noise ratio correctly', () => {
    const tokens = ['learn', 'the', 'best', 'language', 'app'];
    const result = filterStopwords(tokens);

    // 3 stopwords out of 5 tokens = 0.6 noise ratio
    expect(result.keywords).toEqual(['learn', 'language']);
    expect(result.ignored).toEqual(['the', 'best', 'app']);
    expect(result.noiseRatio).toBeCloseTo(0.6, 2);
  });

  it('should handle empty token array', () => {
    const result = filterStopwords([]);

    expect(result.keywords).toEqual([]);
    expect(result.ignored).toEqual([]);
    expect(result.noiseRatio).toBe(0);
  });

  it('should handle all stopwords', () => {
    const tokens = ['the', 'a', 'an', 'and', 'or', 'in'];
    const result = filterStopwords(tokens);

    expect(result.keywords).toEqual([]);
    expect(result.ignored.length).toBe(6);
    expect(result.noiseRatio).toBe(1);
  });

  it('should handle no stopwords', () => {
    const tokens = ['pimsleur', 'language', 'learning', 'spanish', 'french'];
    const result = filterStopwords(tokens);

    expect(result.keywords).toEqual(['pimsleur', 'language', 'learning', 'spanish', 'french']);
    expect(result.ignored).toEqual([]);
    expect(result.noiseRatio).toBe(0);
  });

  it('should support custom stopwords', () => {
    const tokens = ['custom', 'word', 'learning'];
    const customStopwords = new Set(['custom', 'word']);
    const result = filterStopwords(tokens, customStopwords);

    expect(result.keywords).toEqual(['learning']);
    expect(result.ignored).toContain('custom');
    expect(result.ignored).toContain('word');
  });
});

describe('analyzeText', () => {
  it('should tokenize and filter in one step', () => {
    const text = 'Pimsleur | Language Learning';
    const result = analyzeText(text);

    expect(result.allTokens).toEqual(['pimsleur', 'language', 'learning']);
    expect(result.keywords).toEqual(['pimsleur', 'language', 'learning']);
    expect(result.ignored).toEqual([]);
    expect(result.noiseRatio).toBe(0);
  });

  it('should handle text with stopwords', () => {
    const text = 'Learn the best language app for free';
    const result = analyzeText(text);

    expect(result.allTokens).toEqual(['learn', 'the', 'best', 'language', 'app', 'for', 'free']);
    expect(result.keywords).toEqual(['learn', 'language']);
    expect(result.ignored).toContain('the');
    expect(result.ignored).toContain('best');
    expect(result.ignored).toContain('app');
    expect(result.ignored).toContain('for');
    expect(result.ignored).toContain('free');
  });

  it('should calculate noise ratio for real app title', () => {
    const text = 'Pimsleur | Language Learning';
    const result = analyzeText(text);

    // All 3 tokens are meaningful (no stopwords)
    expect(result.keywords.length).toBe(3);
    expect(result.noiseRatio).toBe(0);
  });

  it('should calculate noise ratio for noisy description', () => {
    const text = 'This is the best app you can get for free today';
    const result = analyzeText(text);

    // Many stopwords: this, is, the, best, app, you, can, get, for, free
    // Few keywords: today
    expect(result.keywords).toEqual(['today']);
    expect(result.noiseRatio).toBeGreaterThan(0.8);
  });
});

describe('getASOStopwords', () => {
  it('should return a Set of stopwords', () => {
    const stopwords = getASOStopwords();

    expect(stopwords).toBeInstanceOf(Set);
    expect(stopwords.size).toBeGreaterThan(100);
  });

  it('should include common English stopwords', () => {
    const stopwords = getASOStopwords();

    expect(stopwords.has('the')).toBe(true);
    expect(stopwords.has('and')).toBe(true);
    expect(stopwords.has('for')).toBe(true);
    expect(stopwords.has('with')).toBe(true);
  });

  it('should include ASO-specific terms', () => {
    const stopwords = getASOStopwords();

    expect(stopwords.has('app')).toBe(true);
    expect(stopwords.has('apps')).toBe(true);
    expect(stopwords.has('iphone')).toBe(true);
    expect(stopwords.has('ipad')).toBe(true);
    expect(stopwords.has('free')).toBe(true);
    expect(stopwords.has('best')).toBe(true);
    expect(stopwords.has('top')).toBe(true);
  });
});

describe('Real-world App Store Examples', () => {
  it('should tokenize Pimsleur correctly (3 words, not 4)', () => {
    const text = 'Pimsleur | Language Learning';
    const result = analyzeText(text);

    // User reported this was counting as 4 words with old tokenizer
    expect(result.keywords.length).toBe(3);
    expect(result.keywords).toEqual(['pimsleur', 'language', 'learning']);
  });

  it('should handle typical app subtitle with separators', () => {
    const text = 'Learn Spanish, French & More';
    const result = analyzeText(text);

    expect(result.allTokens).toEqual(['learn', 'spanish', 'french', 'more']);
    // 'more' is a stopword, so it's filtered out
    expect(result.keywords).toEqual(['learn', 'spanish', 'french']);
    expect(result.ignored).toContain('more');
  });

  it('should filter noise from typical app description', () => {
    const text = 'Discover the power of our amazing app. Get started for free today!';
    const result = analyzeText(text);

    // Stopwords: the, of, our, for, get
    // Keywords: discover, power, amazing, app (wait, app is stopword now!), started, free (stopword!), today
    // Actually: discover, power, amazing, started, today
    expect(result.keywords).toContain('discover');
    expect(result.keywords).toContain('power');
    expect(result.keywords).toContain('started');
    expect(result.keywords).toContain('today');
    expect(result.keywords).not.toContain('app');
    expect(result.keywords).not.toContain('free');
  });

  it('should handle description with many stopwords', () => {
    const text = 'This is the best app for learning languages. You can learn Spanish, French, and German with our proven method.';
    const result = analyzeText(text);

    // High noise ratio expected
    expect(result.noiseRatio).toBeGreaterThan(0.5);

    // Should still extract meaningful keywords
    expect(result.keywords).toContain('learning');
    expect(result.keywords).toContain('languages');
    expect(result.keywords).toContain('spanish');
    expect(result.keywords).toContain('french');
    expect(result.keywords).toContain('german');
    expect(result.keywords).toContain('proven');
    expect(result.keywords).toContain('method');
  });
});
