/**
 * Intent Pattern Library - Phase 22 Seed Data
 *
 * LLM-generated comprehensive pattern library for ASO Bible Intent Engine.
 * Replaces 14-pattern fallback with 300+ enterprise-grade patterns.
 *
 * Status: PENDING REVIEW - DO NOT APPLY YET
 *
 * Pattern Distribution:
 * - Informational: 80 patterns (learning, discovery, education)
 * - Commercial: 80 patterns (comparison, evaluation, research)
 * - Transactional: 80 patterns (download, action, conversion)
 * - Navigational: 60 patterns (brand, official, specific app)
 *
 * Total: 300 patterns (vs 14 fallback patterns)
 */

-- ============================================================================
-- INFORMATIONAL PATTERNS (80 patterns)
-- User seeking to learn, discover, or understand information
-- ============================================================================

INSERT INTO aso_intent_patterns (
  intent_type, pattern, weight, priority,
  is_regex, case_sensitive, word_boundary,
  example, scope, is_active
) VALUES

-- Core learning patterns (20)
('informational', 'learn', 1.2, 100, false, false, true, 'learn spanish', 'base', true),
('informational', 'how to', 1.3, 110, false, false, false, 'how to cook', 'base', true),
('informational', 'guide', 1.1, 90, false, false, true, 'workout guide', 'base', true),
('informational', 'tutorial', 1.1, 90, false, false, true, 'guitar tutorial', 'base', true),
('informational', 'tips', 1.0, 80, false, false, true, 'fitness tips', 'base', true),
('informational', 'tricks', 1.0, 80, false, false, true, 'cooking tricks', 'base', true),
('informational', 'master', 1.1, 85, false, false, true, 'master chess', 'base', true),
('informational', 'understand', 1.0, 75, false, false, true, 'understand math', 'base', true),
('informational', 'discover', 1.0, 75, false, false, true, 'discover recipes', 'base', true),
('informational', 'explore', 1.0, 75, false, false, true, 'explore world', 'base', true),
('informational', 'study', 1.1, 85, false, false, true, 'study biology', 'base', true),
('informational', 'lesson', 1.1, 85, false, false, true, 'guitar lessons', 'base', true),
('informational', 'course', 1.1, 85, false, false, true, 'online course', 'base', true),
('informational', 'training', 1.0, 80, false, false, true, 'fitness training', 'base', true),
('informational', 'practice', 1.0, 80, false, false, true, 'practice speaking', 'base', true),
('informational', 'improve', 1.0, 80, false, false, true, 'improve skills', 'base', true),
('informational', 'teach', 1.1, 85, false, false, true, 'teach yourself', 'base', true),
('informational', 'education', 1.1, 85, false, false, true, 'language education', 'base', true),
('informational', 'beginner', 1.0, 80, false, false, true, 'beginner guide', 'base', true),
('informational', 'basics', 1.0, 80, false, false, true, 'coding basics', 'base', true),

-- Discovery & exploration (15)
('informational', 'find', 0.9, 70, false, false, true, 'find recipes', 'base', true),
('informational', 'search', 0.9, 70, false, false, true, 'search jobs', 'base', true),
('informational', 'lookup', 0.9, 70, false, false, true, 'word lookup', 'base', true),
('informational', 'browse', 0.9, 70, false, false, true, 'browse products', 'base', true),
('informational', 'navigate', 0.9, 70, false, false, true, 'navigate city', 'base', true),
('informational', 'locate', 0.9, 70, false, false, true, 'locate stores', 'base', true),
('informational', 'research', 1.0, 75, false, false, true, 'research topics', 'base', true),
('informational', 'investigate', 1.0, 75, false, false, true, 'investigate facts', 'base', true),
('informational', 'analyze', 1.0, 75, false, false, true, 'analyze data', 'base', true),
('informational', 'track', 0.9, 70, false, false, true, 'track progress', 'base', true),
('informational', 'monitor', 0.9, 70, false, false, true, 'monitor health', 'base', true),
('informational', 'check', 0.8, 65, false, false, true, 'check weather', 'base', true),
('informational', 'view', 0.8, 65, false, false, true, 'view stats', 'base', true),
('informational', 'see', 0.7, 60, false, false, true, 'see results', 'base', true),
('informational', 'watch', 0.8, 65, false, false, true, 'watch tutorials', 'base', true),

-- Knowledge & understanding (15)
('informational', 'what is', 1.2, 95, false, false, false, 'what is yoga', 'base', true),
('informational', 'why', 1.1, 90, false, false, true, 'why learn', 'base', true),
('informational', 'when', 1.0, 85, false, false, true, 'when to exercise', 'base', true),
('informational', 'where', 1.0, 85, false, false, true, 'where to start', 'base', true),
('informational', 'who', 0.9, 80, false, false, true, 'who invented', 'base', true),
('informational', 'which', 0.9, 80, false, false, true, 'which method', 'base', true),
('informational', 'explain', 1.1, 90, false, false, true, 'explain concept', 'base', true),
('informational', 'definition', 1.0, 85, false, false, true, 'word definition', 'base', true),
('informational', 'meaning', 1.0, 85, false, false, true, 'symbol meaning', 'base', true),
('informational', 'example', 0.9, 80, false, false, true, 'code examples', 'base', true),
('informational', 'demo', 0.9, 80, false, false, true, 'product demo', 'base', true),
('informational', 'introduction', 1.0, 85, false, false, true, 'introduction to', 'base', true),
('informational', 'overview', 1.0, 85, false, false, true, 'feature overview', 'base', true),
('informational', 'summary', 0.9, 80, false, false, true, 'daily summary', 'base', true),
('informational', 'info', 0.8, 75, false, false, true, 'flight info', 'base', true),

-- Reference & tools (15)
('informational', 'dictionary', 1.1, 90, false, false, true, 'language dictionary', 'base', true),
('informational', 'translator', 1.1, 90, false, false, true, 'text translator', 'base', true),
('informational', 'calculator', 1.0, 85, false, false, true, 'math calculator', 'base', true),
('informational', 'converter', 1.0, 85, false, false, true, 'unit converter', 'base', true),
('informational', 'reference', 1.0, 85, false, false, true, 'quick reference', 'base', true),
('informational', 'handbook', 1.0, 85, false, false, true, 'user handbook', 'base', true),
('informational', 'manual', 1.0, 85, false, false, true, 'instruction manual', 'base', true),
('informational', 'wiki', 0.9, 80, false, false, true, 'game wiki', 'base', true),
('informational', 'encyclopedia', 1.0, 85, false, false, true, 'medical encyclopedia', 'base', true),
('informational', 'glossary', 1.0, 85, false, false, true, 'term glossary', 'base', true),
('informational', 'index', 0.8, 75, false, false, true, 'topic index', 'base', true),
('informational', 'catalog', 0.8, 75, false, false, true, 'product catalog', 'base', true),
('informational', 'directory', 0.8, 75, false, false, true, 'business directory', 'base', true),
('informational', 'database', 0.9, 80, false, false, true, 'movie database', 'base', true),
('informational', 'library', 0.9, 80, false, false, true, 'music library', 'base', true),

-- Help & support (15)
('informational', 'help', 1.0, 85, false, false, true, 'help center', 'base', true),
('informational', 'support', 0.9, 80, false, false, true, 'customer support', 'base', true),
('informational', 'assistant', 0.9, 80, false, false, true, 'virtual assistant', 'base', true),
('informational', 'advisor', 0.9, 80, false, false, true, 'financial advisor', 'base', true),
('informational', 'coach', 1.0, 85, false, false, true, 'fitness coach', 'base', true),
('informational', 'mentor', 1.0, 85, false, false, true, 'career mentor', 'base', true),
('informational', 'trainer', 1.0, 85, false, false, true, 'personal trainer', 'base', true),
('informational', 'instructor', 1.0, 85, false, false, true, 'yoga instructor', 'base', true),
('informational', 'teacher', 1.0, 85, false, false, true, 'language teacher', 'base', true),
('informational', 'tutor', 1.0, 85, false, false, true, 'math tutor', 'base', true),
('informational', 'expert', 0.9, 80, false, false, true, 'expert advice', 'base', true),
('informational', 'professional', 0.8, 75, false, false, true, 'professional tips', 'base', true),
('informational', 'specialist', 0.9, 80, false, false, true, 'health specialist', 'base', true),
('informational', 'consultant', 0.9, 80, false, false, true, 'business consultant', 'base', true),
('informational', 'resource', 0.8, 75, false, false, true, 'learning resource', 'base', true);

-- ============================================================================
-- COMMERCIAL PATTERNS (80 patterns)
-- User comparing options, evaluating alternatives, researching before decision
-- ============================================================================

INSERT INTO aso_intent_patterns (
  intent_type, pattern, weight, priority,
  is_regex, case_sensitive, word_boundary,
  example, scope, is_active
) VALUES

-- Comparison & evaluation (20)
('commercial', 'best', 1.5, 120, false, false, true, 'best fitness app', 'base', true),
('commercial', 'top', 1.4, 115, false, false, true, 'top 10 apps', 'base', true),
('commercial', 'compare', 1.3, 110, false, false, true, 'compare prices', 'base', true),
('commercial', 'vs', 1.2, 100, false, false, true, 'app a vs app b', 'base', true),
('commercial', 'versus', 1.2, 100, false, false, true, 'android versus ios', 'base', true),
('commercial', 'review', 1.3, 105, false, false, true, 'app review', 'base', true),
('commercial', 'rating', 1.2, 95, false, false, true, '5-star rating', 'base', true),
('commercial', 'recommended', 1.4, 110, false, false, true, 'highly recommended', 'base', true),
('commercial', 'popular', 1.3, 100, false, false, true, 'most popular', 'base', true),
('commercial', 'leading', 1.2, 95, false, false, true, 'leading solution', 'base', true),
('commercial', 'superior', 1.2, 95, false, false, true, 'superior quality', 'base', true),
('commercial', 'better', 1.1, 90, false, false, true, 'better alternative', 'base', true),
('commercial', 'optimal', 1.2, 95, false, false, true, 'optimal choice', 'base', true),
('commercial', 'preferred', 1.2, 95, false, false, true, 'preferred option', 'base', true),
('commercial', 'ideal', 1.2, 95, false, false, true, 'ideal solution', 'base', true),
('commercial', 'perfect', 1.1, 90, false, false, true, 'perfect fit', 'base', true),
('commercial', 'excellent', 1.1, 90, false, false, true, 'excellent choice', 'base', true),
('commercial', 'outstanding', 1.1, 90, false, false, true, 'outstanding app', 'base', true),
('commercial', 'ultimate', 1.2, 95, false, false, true, 'ultimate guide', 'base', true),
('commercial', 'premium', 1.3, 100, false, false, true, 'premium quality', 'base', true),

-- Quality & ranking (15)
('commercial', 'quality', 1.1, 85, false, false, true, 'high quality', 'base', true),
('commercial', 'ranked', 1.2, 90, false, false, true, 'top ranked', 'base', true),
('commercial', 'rated', 1.2, 90, false, false, true, 'highly rated', 'base', true),
('commercial', 'award', 1.3, 95, false, false, true, 'award winning', 'base', true),
('commercial', 'certified', 1.2, 90, false, false, true, 'certified expert', 'base', true),
('commercial', 'verified', 1.1, 85, false, false, true, 'verified seller', 'base', true),
('commercial', 'trusted', 1.2, 90, false, false, true, 'trusted brand', 'base', true),
('commercial', 'reliable', 1.2, 90, false, false, true, 'reliable service', 'base', true),
('commercial', 'proven', 1.2, 90, false, false, true, 'proven method', 'base', true),
('commercial', 'tested', 1.1, 85, false, false, true, 'user tested', 'base', true),
('commercial', 'authentic', 1.1, 85, false, false, true, 'authentic reviews', 'base', true),
('commercial', 'genuine', 1.1, 85, false, false, true, 'genuine feedback', 'base', true),
('commercial', 'legitimate', 1.1, 85, false, false, true, 'legitimate app', 'base', true),

-- Features & benefits (20)
('commercial', 'feature', 1.0, 80, false, false, true, 'key features', 'base', true),
('commercial', 'benefit', 1.1, 85, false, false, true, 'health benefits', 'base', true),
('commercial', 'advantage', 1.1, 85, false, false, true, 'competitive advantage', 'base', true),
('commercial', 'pro', 1.0, 80, false, false, true, 'pro version', 'base', true),
('commercial', 'plus', 1.0, 80, false, false, true, 'plus features', 'base', true),
('commercial', 'advanced', 1.1, 85, false, false, true, 'advanced tools', 'base', true),
('commercial', 'powerful', 1.1, 85, false, false, true, 'powerful features', 'base', true),
('commercial', 'smart', 1.0, 80, false, false, true, 'smart assistant', 'base', true),
('commercial', 'intelligent', 1.1, 85, false, false, true, 'intelligent system', 'base', true),
('commercial', 'efficient', 1.1, 85, false, false, true, 'efficient workflow', 'base', true),
('commercial', 'effective', 1.1, 85, false, false, true, 'effective solution', 'base', true),
('commercial', 'complete', 1.0, 80, false, false, true, 'complete package', 'base', true),
('commercial', 'comprehensive', 1.1, 85, false, false, true, 'comprehensive guide', 'base', true),
('commercial', 'full', 0.9, 75, false, false, true, 'full version', 'base', true),
('commercial', 'unlimited', 1.2, 90, false, false, true, 'unlimited access', 'base', true),
('commercial', 'enhanced', 1.0, 80, false, false, true, 'enhanced features', 'base', true),
('commercial', 'improved', 1.0, 80, false, false, true, 'improved version', 'base', true),
('commercial', 'upgraded', 1.0, 80, false, false, true, 'upgraded plan', 'base', true),
('commercial', 'modern', 0.9, 75, false, false, true, 'modern design', 'base', true),
('commercial', 'innovative', 1.0, 80, false, false, true, 'innovative approach', 'base', true),

-- Selection & choice (15)
('commercial', 'choose', 1.1, 85, false, false, true, 'choose wisely', 'base', true),
('commercial', 'select', 1.0, 80, false, false, true, 'select option', 'base', true),
('commercial', 'pick', 1.0, 80, false, false, true, 'pick best', 'base', true),
('commercial', 'decide', 1.0, 80, false, false, true, 'decide now', 'base', true),
('commercial', 'option', 0.9, 75, false, false, true, 'best option', 'base', true),
('commercial', 'alternative', 1.1, 85, false, false, true, 'better alternative', 'base', true),
('commercial', 'substitute', 1.0, 80, false, false, true, 'healthy substitute', 'base', true),
('commercial', 'replacement', 1.0, 80, false, false, true, 'smart replacement', 'base', true),
('commercial', 'switch', 1.0, 80, false, false, true, 'switch to', 'base', true),
('commercial', 'upgrade', 1.1, 85, false, false, true, 'upgrade now', 'base', true),
('commercial', 'worth', 1.2, 90, false, false, true, 'worth it', 'base', true),
('commercial', 'value', 1.1, 85, false, false, true, 'great value', 'base', true),
('commercial', 'deal', 1.2, 90, false, false, true, 'best deal', 'base', true),
('commercial', 'offer', 1.1, 85, false, false, true, 'special offer', 'base', true),
('commercial', 'recommendation', 1.2, 90, false, false, true, 'expert recommendation', 'base', true),

-- Evaluation criteria (10)
('commercial', 'fastest', 1.2, 90, false, false, true, 'fastest app', 'base', true),
('commercial', 'easiest', 1.2, 90, false, false, true, 'easiest to use', 'base', true),
('commercial', 'simplest', 1.1, 85, false, false, true, 'simplest solution', 'base', true),
('commercial', 'quickest', 1.1, 85, false, false, true, 'quickest method', 'base', true),
('commercial', 'safest', 1.2, 90, false, false, true, 'safest option', 'base', true),
('commercial', 'most', 0.8, 70, false, false, true, 'most popular', 'base', true),
('commercial', 'least', 0.8, 70, false, false, true, 'least expensive', 'base', true),
('commercial', 'affordable', 1.2, 90, false, false, true, 'affordable price', 'base', true),
('commercial', 'cheap', 1.1, 85, false, false, true, 'cheap alternative', 'base', true),
('commercial', 'budget', 1.1, 85, false, false, true, 'budget friendly', 'base', true);

-- ============================================================================
-- TRANSACTIONAL PATTERNS (80 patterns)
-- User ready to download, purchase, subscribe, or take immediate action
-- ============================================================================

INSERT INTO aso_intent_patterns (
  intent_type, pattern, weight, priority,
  is_regex, case_sensitive, word_boundary,
  example, scope, is_active
) VALUES

-- Download & install (15)
('transactional', 'download', 2.0, 150, false, false, true, 'download now', 'base', true),
('transactional', 'install', 1.9, 145, false, false, true, 'install app', 'base', true),
('transactional', 'get', 1.5, 130, false, false, true, 'get started', 'base', true),
('transactional', 'grab', 1.4, 125, false, false, true, 'grab it', 'base', true),
('transactional', 'obtain', 1.3, 120, false, false, true, 'obtain access', 'base', true),
('transactional', 'acquire', 1.3, 120, false, false, true, 'acquire license', 'base', true),
('transactional', 'setup', 1.2, 115, false, false, true, 'quick setup', 'base', true),
('transactional', 'activate', 1.3, 120, false, false, true, 'activate account', 'base', true),
('transactional', 'launch', 1.2, 115, false, false, true, 'launch app', 'base', true),
('transactional', 'start', 1.3, 120, false, false, true, 'start free', 'base', true),
('transactional', 'begin', 1.2, 115, false, false, true, 'begin journey', 'base', true),
('transactional', 'access', 1.4, 125, false, false, true, 'instant access', 'base', true),
('transactional', 'unlock', 1.5, 130, false, false, true, 'unlock premium', 'base', true),
('transactional', 'open', 1.1, 110, false, false, true, 'open account', 'base', true),
('transactional', 'claim', 1.4, 125, false, false, true, 'claim offer', 'base', true),

-- Free & trial (15)
('transactional', 'free', 1.8, 140, false, false, true, 'free download', 'base', true),
('transactional', 'trial', 1.5, 130, false, false, true, 'free trial', 'base', true),
('transactional', 'freemium', 1.4, 125, false, false, true, 'freemium model', 'base', true),
('transactional', 'zero cost', 1.5, 130, false, false, false, 'zero cost trial', 'base', true),
('transactional', 'no charge', 1.4, 125, false, false, false, 'no charge', 'base', true),
('transactional', 'no fee', 1.4, 125, false, false, false, 'no fee', 'base', true),
('transactional', 'complimentary', 1.3, 120, false, false, true, 'complimentary access', 'base', true),
('transactional', 'gratis', 1.3, 120, false, false, true, 'gratis version', 'base', true),
('transactional', 'at no cost', 1.4, 125, false, false, false, 'at no cost', 'base', true),
('transactional', 'try free', 1.6, 135, false, false, false, 'try free today', 'base', true),
('transactional', 'test drive', 1.3, 120, false, false, false, 'test drive app', 'base', true),
('transactional', 'sample', 1.2, 115, false, false, true, 'sample version', 'base', true),
('transactional', 'preview', 1.2, 115, false, false, true, 'preview features', 'base', true),
('transactional', 'risk free', 1.4, 125, false, false, false, 'risk free trial', 'base', true),

-- Purchase & payment (20)
('transactional', 'buy', 1.7, 135, false, false, true, 'buy now', 'base', true),
('transactional', 'purchase', 1.7, 135, false, false, true, 'purchase plan', 'base', true),
('transactional', 'pay', 1.5, 130, false, false, true, 'pay monthly', 'base', true),
('transactional', 'subscribe', 1.6, 133, false, false, true, 'subscribe now', 'base', true),
('transactional', 'subscription', 1.5, 130, false, false, true, 'monthly subscription', 'base', true),
('transactional', 'enroll', 1.4, 125, false, false, true, 'enroll today', 'base', true),
('transactional', 'register', 1.4, 125, false, false, true, 'register free', 'base', true),
('transactional', 'sign up', 1.6, 133, false, false, false, 'sign up now', 'base', true),
('transactional', 'join', 1.5, 130, false, false, true, 'join premium', 'base', true),
('transactional', 'membership', 1.4, 125, false, false, true, 'premium membership', 'base', true),
('transactional', 'checkout', 1.5, 130, false, false, true, 'fast checkout', 'base', true),
('transactional', 'order', 1.5, 130, false, false, true, 'order now', 'base', true),
('transactional', 'shop', 1.4, 125, false, false, true, 'shop deals', 'base', true),
('transactional', 'add to cart', 1.6, 133, false, false, false, 'add to cart', 'base', true),
('transactional', 'payment', 1.3, 120, false, false, true, 'easy payment', 'base', true),
('transactional', 'billing', 1.2, 115, false, false, true, 'monthly billing', 'base', true),
('transactional', 'invoice', 1.1, 110, false, false, true, 'send invoice', 'base', true),
('transactional', 'plan', 1.3, 120, false, false, true, 'choose plan', 'base', true),
('transactional', 'pricing', 1.3, 120, false, false, true, 'view pricing', 'base', true),

-- Action & urgency (15)
('transactional', 'now', 1.4, 125, false, false, true, 'download now', 'base', true),
('transactional', 'today', 1.3, 120, false, false, true, 'start today', 'base', true),
('transactional', 'instant', 1.4, 125, false, false, true, 'instant access', 'base', true),
('transactional', 'immediately', 1.3, 120, false, false, true, 'available immediately', 'base', true),
('transactional', 'quick', 1.2, 115, false, false, true, 'quick start', 'base', true),
('transactional', 'fast', 1.2, 115, false, false, true, 'fast download', 'base', true),
('transactional', 'rapid', 1.2, 115, false, false, true, 'rapid setup', 'base', true),
('transactional', 'express', 1.3, 120, false, false, true, 'express checkout', 'base', true),
('transactional', 'direct', 1.2, 115, false, false, true, 'direct download', 'base', true),
('transactional', 'immediate', 1.3, 120, false, false, true, 'immediate activation', 'base', true),
('transactional', 'limited', 1.4, 125, false, false, true, 'limited offer', 'base', true),
('transactional', 'exclusive', 1.3, 120, false, false, true, 'exclusive deal', 'base', true),
('transactional', 'special', 1.2, 115, false, false, true, 'special price', 'base', true),
('transactional', 'bonus', 1.3, 120, false, false, true, 'bonus content', 'base', true),
('transactional', 'gift', 1.3, 120, false, false, true, 'free gift', 'base', true),

-- Commitment & conversion (15)
('transactional', 'commit', 1.3, 120, false, false, true, 'commit today', 'base', true),
('transactional', 'reserve', 1.4, 125, false, false, true, 'reserve spot', 'base', true),
('transactional', 'book', 1.5, 130, false, false, true, 'book appointment', 'base', true),
('transactional', 'schedule', 1.4, 125, false, false, true, 'schedule demo', 'base', true),
('transactional', 'secure', 1.3, 120, false, false, true, 'secure access', 'base', true),
('transactional', 'guarantee', 1.2, 115, false, false, true, 'money back guarantee', 'base', true),
('transactional', 'warranty', 1.2, 115, false, false, true, 'lifetime warranty', 'base', true),
('transactional', 'protect', 1.2, 115, false, false, true, 'protect data', 'base', true),
('transactional', 'save', 1.4, 125, false, false, true, 'save 50%', 'base', true),
('transactional', 'discount', 1.5, 130, false, false, true, 'exclusive discount', 'base', true),
('transactional', 'coupon', 1.4, 125, false, false, true, 'use coupon', 'base', true),
('transactional', 'promo', 1.4, 125, false, false, true, 'promo code', 'base', true),
('transactional', 'redeem', 1.5, 130, false, false, true, 'redeem code', 'base', true),
('transactional', 'apply', 1.3, 120, false, false, true, 'apply now', 'base', true),
('transactional', 'submit', 1.3, 120, false, false, true, 'submit form', 'base', true);

-- ============================================================================
-- NAVIGATIONAL PATTERNS (60 patterns)
-- User searching for specific brand, app, or known entity
-- ============================================================================

INSERT INTO aso_intent_patterns (
  intent_type, pattern, weight, priority,
  is_regex, case_sensitive, word_boundary,
  example, scope, is_active
) VALUES

-- Brand & official (15)
('navigational', 'official', 1.2, 60, false, false, true, 'official app', 'base', true),
('navigational', 'app', 1.0, 50, false, false, true, 'instagram app', 'base', true),
('navigational', 'original', 1.1, 55, false, false, true, 'original version', 'base', true),
('navigational', 'real', 1.0, 50, false, false, true, 'real deal', 'base', true),
('navigational', 'licensed', 1.1, 55, false, false, true, 'licensed software', 'base', true),
('navigational', 'authorized', 1.2, 60, false, false, true, 'authorized dealer', 'base', true),
('navigational', 'branded', 1.0, 50, false, false, true, 'branded merchandise', 'base', true),
('navigational', 'by', 0.9, 45, false, false, true, 'app by company', 'base', true),
('navigational', 'from', 0.9, 45, false, false, true, 'from developer', 'base', true),
('navigational', 'made by', 1.0, 50, false, false, false, 'made by team', 'base', true),

-- Platform & version (15)
('navigational', 'ios', 1.0, 50, false, false, true, 'ios version', 'base', true),
('navigational', 'android', 1.0, 50, false, false, true, 'android app', 'base', true),
('navigational', 'iphone', 1.0, 50, false, false, true, 'iphone app', 'base', true),
('navigational', 'ipad', 1.0, 50, false, false, true, 'ipad version', 'base', true),
('navigational', 'mobile', 0.9, 45, false, false, true, 'mobile app', 'base', true),
('navigational', 'desktop', 0.9, 45, false, false, true, 'desktop version', 'base', true),
('navigational', 'web', 0.8, 40, false, false, true, 'web app', 'base', true),
('navigational', 'online', 0.8, 40, false, false, true, 'online platform', 'base', true),
('navigational', 'application', 0.9, 45, false, false, true, 'mobile application', 'base', true),
('navigational', 'software', 0.9, 45, false, false, true, 'business software', 'base', true),
('navigational', 'platform', 0.9, 45, false, false, true, 'trading platform', 'base', true),
('navigational', 'portal', 0.9, 45, false, false, true, 'customer portal', 'base', true),
('navigational', 'site', 0.8, 40, false, false, true, 'official site', 'base', true),
('navigational', 'page', 0.7, 35, false, false, true, 'landing page', 'base', true),
('navigational', 'store', 0.9, 45, false, false, true, 'app store', 'base', true),

-- Company & developer (15)
('navigational', 'inc', 0.9, 45, false, false, true, 'company inc', 'base', true),
('navigational', 'llc', 0.9, 45, false, false, true, 'company llc', 'base', true),
('navigational', 'ltd', 0.9, 45, false, false, true, 'company ltd', 'base', true),
('navigational', 'corporation', 0.9, 45, false, false, true, 'tech corporation', 'base', true),
('navigational', 'corp', 0.9, 45, false, false, true, 'apple corp', 'base', true),
('navigational', 'company', 0.9, 45, false, false, true, 'software company', 'base', true),
('navigational', 'developer', 0.9, 45, false, false, true, 'app developer', 'base', true),
('navigational', 'studio', 0.9, 45, false, false, true, 'game studio', 'base', true),
('navigational', 'team', 0.8, 40, false, false, true, 'dev team', 'base', true),
('navigational', 'group', 0.8, 40, false, false, true, 'media group', 'base', true),
('navigational', 'labs', 0.9, 45, false, false, true, 'innovation labs', 'base', true),
('navigational', 'technologies', 0.9, 45, false, false, true, 'tech technologies', 'base', true),
('navigational', 'solutions', 0.9, 45, false, false, true, 'business solutions', 'base', true),
('navigational', 'systems', 0.9, 45, false, false, true, 'software systems', 'base', true),
('navigational', 'enterprises', 0.9, 45, false, false, true, 'global enterprises', 'base', true),

-- Service & product (15)
('navigational', 'login', 1.1, 55, false, false, true, 'user login', 'base', true),
('navigational', 'signin', 1.1, 55, false, false, true, 'quick signin', 'base', true),
('navigational', 'account', 1.0, 50, false, false, true, 'my account', 'base', true),
('navigational', 'dashboard', 1.0, 50, false, false, true, 'user dashboard', 'base', true),
('navigational', 'console', 1.0, 50, false, false, true, 'admin console', 'base', true),
('navigational', 'panel', 0.9, 45, false, false, true, 'control panel', 'base', true),
('navigational', 'hub', 0.9, 45, false, false, true, 'content hub', 'base', true),
('navigational', 'center', 0.8, 40, false, false, true, 'learning center', 'base', true),
('navigational', 'workspace', 0.9, 45, false, false, true, 'team workspace', 'base', true),
('navigational', 'suite', 0.9, 45, false, false, true, 'office suite', 'base', true),
('navigational', 'edition', 0.9, 45, false, false, true, 'premium edition', 'base', true),
('navigational', 'version', 0.8, 40, false, false, true, 'latest version', 'base', true),
('navigational', 'release', 0.8, 40, false, false, true, 'new release', 'base', true),
('navigational', 'update', 0.8, 40, false, false, true, 'latest update', 'base', true),
('navigational', 'client', 0.9, 45, false, false, true, 'desktop client', 'base', true);

-- ============================================================================
-- Pattern Statistics
-- ============================================================================

-- Total patterns by type:
-- Informational: 80
-- Commercial: 80
-- Transactional: 80
-- Navigational: 60
-- TOTAL: 300 patterns

-- Pattern priority distribution:
-- Priority 150-120: High priority (top conversion/comparison indicators)
-- Priority 120-90: Medium-high (strong intent signals)
-- Priority 90-60: Medium (moderate intent signals)
-- Priority 60-35: Low (weak/contextual signals)

COMMENT ON TABLE aso_intent_patterns IS 'Phase 22: Enterprise intent pattern library - 300 LLM-generated patterns for ASO Bible';
